#!/usr/bin/env python3
"""Google Calendar sync for YouTube Dashboard."""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Google Calendar API imports
try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print("Google API libraries not installed. Run: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")

# Constants
DB_PATH = Path(__file__).resolve().parent.parent / "dashboard.db"
SCOPES = ['https://www.googleapis.com/auth/calendar']

# Calendar colors
COLORS = {
    'video': '9',      # Blue
    'record': '3',     # Purple
    'live': '11',      # Red
    'script': '5',     # Yellow
    'approval': '8',   # Gray
}


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_credentials():
    """Get or refresh Google Calendar credentials."""
    creds = None
    token_path = os.getenv('GCAL_TOKEN_PATH', 'token.json')
    client_secret_path = os.getenv('GCAL_CLIENT_SECRET_PATH', 'client_secret.json')
    
    # Load existing token
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    # Refresh or create new token
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(client_secret_path):
                print(f"ERROR: {client_secret_path} not found!")
                print("Follow setup instructions in docs/GCAL_SETUP.md")
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                client_secret_path, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save token
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    
    return creds


def sync_video_deadlines(service, calendar_id='primary', days_ahead=30):
    """Sync video due dates to Google Calendar."""
    conn = get_db()
    
    # Get videos with due dates
    videos = conn.execute(
        """SELECT id, title, due_date, stage, notes 
           FROM videos 
           WHERE due_date IS NOT NULL 
           AND due_date >= date('now')
           AND due_date <= date('now', ?)
           AND stage != 'published'""",
        (f'+{days_ahead} days',)
    ).fetchall()
    
    synced = 0
    for video in videos:
        event_body = {
            'summary': f"📹 {video['title']}",
            'description': f"Stage: {video['stage']}\nNotes: {video['notes'] or 'None'}\n\nDashboard: http://localhost:5050/videos",
            'start': {'date': video['due_date']},
            'end': {'date': video['due_date']},
            'colorId': COLORS['video'],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                    {'method': 'popup', 'minutes': 60},       # 1 hour before
                ]
            }
        }
        
        try:
            # Check if event exists (by extended properties)
            events_result = service.events().list(
                calendarId=calendar_id,
                privateExtendedProperty=f"dashboard_video_id={video['id']}",
                timeMin=f"{video['due_date']}T00:00:00Z",
                timeMax=f"{video['due_date']}T23:59:59Z",
                maxResults=1
            ).execute()
            
            existing = events_result.get('items', [])
            
            if existing:
                # Update existing event
                event_id = existing[0]['id']
                service.events().update(
                    calendarId=calendar_id,
                    eventId=event_id,
                    body={**event_body, 'extendedProperties': {
                        'private': {'dashboard_video_id': str(video['id'])}
                    }}
                ).execute()
            else:
                # Create new event
                service.events().insert(
                    calendarId=calendar_id,
                    body={**event_body, 'extendedProperties': {
                        'private': {'dashboard_video_id': str(video['id'])}
                    }}
                ).execute()
            
            synced += 1
            
        except HttpError as e:
            print(f"Error syncing video {video['id']}: {e}")
    
    conn.close()
    print(f"Synced {synced} video deadlines")
    return synced


