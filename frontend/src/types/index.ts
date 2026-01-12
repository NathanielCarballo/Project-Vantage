/**
 * Log-Metropolis Visual Cortex - Type Definitions
 *
 * Data flows from WebSocket at 10Hz, but renders at 60FPS.
 * We separate "target" state (from network) from "current" state (interpolated each frame).
 */

/** Raw building data from WebSocket */
export interface BuildingData {
  height: number;  // Load metric (0.0 - 1.0+)
  health: number;  // Health metric (0.0 - 1.0, where 1.0 = green, 0.0 = red)
  status: string;  // Lifecycle status: "active", "decaying", or "pruned"
}

/** WebSocket message shape */
export interface CityStateMessage {
  buildings: Record<string, BuildingData>;
}

/**
 * Mutable building state for 60FPS rendering.
 * Stored in a ref, not reactive state, to avoid re-renders.
 */
export interface MutableBuildingState {
  // Target values (set by WebSocket at 10Hz)
  targetHeight: number;
  targetHealth: number;

  // Current interpolated values (updated every frame at 60FPS)
  currentHeight: number;
  currentHealth: number;

  // Grid position (assigned when building spawns)
  gridX: number;
  gridZ: number;

  // Timestamp for spawn animation
  spawnTime: number;

  // Lifecycle status: "active", "decaying", or "pruned"
  status: string;
}

/** The mutable city state stored outside React's reactive system */
export interface MutableCityState {
  buildings: Map<string, MutableBuildingState>;
  buildingOrder: string[];  // Maintains spawn order for stable grid layout
  lastUpdateTime: number;
}

/** Connection status for UI feedback */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
