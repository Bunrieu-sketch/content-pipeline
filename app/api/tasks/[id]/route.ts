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
  
  db.prepare(`UPDATE pre_pro_tasks SET ${setClause} WHERE id = ?`).run(...values);
  
  const task = db.prepare('SELECT * FROM pre_pro_tasks WHERE id = ?').get(id);
  return NextResponse.json(task);
}
