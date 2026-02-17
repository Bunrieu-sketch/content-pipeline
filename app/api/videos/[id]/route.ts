import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const STAGES = ['idea', 'pre-production', 'filming', 'post-production', 'ready', 'published'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const row = db.prepare('SELECT * FROM videos WHERE id=?').get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: string[] = [];
  const vals: any[] = [];

  if (body.title) { fields.push('title=?'); vals.push(body.title); }
  if (body.stage && STAGES.includes(body.stage)) { fields.push('stage=?'); vals.push(body.stage); }
  if (body.notes !== undefined) { fields.push('notes=?'); vals.push(body.notes); }
  if (body.due_date !== undefined) { fields.push('due_date=?'); vals.push(body.due_date); }
  if (body.youtube_video_id !== undefined) { fields.push('youtube_video_id=?'); vals.push(body.youtube_video_id); }
  if (body.view_count !== undefined) { fields.push('view_count=?'); vals.push(body.view_count); }
  if (body.outlier_score !== undefined) { fields.push('outlier_score=?'); vals.push(body.outlier_score); }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });

  fields.push("updated_at=datetime('now')");
  vals.push(id);
  db.prepare(`UPDATE videos SET ${fields.join(', ')} WHERE id=?`).run(...vals);

  const updated = db.prepare('SELECT * FROM videos WHERE id=?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM videos WHERE id=?').get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  db.prepare('DELETE FROM videos WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
