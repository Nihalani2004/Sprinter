from __future__ import annotations

from typing import Any, Dict, Optional

from bug import add_bug_to_task, list_bugs_for_task, print_bug_list, update_bug_status
from data import TASK_STATUS_FLOW, new_project
from sprint import create_sprint, print_all_sprints
from storage import load_project, save_project
from task import (
    create_task,
    list_all_tasks,
    list_tasks_for_developer,
    list_tasks_in_testing,
    print_task_list,
    update_task_status,
    assign_task,
)
from user import get_user_role, seed_default_users


def load_or_init_project() -> Dict[str, Any]:
    project = load_project()
    if project is None:
        project = new_project()
    seed_default_users(project)
    return project


def input_int(prompt: str, minimum: Optional[int] = None, maximum: Optional[int] = None) -> int:
    while True:
        raw = input(prompt).strip()
        if not raw.isdigit():
            print("Please enter a valid number.")
            continue
        value = int(raw)
        if minimum is not None and value < minimum:
            print(f"Please enter a number >= {minimum}.")
            continue
        if maximum is not None and value > maximum:
            print(f"Please enter a number <= {maximum}.")
            continue
        return value


def login_menu(project: Dict[str, Any]) -> Optional[str]:
    while True:
        print("\n=== Software Development Sprint Tracker ===")
        print("1. Login as Manager")
        print("2. Login as Developer")
        print("3. Login as Tester")
        print("4. Exit")
        choice = input("Select an option: ").strip()

        if choice == "4":
            return None
        elif choice in ("1", "2", "3"):
            username = input("Enter username: ").strip()
            role = get_user_role(project, username)
            expected_role = { "1": "Manager", "2": "Developer", "3": "Tester" }[choice]
            if role != expected_role:
                print(f"Access denied. User '{username}' is not a {expected_role}.")
                continue
            print(f"Logged in as {username} ({role}).")
            return username
        else:
            print("Invalid option. Try again.")


def manager_menu(project: Dict[str, Any], username: str) -> None:
    while True:
        print("\n=== Manager Menu ===")
        print("1. Create Sprint")
        print("2. View Sprints")
        print("3. Create Task in Sprint")
        print("4. Assign Task to Developer")
        print("5. View All Tasks")
        print("6. Save and Logout")
        choice = input("Select an option: ").strip()

        if choice == "1":
            name = input("Sprint name: ").strip()
            duration = input_int("Duration (days): ", minimum=1)
            sprint = create_sprint(project, name, duration)
            print(f"Created sprint with id {sprint['sprint_id']}.")
        elif choice == "2":
            print_all_sprints(project)
        elif choice == "3":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID (unique within sprint): ").strip()
            title = input("Task title: ").strip()
            description = input("Task description: ").strip()
            assigned = input("Assign to developer username (optional): ").strip() or None
            task = create_task(project, sprint_id, task_id, title, description, assigned)
            if task:
                print("Task created successfully.")
        elif choice == "4":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID: ").strip()
            dev = input("Developer username: ").strip()
            if assign_task(project, sprint_id, task_id, dev):
                print("Task assigned.")
        elif choice == "5":
            tasks = list_all_tasks(project)
            print_task_list(tasks)
        elif choice == "6":
            save_project(project)
            print("Data saved. Logging out.")
            break
        else:
            print("Invalid option.")


def developer_menu(project: Dict[str, Any], username: str) -> None:
    while True:
        print("\n=== Developer Menu ===")
        print("1. View My Tasks")
        print("2. Update Task Status")
        print("3. View Bugs for My Task")
        print("4. Update Bug Status (e.g., mark Fixed)")
        print("5. Save and Logout")
        choice = input("Select an option: ").strip()

        if choice == "1":
            tasks = list_tasks_for_developer(project, username)
            print_task_list(tasks)
        elif choice == "2":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID: ").strip()
            print("Possible statuses:", ", ".join(TASK_STATUS_FLOW))
            new_status = input("New status: ").strip()
            if update_task_status(project, sprint_id, task_id, new_status):
                print("Task status updated.")
        elif choice == "3":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID: ").strip()
            bugs = list_bugs_for_task(project, sprint_id, task_id)
            print_bug_list(bugs)
        elif choice == "4":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID: ").strip()
            bug_id = input("Bug ID: ").strip()
            new_status = input("New bug status (e.g., Fixed): ").strip()
            if update_bug_status(project, sprint_id, task_id, bug_id, new_status):
                print("Bug status updated.")
        elif choice == "5":
            save_project(project)
            print("Data saved. Logging out.")
            break
        else:
            print("Invalid option.")


def tester_menu(project: Dict[str, Any], username: str) -> None:
    while True:
        print("\n=== Tester Menu ===")
        print("1. View Tasks in Testing")
        print("2. Add Bug to Task")
        print("3. View Bugs for Task")
        print("4. Update Bug Status (e.g., Verified/Closed)")
        print("5. Save and Logout")
        choice = input("Select an option: ").strip()

        if choice == "1":
            tasks = list_tasks_in_testing(project)
            print_task_list(tasks)
        elif choice == "2":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID: ").strip()
            description = input("Bug description: ").strip()
            bug = add_bug_to_task(project, sprint_id, task_id, description)
            if bug:
                print(f"Bug created with id {bug['bug_id']}.")
        elif choice == "3":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID: ").strip()
            bugs = list_bugs_for_task(project, sprint_id, task_id)
            print_bug_list(bugs)
        elif choice == "4":
            sprint_id = input("Sprint ID: ").strip()
            task_id = input("Task ID: ").strip()
            bug_id = input("Bug ID: ").strip()
            new_status = input("New bug status (Open/Fixed/Verified/Closed): ").strip()
            if update_bug_status(project, sprint_id, task_id, bug_id, new_status):
                print("Bug status updated.")
        elif choice == "5":
            save_project(project)
            print("Data saved. Logging out.")
            break
        else:
            print("Invalid option.")


def main() -> None:
    project = load_or_init_project()
    while True:
        username = login_menu(project)
        if username is None:
            print("Goodbye!")
            save_project(project)
            break
        role = get_user_role(project, username)
        if role == "Manager":
            manager_menu(project, username)
        elif role == "Developer":
            developer_menu(project, username)
        elif role == "Tester":
            tester_menu(project, username)
        else:
            print("Unknown role, logging out.")


if __name__ == "__main__":
    main()

