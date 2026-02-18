import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  
  const fields = Object.keys(body);
  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = [...Object.values(body), id];
  
  db.prepare(`UPDATE episodes SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  return NextResponse.json(episode);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  db.prepare('DELETE FROM episodes WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
