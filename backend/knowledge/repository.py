"""
Knowledge Repository Manager
Handles persistence of research results as JSON files.

Each entry stores: id, query, result, domain, model, agent_logs, created_at, updated_at
The list() function returns lightweight summaries (no full result text) for efficiency.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Optional


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _ensure_data_dir():
    """Create the data directory if it doesn't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)


def save_research(
    query: str,
    result: str,
    agent_logs: list[str] | None = None,
    domain: str = "General Logistics",
    model: str = "gemini-1.5-flash",
) -> dict:
    """
    Save a research result to the knowledge repository.
    Persists both a JSON file and a human-readable Markdown file.
    Returns the saved entry.
    """
    _ensure_data_dir()

    entry_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().isoformat()

    entry = {
        "id": entry_id,
        "query": query,
        "result": result,
        "domain": domain,
        "model": model,
        "agent_logs": agent_logs or [],
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    # Persist full JSON
    filepath = os.path.join(DATA_DIR, f"{entry_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(entry, f, indent=2, ensure_ascii=False)

    # Persist human-readable Markdown
    md_filepath = os.path.join(DATA_DIR, f"{entry_id}.md")
    with open(md_filepath, "w", encoding="utf-8") as md_file:
        md_file.write(f"# Logistics Research: {query}\n\n")
        md_file.write(f"**Domain:** {domain}  \n")
        md_file.write(f"**Model:** {model}  \n")
        md_file.write(f"**Date:** {timestamp}\n\n")
        md_file.write("---\n\n")
        md_file.write(result)

    return entry


def get_research(entry_id: str) -> Optional[dict]:
    """Retrieve a specific research entry by ID (full data including result)."""
    filepath = os.path.join(DATA_DIR, f"{entry_id}.json")
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def list_research() -> list[dict]:
    """
    List all research entries as lightweight summaries, sorted by creation date (newest first).
    Does NOT include 'result' or 'agent_logs' to avoid loading large data for the dashboard.
    """
    _ensure_data_dir()

    summaries = []
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith(".json"):
            continue
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                entry = json.load(f)
                summaries.append({
                    "id": entry.get("id"),
                    "query": entry.get("query"),
                    "domain": entry.get("domain", "General Logistics"),
                    "model": entry.get("model", "gemini-1.5-flash"),
                    "created_at": entry.get("created_at"),
                })
        except (json.JSONDecodeError, IOError):
            continue

    summaries.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return summaries


def delete_research(entry_id: str) -> bool:
    """Delete a research entry and its markdown file. Returns True if deleted."""
    filepath = os.path.join(DATA_DIR, f"{entry_id}.json")
    if not os.path.exists(filepath):
        return False
    os.remove(filepath)
    md_filepath = os.path.join(DATA_DIR, f"{entry_id}.md")
    if os.path.exists(md_filepath):
        os.remove(md_filepath)
    return True


def search_research(keyword: str) -> list[dict]:
    """Search research summaries by keyword in query or domain."""
    all_summaries = list_research()
    keyword_lower = keyword.lower()
    return [
        e for e in all_summaries
        if keyword_lower in e.get("query", "").lower()
        or keyword_lower in e.get("domain", "").lower()
    ]


def update_research(entry_id: str, updates: dict) -> Optional[dict]:
    """
    Update fields of an existing research entry.
    Allowed updatable fields: 'query', 'result', 'domain'.
    Returns updated entry or None if not found.
    """
    entry = get_research(entry_id)
    if not entry:
        return None

    allowed_fields = {"query", "result", "domain"}
    for key, value in updates.items():
        if key in allowed_fields:
            entry[key] = value
    entry["updated_at"] = datetime.now().isoformat()

    filepath = os.path.join(DATA_DIR, f"{entry_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(entry, f, indent=2, ensure_ascii=False)

    return entry
