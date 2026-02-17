#!/usr/bin/env python3
"""Migration script: create schema and migrate videos from JSON to SQLite."""
import json
import sqlite3
from pathlib import Path

BASE = Path(__file__).resolve().parent
DB_PATH = BASE / "dashboard.db"
SCHEMA_PATH = BASE / "schema.sql"
JSON_PATH = BASE / "content-pipeline.json"


def run():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    # Apply schema
    conn.executescript(SCHEMA_PATH.read_text())
    print("Schema applied.")

    # Migrate videos from JSON
    data = json.loads(JSON_PATH.read_text()) if JSON_PATH.exists() else []
    migrated = 0
    for v in data:
        title = v.get("title", "").strip()
        stage = v.get("stage", "idea").strip()
        if not title:
            continue
        # Skip duplicates
        exists = conn.execute("SELECT 1 FROM videos WHERE title = ?", (title,)).fetchone()
        if exists:
            print(f"  Skipping duplicate: {title}")
            continue
        conn.execute("INSERT INTO videos (title, stage) VALUES (?, ?)", (title, stage))
        migrated += 1

    conn.commit()
    print(f"Migrated {migrated} videos.")

    # Verify
    rows = conn.execute("SELECT id, title, stage, created_at FROM videos").fetchall()
    print(f"\nVideos in database ({len(rows)}):")
    for r in rows:
        print(f"  [{r[0]}] {r[1]} — {r[2]} (created: {r[3]})")

    tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
    print(f"\nTables: {[t[0] for t in tables]}")
    conn.close()


if __name__ == "__main__":
    run()
