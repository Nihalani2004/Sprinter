"""
Flask-SocketIO real-time event handlers.

Provides:
  • connect / disconnect lifecycle events
  • emit_event() helper called by API blueprints after mutations
"""

from __future__ import annotations

from datetime import datetime, timezone

from flask_socketio import SocketIO, emit, join_room, leave_room

# The SocketIO instance — initialised once and imported by app.py
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def init_socketio(app):
    """Attach SocketIO to the Flask app."""
    socketio.init_app(app)
    return socketio


def emit_event(event_name: str, data: dict) -> None:
    """Broadcast a real-time event to all connected clients."""
    payload = {
        "event": event_name,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    socketio.emit(event_name, payload, namespace="/")


def emit_to_user(user_id: int, event_name: str, data: dict) -> None:
    """Emit an event specifically to a given user's room."""
    payload = {
        "event": event_name,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    socketio.emit(event_name, payload, to=f"user_{user_id}", namespace="/")


# ---------------------------------------------------------------------------
# SocketIO event handlers
# ---------------------------------------------------------------------------

@socketio.on("connect")
def handle_connect():
    """Client connected."""
    emit("connected", {"message": "Connected to Sprint Tracker real-time server"})


@socketio.on("join_user_room")
def handle_join_user_room(data):
    """Client requests to join their user-specific room."""
    user_id = data.get("user_id")
    if user_id:
        room = f"user_{user_id}"
        join_room(room)
        emit("room_joined", {"message": f"Joined room {room}"})


@socketio.on("disconnect")
def handle_disconnect():
    """Client disconnected."""
    pass  # Could track active user count here


@socketio.on("ping_server")
def handle_ping(data):
    """Simple ping/pong for connection health checks."""
    emit("pong_server", {"message": "pong", "received": data})
