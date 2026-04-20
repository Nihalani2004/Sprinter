"""
Sprints API blueprint — full CRUD.

Manager-only for create / update / delete.
All authenticated users can list / read (filtered by role).

Data isolation:
  Manager   → all sprints
  Developer → sprints containing tasks assigned to them
  Tester    → sprints containing tasks in "Testing" status
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func

from models import Sprint, Task, User, db
from .access_control import get_current_user_and_role, get_accessible_task_ids

sprints_bp = Blueprint("api_sprints", __name__, url_prefix="/api/sprints")


def _sprint_to_dict(sprint: Sprint, include_tasks: bool = False,
                     accessible_task_ids=None) -> dict:
    """Serialise a Sprint ORM object to a JSON-friendly dict.
    
    If *accessible_task_ids* is a set, only include/count tasks in that set.
    If it is None, include all tasks (Manager).
    """
    if accessible_task_ids is None:
        visible_tasks = sprint.tasks
    else:
        visible_tasks = [t for t in sprint.tasks if t.id in accessible_task_ids]

    data = {
        "id": sprint.id,
        "sprint_id": sprint.sprint_id,
        "name": sprint.name,
        "duration_days": sprint.duration_days,
        "task_count": len(visible_tasks),
    }
    if include_tasks:
        data["tasks"] = [
            {
                "id": t.id,
                "task_id": t.task_id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "assigned_to": t.assigned_to,
                "bug_count": len(t.bugs),
            }
            for t in visible_tasks
        ]
    return data


def _next_sprint_id() -> str:
    result = db.session.query(func.max(db.cast(Sprint.sprint_id, db.Integer))).scalar()
    return str((result or 0) + 1)


def _require_manager():
    claims = get_jwt()
    if claims.get("role") != "Manager":
        return jsonify({"error": "Manager role required"}), 403
    return None


# ------------------------------------------------------------------ list
@sprints_bp.get("")
@jwt_required()
def list_sprints():
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    accessible_task_ids = get_accessible_task_ids(user, role)

    all_sprints = Sprint.query.order_by(Sprint.id).all()

    if accessible_task_ids is None:
        # Manager — show all sprints
        result = [_sprint_to_dict(s, accessible_task_ids=None) for s in all_sprints]
    else:
        # Developer/Tester — only show sprints that contain at least one accessible task
        result = []
        for s in all_sprints:
            sprint_task_ids = {t.id for t in s.tasks}
            if sprint_task_ids & accessible_task_ids:
                result.append(_sprint_to_dict(s, accessible_task_ids=accessible_task_ids))

    return jsonify(result), 200


# ------------------------------------------------------------------ get one
@sprints_bp.get("/<int:sprint_pk>")
@jwt_required()
def get_sprint(sprint_pk: int):
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    sprint = db.session.get(Sprint, sprint_pk)
    if not sprint:
        return jsonify({"error": "Sprint not found"}), 404

    accessible_task_ids = get_accessible_task_ids(user, role)

    # For non-managers, verify they have at least one task in this sprint
    if accessible_task_ids is not None:
        sprint_task_ids = {t.id for t in sprint.tasks}
        if not (sprint_task_ids & accessible_task_ids):
            return jsonify({"error": "Not authorized to view this sprint"}), 403

    return jsonify(_sprint_to_dict(sprint, include_tasks=True,
                                    accessible_task_ids=accessible_task_ids)), 200


# ------------------------------------------------------------------ create
@sprints_bp.post("")
@jwt_required()
def create_sprint():
    err = _require_manager()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    duration_raw = data.get("duration_days")

    if not name:
        return jsonify({"error": "Sprint name is required"}), 400
    try:
        duration_days = int(duration_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "duration_days must be an integer"}), 400
    if duration_days <= 0 or duration_days > 365:
        return jsonify({"error": "duration_days must be between 1 and 365"}), 400

    sprint_id = _next_sprint_id()
    # Look up the creating manager to record ownership
    username = get_jwt_identity()
    creator = User.query.filter_by(username=username).first()
    sprint = Sprint(
        sprint_id=sprint_id,
        name=name,
        duration_days=duration_days,
        created_by_id=creator.id if creator else None,
    )
    db.session.add(sprint)
    db.session.commit()

    # Emit real-time event
    try:
        from realtime import emit_event
        emit_event("sprint_created", _sprint_to_dict(sprint))
    except Exception:
        pass

    return jsonify(_sprint_to_dict(sprint)), 201


# ------------------------------------------------------------------ update
@sprints_bp.put("/<int:sprint_pk>")
@jwt_required()
def update_sprint(sprint_pk: int):
    err = _require_manager()
    if err:
        return err

    sprint = db.session.get(Sprint, sprint_pk)
    if not sprint:
        return jsonify({"error": "Sprint not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify({"error": "Sprint name cannot be empty"}), 400
        sprint.name = name
    if "duration_days" in data:
        try:
            duration_days = int(data["duration_days"])
        except (TypeError, ValueError):
            return jsonify({"error": "duration_days must be an integer"}), 400
        if duration_days <= 0 or duration_days > 365:
            return jsonify({"error": "duration_days must be between 1 and 365"}), 400
        sprint.duration_days = duration_days

    db.session.commit()
    return jsonify(_sprint_to_dict(sprint)), 200


# ------------------------------------------------------------------ delete
@sprints_bp.delete("/<int:sprint_pk>")
@jwt_required()
def delete_sprint(sprint_pk: int):
    err = _require_manager()
    if err:
        return err

    sprint = db.session.get(Sprint, sprint_pk)
    if not sprint:
        return jsonify({"error": "Sprint not found"}), 404

    sprint_data = _sprint_to_dict(sprint)
    db.session.delete(sprint)
    db.session.commit()

    try:
        from realtime import emit_event
        emit_event("sprint_deleted", sprint_data)
    except Exception:
        pass

    return jsonify({"message": f"Sprint {sprint_data['sprint_id']} deleted"}), 200
