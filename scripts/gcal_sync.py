#!/usr/bin/env python3
"""
Google Calendar Sync for Content Pipeline

Syncs video deadlines and sponsor dates to Google Calendar.
Handles duplicate detection and cleanup.
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configuration
SCOPES = ['https://www.googleapis.com/auth/calendar']
SERVICE_ACCOUNT_FILE = Path(__file__).resolve().parent.parent / 'service_account.json'
CALENDAR_NAME = 'YouTube Production'
DB_PATH = Path(__file__).resolve().parent.parent / 'dashboard.db'

# Color IDs for Google Calendar
COLORS = {
    'video_due': '9',      # Blue - video deadlines
    'sponsor_script': '5', # Yellow - script due
    'sponsor_record': '2', # Green - record date
    'sponsor_live': '11',  # Red - go live
    'sponsor_general': '3' # Purple - other sponsor dates
}


def get_calendar_service():
    """Authenticate and return calendar service."""
    if not SERVICE_ACCOUNT_FILE.exists():
        print(f"Error: Service account file not found at {SERVICE_ACCOUNT_FILE}")
        sys.exit(1)
    
    credentials = service_account.Credentials.from_service_account_file(
        str(SERVICE_ACCOUNT_FILE), scopes=SCOPES)
    return build('calendar', 'v3', credentials=credentials)


def get_or_create_calendar(service):
    """Get the YouTube Production calendar or create it if it doesn't exist."""
    # List existing calendars
    calendars = service.calendarList().list().execute()
    
    for cal in calendars.get('items', []):
        if cal['summary'] == CALENDAR_NAME:
            print(f"Found existing calendar: {cal['id']}")
            return cal['id']
    
    # Create new calendar
    calendar = {
        'summary': CALENDAR_NAME,
        'description': 'YouTube video deadlines and sponsor integration dates',
        'timeZone': 'Asia/Saigon'
    }
    created = service.calendars().insert(body=calendar).execute()
    print(f"Created new calendar: {created['id']}")
    return created['id']


def get_events(service, calendar_id, days_back=7, days_forward=90):
    """Get all events in the specified date range."""
    now = datetime.now(timezone.utc)
    time_min = (now - timedelta(days=days_back)).strftime('%Y-%m-%dT%H:%M:%SZ')
    time_max = (now + timedelta(days=days_forward)).strftime('%Y-%m-%dT%H:%M:%SZ')
    
    events = []
    page_token = None
    
    while True:
        response = service.events().list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            pageToken=page_token
        ).execute()
        
        events.extend(response.get('items', []))
        page_token = response.get('nextPageToken')
        
        if not page_token:
            break
    
    return events


def find_duplicates(events):
    """Find duplicate events based on summary and start time."""
    seen = {}
    duplicates = []
    
    for event in events:
        # Create a key from summary + start time
        summary = event.get('summary', '')
        start = event.get('start', {})
        
        # Handle all-day vs datetime events
        if 'date' in start:
            start_key = start['date']
        elif 'dateTime' in start:
            start_key = start['dateTime'][:10]  # Just the date part
        else:
            continue
        
        key = f"{summary}|{start_key}"
        
        if key in seen:
            duplicates.append(event)
        else:
            seen[key] = event
    
    return duplicates


def delete_event(service, calendar_id, event_id):
    """Delete a specific event."""
    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return True
    except HttpError as e:
        print(f"Error deleting event {event_id}: {e}")
        return False


def delete_duplicates(service, calendar_id, dry_run=False):
    """Find and delete duplicate events."""
    print("\n=== Checking for Duplicates ===")
    events = get_events(service, calendar_id)
    print(f"Total events: {len(events)}")
    
    duplicates = find_duplicates(events)
    print(f"Found {len(duplicates)} duplicate(s)")
    
    if not duplicates:
        print("No duplicates found!")
        return 0
    
    if dry_run:
        print("\n[DRY RUN] Would delete these duplicates:")
        for dup in duplicates:
            print(f"  - {dup.get('summary')} ({dup.get('start', {}).get('date', dup.get('start', {}).get('dateTime', 'unknown'))})")
        return len(duplicates)
    
    deleted = 0
    for dup in duplicates:
        event_id = dup['id']
        summary = dup.get('summary', 'Unknown')
        print(f"Deleting: {summary}")
        if delete_event(service, calendar_id, event_id):
            deleted += 1
    
    print(f"\nDeleted {deleted} duplicate(s)")
    return deleted


