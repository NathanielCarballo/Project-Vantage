from pydantic import BaseModel, Field
from typing import Literal
import time

class BuildingStats(BaseModel):
    name: str
    height: float = 0.0
    health: float = 1.0
    request_count: int = 0
    error_count: int = 0
    last_seen: float = 0.0
    
    # Phase 6: Resilience & Decay
    last_heartbeat: float = Field(default_factory=time.time)
    status: Literal["active", "decaying"] = "active"
