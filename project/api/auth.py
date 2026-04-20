"""
Authentication API blueprint — login, signup, profile.

All endpoints return JSON.  Authentication uses JWT tokens
(flask-jwt-extended).
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from models import User, db

auth_bp = Blueprint("api_auth", __name__, url_prefix="/api/auth")


# ------------------------------------------------------------------ login
@auth_bp.post("/login")
def login():
    """Authenticate via JSON.  Returns a JWT access token."""
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(
        identity=user.username,
        additional_claims={"role": user.role},
    )
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
        },
    }), 200


# ------------------------------------------------------------------ signup
@auth_bp.post("/signup")
def signup():
    """Register a new user.  Returns a JWT access token."""
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    role = (data.get("role") or "").strip()

    if not username or not password or not role:
        return jsonify({"error": "username, password, and role are required"}), 400

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if role not in ("Manager", "Developer", "Tester"):
        return jsonify({"error": "Role must be Manager, Developer, or Tester"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409

    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    access_token = create_access_token(
        identity=new_user.username,
        additional_claims={"role": new_user.role},
    )
    return jsonify({
        "message": "User created successfully",
        "access_token": access_token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
        },
    }), 201


# ------------------------------------------------------------------ me
@auth_bp.get("/me")
@jwt_required()
def me():
    """Return authenticated user info."""
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "assigned_tasks": len(user.tasks),
    }), 200
