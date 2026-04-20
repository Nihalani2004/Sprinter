"""
Tasks API blueprint — full CRUD + status updates + assignment.

Role-based filtering:
  Manager  → all tasks
  Developer → only assigned tasks
  Tester   → only tasks in "Testing" status
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import (
    TASK_STATUS_FLOW,
    Bug,
    Sprint,
    Task,
    User,
    can_advance_status,
    db,
)
from .access_control import can_access_task, get_current_user_and_role
from .notifications import create_notification

tasks_bp = Blueprint("api_tasks", __name__, url_prefix="/api/tasks")


def _task_to_dict(task: Task) -> dict:
    return {
        "id": task.id,
        "task_id": task.task_id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "sprint_id": task.sprint.sprint_id if task.sprint else None,
        "sprint_name": task.sprint.name if task.sprint else None,
        "sprint_pk": task.sprint_ref_id,
        "assigned_to": task.assigned_to,
        "assigned_to_id": task.assigned_to_id,
        "bug_count": len(task.bugs),
        "bugs": [
            {
                "id": b.id,
                "bug_id": b.bug_id,
                "description": b.description,
                "status": b.status,
            }
            for b in task.bugs
        ],
    }


def _require_manager():
    claims = get_jwt()
    if claims.get("role") != "Manager":
        return jsonify({"error": "Manager role required"}), 403
    return None


def _get_role_filtered_tasks(user, role):
    """Return tasks filtered by the user's role."""
    if role == "Manager":
        return Task.query.join(Sprint).order_by(Sprint.id, Task.id).all()
    elif role == "Developer":
        return (
            Task.query.filter_by(assigned_to_id=user.id)
            .join(Sprint)
            .order_by(Sprint.id, Task.id)
            .all()
        ) if user else []
    else:  # Tester
        return (
            Task.query.filter_by(status="Testing")
            .join(Sprint)
            .order_by(Sprint.id, Task.id)
            .all()
        )


# ------------------------------------------------------------------ list
@tasks_bp.get("")
@jwt_required()
def list_tasks():
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    tasks = _get_role_filtered_tasks(user, role)

    return jsonify({
        "role": role,
        "tasks": [_task_to_dict(t) for t in tasks],
    }), 200


# ------------------------------------------------------------------ list all (for kanban)
@tasks_bp.get("/all")
@jwt_required()
def list_all_tasks():
    """Return tasks filtered by role — used by Kanban board."""
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    tasks = _get_role_filtered_tasks(user, role)
    return jsonify([_task_to_dict(t) for t in tasks]), 200


# ------------------------------------------------------------------ get one
@tasks_bp.get("/<int:task_pk>")
@jwt_required()
def get_task(task_pk: int):
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    task = db.session.get(Task, task_pk)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    if not can_access_task(user, role, task):
        return jsonify({"error": "Not authorized to view this task"}), 403

    return jsonify(_task_to_dict(task)), 200


# ------------------------------------------------------------------ create
@tasks_bp.post("")
@jwt_required()
def create_task():
    err = _require_manager()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    sprint_id = (data.get("sprint_id") or "").strip()
    task_id = (data.get("task_id") or "").strip()
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    assigned_to = (data.get("assigned_to") or "").strip() or None

    if not sprint_id or not task_id or not title:
        return jsonify({"error": "sprint_id, task_id, and title are required"}), 400

    sprint = Sprint.query.filter_by(sprint_id=sprint_id).first()
    if not sprint:
        return jsonify({"error": f"Sprint {sprint_id} not found"}), 404

    existing = Task.query.filter_by(sprint_ref_id=sprint.id, task_id=task_id).first()
    if existing:
        return jsonify({"error": f"Task {task_id} already exists in Sprint {sprint_id}"}), 409

    assigned_user = None
    if assigned_to:
        assigned_user = User.query.filter_by(username=assigned_to).first()

    new_task = Task(
        task_id=task_id,
        title=title,
        description=description,
        sprint_ref_id=sprint.id,
        assigned_to_id=assigned_user.id if assigned_user else None,
    )
    db.session.add(new_task)
    db.session.commit()

    task_data = _task_to_dict(new_task)
    
    if assigned_user:
        create_notification(
            user_id=assigned_user.id,
            notif_type="task_assigned",
            title="New Task Assigned",
            message=f"You have been assigned to task {task_id}: {title}",
            related_id=str(new_task.id),
            related_type="task"
        )
        
    try:
        from realtime import emit_event
        emit_event("task_created", task_data)
    except Exception:
        pass

    return jsonify(task_data), 201


