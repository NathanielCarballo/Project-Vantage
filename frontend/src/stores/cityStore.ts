/**
 * Log-Metropolis City Store
 *
 * CRITICAL ARCHITECTURE: Decoupling Data Ingestion from Frame Rendering
 *
 * Problem: WebSocket delivers data at 10Hz. React re-renders are expensive.
 *          If we trigger a re-render on every message, we kill performance.
 *
 * Solution: Two-tier state management:
 *   1. MUTABLE STATE (cityStateRef): Updated at 10Hz, no re-renders.
 *      - Stores target/current values for interpolation
 *      - Read directly by R3F in useFrame loop
 *
 *   2. REACTIVE STATE (Zustand): Updated only for structural changes.
 *      - Connection status (for UI feedback)
 *      - Building list (only when buildings spawn/despawn)
 */

import { create } from 'zustand';
import type {
  BuildingData,
  MutableCityState,
  MutableBuildingState,
  ConnectionStatus,
} from '../types';

// Grid configuration
const GRID_SPACING = 2.5;  // Units between building centers

/**
 * Calculate grid position for a building based on its index.
 * Uses a square spiral pattern from center for aesthetic city block distribution.
 *
 * Safety: Returns (0,0) for any invalid input to prevent NaN coordinates.
 */
function calculateGridPosition(index: number): { x: number; z: number } {
  // Guard: Invalid index
  if (index < 0 || !Number.isFinite(index)) {
    return { x: 0, z: 0 };
  }

  // First building goes at center
  if (index === 0) {
    return { x: 0, z: 0 };
  }

  // Square spiral from center - buildings spawn outward from origin
  // This creates a natural city-block feel as services come online

  // Determine which "ring" this index is in
  const ring = Math.ceil((Math.sqrt(index + 1) - 1) / 2);

  // Guard: Ensure ring is valid
  if (ring <= 0 || !Number.isFinite(ring)) {
    return { x: 0, z: 0 };
  }

  const ringStart = (2 * ring - 1) ** 2;
  const posInRing = index - ringStart;
  const sideLength = Math.max(2 * ring, 1); // Ensure never zero
  const side = Math.floor(posInRing / sideLength);
  const posOnSide = posInRing % sideLength;

  let x: number, z: number;

  switch (side) {
    case 0: // Right side, going up
      x = ring;
      z = -ring + 1 + posOnSide;
      break;
    case 1: // Top side, going left
      x = ring - 1 - posOnSide;
      z = ring;
      break;
    case 2: // Left side, going down
      x = -ring;
      z = ring - 1 - posOnSide;
      break;
    case 3: // Bottom side, going right
      x = -ring + 1 + posOnSide;
      z = -ring;
      break;
    default:
      x = 0;
      z = 0;
  }

  // Final NaN guard
  const finalX = Number.isFinite(x) ? x * GRID_SPACING : 0;
  const finalZ = Number.isFinite(z) ? z * GRID_SPACING : 0;

  return { x: finalX, z: finalZ };
}

/**
 * THE MUTABLE STATE
 * This lives outside React's reactivity system.
 * Updated at 10Hz by WebSocket, read at 60FPS by R3F useFrame.
 */
export const cityStateRef: MutableCityState = {
  buildings: new Map(),
  buildingOrder: [],
  lastUpdateTime: 0,
};

/**
 * Update mutable state from WebSocket message.
 * Called at 10Hz - must be fast, no React re-renders triggered here.
 */
export function updateCityState(
  buildingsData: Record<string, BuildingData>,
  triggerReactiveUpdate: () => void
): void {
  const now = performance.now();
  let hasNewBuildings = false;

  // Process each building in the message
  for (const [serviceName, data] of Object.entries(buildingsData)) {
    const existing = cityStateRef.buildings.get(serviceName);

    if (existing) {
      // Update existing building's targets (no re-render)
      existing.targetHeight = data.height;
      existing.targetHealth = data.health;
      // Status updates IMMEDIATELY - no interpolation (critical for decay)
      existing.status = data.status ?? 'active';
    } else {
      // New building detected - spawn it
      const index = cityStateRef.buildingOrder.length;
      const pos = calculateGridPosition(index);

      const newBuilding: MutableBuildingState = {
        targetHeight: data.height,
        targetHealth: data.health,
        currentHeight: 0,  // Start at 0 for spawn animation
        currentHealth: data.health,
        gridX: pos.x,
        gridZ: pos.z,
        spawnTime: now,
        status: data.status ?? 'active',
      };

      cityStateRef.buildings.set(serviceName, newBuilding);
      cityStateRef.buildingOrder.push(serviceName);
      hasNewBuildings = true;
    }
  }

  cityStateRef.lastUpdateTime = now;

  // Only trigger React re-render if topology changed
  if (hasNewBuildings) {
    triggerReactiveUpdate();
  }
}

/**
 * Interpolate all buildings toward their targets.
 * Called every frame (60FPS) from R3F useFrame.
 *
 * @param delta - Time since last frame in seconds
 * @param lerpFactor - Interpolation speed (higher = faster, 0.1 = smooth)
 */
export function interpolateCityState(delta: number, lerpFactor: number = 0.1): void {
  // Clamp delta to prevent huge jumps after tab unfocus
  const clampedDelta = Math.min(delta, 0.1);
  const t = 1 - Math.pow(1 - lerpFactor, clampedDelta * 60);

  for (const building of cityStateRef.buildings.values()) {
    // Lerp height
    building.currentHeight += (building.targetHeight - building.currentHeight) * t;

    // Lerp health
    building.currentHealth += (building.targetHealth - building.currentHealth) * t;
  }
}

/**
 * Get current interpolated state for a building.
 * Called every frame by Building component.
 */
export function getBuildingState(serviceName: string): MutableBuildingState | undefined {
  return cityStateRef.buildings.get(serviceName);
}

// ============================================================================
// REACTIVE ZUSTAND STORE
// Only for UI-relevant state that actually needs React re-renders
// ============================================================================

interface CityStore {
  // Connection status for UI feedback
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Building list - only updated when buildings spawn/despawn
  buildingNames: string[];
  refreshBuildingList: () => void;

  // Error message for UI
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;

  // Phase 5: Interaction state
  hoveredServiceId: string | null;
  selectedServiceId: string | null;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
}

export const useCityStore = create<CityStore>((set) => ({
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  buildingNames: [],
  refreshBuildingList: () =>
    set({ buildingNames: [...cityStateRef.buildingOrder] }),

  errorMessage: null,
  setErrorMessage: (msg) => set({ errorMessage: msg }),

  // Phase 5: Interaction state
  hoveredServiceId: null,
  selectedServiceId: null,
  setHovered: (id) => set({ hoveredServiceId: id }),
  setSelected: (id) => set({ selectedServiceId: id }),
}));
