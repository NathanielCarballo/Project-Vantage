from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from enum import Enum
from datetime import datetime

class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"

class EventType(str, Enum):
    TRAFFIC = "TRAFFIC"
    ERROR = "ERROR"
    HEARTBEAT = "HEARTBEAT"

class LogEvent(BaseModel):
    source_service: str  # Maps to service_name in backend
    target_service: str = "unknown"
    timestamp: float
    metric_value: float = 0.0
    event_type: EventType = EventType.TRAFFIC
    severity: Severity = Severity.INFO
    payload: str = ""
