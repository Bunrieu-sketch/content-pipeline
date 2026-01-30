"""YouTube Content Pipeline Tracker CLI."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, TypedDict

from tabulate import tabulate


STAGES = ["idea", "pre-production", "post-production", "published"]
DEFAULT_FILE = "content-pipeline.json"


class VideoEntry(TypedDict):
    title: str
    stage: str


def load_data(path: Path) -> List[VideoEntry]:
    """Load video entries from a JSON file."""
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
    """Persist video entries to a JSON file."""
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=True), encoding="utf-8")


def normalize_title(title: str) -> str:
    """Normalize a title for comparisons."""
    return title.strip().lower()


def add_video(entries: List[VideoEntry], title: str, stage: str) -> List[VideoEntry]:
    """Add a video entry."""
    normalized = normalize_title(title)
    for entry in entries:
        if normalize_title(entry["title"]) == normalized:
            raise ValueError(f"Video already exists: {title}")
    entries.append({"title": title.strip(), "stage": stage})
    return entries


def move_video(entries: List[VideoEntry], title: str, stage: str) -> List[VideoEntry]:
    """Move a video to a new stage."""
    normalized = normalize_title(title)
    for entry in entries:
        if normalize_title(entry["title"]) == normalized:
            entry["stage"] = stage
            return entries
    raise ValueError(f"Video not found: {title}")


def delete_video(entries: List[VideoEntry], title: str) -> List[VideoEntry]:
    """Delete a video entry."""
    normalized = normalize_title(title)
    new_entries = [e for e in entries if normalize_title(e["title"]) != normalized]
    if len(new_entries) == len(entries):
        raise ValueError(f"Video not found: {title}")
    return new_entries


def list_videos(entries: List[VideoEntry], fmt: str) -> None:
    """Print all videos in the requested format."""
    if not entries:
        print("No videos found.")
        return
    sorted_entries = sorted(entries, key=lambda e: (STAGES.index(e["stage"]), e["title"].lower()))
    rows = [[entry["title"], entry["stage"]] for entry in sorted_entries]
    if fmt == "table":
        print(tabulate(rows, headers=["Title", "Stage"], tablefmt="github"))
    else:
        for title, stage in rows:
            print(f"{title} - {stage}")


def status(entries: List[VideoEntry], fmt: str) -> None:
    """Show counts per stage."""
    counts: Dict[str, int] = {stage: 0 for stage in STAGES}
    for entry in entries:
        if entry["stage"] in counts:
            counts[entry["stage"]] += 1
    rows = [[stage, counts[stage]] for stage in STAGES]
    if fmt == "table":
        print(tabulate(rows, headers=["Stage", "Count"], tablefmt="github"))
    else:
        for stage, count in rows:
            print(f"{stage}: {count}")


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI parser."""
    parser = argparse.ArgumentParser(prog="pipeline", description="YouTube content pipeline tracker")
    parser.add_argument(
        "--file",
        default=DEFAULT_FILE,
        help="Path to content JSON file (default: content-pipeline.json)",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    add_parser = subparsers.add_parser("add", help="Add a new video")
    add_parser.add_argument("title", help="Video title")
    add_parser.add_argument("--stage", required=True, choices=STAGES)

    list_parser = subparsers.add_parser("list", help="List all videos")
    list_parser.add_argument("--format", choices=["plain", "table"], default="plain")

    move_parser = subparsers.add_parser("move", help="Move a video to a new stage")
    move_parser.add_argument("title", help="Video title")
    move_parser.add_argument("--to", required=True, dest="stage", choices=STAGES)

    delete_parser = subparsers.add_parser("delete", help="Delete a video")
    delete_parser.add_argument("title", help="Video title")

    status_parser = subparsers.add_parser("status", help="Show counts per stage")
    status_parser.add_argument("--format", choices=["plain", "table"], default="plain")

    return parser


def main() -> None:
    """Entry point for CLI."""
    parser = build_parser()
    args = parser.parse_args()
    data_path = Path(args.file)
    entries = load_data(data_path)

    try:
        if args.command == "add":
            entries = add_video(entries, args.title, args.stage)
            save_data(data_path, entries)
            print(f"Added: {args.title} ({args.stage})")
        elif args.command == "list":
            list_videos(entries, args.format)
        elif args.command == "move":
            entries = move_video(entries, args.title, args.stage)
            save_data(data_path, entries)
            print(f"Moved: {args.title} -> {args.stage}")
        elif args.command == "delete":
            entries = delete_video(entries, args.title)
            save_data(data_path, entries)
            print(f"Deleted: {args.title}")
        elif args.command == "status":
            status(entries, args.format)
    except ValueError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
