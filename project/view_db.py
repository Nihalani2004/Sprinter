"""
Quick utility to view all tables and data in the SQLite database.

Usage:  py project/view_db.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sprint_tracker.db")

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    print("=" * 60)
    print(f"  DATABASE: {DB_PATH}")
    print(f"  TABLES:   {', '.join(tables)}")
    print("=" * 60)

    # Show each table's data
    for table in tables:
        cursor.execute(f"SELECT * FROM {table}")
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()

        print(f"\n--- {table.upper()} ({len(rows)} rows) ---")
        print(f"  Columns: {columns}")
        for row in rows:
            print(f"  {row}")

    conn.close()


if __name__ == "__main__":
    main()
