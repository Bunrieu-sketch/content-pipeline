"""YouTube Content & Sponsorship Dashboard – Flask App."""
from __future__ import annotations

import json
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request, redirect, url_for

from models import (
    get_db, init_db, git_sync, log_activity,
    get_upcoming_deadlines, get_calendar_events,
    VIDEO_STAGES, VIDEO_STAGE_LABELS,
    SPONSOR_STAGES, SPONSOR_STAGE_LABELS, SPONSOR_NEXT_STAGE,
    CONTENT_PHASES, CONTENT_PHASE_LABELS,
    INVOICE_STATUSES,
)

app = Flask(__name__)
app.secret_key = "andrew-fraser-dashboard-2025"

# ── Initialize DB on first import ───────────────────────────────────
init_db()


# ═══════════════════════════════════════════════════════════════════
#  PAGE ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.route("/")
def dashboard():
    conn = get_db()
    videos = conn.execute("SELECT * FROM videos ORDER BY sort_order, id").fetchall()
    sponsors = conn.execute("SELECT * FROM sponsors ORDER BY id DESC").fetchall()
    recent = conn.execute("SELECT * FROM activity_log ORDER BY id DESC LIMIT 20").fetchall()
    conn.close()

    # Stats
    video_counts = {}
    for s in VIDEO_STAGES:
        video_counts[s] = sum(1 for v in videos if v["stage"] == s)

    active_sponsors = [s for s in sponsors if s["status"] not in ("live", "paid")]
    total_pipeline_value = sum(s["deal_value"] or 0 for s in active_sponsors)

    deadlines = get_upcoming_deadlines(14)
    
    # Sponsor counts by stage
    sponsor_counts = {}
    for s in SPONSOR_STAGES:
        sponsor_counts[s] = sum(1 for sp in sponsors if sp["status"] == s)

    return render_template(
        "dashboard.html",
        videos=videos,
        sponsors=sponsors,
        recent=recent,
        video_counts=video_counts,
        active_sponsors=active_sponsors,
        total_pipeline_value=total_pipeline_value,
        deadlines=deadlines,
        video_stages=VIDEO_STAGES,
        sponsor_stages=SPONSOR_STAGES,
        stage_labels=VIDEO_STAGE_LABELS,
        sponsor_labels=SPONSOR_STAGE_LABELS,
        sponsor_counts=sponsor_counts,
    )


@app.route("/videos")
def videos_page():
    conn = get_db()
    videos = conn.execute("SELECT v.*, s.brand_name FROM videos v LEFT JOIN sponsors s ON v.sponsor_id = s.id ORDER BY v.sort_order, v.id").fetchall()
    sponsors = conn.execute("SELECT id, brand_name FROM sponsors ORDER BY brand_name").fetchall()
    conn.close()
    
    # Group videos by stage
    videos_by_stage = {stage: [] for stage in VIDEO_STAGES}
    for v in videos:
        videos_by_stage[v["stage"]].append(v)
    
    today = datetime.utcnow().strftime("%Y-%m-%d")
    week_from_now = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    return render_template(
        "videos.html",
        videos=videos,
        videos_by_stage=videos_by_stage,
        sponsors=sponsors,
        stages=VIDEO_STAGES,
        stage_labels=VIDEO_STAGE_LABELS,
        today=today,
        week_from_now=week_from_now,
    )


@app.route("/sponsors")
def sponsors_page():
    conn = get_db()
    sponsors = conn.execute("SELECT * FROM sponsors ORDER BY id DESC").fetchall()
    conn.close()

    # Group sponsors by stage
    sponsors_by_stage = {stage: [] for stage in SPONSOR_STAGES}
    for s in sponsors:
        sponsors_by_stage[s["status"]].append(s)

    # Calculate pipeline value (active deals only)
    active_statuses = ["inquiry", "negotiation", "contract", "content", "delivered"]
    total_pipeline_value = sum(s["deal_value"] or 0 for s in sponsors if s["status"] in active_statuses)

    # Sponsor counts
    sponsor_counts = {}
    for s in SPONSOR_STAGES:
        sponsor_counts[s] = sum(1 for sp in sponsors if sp["status"] == s)

    today = datetime.utcnow().strftime("%Y-%m-%d")
    three_days = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")

    return render_template(
        "sponsors.html",
        sponsors=sponsors,
        sponsors_by_stage=sponsors_by_stage,
        stages=SPONSOR_STAGES,
        stage_labels=SPONSOR_STAGE_LABELS,
        content_phase_labels=CONTENT_PHASE_LABELS,
        next_stage=SPONSOR_NEXT_STAGE,
        total_pipeline_value=total_pipeline_value,
        sponsor_counts=sponsor_counts,
        today=today,
        three_days=three_days,
    )


