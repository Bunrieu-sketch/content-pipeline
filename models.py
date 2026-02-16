"""Database models and helpers for the YouTube Content & Sponsorship Dashboard."""
import sqlite3
import subprocess
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "dashboard.db"
REPO_DIR = Path(__file__).resolve().parent

# ── Video stages (ordered) ──────────────────────────────────────────
VIDEO_STAGES = [
    "idea",
    "pre-prod",
    "shooting",
    "post-prod",
    "titles-thumbnails",
    "published",
]

VIDEO_STAGE_LABELS = {
    "idea": "💡 Idea",
    "pre-prod": "📋 Pre-Production",
    "shooting": "🎬 Shooting",
    "post-prod": "✂️ Post-Production",
    "titles-thumbnails": "🖼️ Titles & Thumbnails",
    "published": "🚀 Published",
}

# ── Sponsor workflow stages (ordered, simplified Kanban) ─────────────
SPONSOR_STAGES = [
    "inquiry",
    "negotiation",
    "contract",
    "content",
    "delivered",
    "live",
    "paid",
]

SPONSOR_STAGE_LABELS = {
    "inquiry": "Inquiry",
    "negotiation": "Negotiation",
    "contract": "Contract",
    "content": "Content",
    "delivered": "Delivered",
    "live": "Live",
    "paid": "Paid",
}

SPONSOR_NEXT_STAGE = {}
for i, s in enumerate(SPONSOR_STAGES[:-1]):
    SPONSOR_NEXT_STAGE[s] = SPONSOR_STAGES[i + 1]

# ── Content sub-phases (when status='content') ─────────────────────
CONTENT_PHASES = [
    "brief_pending",
    "script_writing", 
    "script_submitted",
    "script_approved",
    "scheduled",
    "recorded",
]

CONTENT_PHASE_LABELS = {
    "brief_pending": "⏳ Waiting on Brief",
    "script_writing": "✍️ Writing Script",
    "script_submitted": "📤 Script Submitted",
    "script_approved": "✅ Script Approved",
    "scheduled": "📅 Scheduled",
    "recorded": "🎥 Recorded",
}

INVOICE_STATUSES = ["not_due", "pending", "sent", "paid"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL,
    deal_value REAL DEFAULT 0,
    deal_type TEXT DEFAULT 'flat_rate' CHECK(deal_type IN ('flat_rate', 'cpm')),
    status TEXT DEFAULT 'inquiry',
    script_due TEXT,
    record_date TEXT,
    brand_approval_deadline TEXT,
    live_date TEXT,
    invoice_status TEXT DEFAULT 'not_due',
    invoice_amount REAL DEFAULT 0,
    views_at_30_days INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    contact_name TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    stage TEXT DEFAULT 'idea',
    due_date TEXT,
    notes TEXT DEFAULT '',
    sponsor_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize database schema."""
    conn = get_db()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def git_sync(message: str):
    """Auto-commit database changes to git."""
    try:
        subprocess.run(
            ["git", "add", "-A"],
            cwd=str(REPO_DIR),
            capture_output=True,
            timeout=10,
        )
        subprocess.run(
            ["git", "commit", "-m", message, "--allow-empty"],
            cwd=str(REPO_DIR),
            capture_output=True,
            timeout=10,
        )
    except Exception:
        pass  # Don't break the app if git fails


def log_activity(conn, entity_type, entity_id, action, details=""):
    """Log an activity."""
    conn.execute(
        "INSERT INTO activity_log (entity_type, entity_id, action, details) VALUES (?, ?, ?, ?)",
        (entity_type, entity_id, action, details),
    )


def get_upcoming_deadlines(days=7):
    """Get all deadlines within the next N days."""
    conn = get_db()
    now = datetime.utcnow()
    future = now + timedelta(days=days)
    now_str = now.strftime("%Y-%m-%d")
    future_str = future.strftime("%Y-%m-%d")

    deadlines = []

    # Video due dates
    rows = conn.execute(
        "SELECT id, title, due_date, stage FROM videos WHERE due_date IS NOT NULL AND due_date <= ? AND stage != 'published'",
        (future_str,),
    ).fetchall()
    for r in rows:
        urgency = "overdue" if r["due_date"] < now_str else "approaching"
        deadlines.append({
            "type": "video",
            "id": r["id"],
            "title": r["title"],
            "date": r["due_date"],
            "label": f"Video due: {r['title']}",
            "urgency": urgency,
        })

    # Sponsor deadlines
    sponsor_date_fields = [
        ("script_due", "Script due"),
        ("record_date", "Record date"),
        ("brand_approval_deadline", "Brand approval deadline"),
        ("live_date", "Go live"),
    ]
    rows = conn.execute(
        "SELECT id, brand_name, script_due, record_date, brand_approval_deadline, live_date, status FROM sponsors WHERE status NOT IN ('live', 'paid')"
    ).fetchall()
    for r in rows:
        for field, label in sponsor_date_fields:
            if r[field] and r[field] <= future_str:
                urgency = "overdue" if r[field] < now_str else "approaching"
                deadlines.append({
                    "type": "sponsor",
                    "id": r["id"],
                    "title": r["brand_name"],
                    "date": r[field],
                    "label": f"{label}: {r['brand_name']}",
                    "urgency": urgency,
                })

    conn.close()
    deadlines.sort(key=lambda d: d["date"])
    return deadlines


def get_calendar_events():
    """Get all dated items for calendar view."""
    conn = get_db()
    events = []

    # Videos with due dates
    for r in conn.execute("SELECT id, title, due_date, stage FROM videos WHERE due_date IS NOT NULL").fetchall():
        events.append({
            "id": f"v{r['id']}",
            "title": f"📹 {r['title']}",
            "date": r["due_date"],
            "type": "video",
            "stage": r["stage"],
        })

    # Sponsor dates
    for r in conn.execute("SELECT id, brand_name, script_due, record_date, brand_approval_deadline, live_date, status FROM sponsors").fetchall():
        if r["script_due"]:
            events.append({"id": f"s{r['id']}_script", "title": f"📝 Script: {r['brand_name']}", "date": r["script_due"], "type": "sponsor", "stage": r["status"]})
        if r["record_date"]:
            events.append({"id": f"s{r['id']}_record", "title": f"🎥 Record: {r['brand_name']}", "date": r["record_date"], "type": "sponsor", "stage": r["status"]})
        if r["brand_approval_deadline"]:
            events.append({"id": f"s{r['id']}_approval", "title": f"⏳ Approval: {r['brand_name']}", "date": r["brand_approval_deadline"], "type": "sponsor", "stage": r["status"]})
        if r["live_date"]:
            events.append({"id": f"s{r['id']}_live", "title": f"🔴 Live: {r['brand_name']}", "date": r["live_date"], "type": "sponsor", "stage": r["status"]})

    conn.close()
    events.sort(key=lambda e: e["date"])
    return events