def sync_sponsor_dates(service, calendar_id='primary', days_ahead=90):
    """Sync sponsor record/live dates to Google Calendar."""
    conn = get_db()
    
    sponsors = conn.execute(
        """SELECT id, brand_name, script_due, record_date, 
                  brand_approval_deadline, live_date, status, deliverables
           FROM sponsors
           WHERE status NOT IN ('paid')
           AND (script_due >= date('now') OR record_date >= date('now') 
                OR brand_approval_deadline >= date('now') OR live_date >= date('now'))"""
    ).fetchall()
    
    synced = 0
    for sponsor in sponsors:
        dates_to_sync = [
            ('script_due', '📝 Script Due', COLORS['script']),
            ('record_date', '🎥 Record', COLORS['record']),
            ('brand_approval_deadline', '⏳ Brand Approval', COLORS['approval']),
            ('live_date', '🔴 Go Live', COLORS['live']),
        ]
        
        for field, prefix, color in dates_to_sync:
            date_val = sponsor[field]
            if not date_val:
                continue
            
            # Skip if too far in future
            date_obj = datetime.strptime(date_val, '%Y-%m-%d')
            if date_obj > datetime.utcnow() + timedelta(days=days_ahead):
                continue
            
            event_body = {
                'summary': f"{prefix}: {sponsor['brand_name']}",
                'description': f"Status: {sponsor['status']}\nDeliverables: {sponsor['deliverables'] or 'None'}\n\nDashboard: http://localhost:5050/sponsors",
                'start': {'date': date_val},
                'end': {'date': date_val},
                'colorId': color,
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 4 * 60},  # 4 hours before
                    ]
                }
            }
            
            try:
                # Check for existing
                events_result = service.events().list(
                    calendarId=calendar_id,
                    privateExtendedProperty=f"dashboard_sponsor_id={sponsor['id']}_{field}",
                    timeMin=f"{date_val}T00:00:00Z",
                    timeMax=f"{date_val}T23:59:59Z",
                    maxResults=1
                ).execute()
                
                existing = events_result.get('items', [])
                
                if existing:
                    event_id = existing[0]['id']
                    service.events().update(
                        calendarId=calendar_id,
                        eventId=event_id,
                        body={**event_body, 'extendedProperties': {
                            'private': {'dashboard_sponsor_id': f"{sponsor['id']}_{field}"}
                        }}
                    ).execute()
                else:
                    service.events().insert(
                        calendarId=calendar_id,
                        body={**event_body, 'extendedProperties': {
                            'private': {'dashboard_sponsor_id': f"{sponsor['id']}_{field}"}
                        }}
                    ).execute()
                
                synced += 1
                
            except HttpError as e:
                print(f"Error syncing sponsor {sponsor['id']} {field}: {e}")
    
    conn.close()
    print(f"Synced {synced} sponsor dates")
    return synced


def clear_synced_events(service, calendar_id='primary'):
    """Remove all events created by dashboard sync."""
    try:
        # Get all events with dashboard properties
        page_token = None
        deleted = 0
        
        while True:
            events_result = service.events().list(
                calendarId=calendar_id,
                privateExtendedProperty="dashboard_video_id=* OR dashboard_sponsor_id=*",
                pageToken=page_token
            ).execute()
            
            for event in events_result.get('items', []):
                service.events().delete(
                    calendarId=calendar_id,
                    eventId=event['id']
                ).execute()
                deleted += 1
            
            page_token = events_result.get('nextPageToken')
            if not page_token:
                break
        
        print(f"Cleared {deleted} synced events")
        return deleted
        
    except HttpError as e:
        print(f"Error clearing events: {e}")
        return 0


def main():
    """Main entry point."""
    import argparse
    
    if not GOOGLE_API_AVAILABLE:
        print("Google API libraries not installed.")
        print("Run: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        return
    
    parser = argparse.ArgumentParser(description='Sync YouTube Dashboard to Google Calendar')
    parser.add_argument('--videos', action='store_true', help='Sync video deadlines')
    parser.add_argument('--sponsors', action='store_true', help='Sync sponsor dates')
    parser.add_argument('--all', action='store_true', help='Sync everything')
    parser.add_argument('--clear', action='store_true', help='Clear all synced events')
    parser.add_argument('--days', type=int, default=30, help='Days ahead to sync')
    parser.add_argument('--calendar', default='primary', help='Calendar ID')
    
    args = parser.parse_args()
    
    # Get credentials
    creds = get_credentials()
    if not creds:
        return
    
    # Build service
    service = build('calendar', 'v3', credentials=creds)
    
    if args.clear:
        clear_synced_events(service, args.calendar)
        return
    
    if args.all or args.videos:
        sync_video_deadlines(service, args.calendar, args.days)
    
    if args.all or args.sponsors:
        sync_sponsor_dates(service, args.calendar, args.days * 3)  # Look further ahead for sponsors
    
    if not any([args.all, args.videos, args.sponsors, args.clear]):
        parser.print_help()


if __name__ == '__main__':
    main()