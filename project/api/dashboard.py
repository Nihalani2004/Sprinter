"""
Dashboard API — aggregated statistics for the dashboard page.

Data isolation:
  Manager   → global stats
  Developer → stats scoped to their assigned tasks
  Tester    → stats scoped to testing tasks / all bugs
"""

from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import Bug, Sprint, Task, User, db
from .access_control import get_current_user_and_role, get_accessible_task_ids

dashboard_bp = Blueprint("api_dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.get("")
@jwt_required()
def get_dashboard():
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    accessible_task_ids = get_accessible_task_ids(user, role)

    # ------------------------------------------------------------------
    # Build base queries scoped to the user's role
    # ------------------------------------------------------------------
    if accessible_task_ids is None:
        # Manager — global view
        task_query = Task.query
        bug_query = Bug.query
        total_tasks = task_query.count()
        total_bugs = bug_query.count()
        total_sprints = Sprint.query.count()
    else:
        # Developer / Tester — scoped view
        task_id_list = list(accessible_task_ids)
        if task_id_list:
            task_query = Task.query.filter(Task.id.in_(task_id_list))
            bug_query = Bug.query.filter(Bug.task_ref_id.in_(task_id_list))
        else:
            task_query = Task.query.filter(Task.id == -1)  # empty result
            bug_query = Bug.query.filter(Bug.task_ref_id == -1)
        total_tasks = task_query.count()
        total_bugs = bug_query.count()
        # Count sprints that contain at least one accessible task
        if task_id_list:
            total_sprints = (
                db.session.query(Sprint)
                .join(Task)
                .filter(Task.id.in_(task_id_list))
                .distinct()
                .count()
            )
        else:
            total_sprints = 0

    # Only managers should see total user count
    total_users = User.query.count() if role == "Manager" else 0

    # Tasks by status
    tasks_by_status = {}
    for status in ("Pending", "In Progress", "Testing", "Completed"):
        tasks_by_status[status] = task_query.filter(Task.status == status).count()

    # Bugs by status
    bugs_by_status = {}
    for status in ("Open", "Fixed", "Verified", "Closed"):
        bugs_by_status[status] = bug_query.filter(Bug.status == status).count()

    # Completion rate
    completion_rate = 0
    if total_tasks > 0:
        completion_rate = round(tasks_by_status.get("Completed", 0) / total_tasks * 100, 1)

    # Role-specific personal counters
    my_tasks = 0
    my_bugs = 0
    if role == "Developer" and user:
        my_tasks = Task.query.filter_by(assigned_to_id=user.id).count()
        my_bugs = (
            db.session.query(Bug)
            .join(Task)
            .filter(Task.assigned_to_id == user.id)
            .count()
        )
    elif role == "Tester":
        my_tasks = Task.query.filter_by(status="Testing").count()
        my_bugs = total_bugs
    elif role == "Manager":
        my_tasks = total_tasks
        my_bugs = total_bugs

    # Recent tasks (last 10, scoped to role)
    if accessible_task_ids is None:
        recent_tasks = Task.query.order_by(Task.id.desc()).limit(10).all()
    elif accessible_task_ids:
        recent_tasks = (
            Task.query.filter(Task.id.in_(list(accessible_task_ids)))
            .order_by(Task.id.desc())
            .limit(10)
            .all()
        )
    else:
        recent_tasks = []

    return jsonify({
        "total_sprints": total_sprints,
        "total_tasks": total_tasks,
        "total_bugs": total_bugs,
        "total_users": total_users,
        "tasks_by_status": tasks_by_status,
        "bugs_by_status": bugs_by_status,
        "completion_rate": completion_rate,
        "my_tasks": my_tasks,
        "my_bugs": my_bugs,
        "role": role,
        "recent_tasks": [
            {
                "id": t.id,
                "task_id": t.task_id,
                "title": t.title,
                "status": t.status,
                "sprint_id": t.sprint.sprint_id if t.sprint else None,
                "assigned_to": t.assigned_to,
            }
            for t in recent_tasks
        ],
    }), 200
