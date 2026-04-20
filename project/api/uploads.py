"""
Uploads API blueprint.

Handles uploading, validating, and retrieving files attached to tasks or bugs.

Data isolation:
  - Upload/list/download checks that the user has access to the parent task/bug.
  - Download now requires authentication.
"""

from __future__ import annotations

import os
import uuid
from flask import Blueprint, jsonify, request, current_app, send_from_directory
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from models import Attachment, Bug, Task, User, db
from .access_control import can_access_bug, can_access_task, get_current_user_and_role

uploads_bp = Blueprint("api_uploads", __name__, url_prefix="/api/uploads")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf", "doc", "docx", "txt", "xlsx", "csv"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _attachment_to_dict(att: Attachment) -> dict:
    return {
        "id": att.id,
        "filename": att.filename,
        "file_type": att.file_type,
        "file_size": att.file_size,
        "uploaded_by_id": att.uploaded_by_id,
        "uploaded_by": att.uploaded_by.username if att.uploaded_by else None,
        "task_id": att.task_id,
        "bug_id": att.bug_id,
        "created_at": att.created_at.isoformat() if att.created_at else None,
        "url": f"/api/uploads/{att.id}/download"
    }


def _can_access_attachment(user, role, att: Attachment) -> bool:
    """Check if the user can access this attachment via its parent task/bug."""
    if role == "Manager":
        return True
    if att.task_id:
        task = db.session.get(Task, att.task_id)
        if task and can_access_task(user, role, task):
            return True
    if att.bug_id:
        bug = db.session.get(Bug, att.bug_id)
        if bug and can_access_bug(user, role, bug):
            return True
    return False


# ------------------------------------------------------------------ upload
@uploads_bp.post("")
@jwt_required()
def upload_file():
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    task_id = request.form.get("task_id", type=int)
    bug_id = request.form.get("bug_id", type=int)

    if not task_id and not bug_id:
        return jsonify({"error": "Must provide task_id or bug_id"}), 400

    # Verification — check parent exists AND user has access
    if task_id:
        task = db.session.get(Task, task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not can_access_task(user, role, task):
            return jsonify({"error": "Not authorized to upload to this task"}), 403
    if bug_id:
        bug = db.session.get(Bug, bug_id)
        if not bug:
            return jsonify({"error": "Bug not found"}), 404
        if not can_access_bug(user, role, bug):
            return jsonify({"error": "Not authorized to upload to this bug"}), 403

    # Save to disk
    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit(".", 1)[1].lower()
    stored_filename = f"{uuid.uuid4().hex}.{extension}"
    
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(upload_folder, stored_filename)
    
    file.save(file_path)
    file_size = os.path.getsize(file_path)

    # Insert DB
    att = Attachment(
        filename=original_filename,
        stored_filename=stored_filename,
        file_path=stored_filename, # just store relative to uploads/
        file_type=file.content_type,
        file_size=file_size,
        uploaded_by_id=user.id if user else None,
        task_id=task_id,
        bug_id=bug_id
    )
    db.session.add(att)
    db.session.commit()

    return jsonify(_attachment_to_dict(att)), 201


# ------------------------------------------------------------------ list
@uploads_bp.get("")
@jwt_required()
def list_attachments():
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    task_id = request.args.get("task_id", type=int)
    bug_id = request.args.get("bug_id", type=int)

    # If filtering by specific task/bug, verify access first
    if task_id:
        task = db.session.get(Task, task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not can_access_task(user, role, task):
            return jsonify({"error": "Not authorized to view attachments for this task"}), 403

    if bug_id:
        bug = db.session.get(Bug, bug_id)
        if not bug:
            return jsonify({"error": "Bug not found"}), 404
        if not can_access_bug(user, role, bug):
            return jsonify({"error": "Not authorized to view attachments for this bug"}), 403

    query = Attachment.query
    if task_id:
        query = query.filter_by(task_id=task_id)
    if bug_id:
        query = query.filter_by(bug_id=bug_id)

    attachments = query.order_by(Attachment.created_at.desc()).all()

    # If no specific filter was applied, post-filter by access
    if not task_id and not bug_id:
        attachments = [a for a in attachments if _can_access_attachment(user, role, a)]

    return jsonify([_attachment_to_dict(a) for a in attachments]), 200


# ------------------------------------------------------------------ get metadata
@uploads_bp.get("/<int:att_id>")
@jwt_required()
def get_attachment(att_id: int):
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    att = db.session.get(Attachment, att_id)
    if not att:
        return jsonify({"error": "Attachment not found"}), 404

    if not _can_access_attachment(user, role, att):
        return jsonify({"error": "Not authorized to view this attachment"}), 403

    return jsonify(_attachment_to_dict(att)), 200


# ------------------------------------------------------------------ download
@uploads_bp.get("/<int:att_id>/download")
@jwt_required()
def download_attachment(att_id: int):
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    att = db.session.get(Attachment, att_id)
    if not att:
        return jsonify({"error": "Attachment not found"}), 404

    if not _can_access_attachment(user, role, att):
        return jsonify({"error": "Not authorized to download this attachment"}), 403

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    # Send custom attachment filename
    return send_from_directory(
        upload_folder, 
        att.stored_filename, 
        as_attachment=True,
        download_name=att.filename
    )


# ------------------------------------------------------------------ delete
@uploads_bp.delete("/<int:att_id>")
@jwt_required()
def delete_attachment(att_id: int):
    user, role = get_current_user_and_role()
    if not user:
        return jsonify({"error": "User not found"}), 404

    att = db.session.get(Attachment, att_id)
    if not att:
        return jsonify({"error": "Attachment not found"}), 404
        
    # Manager can delete any; others can only delete their own uploads
    if role != "Manager" and att.uploaded_by_id != user.id:
        return jsonify({"error": "Not authorized to delete this attachment"}), 403

    # Delete file from disk
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(upload_folder, att.stored_filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(att)
    db.session.commit()
    return jsonify({"message": "Attachment deleted"}), 200
