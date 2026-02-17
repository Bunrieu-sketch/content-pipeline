import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ALLOWED = ['brand_name','contact_email','deal_value','deal_type','status','payment_due_date','notes',
  'contact_name','content_phase','script_due','brand_approval_deadline','live_date',
  'next_action','next_action_due','deliverables','last_contact_date'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const row = db.prepare('SELECT * FROM sponsors WHERE id=?').get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: string[] = [];
  const vals: any[] = [];
  for (const col of ALLOWED) {
    if (col in body) { fields.push(`${col}=?`); vals.push(body[col]); }
  }
  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });

  fields.push("updated_at=datetime('now')");
  vals.push(id);
  db.prepare(`UPDATE sponsors SET ${fields.join(', ')} WHERE id=?`).run(...vals);

  const updated = db.prepare('SELECT * FROM sponsors WHERE id=?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM sponsors WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
