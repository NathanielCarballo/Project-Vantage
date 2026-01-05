import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .consumer import consume_logs


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Backend Service Starting...")
    consumer_task = asyncio.create_task(consume_logs())
    yield
    print("Backend Service Shutting Down...")
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Log Metropolis Backend", lifespan=lifespan)


@app.get("/")
def read_root():
    return {"message": "Log Metropolis Backend is running"}
