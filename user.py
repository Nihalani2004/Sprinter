from __future__ import annotations

from typing import Any, Dict, Optional


ROLES = ("Manager", "Developer", "Tester")


def seed_default_users(project: Dict[str, Any]) -> None:
    """
    Minimal role mapping. You can extend this later to support registration.
    """
    project.setdefault("users", {})
    defaults = {
        "manager": {"role": "Manager"},
        "dev1": {"role": "Developer"},
        "dev2": {"role": "Developer"},
        "tester": {"role": "Tester"},
    }
    for username, user in defaults.items():
        project["users"].setdefault(username, user)


def get_user_role(project: Dict[str, Any], username: str) -> Optional[str]:
    user = project.get("users", {}).get(username)
    if not user:
        return None
    return user.get("role")


def is_role(project: Dict[str, Any], username: str, role: str) -> bool:
    return get_user_role(project, username) == role

