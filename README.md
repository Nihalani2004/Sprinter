# Software Development Sprint Tracker (CLI, Pure Python)

A menu-driven **Agile Sprint → Tasks → Bugs → Status** tracker built with **pure Python** and **dictionaries** as the primary data structure.  
Includes **role-based menus** (Manager / Developer / Tester) and optional **JSON save/load**.

---

## Features

### Roles (simple login by username)
- **Manager**
  - Create sprints
  - Create tasks inside sprints
  - Assign tasks to developers
  - View all tasks
- **Developer**
  - View tasks assigned to them
  - Update task status
  - Update bug status (e.g., mark bugs as Fixed)
- **Tester**
  - View tasks in Testing
  - Add bugs to tasks
  - Update bug status (e.g., Verified/Closed)

### Status flows (validated)
- **Task**: `Pending → In Progress → Testing → Completed`
- **Bug**: `Open → Fixed → Verified → Closed`

### Storage
- Primary storage is **in-memory dictionaries**.
- Optional persistence to `sprint_tracker_db.json` (auto-saved on logout/exit).

---

## Project structure

```
python project/
├─ main.py        # Entry point + role-based CLI menus
├─ data.py        # Dictionary “models”, status flows, transition checks
├─ sprint.py      # Sprint create/list/view helpers
├─ task.py        # Task create/assign/status/list helpers
├─ bug.py         # Bug add/list/status helpers
├─ user.py        # Roles + seeded users
├─ storage.py     # JSON save/load helpers
└─ sprint_tracker_db.json  # Created automatically after first save (if you run the app)
```

---

## Default users

Use these usernames at login:
- **Manager**: `manager`
- **Developer**: `dev1`, `dev2`
- **Tester**: `tester`

---

## How to run (Windows / PowerShell)

Open PowerShell and run:

```powershell
cd project
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

If `python` is not found, try:

```powershell
py .\main.py
```

---

## Example workflow (quick)

1. **Manager**
   - Create a sprint (name + duration)
   - Create a task inside that sprint
   - Assign it to `dev1`
2. **Developer (`dev1`)**
   - Move task `Pending → In Progress → Testing`
3. **Tester**
   - View tasks in `Testing`
   - Add a bug
4. **Developer**
   - Mark bug `Fixed`
5. **Tester**
   - Mark bug `Verified → Closed`
   - (Optionally) Developer/Manager moves task to `Completed`

---

## Notes / design choices
- The app uses a single shared dictionary called `project`:
  - `project["sprints"]` stores multiple sprints
  - Each sprint stores tasks in `sprint["tasks"]`
  - Each task stores bugs in `task["bugs"]`
- Status transitions are restricted to move **forward** in the defined flow.

