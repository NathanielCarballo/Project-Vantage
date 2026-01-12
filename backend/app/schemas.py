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
    service_name: str
    target_service: str = "unknown" # Added Default
    timestamp: float # Changed from datetime
    metric_value: float = 0.0 # Added Default
    event_type: EventType = EventType.TRAFFIC # Added Default
    severity: Severity = Severity.INFO
    payload: str = ""

# --- New Models ---

class BuildingState(BaseModel):
    name: str
    height: float = 0.0
    health: float = 1.0  # HP Bar: 1.0 (Perfect Health) to 0.0 (Critical/Dead)
    request_count: int = 0
    error_count: int = 0
    last_seen: float = 0.0
    status: str = "active"  # "active", "decaying", or "pruned"

class GlobalStats(BaseModel):
    total_rps: int
    total_errors: int
    active_services: int

class WorldUpdate(BaseModel):
    tick_id: int
    timestamp: float
    buildings: Dict[str, BuildingState]
    global_stats: GlobalStats
