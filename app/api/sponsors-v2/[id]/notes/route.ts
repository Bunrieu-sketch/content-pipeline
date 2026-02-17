import { NextRequest, NextResponse } from 'next/server';
import { ensureSponsorsV2 } from '@/lib/sponsors-v2';

export function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const db = ensureSponsorsV2();
    const rows = db.prepare('SELECT * FROM sponsor_notes WHERE sponsor_id=? ORDER BY created_at DESC').all(id);
    return NextResponse.json(rows);
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const note = (body.note || '').trim();
  if (!note) return NextResponse.json({ error: 'note required' }, { status: 400 });

  const db = ensureSponsorsV2();
  const result = db
    .prepare('INSERT INTO sponsor_notes (sponsor_id, note) VALUES (?,?)')
    .run(id, note);

  const row = db.prepare('SELECT * FROM sponsor_notes WHERE id=?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}
