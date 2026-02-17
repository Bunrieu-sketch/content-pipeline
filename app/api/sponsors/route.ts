import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM sponsors ORDER BY id').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const brand = (body.brand_name || '').trim();
  if (!brand) return NextResponse.json({ error: 'brand_name required' }, { status: 400 });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO sponsors (brand_name, contact_email, deal_value, status, notes, payment_due_date) VALUES (?,?,?,?,?,?)'
  ).run(brand, body.contact_email || '', body.deal_value || 0, body.status || 'inquiry', body.notes || '', body.payment_due_date || null);

  const sponsor = db.prepare('SELECT * FROM sponsors WHERE id=?').get(result.lastInsertRowid);
  return NextResponse.json(sponsor, { status: 201 });
}
