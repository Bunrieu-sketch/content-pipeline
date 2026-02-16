# Google Calendar Integration for YouTube Dashboard

## Setup Instructions

### 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create new project: "Andrew Fraser Dashboard"
3. Enable Google Calendar API:
   - APIs & Services → Library → Search "Google Calendar API" → Enable

### 2. Create OAuth Credentials
1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Configure OAuth consent screen:
   - User Type: External
   - App name: "Andrew Fraser Dashboard"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Create OAuth 2.0 Client ID:
   - Application type: Desktop App
   - Name: "Dashboard Sync"
6. Download `client_secret.json`

### 3. Install Dependencies
```bash
cd /Users/montymac/.openclaw/workspace/content-pipeline
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 4. First Run - Authentication
```bash
python3 scripts/gcal_auth.py
```
This will open a browser for OAuth consent. After approval, tokens are saved to `token.json`.

### 5. Environment Variables
Add to `~/.zshrc` or run manually:
```bash
export GCAL_CLIENT_SECRET_PATH="/Users/montymac/.openclaw/workspace/content-pipeline/client_secret.json"
export GCAL_TOKEN_PATH="/Users/montymac/.openclaw/workspace/content-pipeline/token.json"
export GCAL_CALENDAR_ID="primary"  # or specific calendar ID
```

## Calendar Structure

The sync creates events with specific patterns for easy filtering:

**Video Due Dates:**
- Title: "📹 [Video Title]"
- Description: Link to video in dashboard
- Color: Blue

**Sponsor Record Dates:**
- Title: "🎥 Record: [Brand Name]"
- Description: Deal details, deliverables
- Color: Purple

**Sponsor Live Dates:**
- Title: "🔴 Go Live: [Brand Name]"
- Description: Video ID, payment terms
- Color: Red

**Script Deadlines:**
- Title: "📝 Script Due: [Brand Name]"
- Description: Link to brief/script
- Color: Yellow

## Sync Behavior

### Option A: One-way (Dashboard → GCal)
- Changes in dashboard push to GCal
- GCal is read-only reference
- Simpler, fewer conflicts

### Option B: Two-way
- Changes in either system sync both ways
- Requires conflict resolution logic
- More complex but flexible

**Recommended: Start with Option A**

## Cron Jobs

Add to daily brief generation:
```python
# Sync upcoming events to GCal
from gcal_sync import sync_upcoming_events
sync_upcoming_events(days_ahead=14)
```

## Manual Sync Commands

```bash
# Sync all upcoming video dates
python3 scripts/gcal_sync.py --videos --days 30

# Sync all sponsor dates
python3 scripts/gcal_sync.py --sponsors --days 90

# Full sync
python3 scripts/gcal_sync.py --all

# Clear all synced events
python3 scripts/gcal_sync.py --clear
```