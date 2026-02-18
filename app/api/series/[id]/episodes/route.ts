import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const episodes = db.prepare('SELECT * FROM episodes WHERE series_id = ? ORDER BY episode_number').all(id);
  return NextResponse.json(episodes);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  
  const result = db.prepare(`
    INSERT INTO episodes (
      series_id, episode_number, title, hook, thumbnail_concept,
      episode_type, status, target_publish, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.episode_number,
    body.title,
    body.hook || null,
    body.thumbnail_concept || null,
    body.episode_type || 'secondary',
    body.status || 'planning',
    body.target_publish || null,
    body.notes || null
  );
  
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(episode);
}
