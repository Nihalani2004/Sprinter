from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


DEFAULT_DB_PATH = Path("sprint_tracker_db.json")


def save_project(project: Dict[str, Any], path: Path = DEFAULT_DB_PATH) -> None:
    path.write_text(json.dumps(project, indent=2), encoding="utf-8")


def load_project(path: Path = DEFAULT_DB_PATH) -> Dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))