@app.route("/calendar")
def calendar_page():
    from collections import defaultdict
    from datetime import datetime
    
    events = get_calendar_events()
    events_by_date = defaultdict(list)
    weekdays = {}
    
    for event in events:
        date = event["date"]
        events_by_date[date].append(event)
        if date not in weekdays:
            dt = datetime.strptime(date, "%Y-%m-%d")
            weekdays[date] = dt.strftime("%A")
    
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    return render_template(
        "calendar.html",
        events_by_date=dict(events_by_date),
        weekdays=weekdays,
        today=today,
        datetime=datetime,
    )


@app.route("/sponsors/<int:sid>/edit")
def edit_sponsor_page(sid):
    conn = get_db()
    sponsor = conn.execute("SELECT * FROM sponsors WHERE id = ?", (sid,)).fetchone()
    conn.close()
    
    if not sponsor:
        return "Sponsor not found", 404
    
    return render_template(
        "edit_sponsor.html",
        sponsor=sponsor,
        stages=SPONSOR_STAGES,
        stage_labels=SPONSOR_STAGE_LABELS,
        content_phases=CONTENT_PHASES,
        content_phase_labels=CONTENT_PHASE_LABELS,
    )


# ═══════════════════════════════════════════════════════════════════
#  VIDEO API
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/videos", methods=["GET"])
def api_list_videos():
    conn = get_db()
    rows = conn.execute("SELECT v.*, s.brand_name FROM videos v LEFT JOIN sponsors s ON v.sponsor_id = s.id ORDER BY v.sort_order, v.id").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/videos", methods=["POST"])
def api_create_video():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title required"}), 400

    stage = data.get("stage", "idea")
    if stage not in VIDEO_STAGES:
        stage = "idea"

    due_date = data.get("due_date") or None
    notes = data.get("notes", "")
    sponsor_id = data.get("sponsor_id") or None

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO videos (title, stage, due_date, notes, sponsor_id) VALUES (?, ?, ?, ?, ?)",
        (title, stage, due_date, notes, sponsor_id),
    )
    vid = cur.lastrowid
    log_activity(conn, "video", vid, "created", f"Title: {title}")
    conn.commit()
    conn.close()

    git_sync(f"Add video: {title}")
    return jsonify({"id": vid, "status": "ok"}), 201


