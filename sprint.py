from __future__ import annotations

from typing import Any, Dict, Optional

from data import new_sprint


def _next_sprint_id(project: Dict[str, Any]) -> str:
    meta = project.setdefault("meta", {})
    next_id = int(meta.get("next_sprint_id", 1))
    meta["next_sprint_id"] = next_id + 1
    return str(next_id)


def create_sprint(project: Dict[str, Any], name: str, duration_days: int) -> Dict[str, Any]:
    sprint_id = _next_sprint_id(project)
    sprint_obj = new_sprint(sprint_id=sprint_id, name=name, duration_days=duration_days)
    project.setdefault("sprints", {})
    project["sprints"][sprint_id] = sprint_obj
    return sprint_obj


def get_sprint(project: Dict[str, Any], sprint_id: str) -> Optional[Dict[str, Any]]:
    return project.get("sprints", {}).get(sprint_id)


def list_sprints(project: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return project.get("sprints", {})


def format_sprint_summary(sprint: Dict[str, Any]) -> str:
    tasks = sprint.get("tasks", {})
    return (
        f"Sprint ID: {sprint.get('sprint_id')}\n"
        f"Name     : {sprint.get('name')}\n"
        f"Duration : {sprint.get('duration_days')} days\n"
        f"Tasks    : {len(tasks)}\n"
    )


def print_all_sprints(project: Dict[str, Any]) -> None:
    sprints = list_sprints(project)
    if not sprints:
        print("No sprints available.")
        return
    for s in sprints.values():
        print("-" * 40)
        print(format_sprint_summary(s))


def delete_sprint(project: Dict[str, Any], sprint_id: str) -> bool:
    sprints = project.get("sprints", {})
    if sprint_id not in sprints:
        print(f"Sprint {sprint_id} not found.")
        return False
    del sprints[sprint_id]
    return True

