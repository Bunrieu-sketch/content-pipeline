import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'dashboard.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Migrations
    const cols = db.prepare("PRAGMA table_info(videos)").all() as { name: string }[];
    if (!cols.find(c => c.name === 'youtube_video_id')) {
      db.exec("ALTER TABLE videos ADD COLUMN youtube_video_id TEXT DEFAULT ''");
    }
    if (!cols.find(c => c.name === 'view_count')) {
      db.exec("ALTER TABLE videos ADD COLUMN view_count INTEGER DEFAULT 0");
    }
    if (!cols.find(c => c.name === 'outlier_score')) {
      db.exec("ALTER TABLE videos ADD COLUMN outlier_score REAL DEFAULT 0");
    }
  }
  return db;
}
