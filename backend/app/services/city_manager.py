import asyncio
import time
from typing import Dict
from app.schemas import LogEvent, BuildingState, WorldUpdate, GlobalStats, Severity

class CityStateManager:
    def __init__(self):
        self.buildings: Dict[str, BuildingState] = {}
        self.tick_id = 0
        self.lock = asyncio.Lock()
        
        # Simulation Config
        self.decay_rate = 0.95
        self.error_decay_rate = 0.95
        self.traffic_multiplier = 0.5
    
    async def ingest(self, log: LogEvent):
        async with self.lock:
            if log.service_name not in self.buildings:
                self.buildings[log.service_name] = BuildingState(
                    name=log.service_name,
                    last_seen=log.timestamp
                )
            
            building = self.buildings[log.service_name]
            building.last_seen = time.time()
            building.request_count += 1
            building.height += (1.0 * self.traffic_multiplier)
            
            if log.severity == Severity.ERROR:
                building.error_count += 1
                # Increase heat (Cap at 1.0)
                building.health = min(building.health + 0.2, 1.0)

    async def tick(self) -> WorldUpdate:
        """
        Run one frame of the simulation (Decay & Stats).
        """
        async with self.lock:
            self.tick_id += 1
            now = time.time()
            total_rps = 0
            total_errors = 0
            
            for name, building in self.buildings.items():
                # 1. Decay Height
                building.height *= self.decay_rate
                if building.height < 0.1:
                    building.height = 0
                
                # 2. Extinguish Fire
                building.health *= self.error_decay_rate
                if building.health < 0.05:
                    building.health = 0
                
                # 3. Aggregate Stats
                total_rps += building.request_count
                total_errors += building.error_count
                
                # Reset counters for the next tick (simplified rate)
                building.request_count = 0 
                building.error_count = 0
            
            return WorldUpdate(
                tick_id=self.tick_id,
                timestamp=now,
                buildings=self.buildings.copy(),
                global_stats=GlobalStats(
                    total_rps=total_rps,
                    total_errors=total_errors,
                    active_services=len(self.buildings)
                )
            )

# Singleton Instance
city_manager = CityStateManager()
