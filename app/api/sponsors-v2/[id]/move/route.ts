import { NextRequest, NextResponse } from 'next/server';
import { ensureSponsorsV2, SPONSOR_V2_STAGES, todayISO, calculatePaymentDueDate } from '@/lib/sponsors-v2';

const STAGE_DATE_MAP: Record<string, string> = {
  offer_received: 'offer_date',
  contract_signed: 'contract_date',
  brief_script: 'brief_received_date',
  filming: 'film_by_date',
  brand_review: 'rough_cut_due_date',
  published: 'publish_date',
  invoiced: 'invoice_date',
  paid: 'payment_received_date',
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = ensureSponsorsV2();

  const row = db.prepare('SELECT * FROM sponsors_v2 WHERE id=?').get(id) as any;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const currentIndex = SPONSOR_V2_STAGES.indexOf(row.stage);
  let targetStage = (body as any).stage || SPONSOR_V2_STAGES[Math.min(currentIndex + 1, SPONSOR_V2_STAGES.length - 1)];
  if (!SPONSOR_V2_STAGES.includes(targetStage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
  }

  const fields: string[] = ['stage=?', "updated_at=datetime('now')"];
  const vals: any[] = [targetStage];

  const dateField = STAGE_DATE_MAP[targetStage];
  if (dateField && !row[dateField]) {
    fields.push(`${dateField}=?`);
    vals.push(todayISO());
  }

  if (targetStage === 'published') {
    const publishDate = row.publish_date || todayISO();
    const computed = calculatePaymentDueDate(publishDate, row.payment_terms_brand_days, row.payment_terms_agency_days);
    if (computed) {
      fields.push('payment_due_date=?');
      vals.push(computed);
    }
  }

  vals.push(id);
  db.prepare(`UPDATE sponsors_v2 SET ${fields.join(', ')} WHERE id=?`).run(...vals);

  const updated = db.prepare('SELECT * FROM sponsors_v2 WHERE id=?').get(id);
  return NextResponse.json(updated);
}
