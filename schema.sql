-- Content Pipeline Database Schema
-- Created: 2026-02-17

CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    stage TEXT NOT NULL CHECK(stage IN ('idea', 'pre-production', 'filming', 'post-production', 'ready', 'published')),
    youtube_video_id TEXT,
    publish_date DATE,
    scheduled_date DATE,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL,
    contact_email TEXT,
    deal_value DECIMAL(10,2),
    status TEXT NOT NULL CHECK(status IN ('inquiry', 'negotiation', 'contract', 'content', 'delivered', 'live', 'paid', 'lost')),
    inquiry_date DATE,
    live_date DATE,
    payment_due_date DATE,
    payment_received_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sponsor_deliverables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    video_id INTEGER,
    deliverable_type TEXT,
    due_date DATE,
    completed BOOLEAN DEFAULT 0,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

CREATE TABLE IF NOT EXISTS content_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    phase TEXT NOT NULL CHECK(phase IN ('waiting_on_brief', 'writing_script', 'script_submitted', 'script_approved', 'scheduled', 'recorded')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked')),
    due_date DATE,
    completed_date DATE,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
);
