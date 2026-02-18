import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const series = db.prepare(`
    SELECT s.*, 
      COUNT(e.id) as episode_count,
      SUM(CASE WHEN e.status = 'published' THEN 1 ELSE 0 END) as published_count
    FROM series s
    LEFT JOIN episodes e ON e.series_id = s.id
    GROUP BY s.id
    ORDER BY s.shoot_start ASC
  `).all();
  return NextResponse.json(series);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  
  const result = db.prepare(`
    INSERT INTO series (
      title, location, country, status, pre_pro_week,
      shoot_start, shoot_end, target_publish,
      budget_total, target_cost_per_episode,
      fixer_name, fixer_contact, fixer_rate_day,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.title,
    body.location,
    body.country || null,
    body.status || 'planning',
    body.pre_pro_week || 1,
    body.shoot_start || null,
    body.shoot_end || null,
    body.target_publish || null,
    body.budget_total || 0,
    body.target_cost_per_episode || 1000,
    body.fixer_name || null,
    body.fixer_contact || null,
    body.fixer_rate_day || null,
    body.notes || null
  );
  
  // Create default pre-production tasks
  const seriesId = result.lastInsertRowid;
  const defaultTasks = [
    [1, 'Generate 10-20 episode ideas'],
    [1, 'Interview 6-7 fixers'],
    [1, 'Select 1-2 fixers'],
    [1, 'Confirm fixer availability'],
    [2, 'Lock 4-5 episode concepts'],
    [2, 'Classify Cornerstone vs Secondary'],
    [2, 'Sketch thumbnails for each episode'],
    [2, 'Write hooks for each episode'],
    [3, 'Confirm all locations'],
    [3, 'Receive photo/video proof from fixer'],
    [3, 'Lock expert interviews'],
    [3, 'Confirm shooting permissions'],
    [4, 'Book flights'],
    [4, 'Book hotels'],
    [4, 'Book transport'],
    [4, 'Purchase equipment'],
    [4, 'Daily fixer comms established'],
    [5, 'Packing checklist checked'],
    [5, 'Final confirmation call with fixer'],
    [5, 'Backup plans documented'],
    [5, 'Editor queue confirmed'],
  ];
  
  const insertTask = db.prepare('INSERT INTO pre_pro_tasks (series_id, week_number, task_name) VALUES (?, ?, ?)');
  for (const [week, task] of defaultTasks) {
    insertTask.run(seriesId, week, task);
  }
  
  const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
  return NextResponse.json(series);
}
