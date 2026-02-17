"""Flask web app for the YouTube Content Pipeline tracker — SQLite backend."""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request

STAGES = ["idea", "pre-production", "filming", "post-production", "ready", "published"]
SPONSOR_STAGES = ["inquiry", "negotiation", "contract", "content", "delivered", "live", "paid"]
DB_PATH = Path(__file__).resolve().parent / "dashboard.db"

app = Flask(__name__)


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db:
        db.close()


# ── Pages ───────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/videos")
def videos_page():
    return render_template("videos.html", stages=STAGES)


@app.route("/sponsors")
def sponsors_page():
    return render_template("sponsors.html", stages=SPONSOR_STAGES)


@app.route("/crm-guide")
def crm_guide_page():
    return render_template("crm_guide.html")


# ── Videos API ──────────────────────────────────

@app.route("/api/videos", methods=["GET"])
def list_videos():
    rows = get_db().execute("SELECT * FROM videos ORDER BY id").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/videos", methods=["POST"])
def add_video():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()
    stage = str(payload.get("stage", "")).strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400
    if stage not in STAGES:
        return jsonify({"error": "Invalid stage."}), 400
    db = get_db()
    if db.execute("SELECT 1 FROM videos WHERE LOWER(title)=LOWER(?)", (title,)).fetchone():
        return jsonify({"error": "Video already exists."}), 409
    cur = db.execute("INSERT INTO videos (title, stage) VALUES (?, ?)", (title, stage))
    db.commit()
    row = db.execute("SELECT * FROM videos WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify({"status": "ok", "video": dict(row)}), 201


@app.route("/api/videos/<path:title>", methods=["PUT"])
def update_video(title: str):
    payload = request.get_json(silent=True) or {}
    stage = str(payload.get("stage", "")).strip()
    if stage not in STAGES:
        return jsonify({"error": "Invalid stage."}), 400
    db = get_db()
    row = db.execute("SELECT * FROM videos WHERE LOWER(title)=LOWER(?)", (title,)).fetchone()
    if not row:
        return jsonify({"error": "Video not found."}), 404
    db.execute("UPDATE videos SET stage=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (stage, row["id"]))
    db.commit()
    updated = db.execute("SELECT * FROM videos WHERE id=?", (row["id"],)).fetchone()
    return jsonify({"status": "ok", "video": dict(updated)})


@app.route("/api/videos/<path:title>", methods=["DELETE"])
def delete_video(title: str):
    db = get_db()
    row = db.execute("SELECT * FROM videos WHERE LOWER(title)=LOWER(?)", (title,)).fetchone()
    if not row:
        return jsonify({"error": "Video not found."}), 404
    db.execute("DELETE FROM videos WHERE id=?", (row["id"],))
    db.commit()
    return jsonify({"status": "ok"})


# ── YouTube Sync ────────────────────────────────

@app.route("/api/videos/sync", methods=["POST"])
def sync_youtube():
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        return jsonify({"error": "YOUTUBE_API_KEY not configured"}), 500

    try:
        from googleapiclient.discovery import build
        yt = build("youtube", "v3", developerKey=api_key)

        # Resolve channel ID for @Andrew_Fraser
        ch_resp = yt.search().list(part="snippet", q="@Andrew_Fraser", type="channel", maxResults=1).execute()
        items = ch_resp.get("items", [])
        if not items:
            return jsonify({"error": "Channel not found"}), 404
        channel_id = items[0]["snippet"]["channelId"]

        # Get uploads playlist
        ch_detail = yt.channels().list(part="contentDetails", id=channel_id).execute()
        uploads_id = ch_detail["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

        # Fetch recent videos
        pl_resp = yt.playlistItems().list(part="snippet,contentDetails", playlistId=uploads_id, maxResults=50).execute()

        db = get_db()
        imported = 0
        for item in pl_resp.get("items", []):
            snip = item["snippet"]
            vid_id = snip["resourceId"]["videoId"]
            title = snip["title"]
            pub_date = snip["publishedAt"][:10]

            exists = db.execute("SELECT 1 FROM videos WHERE youtube_video_id=?", (vid_id,)).fetchone()
            if exists:
                continue

            # Also check by title
            exists2 = db.execute("SELECT 1 FROM videos WHERE LOWER(title)=LOWER(?)", (title,)).fetchone()
            if exists2:
                db.execute("UPDATE videos SET youtube_video_id=?, publish_date=? WHERE LOWER(title)=LOWER(?)",
                           (vid_id, pub_date, title))
                db.commit()
                continue

            db.execute(
                "INSERT INTO videos (title, stage, youtube_video_id, publish_date) VALUES (?, 'published', ?, ?)",
                (title, vid_id, pub_date),
            )
            imported += 1

        # Fetch view counts for all synced videos
        all_vid_ids = [r["youtube_video_id"] for r in db.execute("SELECT youtube_video_id FROM videos WHERE youtube_video_id IS NOT NULL").fetchall()]
        for i in range(0, len(all_vid_ids), 50):
            batch = all_vid_ids[i:i+50]
            stats = yt.videos().list(part="statistics", id=",".join(batch)).execute()
            for sv in stats.get("items", []):
                views = int(sv["statistics"].get("viewCount", 0))
                db.execute("UPDATE videos SET views=? WHERE youtube_video_id=?", (views, sv["id"]))

        db.commit()
        return jsonify({"status": "ok", "imported": imported})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Sponsors API ────────────────────────────────

@app.route("/api/sponsors", methods=["GET"])
def list_sponsors():
    rows = get_db().execute("SELECT * FROM sponsors ORDER BY id").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/sponsors", methods=["POST"])
def add_sponsor():
    p = request.get_json(silent=True) or {}
    brand = str(p.get("brand_name", "")).strip()
    status = str(p.get("status", "inquiry")).strip()
    if not brand:
        return jsonify({"error": "brand_name is required."}), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO sponsors (brand_name, contact_email, deal_value, status, inquiry_date, payment_due_date, notes) VALUES (?,?,?,?,?,?,?)",
        (brand, p.get("contact_email"), p.get("deal_value"), status, p.get("inquiry_date"), p.get("payment_due_date"), p.get("notes")),
    )
    db.commit()
    row = db.execute("SELECT * FROM sponsors WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify({"status": "ok", "sponsor": dict(row)}), 201


@app.route("/api/sponsors/<int:sponsor_id>", methods=["PUT"])
def update_sponsor(sponsor_id: int):
    p = request.get_json(silent=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM sponsors WHERE id=?", (sponsor_id,)).fetchone()
    if not row:
        return jsonify({"error": "Sponsor not found."}), 404

    # Update only provided fields
    fields = {}
    for col in ["brand_name", "contact_email", "deal_value", "deal_type", "status", "payment_due_date", "notes",
                 "contact_name", "content_phase", "script_due", "brand_approval_deadline", "live_date",
                 "next_action", "next_action_due", "deliverables", "last_contact_date"]:
        if col in p:
            fields[col] = p[col]

    if not fields:
        return jsonify({"error": "No fields to update."}), 400

    set_clause = ", ".join(f"{k}=?" for k in fields)
    vals = list(fields.values()) + [sponsor_id]
    db.execute(f"UPDATE sponsors SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE id=?", vals)
    db.commit()
    updated = db.execute("SELECT * FROM sponsors WHERE id=?", (sponsor_id,)).fetchone()
    return jsonify({"status": "ok", "sponsor": dict(updated)})


# ── Stats & Deadlines API ───────────────────────

@app.route("/api/stats", methods=["GET"])
def get_stats():
    db = get_db()
    total_videos = db.execute("SELECT COUNT(*) FROM videos").fetchone()[0]
    published = db.execute("SELECT COUNT(*) FROM videos WHERE stage='published'").fetchone()[0]
    active_sponsors = db.execute("SELECT COUNT(*) FROM sponsors WHERE status NOT IN ('paid')").fetchone()[0]
    total_sponsors = db.execute("SELECT COUNT(*) FROM sponsors").fetchone()[0]
    pipeline_value = db.execute(
        "SELECT COALESCE(SUM(deal_value),0) FROM sponsors WHERE status IN ('inquiry','negotiation','contract','content','delivered')"
    ).fetchone()[0]
    live_deals = db.execute("SELECT COUNT(*) FROM sponsors WHERE status='live'").fetchone()[0]
    paid_deals = db.execute("SELECT COUNT(*) FROM sponsors WHERE status='paid'").fetchone()[0]

    video_stages = dict(db.execute("SELECT stage, COUNT(*) FROM videos GROUP BY stage").fetchall())
    sponsor_stages = dict(db.execute("SELECT status, COUNT(*) FROM sponsors GROUP BY status").fetchall())

    return jsonify({
        "total_videos": total_videos,
        "published": published,
        "active_sponsors": active_sponsors,
        "total_sponsors": total_sponsors,
        "pipeline_value": pipeline_value,
        "live_deals": live_deals,
        "paid_deals": paid_deals,
        "video_stages": video_stages,
        "sponsor_stages": sponsor_stages,
    })


@app.route("/api/deadlines", methods=["GET"])
def get_deadlines():
    db = get_db()
    rows = db.execute("""
        SELECT id, brand_name, deal_value, status, script_due, record_date, brand_approval_deadline
        FROM sponsors
        WHERE script_due BETWEEN date('now') AND date('now', '+14 days')
           OR record_date BETWEEN date('now') AND date('now', '+14 days')
           OR brand_approval_deadline BETWEEN date('now') AND date('now', '+14 days')
        ORDER BY COALESCE(script_due, record_date, brand_approval_deadline)
    """).fetchall()
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
