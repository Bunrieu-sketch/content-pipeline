import { NextRequest, NextResponse } from 'next/server';
import { ensureSponsorsV2 } from '@/lib/sponsors-v2';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params;
  const db = ensureSponsorsV2();
  db.prepare('DELETE FROM sponsor_notes WHERE id=? AND sponsor_id=?').run(noteId, id);
  return NextResponse.json({ ok: true });
}
