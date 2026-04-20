"""
Seed script — creates the SQLite database and populates it with default users
and (optionally) sample sprint / task / bug data for demonstration.

Usage:
    python project/seed_db.py            # seed default users + sample data
    python project/seed_db.py --empty    # seed default users only (no sample data)
"""

from __future__ import annotations

import sys

from app import create_app
from models import Bug, Sprint, Task, User, db


def seed_users() -> dict[str, User]:
    """Insert the four default users if they don't already exist."""
    defaults = {
        "manager": "Manager",
        "dev1": "Developer",
        "dev2": "Developer",
        "tester": "Tester",
    }
    users: dict[str, User] = {}
    for username, role in defaults.items():
        user = User.query.filter_by(username=username).first()
        if not user:
            user = User(username=username, role=role)
            user.set_password("password123")
            db.session.add(user)
        elif not user.password_hash:
            user.set_password("password123")
        users[username] = user
    db.session.commit()
    return users


def seed_sample_data(users: dict[str, User]) -> None:
    """Insert a handful of sample sprints, tasks, and bugs for demo purposes."""

    # -- Sprint 1 -----------------------------------------------------------
    s1 = Sprint(sprint_id="1", name="Auth Module", duration_days=7)
    db.session.add(s1)
    db.session.flush()  # get s1.id

    t1 = Task(
        task_id="T1",
        title="Build login page",
        description="Create the login page UI with email and password fields",
        status="Testing",
        sprint_ref_id=s1.id,
        assigned_to_id=users["dev1"].id,
    )
    t2 = Task(
        task_id="T2",
        title="Implement JWT auth",
        description="Add JWT token generation and validation",
        status="In Progress",
        sprint_ref_id=s1.id,
        assigned_to_id=users["dev2"].id,
    )
    db.session.add_all([t1, t2])
    db.session.flush()

    b1 = Bug(
        bug_id="1",
        description="Login button not responding on mobile",
        status="Open",
        task_ref_id=t1.id,
    )
    db.session.add(b1)

    # -- Sprint 2 -----------------------------------------------------------
    s2 = Sprint(sprint_id="2", name="Dashboard & Reports", duration_days=14)
    db.session.add(s2)
    db.session.flush()

    t3 = Task(
        task_id="T3",
        title="Design dashboard layout",
        description="Wire-frame and implement the main dashboard",
        status="Pending",
        sprint_ref_id=s2.id,
        assigned_to_id=users["dev1"].id,
    )
    db.session.add(t3)

    db.session.commit()
    print("[OK] Sample data seeded (2 sprints, 3 tasks, 1 bug).")


def main() -> None:
    empty_mode = "--empty" in sys.argv

    app = create_app()
    with app.app_context():
        db.create_all()
        print("[OK] Database tables created.")

        users = seed_users()
        print(f"[OK] Default users ensured: {', '.join(users.keys())}")

        if not empty_mode:
            # Only seed sample data if no sprints exist yet
            if Sprint.query.count() == 0:
                seed_sample_data(users)
            else:
                print("[SKIP] Sample data skipped (sprints already exist).")
        else:
            print("[SKIP] Sample data skipped (--empty flag).")

    print("\nDone. Run the app with:  py project/app.py")


if __name__ == "__main__":
    main()
