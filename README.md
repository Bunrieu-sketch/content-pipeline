# 🎬 YouTube Content & Sponsorship Dashboard

A unified dashboard for managing Andrew Fraser's YouTube content pipeline and sponsor relationships.

## Features

- **📊 Dashboard Overview** — stats, deadlines, quick-add forms
- **🎬 Video Pipeline** — kanban board (idea → published), drag-and-drop
- **💰 Sponsor CRM** — full workflow from inquiry → invoiced
- **📅 Calendar View** — all deadlines in timeline view
- **🔄 Auto Git Sync** — every change commits to git for backup
- **📱 Mobile-friendly** — works on phone and desktop

## Sponsor Workflow

```
Inquiry → Approved → Script → Script Approved → Contract Signed 
    → Scheduled → Recorded → Editing → Brand Approval → Approved 
    → Live → Invoiced
```

- **Flat rate deals**: Invoice immediately after going live
- **CPM deals**: Invoice 30 days after live (based on views)
- **Brand approval**: Always due 1 week before video goes live

## Quick Start

```bash
cd /Users/montymac/.openclaw/workspace/content-pipeline
source venv/bin/activate
python3 app.py
```

Then open: http://localhost:5000

## Auto-Start on Boot (Mac)

Install the LaunchAgent:

```bash
cp com.andrewfraser.dashboard.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.andrewfraser.dashboard.plist
```

The dashboard will now start automatically when your Mac boots.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | List all videos |
| POST | `/api/videos` | Create new video |
| POST | `/api/videos/:id` | Update video |
| POST | `/api/videos/:id/stage` | Change video stage (drag-drop) |
| POST | `/api/videos/:id/delete` | Delete video |
| GET | `/api/sponsors` | List all sponsors |
| POST | `/api/sponsors` | Create new sponsor |
| POST | `/api/sponsors/:id` | Update sponsor |
| POST | `/api/sponsors/:id/advance` | Advance to next stage |
| POST | `/api/sponsors/:id/delete` | Delete sponsor |

## File Structure

```
content-pipeline/
├── app.py              # Flask app
├── models.py           # Database models & helpers
├── dashboard.db        # SQLite database
├── requirements.txt    # Python deps
├── templates/
│   ├── dashboard.html  # Overview page
│   ├── videos.html     # Video kanban
│   ├── sponsors.html   # Sponsor CRM
│   ├── calendar.html   # Timeline view
│   ├── edit_video.html # Video edit form
│   └── edit_sponsor.html # Sponsor edit form
├── static/
│   └── dashboard.css   # Styles
└── README.md           # This file
```

## Data Backup

All changes are automatically committed to git. The database is also just a file — copy `dashboard.db` anywhere for backup.

---

*Built by Monty 🦉 for Andrew Fraser*
