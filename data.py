from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


TASK_STATUS_FLOW: Tuple[str, ...] = ("Pending", "In Progress", "Testing", "Completed")
BUG_STATUS_FLOW: Tuple[str, ...] = ("Open", "Fixed", "Verified", "Closed")


def new_project() -> Dict[str, Any]:
    """
    In-memory project store (JSON-serializable).

    Primary structure:
      project = {"sprints": {...}, "users": {...}, "meta": {...}}
    """
    return {
        "sprints": {},  # sprint_id -> sprint_dict
        "users": {
            # username -> {"role": "Manager"|"Developer"|"Tester"}
            # pre-seeded in main for convenience
        },
        "meta": {
            "next_sprint_id": 1,
            "next_bug_id": 1,
        },
    }


def new_sprint(*, sprint_id: str, name: str, duration_days: int) -> Dict[str, Any]:
    return {
        "sprint_id": sprint_id,
        "name": name,
        "duration_days": duration_days,
        "tasks": {},  # task_id -> task_dict
    }


def new_task(
    *,
    task_id: str,
    title: str,
    description: str,
    assigned_to: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "id": task_id,
        "title": title,
        "description": description,
        "assigned_to": assigned_to,  # developer username (or None)
        "status": TASK_STATUS_FLOW[0],
        "bugs": [],  # list[bug_dict]
    }


def new_bug(*, bug_id: str, description: str) -> Dict[str, Any]:
    return {
        "bug_id": bug_id,
        "description": description,
        "status": BUG_STATUS_FLOW[0],
    }


def is_valid_task_status(status: str) -> bool:
    return status in TASK_STATUS_FLOW


def is_valid_bug_status(status: str) -> bool:
    return status in BUG_STATUS_FLOW


def can_advance_status(flow: Tuple[str, ...], current: str, new: str) -> bool:
    if current not in flow or new not in flow:
        return False
    return flow.index(new) >= flow.index(current)