@app.route("/api/videos/<int:vid>", methods=["PUT"])
def api_update_video(vid):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    row = conn.execute("SELECT * FROM videos WHERE id = ?", (vid,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    fields = []
    values = []
    for col in ("title", "stage", "due_date", "notes", "sponsor_id", "sort_order"):
        if col in data:
            fields.append(f"{col} = ?")
            values.append(data[col] if data[col] != "" else None)

    if fields:
        fields.append("updated_at = datetime('now')")
        values.append(vid)
        conn.execute(f"UPDATE videos SET {', '.join(fields)} WHERE id = ?", values)
        log_activity(conn, "video", vid, "updated", json.dumps(data))
        conn.commit()

    conn.close()
    git_sync(f"Update video #{vid}")
    return jsonify({"status": "ok"})


@app.route("/api/videos/<int:vid>", methods=["DELETE"])
def api_delete_video(vid):
    conn = get_db()
    conn.execute("DELETE FROM videos WHERE id = ?", (vid,))
    log_activity(conn, "video", vid, "deleted", "")
    conn.commit()
    conn.close()
    git_sync(f"Delete video #{vid}")
    return jsonify({"status": "ok"})


# ═══════════════════════════════════════════════════════════════════
#  SPONSOR API
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/sponsors", methods=["GET"])
def api_list_sponsors():
    conn = get_db()
    rows = conn.execute("SELECT * FROM sponsors ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/sponsors", methods=["POST"])
def api_create_sponsor():
    data = request.get_json(silent=True) or {}
    brand = (data.get("brand_name") or "").strip()
    if not brand:
        return jsonify({"error": "Brand name required"}), 400

    conn = get_db()
    cur = conn.execute(
        """INSERT INTO sponsors (brand_name, deal_value, deal_type, status, script_due,
           record_date, brand_approval_deadline, live_date, notes, contact_name, contact_email,
           deliverables, next_action, next_action_due)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            brand,
            data.get("deal_value", 0),
            data.get("deal_type", "flat_rate"),
            "inquiry",
            data.get("script_due"),
            data.get("record_date"),
            data.get("brand_approval_deadline"),
            data.get("live_date"),
            data.get("notes", ""),
            data.get("contact_name", ""),
            data.get("contact_email", ""),
            data.get("deliverables", ""),
            data.get("next_action", ""),
            data.get("next_action_due"),
        ),
    )
    sid = cur.lastrowid
    log_activity(conn, "sponsor", sid, "created", f"Brand: {brand}")
    conn.commit()
    conn.close()

    git_sync(f"Add sponsor: {brand}")
    return jsonify({"id": sid, "status": "ok"}), 201


@app.route("/api/sponsors/<int:sid>", methods=["PUT"])
def api_update_sponsor(sid):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    row = conn.execute("SELECT * FROM sponsors WHERE id = ?", (sid,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    fields = []
    values = []
    allowed = (
        "brand_name", "deal_value", "deal_type", "status",
        "script_due", "record_date", "brand_approval_deadline", "live_date",
        "invoice_status", "invoice_amount", "views_at_30_days",
        "notes", "contact_name", "contact_email",
        "brief", "brief_due", "contract_link", "brief_link", "script_link",
        "last_contact_date", "next_action", "next_action_due", "deliverables",
        "content_phase", "payment_terms_days", "invoice_generated_date",
        "payment_due_date", "payment_received_date", "youtube_video_id", "youtube_video_title",
    )
    for col in allowed:
        if col in data:
            fields.append(f"{col} = ?")
            values.append(data[col] if data[col] != "" else None)

    if fields:
        fields.append("updated_at = datetime('now')")
        values.append(sid)
        conn.execute(f"UPDATE sponsors SET {', '.join(fields)} WHERE id = ?", values)
        log_activity(conn, "sponsor", sid, "updated", json.dumps(data))
        conn.commit()

    conn.close()
    git_sync(f"Update sponsor #{sid}")
    return jsonify({"status": "ok"})


@app.route("/api/sponsors/<int:sid>/advance", methods=["POST"])
def api_advance_sponsor(sid):
    """Move sponsor to the next workflow stage."""
    conn = get_db()
    row = conn.execute("SELECT * FROM sponsors WHERE id = ?", (sid,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    current = row["status"]
    next_stage = SPONSOR_NEXT_STAGE.get(current)
    if not next_stage:
        conn.close()
        return jsonify({"error": "Already at final stage"}), 400

    # Handle invoice logic when going live
    updates = {"status": next_stage}
    if next_stage == "live":
        if row["deal_type"] == "flat_rate":
            updates["invoice_status"] = "not_due"
            updates["invoice_amount"] = row["deal_value"]

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    vals = list(updates.values()) + [sid]
    conn.execute(f"UPDATE sponsors SET {set_clause}, updated_at = datetime('now') WHERE id = ?", vals)
    log_activity(conn, "sponsor", sid, "advanced", f"{current} → {next_stage}")
    conn.commit()
    conn.close()

    git_sync(f"Advance sponsor #{sid}: {current} → {next_stage}")
    return jsonify({"status": "ok", "new_stage": next_stage})


@app.route("/api/sponsors/<int:sid>", methods=["DELETE"])
def api_delete_sponsor(sid):
    conn = get_db()
    conn.execute("DELETE FROM sponsors WHERE id = ?", (sid,))
    log_activity(conn, "sponsor", sid, "deleted", "")
    conn.commit()
    conn.close()
    git_sync(f"Delete sponsor #{sid}")
    return jsonify({"status": "ok"})


# ═══════════════════════════════════════════════════════════════════
#  ACTIVITY / DEADLINES API
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/deadlines")
def api_deadlines():
    days = request.args.get("days", 14, type=int)
    return jsonify(get_upcoming_deadlines(days))


@app.route("/api/calendar")
def api_calendar():
    return jsonify(get_calendar_events())


# ═══════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
