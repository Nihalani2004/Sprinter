"""
Users API blueprint — list users / developers.
"""

from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, jwt_required

from models import User

users_bp = Blueprint("api_users", __name__, url_prefix="/api/users")


@users_bp.get("")
@jwt_required()
def list_users():
    """List all users (Manager only)."""
    claims = get_jwt()
    if claims.get("role") != "Manager":
        return jsonify({"error": "Manager role required"}), 403
    users = User.query.order_by(User.id).all()
    return jsonify([
        {"id": u.id, "username": u.username, "role": u.role}
        for u in users
    ]), 200


@users_bp.get("/developers")
@jwt_required()
def list_developers():
    """List developer usernames — Manager only, used for task assignment dropdowns."""
    claims = get_jwt()
    if claims.get("role") != "Manager":
        return jsonify({"error": "Manager role required"}), 403
    devs = User.query.filter_by(role="Developer").order_by(User.username).all()
    return jsonify([
        {"id": u.id, "username": u.username}
        for u in devs
    ]), 200
