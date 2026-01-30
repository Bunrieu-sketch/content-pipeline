"""Flask web app for the YouTube Content Pipeline tracker."""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, TypedDict

from flask import Flask, jsonify, render_template, request


STAGES = ["idea", "pre-production", "post-production", "published"]
DATA_FILE = Path(__file__).resolve().parent / "content-pipeline.json"


class VideoEntry(TypedDict):
    title: str
    stage: str


def load_data(path: Path) -> List[VideoEntry]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    entries: List[VideoEntry] = []
    for item in data:
        if (
            isinstance(item, dict)
            and isinstance(item.get("title"), str)
            and isinstance(item.get("stage"), str)
        ):
            entries.append({"title": item["title"], "stage": item["stage"]})
    return entries


def save_data(path: Path, entries: List[VideoEntry]) -> None:
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=True), encoding="utf-8")


def normalize_title(title: str) -> str:
    return title.strip().lower()


def find_entry(entries: List[VideoEntry], title: str) -> VideoEntry | None:
    normalized = normalize_title(title)
    for entry in entries:
        if normalize_title(entry["title"]) == normalized:
            return entry
    return None


app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", stages=STAGES)


@app.route("/api/videos", methods=["GET"])
def list_videos():
    entries = load_data(DATA_FILE)
    return jsonify(entries)


@app.route("/api/videos", methods=["POST"])
def add_video():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()
    stage = str(payload.get("stage", "")).strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400
    if stage not in STAGES:
        return jsonify({"error": "Invalid stage."}), 400
    entries = load_data(DATA_FILE)
    if find_entry(entries, title):
        return jsonify({"error": "Video already exists."}), 409
    entries.append({"title": title, "stage": stage})
    save_data(DATA_FILE, entries)
    return jsonify({"status": "ok", "video": {"title": title, "stage": stage}}), 201


@app.route("/api/videos/<path:title>", methods=["PUT"])
def update_video(title: str):
    payload = request.get_json(silent=True) or {}
    stage = str(payload.get("stage", "")).strip()
    if stage not in STAGES:
        return jsonify({"error": "Invalid stage."}), 400
    entries = load_data(DATA_FILE)
    entry = find_entry(entries, title)
    if not entry:
        return jsonify({"error": "Video not found."}), 404
    entry["stage"] = stage
    save_data(DATA_FILE, entries)
    return jsonify({"status": "ok", "video": entry})


@app.route("/api/videos/<path:title>", methods=["DELETE"])
def delete_video(title: str):
    entries = load_data(DATA_FILE)
    entry = find_entry(entries, title)
    if not entry:
        return jsonify({"error": "Video not found."}), 404
    entries = [e for e in entries if normalize_title(e["title"]) != normalize_title(title)]
    save_data(DATA_FILE, entries)
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
