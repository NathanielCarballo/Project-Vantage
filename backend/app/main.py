import asyncio
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.consumer import consume_logs
from app.services.city_manager import city_manager

# Active WebSocket Connections
active_connections: List[WebSocket] = []

# Background task references for graceful shutdown
background_tasks: List[asyncio.Task] = []


async def broadcast_state():
    """The Game Loop: 10Hz Tick - broadcasts city state to all WebSocket clients."""
    while True:
        await asyncio.sleep(0.1)  # 100ms = 10Hz tick rate
        state = await city_manager.tick()

        if not active_connections:
            continue

        # Broadcast to all connected clients
        json_data = state.model_dump_json()
        disconnected = []

        for connection in active_connections:
            try:
                await connection.send_text(json_data)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            if conn in active_connections:
                active_connections.remove(conn)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage background tasks lifecycle."""
    print("Log Metropolis Backend Starting...")

    # Start background tasks
    broadcast_task = asyncio.create_task(broadcast_state())
    consumer_task = asyncio.create_task(consume_logs())
    background_tasks.extend([broadcast_task, consumer_task])

    print("Background tasks started: [broadcast_state, consume_logs]")

    yield

    # Shutdown: cancel background tasks
    print("Shutting down background tasks...")
    for task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    print("Log Metropolis Backend Stopped")


app = FastAPI(title="Log Metropolis Backend", lifespan=lifespan)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time city state updates."""
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep connection open; actual broadcasting happens in broadcast_state()
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)


@app.get("/")
def read_root():
    return {"message": "Log Metropolis Backend is running"}
