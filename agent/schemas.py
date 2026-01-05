from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class EventType(str, Enum):
    TRAFFIC = "TRAFFIC"
    ERROR = "ERROR"
    HEARTBEAT = "HEARTBEAT"

class LogEvent(BaseModel):
    source_service: str
    target_service: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metric_value: float
    event_type: EventType

class ServiceMetric(BaseModel):
    service_name: str
    request_count: int
    error_count: int
    avg_latency: float

class WorldState(BaseModel):
    timestamp: datetime
    active_services: List[ServiceMetric]
    global_traffic_rate: float
