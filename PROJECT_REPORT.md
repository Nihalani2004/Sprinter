# Software Development Sprint Tracker — Detailed Project Report

**Project Title:** Software Development Sprint Tracker  
**Technology:** Python · Flask · Tkinter · JSON · HTML/CSS  
**Author:** Mayank Nihalani  
**Date:** April 2026  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Objectives](#2-objectives)
3. [System Requirements](#3-system-requirements)
4. [Project Structure](#4-project-structure)
5. [Architecture Overview](#5-architecture-overview)
6. [Data Model](#6-data-model)
7. [Modules – Detailed Description](#7-modules--detailed-description)
8. [Role-Based Access Control](#8-role-based-access-control)
9. [Status Workflow Rules](#9-status-workflow-rules)
10. [Flask Web Application – Routes & Templates](#10-flask-web-application--routes--templates)
11. [Feature Summary by Role](#11-feature-summary-by-role)
12. [User Interface Screenshots Description](#12-user-interface-screenshots-description)
13. [How to Run the Project](#13-how-to-run-the-project)
14. [Sample Workflow](#14-sample-workflow)
15. [Future Enhancements](#15-future-enhancements)
16. [Conclusion](#16-conclusion)

---

## 1. Introduction

The **Software Development Sprint Tracker** is a full-stack Agile project management tool built with Python. It simulates how real software development teams manage their work using **Sprints**, **Tasks**, and **Bugs** following an Agile/Scrum methodology.

The application supports **three user roles** — Manager, Developer, and Tester — each with specific permissions and dashboards. The system enforces forward-only status transitions for both tasks and bugs, ensuring a disciplined workflow.

The project provides **three independent user interfaces** that share the same underlying backend logic:

| Interface | Technology | Entry Point |
|-----------|------------|-------------|
| Command-Line Interface (CLI) | Pure Python (`input()`/`print()`) | `main.py` |
| Desktop GUI | Python Tkinter | `ui/app.py` |
| Web Application | Flask + HTML/CSS + Jinja2 | `project/app.py` |

---

## 2. Objectives

- Build an Agile Sprint Management System with role-based access control.
- Implement Sprint, Task, and Bug lifecycle management with enforced status workflows.
- Use **Python dictionaries** as the primary in-memory data structure.
- Provide persistent storage via JSON files.
- Deliver three different UIs (CLI, desktop, and web) all sharing the same backend logic.
- Enable cross-role visibility: bugs filed by Testers are visible to Developers and Managers.

---

## 3. System Requirements

### Software Requirements

| Component | Requirement |
|-----------|-------------|
| Python | 3.10 or higher |
| Flask | 3.0.0 or higher |
| Browser | Any modern browser (Chrome, Firefox, Edge) |
| Operating System | Windows / macOS / Linux |

### Hardware Requirements

| Component | Minimum |
|-----------|---------|
| RAM | 2 GB |
| Disk Space | 50 MB |
| Processor | Any modern CPU |

### Dependencies

```
Flask>=3.0.0
```

The CLI and Tkinter GUI require **no external dependencies** — they use Python's standard library only.

---

## 4. Project Structure

```
python project flask/
│
├── main.py                        # CLI entry point — menu-driven terminal interface
├── data.py                        # Data models, factory functions, status flow definitions
├── sprint.py                      # Sprint CRUD operations (create, list, delete)
├── task.py                        # Task CRUD operations (create, assign, update status, queries)
├── bug.py                         # Bug CRUD operations (add, update status, list)
├── user.py                        # User role management and default user seeding
├── storage.py                     # JSON save/load persistence helpers
├── sprint_tracker_db.json         # Auto-generated JSON database file
├── README.md                      # Original project README
├── PROJECT_REPORT.md              # This report file
│
├── project/                       # Flask Web Application
│   ├── app.py                     # Flask app — all routes, auth, business logic wiring
│   ├── requirements.txt           # Python dependencies (Flask>=3.0.0)
│   ├── static/
│   │   └── style.css              # Complete CSS stylesheet (322 lines)
│   └── templates/
│       ├── base.html              # Base layout (navbar, alerts, session handling)
│       ├── login.html             # Login page
│       ├── manager.html           # Manager dashboard (sprints list, create/delete)
│       ├── create_sprint.html     # Create sprint form
│       ├── create_task.html       # Create task form (sprint dropdown, dev assignment)
│       ├── view_tasks.html        # All tasks view with bug reports and assignment
│       ├── developer.html         # Developer dashboard (tasks, bugs, status updates)
│       └── tester.html            # Tester dashboard (testing tasks, add/update bugs)
│
└── ui/                            # Tkinter Desktop GUI
    └── app.py                     # Full desktop application using tkinter
```

### File Count Summary

| Category | Files | Lines of Code (approx.) |
|----------|-------|------------------------|
| Backend modules | 6 files | ~420 lines |
| Flask web app | 1 file | ~422 lines |
| HTML templates | 8 files | ~500 lines |
| CSS stylesheet | 1 file | ~322 lines |
| Tkinter GUI | 1 file | ~417 lines |
| CLI | 1 file | ~215 lines |
| **Total** | **18 files** | **~2,300 lines** |

---

## 5. Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                     │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │   CLI   │   │  Tkinter GUI │   │  Flask Web App  │  │
│  │ main.py │   │  ui/app.py   │   │ project/app.py  │  │
│  └────┬────┘   └──────┬───────┘   └────────┬────────┘  │
│       │               │                     │            │
├───────┼───────────────┼─────────────────────┼────────────┤
│       │        BUSINESS LOGIC LAYER         │            │
│       │               │                     │            │
│  ┌────┴───────────────┴─────────────────────┴────────┐  │
│  │  data.py │ sprint.py │ task.py │ bug.py │ user.py │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                                │
├─────────────────────────┼────────────────────────────────┤
│                   DATA ACCESS LAYER                      │
│                         │                                │
│              ┌──────────┴──────────┐                     │
│              │     storage.py      │                     │
│              └──────────┬──────────┘                     │
│                         │                                │
│              ┌──────────┴──────────┐                     │
│              │ sprint_tracker_db   │                     │
│              │      .json          │                     │
│              └─────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Shared Backend:** All three interfaces import and use the same backend modules, ensuring consistent business logic across CLI, GUI, and web.
2. **Dictionary-Based Data Model:** The entire project state is stored in a single nested Python dictionary — no ORM or relational database is used.
3. **JSON Persistence:** Data is serialized to `sprint_tracker_db.json` and automatically loaded on startup.
4. **Functional Design Pattern:** Factory functions create data objects; helper functions perform operations. No class hierarchies are used in the backend.

---

## 6. Data Model

### In-Memory Dictionary Structure

```python
project = {
    "sprints": {
        "<sprint_id>": {
            "sprint_id": "1",
            "name": "Sprint Alpha",
            "duration_days": 14,
            "tasks": {
                "<task_id>": {
                    "id": "T1",
                    "title": "Build login page",
                    "description": "Create the login page UI",
                    "assigned_to": "dev1",       # Developer username or None
                    "status": "Pending",          # One of the TASK_STATUS_FLOW values
                    "bugs": [
                        {
                            "bug_id": "1",
                            "description": "Login button not responding",
                            "status": "Open"      # One of the BUG_STATUS_FLOW values
                        }
                    ]
                }
            }
        }
    },
    "users": {
        "manager": {"role": "Manager"},
        "dev1":    {"role": "Developer"},
        "dev2":    {"role": "Developer"},
        "tester":  {"role": "Tester"}
    },
    "meta": {
        "next_sprint_id": 2,
        "next_bug_id": 2
    }
}
```

### Entity Relationships

```
Project (1)
  └── Sprints (many)
        └── Tasks (many)
              └── Bugs (many)

Project (1)
  └── Users (many)
```

- A **Project** contains multiple **Sprints**.
- A **Sprint** contains multiple **Tasks**.
- A **Task** contains multiple **Bugs** and is assigned to one **Developer**.
- **Users** are stored separately with their role mapping.

---

## 7. Modules – Detailed Description

### 7.1 `data.py` — Data Models & Status Rules

This module defines the core data structures and validation rules.

**Constants:**
- `TASK_STATUS_FLOW = ("Pending", "In Progress", "Testing", "Completed")`
- `BUG_STATUS_FLOW = ("Open", "Fixed", "Verified", "Closed")`

**Factory Functions:**
| Function | Returns |
|----------|---------|
| `new_project()` | Empty project dictionary with sprints, users, and meta sections |
| `new_sprint(sprint_id, name, duration_days)` | Sprint dictionary with empty tasks |
| `new_task(task_id, title, description, assigned_to)` | Task dictionary with status "Pending" |
| `new_bug(bug_id, description)` | Bug dictionary with status "Open" |

**Validation Functions:**
| Function | Purpose |
|----------|---------|
| `is_valid_task_status(status)` | Checks if a status string is in TASK_STATUS_FLOW |
| `is_valid_bug_status(status)` | Checks if a status string is in BUG_STATUS_FLOW |
| `can_advance_status(flow, current, new)` | Ensures the new status is at or ahead of the current status in the flow |

### 7.2 `sprint.py` — Sprint Management

| Function | Description |
|----------|-------------|
| `create_sprint(project, name, duration_days)` | Creates a sprint with an auto-incremented ID |
| `get_sprint(project, sprint_id)` | Returns a specific sprint or `None` |
| `list_sprints(project)` | Returns all sprints as a dictionary |
| `delete_sprint(project, sprint_id)` | Deletes a sprint and all its tasks/bugs |
| `print_all_sprints(project)` | Prints formatted sprint summaries (CLI) |

### 7.3 `task.py` — Task Management

| Function | Description |
|----------|-------------|
| `create_task(project, sprint_id, task_id, title, desc, assigned_to)` | Creates a task inside a sprint |
| `assign_task(project, sprint_id, task_id, developer)` | Assigns/reassigns a task to a developer |
| `update_task_status(project, sprint_id, task_id, new_status)` | Updates status with flow validation |
| `list_all_tasks(project)` | Returns all tasks across all sprints |
| `list_tasks_for_developer(project, username)` | Returns tasks assigned to a specific developer |
| `list_tasks_in_testing(project)` | Returns tasks with status "Testing" |

### 7.4 `bug.py` — Bug Management

| Function | Description |
|----------|-------------|
| `add_bug_to_task(project, sprint_id, task_id, description)` | Creates a bug under a specific task |
| `update_bug_status(project, sprint_id, task_id, bug_id, new_status)` | Updates bug status with flow validation |
| `list_bugs_for_task(project, sprint_id, task_id)` | Returns all bugs for a given task |

### 7.5 `user.py` — User & Role Management

| Function | Description |
|----------|-------------|
| `seed_default_users(project)` | Initializes 4 default users (manager, dev1, dev2, tester) |
| `get_user_role(project, username)` | Returns the role string for a given username |
| `is_role(project, username, role)` | Checks if a user has a specific role |

### 7.6 `storage.py` — JSON Persistence

| Function | Description |
|----------|-------------|
| `save_project(project, path)` | Serializes the project dictionary to a JSON file |
| `load_project(path)` | Loads and deserializes from JSON; returns `None` if file doesn't exist |

---

## 8. Role-Based Access Control

### Default Users

| Username | Role | Password |
|----------|------|----------|
| `manager` | Manager | N/A (username-only auth) |
| `dev1` | Developer | N/A |
| `dev2` | Developer | N/A |
| `tester` | Tester | N/A |

### Permission Matrix

| Action | Manager | Developer | Tester |
|--------|:-------:|:---------:|:------:|
| Create Sprint | ✅ | ❌ | ❌ |
| Delete Sprint | ✅ | ❌ | ❌ |
| Create Task | ✅ | ❌ | ❌ |
| Assign Task to Developer | ✅ | ❌ | ❌ |
| View All Tasks | ✅ | ❌ | ❌ |
| View Own Assigned Tasks | ❌ | ✅ | ❌ |
| Update Task Status | ❌ | ✅ | ❌ |
| View Bugs on Own Tasks | ❌ | ✅ | ❌ |
| Update Bug Status (e.g. Fixed) | ❌ | ✅ | ❌ |
| View Tasks in Testing | ❌ | ❌ | ✅ |
| Add Bug to Task | ❌ | ❌ | ✅ |
| Update Bug Status (Verified/Closed) | ❌ | ❌ | ✅ |

---

## 9. Status Workflow Rules

### Task Status Flow

```
Pending  →  In Progress  →  Testing  →  Completed
```

- Tasks always start at **Pending**.
- Statuses can only move **forward** (left to right).
- Going backwards (e.g., Testing → Pending) is **not allowed**.

### Bug Status Flow

```
Open  →  Fixed  →  Verified  →  Closed
```

- Bugs always start at **Open**.
- Developers typically mark bugs as **Fixed**.
- Testers verify fixes and move bugs to **Verified** or **Closed**.

### Enforcement

The function `can_advance_status(flow, current, new)` in `data.py` validates every status change:

```python
def can_advance_status(flow, current, new):
    if current not in flow or new not in flow:
        return False
    return flow.index(new) >= flow.index(current)
```

---

## 10. Flask Web Application – Routes & Templates

### 10.1 All Flask Routes

| Method | URL | Function | Role | Description |
|--------|-----|----------|------|-------------|
| GET | `/` | `login_get` | Public | Display login form |
| POST | `/` | `login_post` | Public | Authenticate user, redirect to dashboard |
| GET | `/logout` | `logout` | Any | Clear session, redirect to login |
| GET | `/manager/<username>` | `manager_dashboard` | Manager | Dashboard with sprints list |
| GET/POST | `/create_sprint` | `create_sprint_page` | Manager | Create a new sprint |
| POST | `/delete_sprint` | `delete_sprint_page` | Manager | Delete an existing sprint |
| GET/POST | `/create_task` | `create_task_page` | Manager | Create a task in a sprint |
| POST | `/assign_task` | `manager_assign_task` | Manager | Assign/reassign a task to a developer |
| GET | `/view_tasks` | `view_tasks_page` | Manager | View all tasks with bug details |
| GET | `/developer/<username>` | `developer_dashboard` | Developer | View assigned tasks and bugs |
| POST | `/developer/update_task_status` | `developer_update_task_status` | Developer | Update task status |
| POST | `/developer/update_bug_status` | `developer_update_bug_status` | Developer | Update bug status (e.g. mark Fixed) |
| GET | `/tester/<username>` | `tester_dashboard` | Tester | View tasks in Testing |
| POST | `/tester/add_bug` | `tester_add_bug` | Tester | Add a bug to a task |
| POST | `/tester/update_bug_status` | `tester_update_bug_status` | Tester | Update bug status (Verified/Closed) |

**Total: 15 routes** (7 GET, 8 POST)

### 10.2 HTML Templates

| Template | Used By | Description |
|----------|---------|-------------|
| `base.html` | All pages | Base layout with navbar, session info, flash alerts |
| `login.html` | Public | Username input form |
| `manager.html` | Manager | Sprint list cards with Create/Delete buttons |
| `create_sprint.html` | Manager | Sprint name + duration form |
| `create_task.html` | Manager | Task form with sprint dropdown, developer assignment |
| `view_tasks.html` | Manager | All tasks as cards with assign forms and bug reports |
| `developer.html` | Developer | Task cards with status update + bug list with update forms |
| `tester.html` | Tester | Testing tasks with add bug form + bug status management |

### 10.3 CSS Design System

The `style.css` file (322 lines) implements a complete design system with:

- **CSS Custom Properties** for consistent theming (colors, radius, shadows)
- **Glassmorphism navbar** with backdrop blur
- **Card-based layouts** with rounded corners and subtle shadows
- **Responsive grid** that collapses to single column on mobile
- **Status badges** with color-coded backgrounds (Pending=gray, In Progress=blue, Testing=amber, Completed=green)
- **Bug status badges** (Open=red, Fixed=blue, Verified=amber, Closed=green)
- **Danger buttons** for destructive actions (Delete sprint)
- **Flash alerts** with success/error/info color variants

---

## 11. Feature Summary by Role

### Manager Features

1. **Dashboard** — View all sprints with task count, duration, and Delete buttons.
2. **Create Sprint** — Form with name and duration (1–365 days).
3. **Delete Sprint** — Remove a sprint and all its tasks/bugs (with confirmation dialog).
4. **Create Task** — Form with sprint dropdown, task ID, title, description, and developer assignment.
5. **View All Tasks** — Card-based view showing every task with:
   - Current status badge
   - Developer assignment dropdown with Assign button
   - Bug reports section showing all bugs with their status
6. **Bug Visibility** — Manager can see all bugs reported by testers across all tasks.

### Developer Features

1. **Dashboard** — View only tasks assigned to the logged-in developer.
2. **Update Task Status** — Dropdown selector with Save button to advance task status:
   - `Pending → In Progress → Testing → Completed`
3. **View Bugs** — See all bugs reported against their tasks, with:
   - Bug ID, description, and current status
   - Bug count per task
4. **Update Bug Status** — Dropdown to change bug status (e.g., mark as `Fixed`).

### Tester Features

1. **Dashboard** — View tasks that are currently in `Testing` status.
2. **Add Bug** — File bug reports against tasks with a description.
3. **View Bugs** — See all existing bugs for each testing task.
4. **Update Bug Status** — Change status to `Verified` or `Closed`.

---

## 12. User Interface Screenshots Description

### Login Page
- Clean centered login form with username input
- Hint text showing available usernames (manager, dev1, dev2, tester)
- Styled with rounded card and gradient background

### Manager Dashboard
- Header with "Create sprint", "Create task", and "View tasks" buttons
- Left column: Sprint cards showing name, ID, duration, task count, and red Delete button
- Right column: Quick tips showing Task and Bug status flows

### Create Task Page
- Sprint dropdown selector (populated from existing sprints)
- Task ID, Title, and Description input fields
- Developer assignment dropdown (populated with dev1, dev2)
- Create and Cancel buttons

### View Tasks Page (Manager)
- Cards for each task showing title, sprint ID, task ID, status badge, and bug count
- Inline developer assignment dropdown with Assign button
- Expandable "Bug reports" section showing bug details under each task

### Developer Dashboard
- Task cards showing title, sprint/task IDs, and status badge
- Two-column layout per task:
  - Left: Task status update dropdown + Save button
  - Right: Bug list with bug ID, description, status, and Update button
- Bug count shown as "Bugs (N)" heading

### Tester Dashboard
- Task cards for tasks currently in "Testing" status
- Two-column layout per task:
  - Left: Add bug form with description input and Add button
  - Right: Existing bugs with status dropdown and Update button

---

## 13. How to Run the Project

### Prerequisites

```bash
pip install flask
```

### Running the Flask Web Application

```powershell
cd "python project flask"
py .\project\app.py
```

Then open a browser and navigate to: **http://127.0.0.1:5000**

### Running the CLI

```powershell
cd "python project flask"
py .\main.py
```

### Running the Tkinter GUI

```powershell
cd "python project flask"
py .\ui\app.py
```

---

## 14. Sample Workflow

This walkthrough demonstrates the complete Agile cycle across all three roles:

### Step 1 — Manager Creates Sprint & Task

1. Login as `manager`
2. Click **Create Sprint** → Enter name "Sprint Alpha", duration 14 days → Submit
3. Click **Create Task** → Select "Sprint Alpha", Task ID "T1", Title "Build Login Page", Assign to "dev1" → Submit
4. Task appears in **View Tasks** with status Pending, assigned to dev1

### Step 2 — Developer Works on Task

1. Logout → Login as `dev1`
2. Task "Build Login Page" appears in the Developer Dashboard
3. Change status from **Pending → In Progress** → Click Save
4. After implementation, change status from **In Progress → Testing** → Click Save
5. Task is now ready for testing

### Step 3 — Tester Tests & Files Bugs

1. Logout → Login as `tester`
2. Task "Build Login Page" appears in the Tester Dashboard (status: Testing)
3. In the "Add bug" section, type "Login button not responding" → Click Add
4. Bug #1 appears with status **Open**

### Step 4 — Developer Fixes Bug

1. Logout → Login as `dev1`
2. Task "Build Login Page" now shows **Bugs (1)** with "Login button not responding"
3. Change bug status from **Open → Fixed** → Click Update

### Step 5 — Tester Verifies & Closes Bug

1. Logout → Login as `tester`
2. Bug status is now "Fixed" — change to **Verified** → Click Update
3. Change to **Closed** → Click Update
4. Bug lifecycle is complete

### Step 6 — Task Completion

1. Developer or Manager moves task from **Testing → Completed**
2. Manager can view the full history in **View Tasks** page

---

## 15. Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| User Registration | Allow new users to register with password authentication |
| Sprint Dates | Add start/end dates and track sprint progress over time |
| Task Priority | Add priority levels (Low, Medium, High, Critical) |
| Comments | Allow team members to leave comments on tasks and bugs |
| Real Database | Replace JSON with SQLite or PostgreSQL for production use |
| Notifications | Email or in-app notifications when tasks are assigned or bugs are filed |
| Dashboard Analytics | Charts showing sprint velocity, bug trends, and completion rates |
| Export | Export sprint reports to PDF or CSV |
| Search & Filter | Search tasks by title, filter by status or developer |
| API | Add REST API endpoints for integration with other tools |

---

## 16. Conclusion

The **Software Development Sprint Tracker** successfully implements a complete Agile project management workflow with role-based access control. The project demonstrates:

- **Modular Python Architecture** — Clean separation between data models, business logic, and presentation layers.
- **Three Independent User Interfaces** — CLI, Desktop GUI, and Web Application all sharing the same backend.
- **Role-Based Permissions** — Manager, Developer, and Tester roles with appropriate access controls.
- **Status Workflow Enforcement** — Forward-only status transitions for both tasks and bugs.
- **Cross-Role Bug Visibility** — Bugs filed by Testers are visible to Developers (who fix them) and Managers (who monitor progress).
- **Persistent Storage** — All data is automatically saved to and loaded from a JSON file.
- **Modern Web Design** — Responsive, card-based UI with color-coded status badges and glassmorphism effects.

The system provides a realistic simulation of how Agile software development teams manage their sprints, tasks, and bugs in a collaborative environment.

---

*Report generated on April 16, 2026*
