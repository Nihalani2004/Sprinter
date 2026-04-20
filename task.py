from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from data import (
    TASK_STATUS_FLOW,
    can_advance_status,
    new_task,
)
from sprint import get_sprint


def _find_task(
    project: Dict[str, Any], sprint_id: str, task_id: str
) -> Optional[Dict[str, Any]]:
    sprint = get_sprint(project, sprint_id)
    if not sprint:
        return None
    return sprint.get("tasks", {}).get(task_id)


def create_task(
    project: Dict[str, Any],
    sprint_id: str,
    task_id: str,
    title: str,
    description: str,
    assigned_to: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    sprint = get_sprint(project, sprint_id)
    if not sprint:
        print(f"Sprint {sprint_id} not found.")
        return None
    tasks = sprint.setdefault("tasks", {})
    if task_id in tasks:
        print(f"Task with id {task_id} already exists in sprint {sprint_id}.")
        return None
    task_obj = new_task(
        task_id=task_id,
        title=title,
        description=description,
        assigned_to=assigned_to,
    )
    tasks[task_id] = task_obj
    return task_obj


def assign_task(
    project: Dict[str, Any],
    sprint_id: str,
    task_id: str,
    developer_username: str,
) -> bool:
    task = _find_task(project, sprint_id, task_id)
    if not task:
        print("Task not found.")
        return False
    task["assigned_to"] = developer_username
    return True


def update_task_status(
    project: Dict[str, Any],
    sprint_id: str,
    task_id: str,
    new_status: str,
) -> bool:
    task = _find_task(project, sprint_id, task_id)
    if not task:
        print("Task not found.")
        return False
    current = task.get("status")
    if new_status not in TASK_STATUS_FLOW:
        print("Invalid status.")
        return False
    if not can_advance_status(TASK_STATUS_FLOW, current, new_status):
        print(f"Cannot move from {current} to {new_status} (invalid flow).")
        return False
    task["status"] = new_status
    return True


def list_all_tasks(project: Dict[str, Any]) -> List[Tuple[str, str, Dict[str, Any]]]:
    """
    Returns list of (sprint_id, task_id, task_dict)
    """
    result: List[Tuple[str, str, Dict[str, Any]]] = []
    for sprint_id, sprint in project.get("sprints", {}).items():
        for task_id, task in sprint.get("tasks", {}).items():
            result.append((sprint_id, task_id, task))
    return result


def list_tasks_for_developer(
    project: Dict[str, Any], developer_username: str
) -> List[Tuple[str, str, Dict[str, Any]]]:
    return [
        (sprint_id, task_id, t)
        for sprint_id, task_id, t in list_all_tasks(project)
        if t.get("assigned_to") == developer_username
    ]


def list_tasks_in_status(
    project: Dict[str, Any], status: str
) -> List[Tuple[str, str, Dict[str, Any]]]:
    return [
        (sprint_id, task_id, t)
        for sprint_id, task_id, t in list_all_tasks(project)
        if t.get("status") == status
    ]


def list_tasks_in_testing(
    project: Dict[str, Any],
) -> List[Tuple[str, str, Dict[str, Any]]]:
    return list_tasks_in_status(project, "Testing")


def format_task_line(
    sprint_id: str,
    task_id: str,
    task: Dict[str, Any],
) -> str:
    return (
        f"[Sprint {sprint_id}] Task {task_id}: {task.get('title')} "
        f"(Status: {task.get('status')}, Assigned to: {task.get('assigned_to')})"
    )


def print_task_list(tasks: List[Tuple[str, str, Dict[str, Any]]]) -> None:
    if not tasks:
        print("No tasks found.")
        return
    for sprint_id, task_id, t in tasks:
        print(format_task_line(sprint_id, task_id, t))

