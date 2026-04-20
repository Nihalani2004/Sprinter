from __future__ import annotations

import sys
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, simpledialog, ttk
from typing import Any, Callable, Dict, Optional, Sequence

# Allow running as: python ui/app.py
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from data import new_project  # noqa: E402
from data import BUG_STATUS_FLOW, TASK_STATUS_FLOW  # noqa: E402
from bug import add_bug_to_task, list_bugs_for_task, update_bug_status  # noqa: E402
from sprint import create_sprint  # noqa: E402
from storage import load_project, save_project  # noqa: E402
from task import (  # noqa: E402
    assign_task,
    create_task,
    list_all_tasks,
    list_tasks_for_developer,
    list_tasks_in_testing,
    update_task_status,
)
from user import get_user_role, seed_default_users  # noqa: E402


class ProjectStore:
    """
    Thin wrapper around the backend dictionary store + JSON persistence.
    UI should call these methods; backend business logic stays in existing modules.
    """

    def __init__(self) -> None:
        project = load_project()
        if project is None:
            project = new_project()
        seed_default_users(project)
        self.project: Dict[str, Any] = project

    def save(self) -> None:
        save_project(self.project)

    def role_for(self, username: str) -> Optional[str]:
        return get_user_role(self.project, username)


def _format_task_line(sprint_id: str, task_id: str, task: Dict[str, Any]) -> str:
    return (
        f"[Sprint {sprint_id}] Task {task_id}: {task.get('title')} "
        f"(Status: {task.get('status')}, Assigned: {task.get('assigned_to')})"
    )


def _format_bug_line(bug: Dict[str, Any]) -> str:
    return f"Bug {bug.get('bug_id')}: {bug.get('description')} (Status: {bug.get('status')})"


def _ask_nonempty_string(title: str, prompt: str) -> Optional[str]:
    value = simpledialog.askstring(title, prompt)
    if value is None:
        return None
    value = value.strip()
    if not value:
        messagebox.showerror("Invalid input", "Value cannot be empty.")
        return None
    return value


def _ask_int(title: str, prompt: str, *, minimum: int = 1) -> Optional[int]:
    value = simpledialog.askinteger(title, prompt, minvalue=minimum)
    return value


def _choose_from_list(title: str, prompt: str, options: Sequence[str]) -> Optional[str]:
    """
    Minimal chooser: asks user to type an option exactly.
    Keeps UI simple and dependency-free.
    """
    opt_text = ", ".join(options)
    value = simpledialog.askstring(title, f"{prompt}\nOptions: {opt_text}")
    if value is None:
        return None
    value = value.strip()
    if value not in options:
        messagebox.showerror("Invalid input", f"Please choose one of: {opt_text}")
        return None
    return value


class ListWindow(tk.Toplevel):
    def __init__(self, master: tk.Misc, *, title: str, lines: Sequence[str]) -> None:
        super().__init__(master)
        self.title(title)
        self.geometry("720x420")

        container = ttk.Frame(self, padding=12)
        container.pack(fill="both", expand=True)

        self.listbox = tk.Listbox(container)
        self.listbox.pack(fill="both", expand=True)
        for line in lines:
            self.listbox.insert(tk.END, line)

        ttk.Button(container, text="Close", command=self.destroy).pack(anchor="e", pady=(10, 0))


class LoginFrame(ttk.Frame):
    def __init__(self, master: tk.Misc, *, on_login: callable) -> None:
        super().__init__(master, padding=16)
        self._on_login = on_login

        title = ttk.Label(self, text="Sprint Tracker Login", font=("Segoe UI", 16, "bold"))
        title.grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 12))

        ttk.Label(self, text="Username").grid(row=1, column=0, sticky="w")
        self.username_var = tk.StringVar()
        self.username_entry = ttk.Entry(self, textvariable=self.username_var, width=28)
        self.username_entry.grid(row=2, column=0, columnspan=2, sticky="we", pady=(4, 12))
        self.username_entry.bind("<Return>", lambda _e: self._handle_login())

        self.login_btn = ttk.Button(self, text="Login", command=self._handle_login)
        self.login_btn.grid(row=3, column=0, sticky="w")

        ttk.Label(
            self,
            text="Default users: manager, dev1, dev2, tester",
            foreground="#555555",
        ).grid(row=4, column=0, columnspan=2, sticky="w", pady=(12, 0))

        self.columnconfigure(0, weight=1)

    def focus_username(self) -> None:
        self.username_entry.focus_set()
        self.username_entry.selection_range(0, tk.END)

    def _handle_login(self) -> None:
        username = self.username_var.get().strip()
        if not username:
            messagebox.showerror("Login failed", "Please enter a username.")
            return
        self._on_login(username)


