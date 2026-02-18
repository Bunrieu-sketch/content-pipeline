import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  
  const series = db.prepare('SELECT * FROM series WHERE id = ?').get(id);
  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  const episodes = db.prepare('SELECT * FROM episodes WHERE series_id = ? ORDER BY episode_number').all(id);
  const tasks = db.prepare('SELECT * FROM pre_pro_tasks WHERE series_id = ? ORDER BY week_number, task_name').all(id);
  
  return NextResponse.json({ ...series, episodes, tasks });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  
  const fields = Object.keys(body);
  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = [...Object.values(body), id];
  
  db.prepare(`UPDATE series SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  
  const series = db.prepare('SELECT * FROM series WHERE id = ?').get(id);
  return NextResponse.json(series);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  db.prepare('DELETE FROM series WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
