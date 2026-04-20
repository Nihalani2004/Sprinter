"""
Sprint Tracker — Flask application (SQLAlchemy backend).

All data is persisted in a SQLite database via Flask-SQLAlchemy.
Authentication uses password hashing (Werkzeug) for the web UI and
JWT tokens (flask-jwt-extended) for the REST API layer.

Real-time updates are provided via Flask-SocketIO.
"""

from __future__ import annotations

import os
from datetime import timedelta
from typing import Any, Dict, List

from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from models import (
    BUG_STATUS_FLOW,
    TASK_STATUS_FLOW,
    Bug,
    Sprint,
    Task,
    User,
    can_advance_status,
    db,
)


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.secret_key = os.urandom(24)

    # Database configuration — SQLite file stored next to this script.
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, "sprint_tracker.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT configuration
    app.config["JWT_SECRET_KEY"] = os.urandom(24).hex()
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)

    # Uploads configuration
    app.config["UPLOAD_FOLDER"] = os.path.join(basedir, "uploads")
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

    db.init_app(app)
    JWTManager(app)

    # CORS — allow React dev server
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register API blueprints
    from api.auth import auth_bp
    from api.sprints import sprints_bp
    from api.tasks import tasks_bp
    from api.bugs import bugs_bp
    from api.users import users_bp
    from api.dashboard import dashboard_bp
    from api.notifications import notifications_bp
    from api.uploads import uploads_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(sprints_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(bugs_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(uploads_bp)

    # Create tables on first request (safe no-op if they already exist)
    with app.app_context():
        db.create_all()
        _ensure_password_column()
        _ensure_end_date_column()
        _ensure_sprint_created_by_column()
        _ensure_bug_reported_by_column()
        _ensure_default_users()
        
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    return app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DEFAULT_PASSWORD = "password123"


def _ensure_password_column() -> None:
    """Add the password_hash column if upgrading from an older schema."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("users")]
    if "password_hash" not in columns:
        db.session.execute(
            text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(256)")
        )
        db.session.commit()

def _ensure_end_date_column() -> None:
    """Add the end_date column to sprints if upgrading from an older schema."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("sprints")]
    if "end_date" not in columns:
        db.session.execute(
            text("ALTER TABLE sprints ADD COLUMN end_date DATETIME")
        )
        db.session.commit()


def _ensure_sprint_created_by_column() -> None:
    """Add the created_by_id column to sprints for ownership tracking."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("sprints")]
    if "created_by_id" not in columns:
        db.session.execute(
            text("ALTER TABLE sprints ADD COLUMN created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL")
        )
        db.session.commit()


def _ensure_bug_reported_by_column() -> None:
    """Add the reported_by_id column to bugs for tracking who reported each bug."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("bugs")]
    if "reported_by_id" not in columns:
        db.session.execute(
            text("ALTER TABLE bugs ADD COLUMN reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL")
        )
        db.session.commit()


def _ensure_default_users() -> None:
    """Insert the four default users if they don't already exist.
    Also sets passwords for users that don't have one yet."""
    defaults = {
        "manager": "Manager",
        "dev1": "Developer",
        "dev2": "Developer",
        "tester": "Tester",
    }
    for username, role in defaults.items():
        user = User.query.filter_by(username=username).first()
        if not user:
            user = User(username=username, role=role)
            user.set_password(DEFAULT_PASSWORD)
            db.session.add(user)
        elif not user.password_hash:
            user.set_password(DEFAULT_PASSWORD)
    db.session.commit()


def _next_sprint_id() -> str:
    """Generate a new sprint_id by finding the current max and incrementing."""
    from sqlalchemy import func
    result = db.session.query(func.max(db.cast(Sprint.sprint_id, db.Integer))).scalar()
    return str((result or 0) + 1)


def _next_bug_id() -> str:
    """Generate a new bug_id by finding the current max and incrementing."""
    from sqlalchemy import func
    result = db.session.query(func.max(db.cast(Bug.bug_id, db.Integer))).scalar()
    return str((result or 0) + 1)


def require_login() -> str | None:
    username = session.get("username")
    if not username:
        flash("Please log in first.", "error")
        return None
    return str(username)


def require_role(expected_role: str) -> str | None:
    username = require_login()
    if not username:
        return None
    user = User.query.filter_by(username=username).first()
    if not user or user.role != expected_role:
        flash("You are not authorized to view that page.", "error")
        return None
    return username


def _task_rows(tasks: List[Task]) -> List[Dict[str, Any]]:
    """Convert a list of Task ORM objects into template-friendly dicts."""
    rows: List[Dict[str, Any]] = []
    for task in tasks:
        rows.append(
            {
                "sprint_id": task.sprint_id,
                "task_id": task.task_id,
                "title": task.title,
                "assigned_to": task.assigned_to,
                "status": task.status,
                "bugs": [
                    {
                        "bug_id": b.bug_id,
                        "description": b.description,
                        "status": b.status,
                    }
                    for b in task.bugs
                ],
            }
        )
    return rows


# ---------------------------------------------------------------------------
# Create the app
# ---------------------------------------------------------------------------

app = create_app()

# Initialise SocketIO
from realtime import init_socketio
socketio = init_socketio(app)


# ===================================================================
#  WEB ROUTES — Session-Based Auth (Login / Signup / Logout)
# ===================================================================

@app.get("/")
def login_get():
    return render_template("login.html")


@app.post("/")
def login_post():
    username = (request.form.get("username") or "").strip()
    password = (request.form.get("password") or "").strip()

    if not username:
        flash("Please enter a username.", "error")
        return render_template("login.html", username=username), 400

    if not password:
        flash("Please enter a password.", "error")
        return render_template("login.html", username=username), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        flash("Invalid username or password.", "error")
        return render_template("login.html", username=username), 401

    session["username"] = user.username
    session["role"] = user.role

    if user.role == "Manager":
        return redirect(url_for("manager_dashboard", username=user.username))
    if user.role == "Developer":
        return redirect(url_for("developer_dashboard", username=user.username))
    return redirect(url_for("tester_dashboard", username=user.username))


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "GET":
        return render_template("signup.html")

    username = (request.form.get("username") or "").strip()
    password = (request.form.get("password") or "").strip()
    confirm = (request.form.get("confirm_password") or "").strip()
    role = (request.form.get("role") or "").strip()

    # Validation
    if not username or not password or not role:
        flash("All fields are required.", "error")
        return render_template("signup.html", username=username, role=role), 400

    if len(username) < 3:
        flash("Username must be at least 3 characters.", "error")
        return render_template("signup.html", username=username, role=role), 400

    if len(password) < 6:
        flash("Password must be at least 6 characters.", "error")
        return render_template("signup.html", username=username, role=role), 400

    if password != confirm:
        flash("Passwords do not match.", "error")
        return render_template("signup.html", username=username, role=role), 400

    if role not in ("Manager", "Developer", "Tester"):
        flash("Invalid role selected.", "error")
        return render_template("signup.html", username=username, role=role), 400

    if User.query.filter_by(username=username).first():
        flash("Username already taken. Please choose another.", "error")
        return render_template("signup.html", username=username, role=role), 409

    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    flash(f"Account created! You can now log in as '{username}'.", "success")
    return redirect(url_for("login_get"))


@app.get("/logout")
def logout():
    session.clear()
    flash("Logged out.", "info")
    return redirect(url_for("login_get"))


# ===================================================================
#  WEB ROUTES — Manager (unchanged business logic)
# ===================================================================

@app.get("/manager/<username>")
def manager_dashboard(username: str):
    auth_user = require_role("Manager")
    if not auth_user:
        return redirect(url_for("login_get"))
    if auth_user != username:
        return redirect(url_for("manager_dashboard", username=auth_user))

    sprints = Sprint.query.order_by(Sprint.id).all()
    return render_template("manager.html", username=auth_user, sprints=sprints)


@app.route("/create_sprint", methods=["GET", "POST"])
def create_sprint_page():
    username = require_role("Manager")
    if not username:
        return redirect(url_for("login_get"))

    if request.method == "GET":
        return render_template("create_sprint.html", username=username)

    name = (request.form.get("name") or "").strip()
    duration_raw = (request.form.get("duration") or "").strip()

    if not name:
        flash("Sprint name is required.", "error")
        return render_template("create_sprint.html", username=username, name=name), 400

    try:
        duration_days = int(duration_raw)
    except ValueError:
        flash("Duration must be a number (days).", "error")
        return render_template(
            "create_sprint.html", username=username, name=name, duration=duration_raw
        ), 400

    if duration_days <= 0 or duration_days > 365:
        flash("Duration must be between 1 and 365 days.", "error")
        return render_template(
            "create_sprint.html", username=username, name=name, duration=duration_raw
        ), 400

    sprint_id = _next_sprint_id()
    manager_user = User.query.filter_by(username=username).first()
    sprint = Sprint(
        sprint_id=sprint_id,
        name=name,
        duration_days=duration_days,
        created_by_id=manager_user.id if manager_user else None,
    )
    db.session.add(sprint)
    db.session.commit()

    flash(f"Created sprint \u201c{name}\u201d.", "success")
    return redirect(url_for("manager_dashboard", username=username))


@app.post("/delete_sprint")
def delete_sprint_page():
    username = require_role("Manager")
    if not username:
        return redirect(url_for("login_get"))

    sprint_id = (request.form.get("sprint_id") or "").strip()
    if not sprint_id:
        flash("Sprint ID is required.", "error")
        return redirect(url_for("manager_dashboard", username=username))

    sprint = Sprint.query.filter_by(sprint_id=sprint_id).first()
    if sprint:
        db.session.delete(sprint)  # cascade removes tasks + bugs
        db.session.commit()
        flash(f"Sprint {sprint_id} deleted successfully.", "success")
    else:
        flash("Could not delete sprint (sprint not found).", "error")

    return redirect(url_for("manager_dashboard", username=username))


@app.route("/create_task", methods=["GET", "POST"])
def create_task_page():
    username = require_role("Manager")
    if not username:
        return redirect(url_for("login_get"))

    sprints = Sprint.query.order_by(Sprint.id).all()
    developers = [u.username for u in User.query.filter_by(role="Developer").all()]

    if request.method == "GET":
        return render_template(
            "create_task.html", username=username, sprints=sprints, developers=developers
        )

    sprint_id = (request.form.get("sprint_id") or "").strip()
    task_id = (request.form.get("task_id") or "").strip()
    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()
    assigned_to = (request.form.get("assigned_to") or "").strip() or None

    if not sprint_id or not task_id or not title:
        flash("Sprint, Task ID, and Title are required.", "error")
        return render_template(
            "create_task.html", username=username, sprints=sprints, developers=developers,
            sprint_id=sprint_id, task_id=task_id, title=title,
            description=description, assigned_to=assigned_to,
        ), 400

    sprint = Sprint.query.filter_by(sprint_id=sprint_id).first()
    if not sprint:
        flash("Could not create task (sprint not found or task ID already exists).", "error")
        return render_template(
            "create_task.html", username=username, sprints=sprints, developers=developers,
            sprint_id=sprint_id, task_id=task_id, title=title,
            description=description, assigned_to=assigned_to,
        ), 400

    # Check for duplicate task_id within this sprint
    existing = Task.query.filter_by(sprint_ref_id=sprint.id, task_id=task_id).first()
    if existing:
        flash("Could not create task (sprint not found or task ID already exists).", "error")
        return render_template(
            "create_task.html", username=username, sprints=sprints, developers=developers,
            sprint_id=sprint_id, task_id=task_id, title=title,
            description=description, assigned_to=assigned_to,
        ), 400

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

    flash(f'Task "{title}" created in Sprint {sprint_id}.', "success")
    return redirect(url_for("view_tasks_page"))


@app.post("/assign_task")
def manager_assign_task():
    username = require_role("Manager")
    if not username:
        return redirect(url_for("login_get"))

    sprint_id = (request.form.get("sprint_id") or "").strip()
    task_id = (request.form.get("task_id") or "").strip()
    developer = (request.form.get("assigned_to") or "").strip()

    if not developer:
        flash("Please select a developer.", "error")
        return redirect(url_for("view_tasks_page"))

    sprint = Sprint.query.filter_by(sprint_id=sprint_id).first()
    if not sprint:
        flash("Could not assign task (task not found).", "error")
        return redirect(url_for("view_tasks_page"))

    task = Task.query.filter_by(sprint_ref_id=sprint.id, task_id=task_id).first()
    if not task:
        flash("Could not assign task (task not found).", "error")
        return redirect(url_for("view_tasks_page"))

    dev_user = User.query.filter_by(username=developer).first()
    task.assigned_to_id = dev_user.id if dev_user else None
    db.session.commit()

    flash(f"Task {task_id} assigned to {developer}.", "success")
    return redirect(url_for("view_tasks_page"))


@app.get("/view_tasks")
def view_tasks_page():
    username = require_role("Manager")
    if not username:
        return redirect(url_for("login_get"))

    tasks = Task.query.join(Sprint).order_by(Sprint.id, Task.id).all()
    rows = _task_rows(tasks)
    developers = [u.username for u in User.query.filter_by(role="Developer").all()]

    return render_template(
        "view_tasks.html", username=username, tasks=rows,
        developers=developers, bug_status_flow=list(BUG_STATUS_FLOW),
    )


# ===================================================================
#  WEB ROUTES — Developer (unchanged business logic)
# ===================================================================

@app.get("/developer/<username>")
def developer_dashboard(username: str):
    auth_user = require_role("Developer")
    if not auth_user:
        return redirect(url_for("login_get"))
    if auth_user != username:
        return redirect(url_for("developer_dashboard", username=auth_user))

    user = User.query.filter_by(username=auth_user).first()
    tasks = Task.query.filter_by(assigned_to_id=user.id).all() if user else []
    rows = _task_rows(tasks)

    return render_template(
        "developer.html",
        username=auth_user,
        tasks=rows,
        task_status_flow=list(TASK_STATUS_FLOW),
        bug_status_flow=list(BUG_STATUS_FLOW),
    )


@app.post("/developer/update_task_status")
def developer_update_task_status():
    username = require_role("Developer")
    if not username:
        return redirect(url_for("login_get"))

    sprint_id_str = (request.form.get("sprint_id") or "").strip()
    task_id = (request.form.get("task_id") or "").strip()
    new_status = (request.form.get("new_status") or "").strip()

    sprint = Sprint.query.filter_by(sprint_id=sprint_id_str).first()
    task = Task.query.filter_by(sprint_ref_id=sprint.id, task_id=task_id).first() if sprint else None

    if not task:
        flash("Could not update task status (invalid flow or task not found).", "error")
        return redirect(url_for("developer_dashboard", username=username))

    if new_status not in TASK_STATUS_FLOW:
        flash("Could not update task status (invalid flow or task not found).", "error")
        return redirect(url_for("developer_dashboard", username=username))

    if not can_advance_status(TASK_STATUS_FLOW, task.status, new_status):
        flash("Could not update task status (invalid flow or task not found).", "error")
        return redirect(url_for("developer_dashboard", username=username))

    task.status = new_status
    db.session.commit()

    flash(f"Task {task_id} updated to {new_status}.", "success")
    return redirect(url_for("developer_dashboard", username=username))


@app.post("/developer/update_bug_status")
def developer_update_bug_status():
    username = require_role("Developer")
    if not username:
        return redirect(url_for("login_get"))

    sprint_id_str = (request.form.get("sprint_id") or "").strip()
    task_id = (request.form.get("task_id") or "").strip()
    bug_id = (request.form.get("bug_id") or "").strip()
    new_status = (request.form.get("new_status") or "").strip()

    sprint = Sprint.query.filter_by(sprint_id=sprint_id_str).first()
    task = Task.query.filter_by(sprint_ref_id=sprint.id, task_id=task_id).first() if sprint else None
    bug = Bug.query.filter_by(task_ref_id=task.id, bug_id=bug_id).first() if task else None

    if not bug:
        flash("Could not update bug status (invalid flow or bug not found).", "error")
        return redirect(url_for("developer_dashboard", username=username))

    if new_status not in BUG_STATUS_FLOW or not can_advance_status(BUG_STATUS_FLOW, bug.status, new_status):
        flash("Could not update bug status (invalid flow or bug not found).", "error")
        return redirect(url_for("developer_dashboard", username=username))

    bug.status = new_status
    db.session.commit()

    flash(f"Bug {bug_id} updated to {new_status}.", "success")
    return redirect(url_for("developer_dashboard", username=username))


# ===================================================================
#  WEB ROUTES — Tester (unchanged business logic)
# ===================================================================

@app.get("/tester/<username>")
def tester_dashboard(username: str):
    auth_user = require_role("Tester")
    if not auth_user:
        return redirect(url_for("login_get"))
    if auth_user != username:
        return redirect(url_for("tester_dashboard", username=auth_user))

    tasks = Task.query.filter_by(status="Testing").all()
    rows = _task_rows(tasks)

    return render_template(
        "tester.html",
        username=auth_user,
        tasks=rows,
        bug_status_flow=list(BUG_STATUS_FLOW),
    )


@app.post("/tester/add_bug")
def tester_add_bug():
    username = require_role("Tester")
    if not username:
        return redirect(url_for("login_get"))

    sprint_id_str = (request.form.get("sprint_id") or "").strip()
    task_id = (request.form.get("task_id") or "").strip()
    description = (request.form.get("description") or "").strip()

    if not description:
        flash("Bug description is required.", "error")
        return redirect(url_for("tester_dashboard", username=username))

    sprint = Sprint.query.filter_by(sprint_id=sprint_id_str).first()
    task = Task.query.filter_by(sprint_ref_id=sprint.id, task_id=task_id).first() if sprint else None

    if not task:
        flash("Could not add bug (task not found).", "error")
        return redirect(url_for("tester_dashboard", username=username))

    new_bug_id = _next_bug_id()
    tester_user = User.query.filter_by(username=username).first()
    bug = Bug(
        bug_id=new_bug_id,
        description=description,
        task_ref_id=task.id,
        reported_by_id=tester_user.id if tester_user else None,
    )
    db.session.add(bug)
    db.session.commit()

    flash(f"Added bug {new_bug_id} to task {task_id}.", "success")
    return redirect(url_for("tester_dashboard", username=username))


@app.post("/tester/update_bug_status")
def tester_update_bug_status():
    username = require_role("Tester")
    if not username:
        return redirect(url_for("login_get"))

    sprint_id_str = (request.form.get("sprint_id") or "").strip()
    task_id = (request.form.get("task_id") or "").strip()
    bug_id = (request.form.get("bug_id") or "").strip()
    new_status = (request.form.get("new_status") or "").strip()

    sprint = Sprint.query.filter_by(sprint_id=sprint_id_str).first()
    task = Task.query.filter_by(sprint_ref_id=sprint.id, task_id=task_id).first() if sprint else None
    bug = Bug.query.filter_by(task_ref_id=task.id, bug_id=bug_id).first() if task else None

    if not bug:
        flash("Could not update bug status (invalid flow or bug not found).", "error")
        return redirect(url_for("tester_dashboard", username=username))

    if new_status not in BUG_STATUS_FLOW or not can_advance_status(BUG_STATUS_FLOW, bug.status, new_status):
        flash("Could not update bug status (invalid flow or bug not found).", "error")
        return redirect(url_for("tester_dashboard", username=username))

    bug.status = new_status
    db.session.commit()

    flash(f"Bug {bug_id} updated to {new_status}.", "success")
    return redirect(url_for("tester_dashboard", username=username))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Run from: python project/app.py
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
