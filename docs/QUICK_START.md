# YouTube Dashboard + Google Calendar Setup

## What You Get

**Dashboard (localhost:5050):**
- Sponsor pipeline with Kanban view
- Video production tracker  
- Calendar view with all deadlines
- Payment tracking

**Google Calendar (your phone):**
- All video deadlines
- Sponsor record/live dates
- Script deadlines
- Native reminders on your phone

## Quick Setup (5 minutes)

### Step 1: Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name: "Andrew Fraser Dashboard" → Create
4. Make sure the new project is selected

### Step 2: Enable Calendar API
1. APIs & Services → Library
2. Search "Google Calendar API"
3. Click Enable

### Step 3: Create Credentials
1. APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. If asked to configure consent screen:
   - Click "Configure Consent Screen"
   - User Type: External
   - App name: "Andrew Fraser Dashboard"
   - User support email: (your Gmail)
   - Developer contact: (your Gmail)
   - Save and Continue (twice) → Back to Dashboard
4. Create Credentials → OAuth 2.0 Client ID
   - Application type: Desktop app
   - Name: "Dashboard Sync"
   - Create
5. Click Download JSON
6. Save file as `client_secret.json` in:
   `/Users/montymac/.openclaw/workspace/content-pipeline/`

### Step 4: First Sync
```bash
cd /Users/montymac/.openclaw/workspace/content-pipeline
python3 scripts/gcal_sync.py --all
```

This will:
- Open browser for Google login
- Ask permission to manage your calendar
- Sync next 30 days of events

### Step 5: Verify
Check your Google Calendar — you should see:
- 📹 Video due dates (blue)
- 📝 Script deadlines (yellow)
- 🎥 Record dates (purple)
- 🔴 Go live dates (red)

## Daily Workflow

**Morning:**
1. Check daily brief (sent 7am to Telegram)
2. Check Google Calendar on phone
3. Forward any sponsor emails to montythehandler@gmail.com

**When video goes live:**
1. Update sponsor in dashboard with YouTube video ID
2. Dashboard auto-calculates payment due date
3. Weekly payment check alerts for overdue invoices

## Troubleshooting

**"client_secret.json not found"**
→ Make sure you downloaded the JSON and saved it to the right folder

**"Token expired"**
→ Delete `token.json` and run sync again

**Events not showing**
→ Check that events have due dates in the dashboard

## Calendar Sync Schedule

- **Daily 8am:** Auto-sync to Google Calendar
- **Manual:** Run `python3 scripts/gcal_sync.py --all` anytime

## Data Flow

```
Sponsor Email → montythehandler@gmail.com
                       ↓
              I read & update dashboard
                       ↓
         Dashboard syncs to Google Calendar
                       ↓
         You see it on your phone
```