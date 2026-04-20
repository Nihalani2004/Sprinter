"""
SQLAlchemy models for the Sprint Tracker application.

Four models: User, Sprint, Task, Bug — with proper foreign-key relationships
and cascade deletes so that removing a Sprint also removes its Tasks and Bugs.

Every model exposes a lightweight ``to_dict()`` helper so that existing Jinja2
templates continue to work without modification.
"""

from __future__ import annotations

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# ---------------------------------------------------------------------------
# Status-flow constants (previously in data.py)
# ---------------------------------------------------------------------------

TASK_STATUS_FLOW = ("Pending", "In Progress", "Testing", "Completed")
BUG_STATUS_FLOW = ("Open", "Fixed", "Verified", "Closed")


def can_advance_status(flow: tuple, current: str, new: str) -> bool:
    """Return True when *new* is at the same position or later than *current*."""
    if current not in flow or new not in flow:
        return False
    return flow.index(new) >= flow.index(current)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)  # Manager / Developer / Tester
    password_hash = db.Column(db.String(256), nullable=True)  # nullable for migration

    # Back-reference: tasks assigned to this user
    tasks = db.relationship("Task", back_populates="developer", lazy="select")
    
    # Back-reference: notifications for this user
    notifications = db.relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )

    def set_password(self, password: str) -> None:
        """Hash and store the given plaintext password."""
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plaintext password against the stored hash."""
        from werkzeug.security import check_password_hash
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f"<User {self.username!r} ({self.role})>"


class Sprint(db.Model):
    __tablename__ = "sprints"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sprint_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)
    end_date = db.Column(db.DateTime, nullable=True)

    # FK to User (manager who created this sprint) — nullable for migration
    created_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    creator = db.relationship("User", foreign_keys=[created_by_id])

    # Children
    tasks = db.relationship(
        "Task",
        back_populates="sprint",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Sprint {self.sprint_id!r} – {self.name!r}>"


class Task(db.Model):
    __tablename__ = "tasks"
    __table_args__ = (
        db.UniqueConstraint("sprint_ref_id", "task_id", name="uq_sprint_task"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    task_id = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(30), nullable=False, default=TASK_STATUS_FLOW[0])

    # FK to Sprint
    sprint_ref_id = db.Column(
        db.Integer, db.ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False
    )
    sprint = db.relationship("Sprint", back_populates="tasks")

    # FK to User (developer assigned)
    assigned_to_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    developer = db.relationship("User", back_populates="tasks")

    # Children
    bugs = db.relationship(
        "Bug",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="select",
    )
    
    attachments = db.relationship(
        "Attachment",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="select",
    )

    # --- Convenience properties used by templates --------------------------

    @property
    def sprint_id(self) -> str:
        """Return the human-visible sprint_id string (e.g. '1')."""
        return self.sprint.sprint_id if self.sprint else ""

    @property
    def assigned_to(self) -> str:
        """Return the developer username or '-'."""
        return self.developer.username if self.developer else "-"

    def __repr__(self) -> str:
        return f"<Task {self.task_id!r} in Sprint {self.sprint_id!r}>"


class Bug(db.Model):
    __tablename__ = "bugs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bug_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default=BUG_STATUS_FLOW[0])

    # FK to Task
    task_ref_id = db.Column(
        db.Integer, db.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    task = db.relationship("Task", back_populates="bugs")

    # FK to User (who reported this bug) — nullable for migration
    reported_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reporter = db.relationship("User", foreign_keys=[reported_by_id])
    
    attachments = db.relationship(
        "Attachment",
        back_populates="bug",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Bug {self.bug_id!r} ({self.status})>"


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # task_assigned, bug_reported, deadline_alert
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    related_id = db.Column(db.String(50), nullable=True) # string task_id or bug_id
    related_type = db.Column(db.String(30), nullable=True) # "task", "bug", "sprint"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = db.relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification {self.id} for U:{self.user_id} - {self.type}>"


class Attachment(db.Model):
    __tablename__ = "attachments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    bug_id = db.Column(db.Integer, db.ForeignKey("bugs.id", ondelete="CASCADE"), nullable=True)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    uploaded_by = db.relationship("User")
    task = db.relationship("Task", back_populates="attachments")
    bug = db.relationship("Bug", back_populates="attachments")

    def __repr__(self) -> str:
        return f"<Attachment {self.filename} ({self.file_size} bytes)>"

