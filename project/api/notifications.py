"""
Notifications API blueprint.

CRUD for notifications and deadline check endpoint.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import Notification, Sprint, User, db
from realtime import emit_to_user

notifications_bp = Blueprint("api_notifications", __name__, url_prefix="/api/notifications")


def create_notification(user_id: int, notif_type: str, title: str, message: str,
                        related_id: str | None = None, related_type: str | None = None) -> Notification:
    """Helper to create and emit a notification."""
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        related_id=str(related_id) if related_id else None,
        related_type=related_type
    )
    db.session.add(notif)
    db.session.commit()

    # Emit real-time right away
    emit_to_user(user_id, notif_type, _notif_to_dict(notif))
    return notif


def _notif_to_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "related_id": n.related_id,
        "related_type": n.related_type,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }

# ------------------------------------------------------------------ list
@notifications_bp.get("")
@jwt_required()
def list_notifications():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    unread_only = request.args.get("unread_only", "false").lower() == "true"
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)

    query = Notification.query.filter_by(user_id=user.id)
    if unread_only:
        query = query.filter_by(is_read=False)

    notifs = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    return jsonify([_notif_to_dict(n) for n in notifs]), 200


# ------------------------------------------------------------------ unread count
@notifications_bp.get("/unread-count")
@jwt_required()
def get_unread_count():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({"count": count}), 200


# ------------------------------------------------------------------ mark read
@notifications_bp.patch("/<int:notif_id>/read")
@jwt_required()
def mark_read(notif_id: int):
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    notif = db.session.get(Notification, notif_id)
    if not notif or notif.user_id != user.id:
        return jsonify({"error": "Notification not found"}), 404

    notif.is_read = True
    db.session.commit()
    return jsonify(_notif_to_dict(notif)), 200


# ------------------------------------------------------------------ mark all read
@notifications_bp.patch("/read-all")
@jwt_required()
def mark_all_read():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200


# ------------------------------------------------------------------ delete
@notifications_bp.delete("/<int:notif_id>")
@jwt_required()
def delete_notification(notif_id: int):
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    notif = db.session.get(Notification, notif_id)
    if not notif or notif.user_id != user.id:
        return jsonify({"error": "Notification not found"}), 404

    db.session.delete(notif)
    db.session.commit()
    return jsonify({"message": "Notification deleted"}), 200


# ------------------------------------------------------------------ check deadlines
@notifications_bp.post("/check-deadlines")
@jwt_required()
def check_deadlines():
    """Scan sprints and alert managers about approaching deadlines (< 2 days)."""
    claims = get_jwt()
    if claims.get("role") != "Manager":
        return jsonify({"error": "Manager role required"}), 403

    now = datetime.now(timezone.utc)
    threshold = now + timedelta(days=2)

    # Find sprints ending soon
    ending_soon = Sprint.query.filter(
        Sprint.end_date != None,
        Sprint.end_date <= threshold,
        Sprint.end_date > now  # not already passed (or modify logic as needed)
    ).all()

    managers = User.query.filter_by(role="Manager").all()
    count = 0

    for sprint in ending_soon:
        for manager in managers:
            # Check if alert already sent recently to avoid spam (optional, skipping for simplicity)
            create_notification(
                user_id=manager.id,
                notif_type="deadline_alert",
                title="Sprint Deadline Approaching",
                message=f"Sprint '{sprint.name}' is ending soon.",
                related_id=sprint.id,
                related_type="sprint"
            )
            count += 1
            
    return jsonify({"message": f"Deadline checks complete. Triggered {count} alerts."}), 200
