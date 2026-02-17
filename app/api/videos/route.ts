import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const STAGES = ['idea', 'pre-production', 'filming', 'post-production', 'ready', 'published'];

export function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM videos ORDER BY sort_order, id').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = (body.title || '').trim();
  const stage = (body.stage || 'idea').trim();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  if (!STAGES.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });

  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM videos WHERE LOWER(title)=LOWER(?)').get(title);
  if (exists) return NextResponse.json({ error: 'Video already exists' }, { status: 409 });

  const result = db.prepare('INSERT INTO videos (title, stage) VALUES (?, ?)').run(title, stage);
  const video = db.prepare('SELECT * FROM videos WHERE id=?').get(result.lastInsertRowid);
  return NextResponse.json(video, { status: 201 });
}
