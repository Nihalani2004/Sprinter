from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from data import BUG_STATUS_FLOW, can_advance_status, new_bug
from sprint import get_sprint


def _next_bug_id(project: Dict[str, Any]) -> str:
    meta = project.setdefault("meta", {})
    next_id = int(meta.get("next_bug_id", 1))
    meta["next_bug_id"] = next_id + 1
    return str(next_id)


def _find_task(
    project: Dict[str, Any], sprint_id: str, task_id: str
) -> Optional[Dict[str, Any]]:
    sprint = get_sprint(project, sprint_id)
    if not sprint:
        return None
    return sprint.get("tasks", {}).get(task_id)


def add_bug_to_task(
    project: Dict[str, Any],
    sprint_id: str,
    task_id: str,
    description: str,
) -> Optional[Dict[str, Any]]:
    task = _find_task(project, sprint_id, task_id)
    if not task:
        print("Task not found for adding bug.")
        return None
    bug_id = _next_bug_id(project)
    bug_obj = new_bug(bug_id=bug_id, description=description)
    task.setdefault("bugs", [])
    task["bugs"].append(bug_obj)
    return bug_obj


def list_bugs_for_task(
    project: Dict[str, Any], sprint_id: str, task_id: str
) -> List[Dict[str, Any]]:
    task = _find_task(project, sprint_id, task_id)
    if not task:
        return []
    return task.get("bugs", [])


def _find_bug(
    task: Dict[str, Any], bug_id: str
) -> Optional[Dict[str, Any]]:
    for bug in task.get("bugs", []):
        if str(bug.get("bug_id")) == str(bug_id):
            return bug
    return None


def update_bug_status(
    project: Dict[str, Any],
    sprint_id: str,
    task_id: str,
    bug_id: str,
    new_status: str,
) -> bool:
    task = _find_task(project, sprint_id, task_id)
    if not task:
        print("Task not found.")
        return False
    bug = _find_bug(task, bug_id)
    if not bug:
        print("Bug not found.")
        return False
    current = bug.get("status")
    if new_status not in BUG_STATUS_FLOW:
        print("Invalid bug status.")
        return False
    if not can_advance_status(BUG_STATUS_FLOW, current, new_status):
        print(f"Cannot move bug from {current} to {new_status} (invalid flow).")
        return False
    bug["status"] = new_status
    return True


def format_bug_line(bug: Dict[str, Any]) -> str:
    return f"Bug {bug.get('bug_id')}: {bug.get('description')} (Status: {bug.get('status')})"


def print_bug_list(bugs: List[Dict[str, Any]]) -> None:
    if not bugs:
        print("No bugs found.")
        return
    for b in bugs:
        print(format_bug_line(b))