# ------------------------------------------------------------------ update
@tasks_bp.put("/<int:task_pk>")
@jwt_required()
def update_task(task_pk: int):
    err = _require_manager()
    if err:
        return err

    task = db.session.get(Task, task_pk)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json(silent=True) or {}
    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return jsonify({"error": "Title cannot be empty"}), 400
        task.title = title
    if "description" in data:
        task.description = (data["description"] or "").strip()

    db.session.commit()

    task_data = _task_to_dict(task)
    try:
        from realtime import emit_event
        emit_event("task_updated", task_data)
    except Exception:
        pass

    return jsonify(task_data), 200


# ------------------------------------------------------------------ update status
@tasks_bp.patch("/<int:task_pk>/status")
@jwt_required()
def update_task_status(task_pk: int):
    """Update task status with flow validation.
    Used by the Kanban board drag-and-drop.
    Developers can only update their own tasks."""
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    task = db.session.get(Task, task_pk)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    # Verify the user has access to this task
    if not can_access_task(user, role, task):
        return jsonify({"error": "Not authorized to update this task"}), 403

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()

    if new_status not in TASK_STATUS_FLOW:
        return jsonify({
            "error": f"Invalid status. Must be one of: {', '.join(TASK_STATUS_FLOW)}"
        }), 400

    if not can_advance_status(TASK_STATUS_FLOW, task.status, new_status):
        return jsonify({
            "error": f"Cannot move from '{task.status}' to '{new_status}'"
        }), 400

    old_status = task.status
    task.status = new_status
    db.session.commit()

    task_data = _task_to_dict(task)
    task_data["old_status"] = old_status
    try:
        from realtime import emit_event
        emit_event("task_updated", task_data)
    except Exception:
        pass

    return jsonify(_task_to_dict(task)), 200


# ------------------------------------------------------------------ assign
@tasks_bp.patch("/<int:task_pk>/assign")
@jwt_required()
def assign_task(task_pk: int):
    err = _require_manager()
    if err:
        return err

    task = db.session.get(Task, task_pk)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json(silent=True) or {}
    developer = (data.get("assigned_to") or "").strip()

    if not developer:
        task.assigned_to_id = None
    else:
        dev_user = User.query.filter_by(username=developer).first()
        if not dev_user:
            return jsonify({"error": f"Developer '{developer}' not found"}), 404
        task.assigned_to_id = dev_user.id

    db.session.commit()

    task_data = _task_to_dict(task)
    
    if task.assigned_to_id:
        create_notification(
            user_id=task.assigned_to_id,
            notif_type="task_assigned",
            title="Task Assigned",
            message=f"You have been assigned to task {task.task_id}: {task.title}",
            related_id=str(task.id),
            related_type="task"
        )
        
    try:
        from realtime import emit_event
        emit_event("task_assigned", task_data)
    except Exception:
        pass

    return jsonify(task_data), 200


# ------------------------------------------------------------------ delete
@tasks_bp.delete("/<int:task_pk>")
@jwt_required()
def delete_task(task_pk: int):
    err = _require_manager()
    if err:
        return err

    task = db.session.get(Task, task_pk)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    task_data = _task_to_dict(task)
    db.session.delete(task)
    db.session.commit()

    try:
        from realtime import emit_event
        emit_event("task_deleted", task_data)
    except Exception:
        pass

    return jsonify({"message": f"Task {task_data['task_id']} deleted"}), 200