def create_event(service, calendar_id, summary, description, date, color_id='1', 
                 all_day=True, start_time=None, end_time=None):
    """Create a calendar event."""
    
    if all_day:
        event_body = {
            'summary': summary,
            'description': description,
            'start': {'date': date},
            'end': {'date': date},
            'colorId': color_id,
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 1440},  # 1 day before
                    {'method': 'popup', 'minutes': 60}      # 1 hour before
                ]
            }
        }
    else:
        event_body = {
            'summary': summary,
            'description': description,
            'start': {'dateTime': start_time, 'timeZone': 'Asia/Saigon'},
            'end': {'dateTime': end_time, 'timeZone': 'Asia/Saigon'},
            'colorId': color_id,
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 30}
                ]
            }
        }
    
    try:
        event = service.events().insert(calendarId=calendar_id, body=event_body).execute()
        print(f"  Created: {summary}")
        return event
    except HttpError as e:
        print(f"  Error creating event '{summary}': {e}")
        return None


def sync_videos(service, calendar_id, days=30):
    """Sync video deadlines to calendar."""
    print("\n=== Syncing Videos ===")
    
    # Load videos from JSON
    json_path = Path(__file__).resolve().parent.parent / 'content-pipeline.json'
    if not json_path.exists():
        print("No content-pipeline.json found, skipping video sync")
        return 0
    
    try:
        with open(json_path) as f:
            videos = json.load(f)
    except json.JSONDecodeError:
        print("Error reading content-pipeline.json")
        return 0
    
    # Get existing events to avoid duplicates
    existing = get_events(service, calendar_id)
    existing_keys = set()
    for e in existing:
        summary = e.get('summary', '')
        start = e.get('start', {})
        if 'date' in start:
            existing_keys.add(f"{summary}|{start['date']}")
    
    created = 0
    for video in videos:
        title = video.get('title', '')
        stage = video.get('stage', '')
        
        # Skip published videos
        if stage == 'published':
            continue
        
        # Check for deadline fields (if they exist in the data)
        deadline = video.get('deadline') or video.get('due_date')
        if not deadline:
            # Create a placeholder event for active videos without deadlines
            continue
        
        event_key = f"🎬 {title}|{deadline}"
        if event_key in existing_keys:
            print(f"  Skipping (exists): {title}")
            continue
        
        description = f"Stage: {stage}\n"
        if video.get('notes'):
            description += f"Notes: {video['notes']}"
        
        if create_event(service, calendar_id, f"🎬 {title}", description, 
                       deadline, COLORS['video_due']):
            created += 1
    
    print(f"Created {created} video event(s)")
    return created


