import { NextRequest, NextResponse } from 'next/server';
import { ensureSponsorsV2, calculatePaymentDueDate } from '@/lib/sponsors-v2';

const ALLOWED_UPDATE = [
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

export function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const db = ensureSponsorsV2();
    const row = db.prepare('SELECT * FROM sponsors_v2 WHERE id=?').get(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = ensureSponsorsV2();

  const row = db.prepare('SELECT * FROM sponsors_v2 WHERE id=?').get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: string[] = [];
  const vals: any[] = [];
  for (const col of ALLOWED_UPDATE) {
    if (col in body) {
      fields.push(`${col}=?`);
      vals.push(body[col]);
    }
  }

  if ('deal_value_gross' in body && !('deal_value_net' in body)) {
    fields.push('deal_value_net=?');
    vals.push(Number(body.deal_value_gross || 0) * 0.8);
  }

  if ('publish_date' in body || 'payment_terms_brand_days' in body || 'payment_terms_agency_days' in body) {
    const computed = calculatePaymentDueDate(
      body.publish_date ?? row.publish_date ?? null,
      body.payment_terms_brand_days ?? row.payment_terms_brand_days,
      body.payment_terms_agency_days ?? row.payment_terms_agency_days
    );
    if (computed) {
      const existingIndex = fields.findIndex(field => field.startsWith('payment_due_date='));
      if (existingIndex >= 0) {
        vals[existingIndex] = computed;
      } else {
        fields.push('payment_due_date=?');
        vals.push(computed);
      }
    }
  }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });

  fields.push("updated_at=datetime('now')");
  vals.push(id);
  db.prepare(`UPDATE sponsors_v2 SET ${fields.join(', ')} WHERE id=?`).run(...vals);

  const updated = db.prepare('SELECT * FROM sponsors_v2 WHERE id=?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = ensureSponsorsV2();
  db.prepare('DELETE FROM sponsors_v2 WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
