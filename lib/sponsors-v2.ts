import { getDb } from '@/lib/db';

export const SPONSOR_V2_STAGES = [
  'offer_received',
  'qualified',
  'contract_signed',
  'brief_script',
  'filming',
  'brand_review',
  'published',
  'invoiced',
  'paid',
  'make_good',
] as const;

export type SponsorV2Stage = (typeof SPONSOR_V2_STAGES)[number];

const CREATE_SPONSORS_V2 = `
CREATE TABLE sponsors_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK(deal_type IN ('flat_rate', 'cpm', 'full_video')),
  deal_value_gross REAL DEFAULT 0,
  deal_value_net REAL DEFAULT 0,
  cpm_rate REAL,
  cpm_cap REAL,
  mvg INTEGER,

  stage TEXT NOT NULL DEFAULT 'offer_received' CHECK(stage IN (
    'offer_received', 'qualified', 'contract_signed', 'brief_script',
    'filming', 'brand_review', 'published', 'invoiced', 'paid', 'make_good'
  )),

  agency_contact TEXT DEFAULT 'Ben Stewart',
  agency_email TEXT DEFAULT '',

  offer_date TEXT,
  contract_date TEXT,
  brief_received_date TEXT,
  script_due_date TEXT,
  film_by_date TEXT,
  rough_cut_due_date TEXT,
  publish_date TEXT,
  invoice_date TEXT,
  payment_due_date TEXT,
  payment_received_date TEXT,

  payment_terms_brand_days INTEGER DEFAULT 30,
  payment_terms_agency_days INTEGER DEFAULT 15,
  invoice_amount REAL DEFAULT 0,

  placement TEXT DEFAULT 'first_5_min',
  integration_length_seconds INTEGER DEFAULT 60,
  brief_text TEXT DEFAULT '',
  brief_link TEXT DEFAULT '',
  script_draft TEXT DEFAULT '',
  script_status TEXT DEFAULT 'not_started' CHECK(script_status IN (
    'not_started', 'drafting', 'submitted', 'revision_1', 'revision_2', 'revision_3', 'approved'
  )),

  has_tracking_link INTEGER DEFAULT 0,
  has_pinned_comment INTEGER DEFAULT 0,
  has_qr_code INTEGER DEFAULT 0,
  tracking_link TEXT DEFAULT '',
  promo_code TEXT DEFAULT '',

  youtube_video_id TEXT DEFAULT '',
  youtube_video_title TEXT DEFAULT '',
  views_at_30_days INTEGER DEFAULT 0,

  cpm_screenshot_taken INTEGER DEFAULT 0,
  cpm_invoice_generated INTEGER DEFAULT 0,

  mvg_met INTEGER,
  make_good_required INTEGER DEFAULT 0,
  make_good_video_id TEXT DEFAULT '',

  exclusivity_window_days INTEGER DEFAULT 0,
  exclusivity_category TEXT DEFAULT '',

  notes TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_action_due TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

const CREATE_SPONSOR_DELIVERABLES_V2 = `
CREATE TABLE IF NOT EXISTS sponsor_deliverables_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sponsor_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'complete')),
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sponsor_id) REFERENCES sponsors_v2(id) ON DELETE CASCADE
);
`;

const CREATE_SPONSOR_NOTES = `
CREATE TABLE IF NOT EXISTS sponsor_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sponsor_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sponsor_id) REFERENCES sponsors_v2(id) ON DELETE CASCADE
);
`;

const MIGRATE_SPONSORS = `
INSERT INTO sponsors_v2 (
  brand_name,
  deal_type,
  deal_value_gross,
  deal_value_net,
  stage,
  invoice_amount,
  views_at_30_days,
  notes,
  brief_link,
  script_status,
  next_action,
  next_action_due,
  payment_due_date,
  payment_received_date,
  youtube_video_id,
  youtube_video_title,
  created_at,
  updated_at
)
SELECT
  brand_name,
  deal_type,
  deal_value,
  deal_value * 0.8,
  CASE status
    WHEN 'inquiry' THEN 'offer_received'
    WHEN 'negotiation' THEN 'qualified'
    WHEN 'contract' THEN 'contract_signed'
    WHEN 'content' THEN 'brief_script'
    WHEN 'live' THEN 'published'
    WHEN 'delivered' THEN 'published'
    WHEN 'paid' THEN 'paid'
    ELSE 'offer_received'
  END,
  invoice_amount,
  views_at_30_days,
  notes,
  brief_link,
  script_status,
  next_action,
  next_action_due,
  payment_due_date,
  payment_received_date,
  youtube_video_id,
  youtube_video_title,
  created_at,
  updated_at
FROM sponsors;
`;

export function ensureSponsorsV2() {
  const db = getDb();
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sponsors_v2'")
    .get();
  if (!exists) {
    db.exec(CREATE_SPONSORS_V2);
    const hasSponsors = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sponsors'")
      .get();
    if (hasSponsors) {
      db.exec(MIGRATE_SPONSORS);
    }
  }
  db.exec(CREATE_SPONSOR_DELIVERABLES_V2);
  db.exec(CREATE_SPONSOR_NOTES);
  return db;
}

export function addDays(dateStr: string, days: number) {
  const base = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(base.getTime())) return dateStr;
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function calculatePaymentDueDate(
  publishDate: string | null | undefined,
  brandDays: number | null | undefined,
  agencyDays: number | null | undefined
) {
  if (!publishDate) return null;
  const brand = Number(brandDays ?? 30);
  const agency = Number(agencyDays ?? 15);
  return addDays(publishDate, brand + agency);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
