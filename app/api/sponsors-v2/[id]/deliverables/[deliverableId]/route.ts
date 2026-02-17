import { NextRequest, NextResponse } from 'next/server';
import { ensureSponsorsV2 } from '@/lib/sponsors-v2';

const ALLOWED = ['title', 'status', 'due_date'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; deliverableId: string }> }) {
  const { id, deliverableId } = await params;
  const body = await req.json();
  const db = ensureSponsorsV2();

  const row = db
    .prepare('SELECT * FROM sponsor_deliverables_v2 WHERE id=? AND sponsor_id=?')
    .get(deliverableId, id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: string[] = [];
  const vals: any[] = [];
  for (const col of ALLOWED) {
    if (col in body) {
      fields.push(`${col}=?`);
      vals.push(body[col]);
    }
  }
  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });

  fields.push("updated_at=datetime('now')");
  vals.push(deliverableId, id);
  db.prepare(`UPDATE sponsor_deliverables_v2 SET ${fields.join(', ')} WHERE id=? AND sponsor_id=?`).run(...vals);

  const updated = db
    .prepare('SELECT * FROM sponsor_deliverables_v2 WHERE id=? AND sponsor_id=?')
    .get(deliverableId, id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; deliverableId: string }> }) {
  const { id, deliverableId } = await params;
  const db = ensureSponsorsV2();
  db.prepare('DELETE FROM sponsor_deliverables_v2 WHERE id=? AND sponsor_id=?').run(deliverableId, id);
  return NextResponse.json({ ok: true });
}
