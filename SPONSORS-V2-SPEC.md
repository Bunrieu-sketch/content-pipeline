# Sponsors V2 — CRM Rebuild Spec

## Overview
Rebuild the sponsor CRM at `/sponsors-v2` as a new page with new API routes and new DB tables. Keep the old `/sponsors` untouched. Use the existing `dashboard.db` SQLite database.

## Tech Stack
- Next.js (existing app in this repo)
- SQLite via `better-sqlite3` (already used in this project)
- Tailwind CSS (already configured)
- No additional dependencies unless absolutely necessary

## Database

### New table: `sponsors_v2`

```sql
CREATE TABLE sponsors_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK(deal_type IN ('flat_rate', 'cpm', 'full_video')),
  deal_value_gross REAL DEFAULT 0,
  deal_value_net REAL DEFAULT 0,  -- after 20% agency commission
  cpm_rate REAL,  -- for CPM deals
  cpm_cap REAL,   -- max payout for CPM deals
  mvg INTEGER,    -- minimum view guarantee (if applicable)
  
  -- Pipeline stage
  stage TEXT NOT NULL DEFAULT 'offer_received' CHECK(stage IN (
    'offer_received', 'qualified', 'contract_signed', 'brief_script',
    'filming', 'brand_review', 'published', 'invoiced', 'paid', 'make_good'
  )),
  
  -- Contacts
  agency_contact TEXT DEFAULT 'Ben Stewart',
  agency_email TEXT DEFAULT '',
  
  -- Key dates
  offer_date TEXT,
  contract_date TEXT,
  brief_received_date TEXT,
  script_due_date TEXT,
  film_by_date TEXT,
  rough_cut_due_date TEXT,     -- ~1 week before publish
  publish_date TEXT,
  invoice_date TEXT,
  payment_due_date TEXT,       -- auto-calculated from contract terms
  payment_received_date TEXT,
  
  -- Payment tracking
  payment_terms_brand_days INTEGER DEFAULT 30,  -- brand pays agency in X days
  payment_terms_agency_days INTEGER DEFAULT 15, -- agency pays Andrew +15 days after
  invoice_amount REAL DEFAULT 0,
  
  -- Content details
  placement TEXT DEFAULT 'first_5_min',  -- first_5_min, first_2_min, midroll
  integration_length_seconds INTEGER DEFAULT 60,
  brief_text TEXT DEFAULT '',
  brief_link TEXT DEFAULT '',
  script_draft TEXT DEFAULT '',
  script_status TEXT DEFAULT 'not_started' CHECK(script_status IN (
    'not_started', 'drafting', 'submitted', 'revision_1', 'revision_2', 'revision_3', 'approved'
  )),
  
  -- Deliverables checklist
  has_tracking_link INTEGER DEFAULT 0,
  has_pinned_comment INTEGER DEFAULT 0,
  has_qr_code INTEGER DEFAULT 0,
  tracking_link TEXT DEFAULT '',
  promo_code TEXT DEFAULT '',
  
  -- Video link
  youtube_video_id TEXT DEFAULT '',
  youtube_video_title TEXT DEFAULT '',
  views_at_30_days INTEGER DEFAULT 0,
  
  -- CPM specific
  cpm_screenshot_taken INTEGER DEFAULT 0,
  cpm_invoice_generated INTEGER DEFAULT 0,
  
  -- MVG / Make-good
  mvg_met INTEGER,  -- NULL = not checked, 0 = not met, 1 = met
  make_good_required INTEGER DEFAULT 0,
  make_good_video_id TEXT DEFAULT '',
  
  -- Exclusivity
  exclusivity_window_days INTEGER DEFAULT 0,
  exclusivity_category TEXT DEFAULT '',
  
  -- Notes
  notes TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_action_due TEXT,
  
  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Data Migration
Migrate ALL existing data from `sponsors` table into `sponsors_v2`, mapping fields:
- `status` → `stage` mapping:
  - inquiry → offer_received
  - negotiation → qualified
  - contract → contract_signed
  - content → brief_script
  - live → published
  - delivered → published
  - paid → paid
- `deal_value` → `deal_value_gross`, calculate `deal_value_net` as gross * 0.8
- Copy all other matching fields

Run migration as part of the API init (check if sponsors_v2 exists, if not create + migrate).

## API Routes

### `/api/sponsors-v2`
- GET: List all deals, with optional `?stage=X` filter
- POST: Create new deal

### `/api/sponsors-v2/[id]`  
- GET: Single deal details
- PATCH: Update deal fields
- DELETE: Remove deal

### `/api/sponsors-v2/[id]/move`
- POST: Move deal to next/specific stage, auto-set dates

## Frontend Page: `/sponsors-v2/page.tsx`

### Layout: Kanban Board
- Horizontal scrolling columns for each stage
- Cards show: brand name, deal value (net), deal type badge, key deadline, next action
- Color-coded urgency: red = overdue, yellow = due within 3 days, green = on track
- Click card → slide-out detail panel (not a separate page)

### Detail Panel (slide-out from right)
When clicking a deal card, show a panel with:

**Header:** Brand name, stage badge, deal type badge, deal value

**Tabs:**
1. **Overview** — key dates, contact, placement, notes, next action
2. **Script** — brief text, script draft (editable textarea), script status with buttons to advance
3. **Checklist** — pre-publish checklist (tracking link, pinned comment, QR code) with toggles
4. **Payment** — invoice status, payment terms breakdown, due date calculation shown, overdue warning

**Actions:**
- "Move to Next Stage" button (with confirmation)
- Edit any field inline
- Delete deal (with confirmation)

### Dashboard Header
- Total active deals count
- Total pipeline value (sum of net values for non-paid deals)
- Overdue payments count (red badge)
- Upcoming deadlines (next 7 days)

### Alerts Bar (below header)
Show actionable alerts:
- 🔴 "FarmKind payment overdue by X days — follow up with Joaquin"
- 🟡 "Saily: 30-day CPM period ends Mar 4 — prepare invoice"
- 🟡 "Simify script due in 3 days"
- Auto-generated from dates in the data

## Payment Due Date Auto-Calculation
When `publish_date` is set:
```
payment_due_date = publish_date + payment_terms_brand_days + payment_terms_agency_days
```
Display breakdown in detail panel:
- "Published: Feb 2 → Brand pays agency by: Mar 4 (30d) → Agency pays you by: Mar 19 (+15d)"

## Visual Style
- Dark theme matching existing dashboard
- Clean, modern Kanban (think Linear/Notion)
- Subtle animations on card drag/move
- Responsive but desktop-first

## Important
- Do NOT modify the existing `/sponsors` page or `/api/sponsors` routes
- Do NOT modify the existing `sponsors` table
- Build everything as new files alongside existing code
- Use the existing `lib/` directory patterns for database access
