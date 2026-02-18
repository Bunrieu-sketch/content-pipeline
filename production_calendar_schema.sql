-- Production Calendar Schema Extension for dashboard.db
-- Series-centric model with 5-week pre-production pipeline

-- Series: The container (e.g., "Bangladesh Series 2")
CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    country TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning','week1','week2','week3','week4','week5','shooting','editing','published')),
    
    -- Pre-production tracking
    pre_pro_week INTEGER DEFAULT 1 CHECK (pre_pro_week BETWEEN 1 AND 5),
    week1_complete INTEGER DEFAULT 0,
    week2_complete INTEGER DEFAULT 0,
    week3_complete INTEGER DEFAULT 0,
    week4_complete INTEGER DEFAULT 0,
    week5_complete INTEGER DEFAULT 0,
    
    -- Fixer/Guide
    fixer_id INTEGER,
    fixer_name TEXT,
    fixer_contact TEXT,
    fixer_rate_day INTEGER,
    
    -- Dates
    shoot_start DATE,
    shoot_end DATE,
    target_publish DATE,
    
    -- Financials
    budget_total INTEGER DEFAULT 0,
    target_cost_per_episode INTEGER DEFAULT 1000,
    actual_cost INTEGER DEFAULT 0,
    
    -- Breakdown prevention checklist
    checklist_expectations_confirmed INTEGER DEFAULT 0,
    checklist_photo_proof_received INTEGER DEFAULT 0,
    checklist_hook_validated INTEGER DEFAULT 0,
    checklist_producer_deliverables_checked INTEGER DEFAULT 0,
    checklist_editor_queue_filled INTEGER DEFAULT 0,
    checklist_sponsorship_products_ordered INTEGER DEFAULT 0,
    checklist_push_plan_ready INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Episodes: The individual videos within a series
CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    hook TEXT,
    thumbnail_concept TEXT,
    episode_type TEXT DEFAULT 'secondary' CHECK (episode_type IN ('cornerstone','secondary')),
    
    -- Status pipeline
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning','pre-prod','shooting','editing','review','published')),
    
    -- Shooting
    shoot_start DATE,
    shoot_end DATE,
    
    -- Script/Content workflow
    script_status TEXT DEFAULT 'none' CHECK (script_status IN ('none','voice_memos','outline_draft','script_complete')),
    
    -- Post-production
    editor_id INTEGER,
    editor_name TEXT,
    edit_week_1_start DATE,
    edit_week_2_start DATE,
    target_publish DATE,
    actual_publish DATE,
    
    -- Sponsorship
    sponsor_id INTEGER,
    sponsor_name TEXT,
    product_ordered_date DATE,
    integration_status TEXT DEFAULT 'none' CHECK (integration_status IN ('none','product_pending','integration_shot','delivered')),
    
    -- Performance
    cost_actual INTEGER DEFAULT 0,
    youtube_id TEXT,
    views INTEGER DEFAULT 0,
    revenue INTEGER DEFAULT 0,
    
    -- Notes
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);

-- Fixers: Reusable directory
CREATE TABLE IF NOT EXISTS fixers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    whatsapp TEXT,
    email TEXT,
    location TEXT,
    rate_day INTEGER,
    reliability_score INTEGER DEFAULT 3 CHECK (reliability_score BETWEEN 1 AND 5),
    notes TEXT,
    last_series_id INTEGER,
    last_worked_date DATE,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Pre-production gates detail (for tracking sub-tasks within each week)
CREATE TABLE IF NOT EXISTS pre_pro_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 5),
    task_name TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    notes TEXT,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);

-- Editor workload assignments
CREATE TABLE IF NOT EXISTS editor_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    editor_name TEXT NOT NULL,
    episode_id INTEGER,
    week_number INTEGER CHECK (week_number IN (1, 2)),
    slot_start DATE,
    slot_end DATE,
    status TEXT DEFAULT 'empty' CHECK (status IN ('empty','assigned','in_progress','done')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

-- Voice memos / camera logs (for future voice-to-script feature)
CREATE TABLE IF NOT EXISTS voice_memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    episode_id INTEGER,
    telegram_message_id TEXT,
    audio_url TEXT,
    transcript TEXT,
    processed INTEGER DEFAULT 0,
    camera_log_generated INTEGER DEFAULT 0,
    outline_generated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Default pre-production tasks for each week
INSERT OR IGNORE INTO pre_pro_tasks (series_id, week_number, task_name) VALUES
-- Week 1 tasks
(NULL, 1, 'Generate 10-20 episode ideas'),
(NULL, 1, 'Interview 6-7 fixers'),
(NULL, 1, 'Select 1-2 fixers'),
(NULL, 1, 'Confirm fixer availability'),
-- Week 2 tasks  
(NULL, 2, 'Lock 4-5 episode concepts'),
(NULL, 2, 'Classify Cornerstone vs Secondary'),
(NULL, 2, 'Sketch thumbnails for each episode'),
(NULL, 2, 'Write hooks for each episode'),
-- Week 3 tasks
(NULL, 3, 'Confirm all locations'),
(NULL, 3, 'Receive photo/video proof from fixer'),
(NULL, 3, 'Lock expert interviews'),
(NULL, 3, 'Confirm shooting permissions'),
-- Week 4 tasks
(NULL, 4, 'Book flights'),
(NULL, 4, 'Book hotels'),
(NULL, 4, 'Book transport'),
(NULL, 4, 'Purchase equipment'),
(NULL, 4, 'Daily fixer comms established'),
-- Week 5 tasks
(NULL, 5, 'Packing checklist checked'),
(NULL, 5, 'Final confirmation call with fixer'),
(NULL, 5, 'Backup plans documented'),
(NULL, 5, 'Editor queue confirmed');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_series_status ON series(status);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_editor ON episodes(editor_name);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
CREATE INDEX IF NOT EXISTS idx_editor_slots_editor ON editor_slots(editor_name);
CREATE INDEX IF NOT EXISTS idx_pre_pro_tasks_series ON pre_pro_tasks(series_id);
