#!/usr/bin/env python3
"""Google Calendar sync for YouTube Dashboard using Service Account."""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Google Calendar API imports
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print("Google API libraries not installed. Run: pip install google-auth google-api-python-client")

# Constants
DB_PATH = Path(__file__).resolve().parent.parent / "dashboard.db"
SCOPES = ['https://www.googleapis.com/auth/calendar']
SERVICE_ACCOUNT_FILE = Path(__file__).resolve().parent.parent / "service_account.json"

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


def get_calendar_service():
    """Get Google Calendar service using service account."""
    if not SERVICE_ACCOUNT_FILE.exists():
        print(f"ERROR: {SERVICE_ACCOUNT_FILE} not found!")
        return None
    
    try:
        credentials = service_account.Credentials.from_service_account_file(
            str(SERVICE_ACCOUNT_FILE),
            scopes=SCOPES
        )
        service = build('calendar', 'v3', credentials=credentials)
        return service
    except Exception as e:
        print(f"Error loading service account: {e}")
        return None


def get_or_create_calendar(service, calendar_name="YouTube Production"):
    """Get or create the production calendar."""
    try:
        # List existing calendars
        calendars_result = service.calendarList().list().execute()
        calendars = calendars_result.get('items', [])
        
        for cal in calendars:
            if cal.get('summary') == calendar_name:
                print(f"Found existing calendar: {calendar_name} (ID: {cal['id']})")
                return cal['id']
        
        # Create new calendar
        calendar = {
            'summary': calendar_name,
            'description': 'YouTube video deadlines and sponsor integration dates',
            'timeZone': 'Asia/Ho_Chi_Minh'
        }
        
        created_calendar = service.calendars().insert(body=calendar).execute()
        print(f"Created new calendar: {calendar_name} (ID: {created_calendar['id']})")
        return created_calendar['id']
        
    except HttpError as e:
        print(f"Error with calendar: {e}")
        return None


def sync_video_deadlines(service, calendar_id, days_ahead=30):
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
                    {'method': 'email', 'minutes': 24 * 60},
                    {'method': 'popup', 'minutes': 60},
                ]
            }
        }
        
        try:
            # Check if event exists
            events_result = service.events().list(
                calendarId=calendar_id,
                privateExtendedProperty=f"dashboard_video_id={video['id']}",
                timeMin=f"{video['due_date']}T00:00:00Z",
                timeMax=f"{video['due_date']}T23:59:59Z",
                maxResults=1
            ).execute()
            
            existing = events_result.get('items', [])
            
            if existing:
                event_id = existing[0]['id']
                service.events().update(
                    calendarId=calendar_id,
                    eventId=event_id,
                    body={**event_body, 'extendedProperties': {
                        'private': {'dashboard_video_id': str(video['id'])}
                    }}
                ).execute()
            else:
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


def sync_sponsor_dates(service, calendar_id, days_ahead=90):
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
                        {'method': 'popup', 'minutes': 4 * 60},
                    ]
                }
            }
            
            try:
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


def main():
    """Main entry point."""
    import argparse
    
    if not GOOGLE_API_AVAILABLE:
        print("Google API libraries not installed.")
        print("Run: pip install google-auth google-api-python-client")
        return
    
    parser = argparse.ArgumentParser(description='Sync YouTube Dashboard to Google Calendar')
    parser.add_argument('--videos', action='store_true', help='Sync video deadlines')
    parser.add_argument('--sponsors', action='store_true', help='Sync sponsor dates')
    parser.add_argument('--all', action='store_true', help='Sync everything')
    parser.add_argument('--days', type=int, default=30, help='Days ahead to sync')
    parser.add_argument('--calendar', default='YouTube Production', help='Calendar name')
    
    args = parser.parse_args()
    
    service = get_calendar_service()
    if not service:
        return
    
    calendar_id = get_or_create_calendar(service, args.calendar)
    if not calendar_id:
        return
    
    print(f"\nSyncing to calendar: {args.calendar}\n")
    
    if args.all or args.videos:
        sync_video_deadlines(service, calendar_id, args.days)
    
    if args.all or args.sponsors:
        sync_sponsor_dates(service, calendar_id, args.days * 3)
    
    if not any([args.all, args.videos, args.sponsors]):
        parser.print_help()


if __name__ == '__main__':
    main()