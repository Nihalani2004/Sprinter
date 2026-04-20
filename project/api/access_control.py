"""
Centralized access-control helpers for role-based data isolation.

Every API blueprint can call these to decide which tasks / bugs a user
may see or modify, based on (user, role).
"""

from __future__ import annotations

from typing import Optional, Set

from flask_jwt_extended import get_jwt, get_jwt_identity

from models import Bug, Task, User, db


def get_current_user_and_role():
    """Return (User, role_str) for the currently authenticated JWT user."""
    username = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")
    user = User.query.filter_by(username=username).first()
    return user, role


def get_accessible_task_ids(user: User, role: str) -> Optional[Set[int]]:
    """Return the set of Task.id values the user may access.

    Returns ``None`` for Manager (meaning *all* tasks are accessible).
    """
    if role == "Manager":
        return None  # unrestricted
    elif role == "Developer":
        return {t.id for t in Task.query.filter_by(assigned_to_id=user.id).all()}
    else:  # Tester
        return {t.id for t in Task.query.filter_by(status="Testing").all()}


def can_access_task(user: User, role: str, task: Task) -> bool:
    """Check whether *user* with *role* is allowed to view / modify *task*."""
    if role == "Manager":
        return True
    if role == "Developer":
        return task.assigned_to_id == user.id
    # Tester
    return task.status == "Testing"


def can_access_bug(user: User, role: str, bug: Bug) -> bool:
    """Check whether *user* with *role* is allowed to view / modify *bug*.

    Access is determined by the parent task:
    - Manager → all bugs
    - Developer → bugs on tasks assigned to them
    - Tester → bugs on tasks in "Testing" status, or bugs they reported
    """
    if role == "Manager":
        return True
    if role == "Tester":
        # Testers can access bugs on tasks in "Testing" status,
        # or bugs they themselves reported (regardless of task status)
        if bug.task and bug.task.status == "Testing":
            return True
        if bug.reported_by_id and bug.reported_by_id == user.id:
            return True
        return False
    # Developer — only bugs linked to their assigned tasks
    return bug.task and bug.task.assigned_to_id == user.id
