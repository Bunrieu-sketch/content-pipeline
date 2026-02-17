import { NextRequest, NextResponse } from 'next/server';
import { ensureSponsorsV2, calculatePaymentDueDate } from '@/lib/sponsors-v2';

export const dynamic = 'force-dynamic';

const ALLOWED_INSERT = [
  'brand_name',
  'deal_type',
  'deal_value_gross',
  'deal_value_net',
  'cpm_rate',
  'cpm_cap',
  'mvg',
  'stage',
  'agency_contact',
  'agency_email',
  'offer_date',
  'contract_date',
  'brief_received_date',
  'script_due_date',
  'film_by_date',
  'rough_cut_due_date',
  'publish_date',
  'invoice_date',
  'payment_due_date',
  'payment_received_date',
  'payment_terms_brand_days',
  'payment_terms_agency_days',
  'invoice_amount',
  'placement',
  'integration_length_seconds',
  'brief_text',
  'brief_link',
  'script_draft',
  'script_status',
  'has_tracking_link',
  'has_pinned_comment',
  'has_qr_code',
  'tracking_link',
  'promo_code',
  'youtube_video_id',
  'youtube_video_title',
  'views_at_30_days',
  'cpm_screenshot_taken',
  'cpm_invoice_generated',
  'mvg_met',
  'make_good_required',
  'make_good_video_id',
  'exclusivity_window_days',
  'exclusivity_category',
  'notes',
  'next_action',
  'next_action_due',
];

export function GET(req: NextRequest) {
  const db = ensureSponsorsV2();
  const stage = new URL(req.url).searchParams.get('stage');
  const rows = stage
    ? db.prepare('SELECT * FROM sponsors_v2 WHERE stage=? ORDER BY id').all(stage)
    : db.prepare('SELECT * FROM sponsors_v2 ORDER BY id').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const brand = (body.brand_name || '').trim();
  if (!brand) return NextResponse.json({ error: 'brand_name required' }, { status: 400 });

  const db = ensureSponsorsV2();

  const fields: string[] = ['brand_name'];
  const values: any[] = [brand];

  for (const col of ALLOWED_INSERT) {
    if (col === 'brand_name') continue;
    if (col in body) {
      fields.push(col);
      values.push(body[col]);
    }
  }

  if ('deal_value_gross' in body && !('deal_value_net' in body)) {
    fields.push('deal_value_net');
    values.push(Number(body.deal_value_gross || 0) * 0.8);
  }

  if ('publish_date' in body || 'payment_terms_brand_days' in body || 'payment_terms_agency_days' in body) {
    const computed = calculatePaymentDueDate(
      body.publish_date || null,
      body.payment_terms_brand_days,
      body.payment_terms_agency_days
    );
    if (computed) {
      const existingIndex = fields.indexOf('payment_due_date');
      if (existingIndex >= 0) {
        values[existingIndex] = computed;
      } else {
        fields.push('payment_due_date');
        values.push(computed);
      }
    }
  }

  const placeholders = fields.map(() => '?').join(', ');
  const result = db
    .prepare(`INSERT INTO sponsors_v2 (${fields.join(', ')}) VALUES (${placeholders})`)
    .run(...values);

  const sponsor = db.prepare('SELECT * FROM sponsors_v2 WHERE id=?').get(result.lastInsertRowid);
  return NextResponse.json(sponsor, { status: 201 });
}
