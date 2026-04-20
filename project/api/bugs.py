"""
Bugs API blueprint — CRUD + status updates.

Testers can create bugs; Developers and Testers can update bug status.

Data isolation:
  Manager   → all bugs
  Developer → bugs on tasks assigned to them
  Tester    → all bugs (testers do QA)
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func

from models import (
    BUG_STATUS_FLOW,
    Bug,
    Sprint,
    Task,
    User,
    can_advance_status,
    db,
)
from .access_control import can_access_bug, can_access_task, get_current_user_and_role
from .notifications import create_notification

bugs_bp = Blueprint("api_bugs", __name__, url_prefix="/api/bugs")


def _bug_to_dict(bug: Bug) -> dict:
    return {
        "id": bug.id,
        "bug_id": bug.bug_id,
        "description": bug.description,
        "status": bug.status,
        "task_id": bug.task.task_id if bug.task else None,
        "task_title": bug.task.title if bug.task else None,
        "task_pk": bug.task_ref_id,
        "sprint_id": bug.task.sprint.sprint_id if bug.task and bug.task.sprint else None,
    }


def _next_bug_id() -> str:
    result = db.session.query(func.max(db.cast(Bug.bug_id, db.Integer))).scalar()
    return str((result or 0) + 1)


# ------------------------------------------------------------------ list
@bugs_bp.get("")
@jwt_required()
def list_bugs():
    """List bugs, filtered by role and optionally by task_pk query parameter."""
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    task_pk = request.args.get("task_pk", type=int)

    if role == "Manager":
        # Manager sees all bugs
        if task_pk:
            bugs = Bug.query.filter_by(task_ref_id=task_pk).all()
        else:
            bugs = Bug.query.all()
    elif role == "Tester":
        # Tester sees bugs on tasks in "Testing" status + bugs they reported
        if task_pk:
            task = db.session.get(Task, task_pk)
            if not task or (task.status != "Testing" and not Bug.query.filter_by(task_ref_id=task_pk, reported_by_id=user.id).first()):
                return jsonify([]), 200
            bugs = Bug.query.filter_by(task_ref_id=task_pk).all()
        else:
            # Bugs on Testing tasks OR bugs reported by this tester
            testing_bugs = (
                Bug.query.join(Task)
                .filter(Task.status == "Testing")
                .all()
            )
            reported_bugs = (
                Bug.query.filter_by(reported_by_id=user.id).all()
            )
            # Merge and deduplicate
            seen_ids = set()
            bugs = []
            for b in testing_bugs + reported_bugs:
                if b.id not in seen_ids:
                    seen_ids.add(b.id)
                    bugs.append(b)
    else:
        # Developer sees only bugs on their assigned tasks
        if task_pk:
            task = db.session.get(Task, task_pk)
            if not task or task.assigned_to_id != user.id:
                return jsonify([]), 200
            bugs = Bug.query.filter_by(task_ref_id=task_pk).all()
        else:
            bugs = (
                Bug.query.join(Task)
                .filter(Task.assigned_to_id == user.id)
                .all()
            )

    return jsonify([_bug_to_dict(b) for b in bugs]), 200


# ------------------------------------------------------------------ get one
@bugs_bp.get("/<int:bug_pk>")
@jwt_required()
def get_bug(bug_pk: int):
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    bug = db.session.get(Bug, bug_pk)
    if not bug:
        return jsonify({"error": "Bug not found"}), 404

    if not can_access_bug(user, role, bug):
        return jsonify({"error": "Not authorized to view this bug"}), 403

    return jsonify(_bug_to_dict(bug)), 200


# ------------------------------------------------------------------ create
@bugs_bp.post("")
@jwt_required()
def create_bug():
    claims = get_jwt()
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if role not in ("Tester", "Manager"):
        return jsonify({"error": "Only Testers or Managers can report bugs"}), 403

    data = request.get_json(silent=True) or {}
    task_pk = data.get("task_pk")
    description = (data.get("description") or "").strip()

    if not task_pk or not description:
        return jsonify({"error": "task_pk and description are required"}), 400

    task = db.session.get(Task, task_pk)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    # Verify the user has access to this task
    if not can_access_task(user, role, task):
        return jsonify({"error": "Not authorized to report bugs on this task"}), 403

    new_bug_id = _next_bug_id()
    bug = Bug(
        bug_id=new_bug_id,
        description=description,
        task_ref_id=task.id,
        reported_by_id=user.id,
    )
    db.session.add(bug)
    db.session.commit()

    bug_data = _bug_to_dict(bug)
    
    if task.assigned_to_id:
        create_notification(
            user_id=task.assigned_to_id,
            notif_type="bug_reported",
            title="New Bug Reported",
            message=f"A new bug has been reported on your task {task.task_id}: {description[:50]}...",
            related_id=str(bug.id),
            related_type="bug"
        )
        
    try:
        from realtime import emit_event
        emit_event("bug_created", bug_data)
    except Exception:
        pass

    return jsonify(bug_data), 201


# ------------------------------------------------------------------ update status
@bugs_bp.patch("/<int:bug_pk>/status")
@jwt_required()
def update_bug_status(bug_pk: int):
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if role not in ("Developer", "Tester", "Manager"):
        return jsonify({"error": "Not authorized to update bug status"}), 403

    bug = db.session.get(Bug, bug_pk)
    if not bug:
        return jsonify({"error": "Bug not found"}), 404

    # Verify user has access to this bug
    if not can_access_bug(user, role, bug):
        return jsonify({"error": "Not authorized to update this bug"}), 403

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()

    if new_status not in BUG_STATUS_FLOW:
        return jsonify({
            "error": f"Invalid status. Must be one of: {', '.join(BUG_STATUS_FLOW)}"
        }), 400

    if not can_advance_status(BUG_STATUS_FLOW, bug.status, new_status):
        return jsonify({
            "error": f"Cannot move bug from '{bug.status}' to '{new_status}'"
        }), 400

    bug.status = new_status
    db.session.commit()

    bug_data = _bug_to_dict(bug)
    try:
        from realtime import emit_event
        emit_event("bug_updated", bug_data)
    except Exception:
        pass

    return jsonify(bug_data), 200


# ------------------------------------------------------------------ delete
@bugs_bp.delete("/<int:bug_pk>")
@jwt_required()
def delete_bug(bug_pk: int):
    claims = get_jwt()
    if claims.get("role") != "Manager":
        return jsonify({"error": "Manager role required"}), 403

    bug = db.session.get(Bug, bug_pk)
    if not bug:
        return jsonify({"error": "Bug not found"}), 404

    bug_data = _bug_to_dict(bug)
    db.session.delete(bug)
    db.session.commit()

    try:
        from realtime import emit_event
        emit_event("bug_deleted", bug_data)
    except Exception:
        pass

    return jsonify({"message": f"Bug {bug_data['bug_id']} deleted"}), 200
