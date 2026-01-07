import asyncio
import time
from typing import Dict
from app.schemas import LogEvent, BuildingState, WorldUpdate, GlobalStats, Severity

class CityStateManager:
    """
    Manages the city state with HP-bar style health logic.

    Health Semantics:
        1.0 = Perfect health (green)
        0.0 = Critical/dead (red)

    Health Mechanics:
        - New buildings start at 1.0 (full HP)
        - Errors deal damage: health -= 0.2
        - Successful requests heal: health += 0.01
        - Health is clamped to [0.0, 1.0]
        - Health regenerates slowly over time
    """

    def __init__(self):
        self.buildings: Dict[str, BuildingState] = {}
        self.tick_id = 0
        self.lock = asyncio.Lock()

        # Simulation Config
        self.height_decay_rate = 0.95      # Load decays each tick
        self.traffic_multiplier = 0.5       # Height gained per request
        self.error_damage = 0.2             # HP lost per error
        self.success_heal = 0.01            # HP gained per successful request
        self.passive_regen = 0.005          # HP regenerated per tick (slow recovery)

    async def ingest(self, log: LogEvent):
        async with self.lock:
            if log.service_name not in self.buildings:
                self.buildings[log.service_name] = BuildingState(
                    name=log.service_name,
                    last_seen=log.timestamp,
                    health=1.0  # Start with full HP
                )

            building = self.buildings[log.service_name]
            building.last_seen = time.time()
            building.request_count += 1
            building.height += (1.0 * self.traffic_multiplier)

            if log.severity == Severity.ERROR:
                # ERROR: Take damage (reduce HP)
                building.error_count += 1
                building.health = max(building.health - self.error_damage, 0.0)
            else:
                # SUCCESS: Heal slightly (increase HP)
                building.health = min(building.health + self.success_heal, 1.0)

    async def tick(self) -> WorldUpdate:
        """
        Run one frame of the simulation.
        - Height (load) decays over time
        - Health slowly regenerates toward full
        """
        async with self.lock:
            self.tick_id += 1
            now = time.time()
            total_rps = 0
            total_errors = 0

            for name, building in self.buildings.items():
                # 1. Decay Height (load decreases when traffic stops)
                building.height *= self.height_decay_rate
                if building.height < 0.1:
                    building.height = 0

                # 2. Passive Health Regeneration (slow recovery over time)
                if building.health < 1.0:
                    building.health = min(building.health + self.passive_regen, 1.0)

                # 3. Aggregate Stats
                total_rps += building.request_count
                total_errors += building.error_count

                # Reset counters for the next tick
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
