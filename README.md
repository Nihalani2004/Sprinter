# Software Development Sprint Tracker (Full-Stack Flask & React)

A modern **Agile Sprint → Tasks → Bugs → Status** tracker built with a **Flask** backend and a **React (Vite)** frontend.
Includes **role-based dashboards** (Manager / Developer / Tester), real-time notifications, and persistent database storage.

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

## Project Structure

```
python project/
├─ project/           # Flask Backend
│  ├─ app.py          # Main Flask entry point
│  ├─ models.py       # Database models
│  └─ requirements.txt # Python dependencies
├─ frontend/          # React Frontend (Vite)
│  ├─ src/            # Components, Hooks, API services
│  └─ package.json    # Node dependencies
└─ README.md          # Project documentation
```

---

## Default users

Use these usernames at login:
- **Manager**: `manager`
- **Developer**: `dev1`, `dev2`
- **Tester**: `tester`

---

## How to Run

### Open Terminal 1: Backend (Flask)
```bash
cd project

# Create a virtual environment (recommended)
python -m venv venv

# Activate the virtual environment
# For Windows:
venv\Scripts\activate

# Install the required Python packages
pip install -r requirements.txt

# Start the Flask backend server
python app.py
```

### Open Terminal 2: Frontend (React)
```bash
cd frontend

# Install the required Node packages
npm install

# Start the React frontend server
npm run dev
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

## Technical Notes
- **Backend**: Flask with Flask-SQLAlchemy and Flask-SocketIO (for real-time updates).
- **Frontend**: React with Material UI (MUI) and Vite.
- **Database**: SQLite (local development).
- **Real-time**: Socket.IO integration for instant notifications across the dashboard.
- **Security**: Role-based access control and data isolation implemented at the API level.