class DashboardFrame(ttk.Frame):
    def __init__(
        self,
        master: tk.Misc,
        *,
        role: str,
        username: str,
        actions: Sequence[tuple[str, Callable[[], None]]],
        on_logout: Callable[[], None],
    ) -> None:
        super().__init__(master, padding=16)
        self._on_logout = on_logout

        header = ttk.Label(self, text=f"{role} Dashboard", font=("Segoe UI", 16, "bold"))
        header.grid(row=0, column=0, sticky="w")

        ttk.Label(self, text=f"Logged in as: {username}", foreground="#555555").grid(
            row=1, column=0, sticky="w", pady=(4, 16)
        )

        for i, (label, handler) in enumerate(actions):
            btn = ttk.Button(self, text=label, command=handler)
            btn.grid(row=2 + i, column=0, sticky="we", pady=4)

        ttk.Separator(self).grid(row=2 + len(actions), column=0, sticky="we", pady=(12, 12))
        ttk.Button(self, text="Logout", command=self._on_logout).grid(
            row=3 + len(actions), column=0, sticky="w"
        )

        self.columnconfigure(0, weight=1)


class SprintTrackerApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Sprint Tracker Login")
        self.geometry("460x360")
        self.minsize(420, 320)

        self.store = ProjectStore()
        self.current_user: Optional[str] = None
        self.current_role: Optional[str] = None

        self._container = ttk.Frame(self)
        self._container.pack(fill="both", expand=True)

        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self._show_login()

    def _clear_container(self) -> None:
        for child in self._container.winfo_children():
            child.destroy()

    def _show_login(self) -> None:
        self._clear_container()
        login = LoginFrame(self._container, on_login=self._try_login)
        login.pack(fill="both", expand=True)
        login.focus_username()
        self.title("Sprint Tracker Login")

    def _show_dashboard(self, username: str, role: str) -> None:
        self._clear_container()
        dash = DashboardFrame(
            self._container,
            role=role,
            username=username,
            actions=self._actions_for(role, username),
            on_logout=self._logout,
        )
        dash.pack(fill="both", expand=True)
        self.title(f"Sprint Tracker - {role}")

    def _actions_for(self, role: str, username: str) -> list[tuple[str, Callable[[], None]]]:
        if role == "Manager":
            return [
                ("Create Sprint", self._ui_create_sprint),
                ("Create Task", self._ui_create_task),
                ("Assign Task", self._ui_assign_task),
                ("View All Tasks", self._ui_view_all_tasks),
            ]
        if role == "Developer":
            return [
                ("View My Tasks", lambda: self._ui_view_my_tasks(username)),
                ("Update Task Status", self._ui_update_task_status),
                ("View Bugs", self._ui_view_bugs_for_task),
                ("Update Bug Status", self._ui_update_bug_status),
            ]
        if role == "Tester":
            return [
                ("View Testing Tasks", self._ui_view_testing_tasks),
                ("Add Bug", self._ui_add_bug),
                ("Verify/Close Bug", self._ui_update_bug_status),
                ("View Bugs for Task", self._ui_view_bugs_for_task),
            ]
        return []

    def _ui_create_sprint(self) -> None:
        name = _ask_nonempty_string("Create Sprint", "Sprint name:")
        if name is None:
            return
        duration = _ask_int("Create Sprint", "Duration (days):", minimum=1)
        if duration is None:
            return
        sprint = create_sprint(self.store.project, name, int(duration))
        self.store.save()
        messagebox.showinfo("Sprint created", f"Created sprint '{sprint['name']}' with ID: {sprint['sprint_id']}")

    def _ui_create_task(self) -> None:
        sprint_id = _ask_nonempty_string("Create Task", "Sprint ID:")
        if sprint_id is None:
            return
        task_id = _ask_nonempty_string("Create Task", "Task ID (unique within sprint):")
        if task_id is None:
            return
        title = _ask_nonempty_string("Create Task", "Task title:")
        if title is None:
            return
        description = _ask_nonempty_string("Create Task", "Task description:")
        if description is None:
            return
        assigned_to = simpledialog.askstring("Create Task", "Assign to developer username (optional):")
        if assigned_to is not None:
            assigned_to = assigned_to.strip() or None
        task_obj = create_task(
            self.store.project,
            sprint_id=sprint_id,
            task_id=task_id,
            title=title,
            description=description,
            assigned_to=assigned_to,
        )
        if not task_obj:
            return
        self.store.save()
        messagebox.showinfo("Task created", f"Task {task_id} created in Sprint {sprint_id}.")

    def _ui_assign_task(self) -> None:
        sprint_id = _ask_nonempty_string("Assign Task", "Sprint ID:")
        if sprint_id is None:
            return
        task_id = _ask_nonempty_string("Assign Task", "Task ID:")
        if task_id is None:
            return
        developer = _ask_nonempty_string("Assign Task", "Developer username:")
        if developer is None:
            return
        ok = assign_task(self.store.project, sprint_id, task_id, developer)
        if not ok:
            return
        self.store.save()
        messagebox.showinfo("Task assigned", f"Task {task_id} assigned to {developer}.")

    def _ui_view_all_tasks(self) -> None:
        tasks = list_all_tasks(self.store.project)
        lines = [_format_task_line(sprint_id, task_id, task) for sprint_id, task_id, task in tasks]
        if not lines:
            messagebox.showinfo("All tasks", "No tasks found.")
            return
        ListWindow(self, title="All Tasks", lines=lines)

    def _ui_view_my_tasks(self, username: str) -> None:
        tasks = list_tasks_for_developer(self.store.project, username)
        lines = [_format_task_line(sprint_id, task_id, task) for sprint_id, task_id, task in tasks]
        if not lines:
            messagebox.showinfo("My tasks", "No tasks assigned to you.")
            return
        ListWindow(self, title=f"Tasks for {username}", lines=lines)

    def _ui_view_testing_tasks(self) -> None:
        tasks = list_tasks_in_testing(self.store.project)
        lines = [_format_task_line(sprint_id, task_id, task) for sprint_id, task_id, task in tasks]
        if not lines:
            messagebox.showinfo("Testing tasks", "No tasks currently in Testing.")
            return
        ListWindow(self, title="Tasks in Testing", lines=lines)

    def _ui_update_task_status(self) -> None:
        sprint_id = _ask_nonempty_string("Update Task Status", "Sprint ID:")
        if sprint_id is None:
            return
        task_id = _ask_nonempty_string("Update Task Status", "Task ID:")
        if task_id is None:
            return
        new_status = _choose_from_list("Update Task Status", "New task status:", TASK_STATUS_FLOW)
        if new_status is None:
            return
        ok = update_task_status(self.store.project, sprint_id, task_id, new_status)
        if not ok:
            return
        self.store.save()
        messagebox.showinfo("Task updated", f"Task {task_id} status updated to {new_status}.")

    def _ui_add_bug(self) -> None:
        sprint_id = _ask_nonempty_string("Add Bug", "Sprint ID:")
        if sprint_id is None:
            return
        task_id = _ask_nonempty_string("Add Bug", "Task ID:")
        if task_id is None:
            return
        description = _ask_nonempty_string("Add Bug", "Bug description:")
        if description is None:
            return
        bug = add_bug_to_task(self.store.project, sprint_id, task_id, description)
        if not bug:
            return
        self.store.save()
        messagebox.showinfo("Bug added", f"Bug {bug['bug_id']} added to Task {task_id}.")

    def _ui_view_bugs_for_task(self) -> None:
        sprint_id = _ask_nonempty_string("View Bugs", "Sprint ID:")
        if sprint_id is None:
            return
        task_id = _ask_nonempty_string("View Bugs", "Task ID:")
        if task_id is None:
            return
        bugs = list_bugs_for_task(self.store.project, sprint_id, task_id)
        lines = [_format_bug_line(b) for b in bugs]
        if not lines:
            messagebox.showinfo("Bugs", "No bugs found for this task.")
            return
        ListWindow(self, title=f"Bugs for Task {task_id} (Sprint {sprint_id})", lines=lines)

    def _ui_update_bug_status(self) -> None:
        sprint_id = _ask_nonempty_string("Update Bug Status", "Sprint ID:")
        if sprint_id is None:
            return
        task_id = _ask_nonempty_string("Update Bug Status", "Task ID:")
        if task_id is None:
            return
        bug_id = _ask_nonempty_string("Update Bug Status", "Bug ID:")
        if bug_id is None:
            return
        new_status = _choose_from_list("Update Bug Status", "New bug status:", BUG_STATUS_FLOW)
        if new_status is None:
            return
        ok = update_bug_status(self.store.project, sprint_id, task_id, bug_id, new_status)
        if not ok:
            return
        self.store.save()
        messagebox.showinfo("Bug updated", f"Bug {bug_id} status updated to {new_status}.")

    def _try_login(self, username: str) -> None:
        role = self.store.role_for(username)
        if not role:
            messagebox.showerror("Login failed", f"Unknown user: {username}")
            return
        self.current_user = username
        self.current_role = role
        self._show_dashboard(username, role)

    def _logout(self) -> None:
        self.current_user = None
        self.current_role = None
        self._show_login()

    def _on_close(self) -> None:
        try:
            self.store.save()
        finally:
            self.destroy()


def main() -> None:
    app = SprintTrackerApp()
    app.mainloop()


if __name__ == "__main__":
    main()