def sync_sponsors(service, calendar_id, days=90):
    """Sync sponsor dates to calendar."""
    print("\n=== Syncing Sponsors ===")
    
    if not DB_PATH.exists():
        print("No database found, skipping sponsor sync")
        return 0
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Check if sponsors table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sponsors'")
    if not cursor.fetchone():
        print("No sponsors table found, skipping sponsor sync")
        conn.close()
        return 0
    
    # Get sponsors with dates
    cursor.execute("""
        SELECT brand_name, status, script_due, record_date, 
               brand_approval_deadline, live_date, next_action, next_action_due,
               deal_value, deliverables
        FROM sponsors 
        WHERE status NOT IN ('paid', 'dead')
    """)
    sponsors = cursor.fetchall()
    conn.close()
    
    # Get existing events to avoid duplicates
    existing = get_events(service, calendar_id, days_forward=days)
    existing_keys = set()
    for e in existing:
        summary = e.get('summary', '')
        start = e.get('start', {})
        if 'date' in start:
            existing_keys.add(f"{summary}|{start['date']}")
    
    created = 0
    for sponsor in sponsors:
        brand = sponsor['brand_name']
        status = sponsor['status']
        
        # Create events for each date field
        date_fields = [
            (sponsor['script_due'], '✍️ Script Due', COLORS['sponsor_script']),
            (sponsor['record_date'], '🎥 Record', COLORS['sponsor_record']),
            (sponsor['brand_approval_deadline'], '👀 Brand Approval', COLORS['sponsor_general']),
            (sponsor['live_date'], '🔴 Go Live', COLORS['sponsor_live']),
            (sponsor['next_action_due'], f'📋 Action: {sponsor["next_action"]}', COLORS['sponsor_general'])
        ]
        
        for date_val, prefix, color in date_fields:
            if not date_val:
                continue
            
            summary = f"{prefix} - {brand}"
            event_key = f"{summary}|{date_val}"
            
            if event_key in existing_keys:
                print(f"  Skipping (exists): {summary}")
                continue
            
            description = f"Status: {status}\n"
            if sponsor['deal_value']:
                description += f"Value: ${sponsor['deal_value']:,}\n"
            if sponsor['deliverables']:
                description += f"Deliverables: {sponsor['deliverables']}"
            
            if create_event(service, calendar_id, summary, description, 
                           date_val, color):
                created += 1
    
    print(f"Created {created} sponsor event(s)")
    return created


def list_events(service, calendar_id, days=30):
    """List all upcoming events."""
    print(f"\n=== Upcoming Events (Next {days} Days) ===")
    events = get_events(service, calendar_id, days_forward=days)
    
    if not events:
        print("No events found.")
        return
    
    # Sort by date
    sorted_events = sorted(events, key=lambda e: e.get('start', {}).get('date', '') or e.get('start', {}).get('dateTime', ''))
    
    for event in sorted_events:
        summary = event.get('summary', 'No title')
        start = event.get('start', {})
        if 'date' in start:
            date_str = start['date']
        else:
            date_str = start.get('dateTime', 'unknown')[:10]
        print(f"  {date_str} - {summary}")
    
    print(f"\nTotal: {len(events)} events")


def main():
    parser = argparse.ArgumentParser(description='Sync content pipeline to Google Calendar')
    parser.add_argument('--duplicates', action='store_true', help='Find and delete duplicate events')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--videos', action='store_true', help='Sync video deadlines')
    parser.add_argument('--sponsors', action='store_true', help='Sync sponsor dates')
    parser.add_argument('--all', action='store_true', help='Sync everything and clean duplicates')
    parser.add_argument('--list', action='store_true', help='List upcoming events')
    parser.add_argument('--days', type=int, default=30, help='Number of days to sync (default: 30)')
    parser.add_argument('--sponsor-days', type=int, default=90, help='Number of days for sponsor sync (default: 90)')
    
    args = parser.parse_args()
    
    # Default action if nothing specified
    if not any([args.duplicates, args.videos, args.sponsors, args.all, args.list]):
        args.all = True
    
    print("🦉 Google Calendar Sync")
    print("=" * 50)
    
    # Connect to Google Calendar
    service = get_calendar_service()
    calendar_id = get_or_create_calendar(service)
    
    if args.list:
        list_events(service, calendar_id, args.days)
        return
    
    # Clean duplicates first (always do this unless just listing)
    if args.duplicates or args.all:
        delete_duplicates(service, calendar_id, args.dry_run)
    
    # Sync videos
    if args.videos or args.all:
        if not args.dry_run:
            sync_videos(service, calendar_id, args.days)
        else:
            print("\n[DRY RUN] Would sync videos")
    
    # Sync sponsors
    if args.sponsors or args.all:
        if not args.dry_run:
            sync_sponsors(service, calendar_id, args.sponsor_days)
        else:
            print("\n[DRY RUN] Would sync sponsors")
    
    print("\n✅ Sync complete!")


if __name__ == '__main__':
    main()
