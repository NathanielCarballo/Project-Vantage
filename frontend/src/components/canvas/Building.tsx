/**
 * Building Component
 *
 * Represents a single service as a 3D building.
 * - Height = Load
 * - Color = Health (High = Neon/Active, Low = Dark/Dormant)
 *
 * PERFORMANCE: Uses useFrame to read mutable state directly.
 * No React re-renders on data updates - just GPU updates.
 *
 * PRODUCTION MODE: Standard physics-based materials and lighting interaction.
 */

import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Color, MeshStandardMaterial, MathUtils } from 'three';
import { getBuildingState, useCityStore } from '../../stores/cityStore';

interface BuildingProps {
  serviceName: string;
}

// Building visual constants
const BASE_HEIGHT = 0.5;         // Minimum height
const HEIGHT_MULTIPLIER = 4;     // Scale factor for height
const BUILDING_WIDTH = 1.5;      // X dimension
const BUILDING_DEPTH = 1.5;      // Z dimension

// Colors - Cyberpunk Theme
const COLOR_ACTIVE = new Color('#00ff88');   // Neon Green/Cyan
const COLOR_DORMANT = new Color('#222233');  // Dark Blue/Grey
const COLOR_DECAYING = new Color('#4a4a4a'); // Dark Grey (Dead/Decaying)

export function Building({ serviceName }: BuildingProps) {
  const meshRef = useRef<Mesh>(null);
  const setHovered = useCityStore((s) => s.setHovered);
  const setSelected = useCityStore((s) => s.setSelected);

  // Interaction handlers
  const handlePointerEnter = useCallback(() => {
    setHovered(serviceName);
    document.body.style.cursor = 'pointer';
  }, [serviceName, setHovered]);

  const handlePointerLeave = useCallback(() => {
    setHovered(null);
    document.body.style.cursor = 'auto';
  }, [setHovered]);

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelected(serviceName);
  }, [serviceName, setSelected]);

  // Use MeshStandardMaterial for lighting reaction + glow
  // toneMapped: false allows HDR values (>1.0) to trigger Bloom effect
  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: COLOR_ACTIVE,       // Base color (will be overridden)
      emissive: COLOR_ACTIVE,    // Glow color (will be overridden)
      emissiveIntensity: 0.6,    // Neon glow intensity
      metalness: 0.5,            // Metallic look
      roughness: 0.2,            // Shiny/Polished
      toneMapped: false,         // CRITICAL: Allows HDR values for Bloom
    });
  }, []);

  // Get initial position from mutable state with NaN guards
  const initialState = getBuildingState(serviceName);
  const gridX = initialState?.gridX ?? 0;
  const gridZ = initialState?.gridZ ?? 0;
  const position: [number, number, number] = [
    Number.isFinite(gridX) ? gridX : 0,
    0,
    Number.isFinite(gridZ) ? gridZ : 0,
  ];

  /**
   * THE RENDER LOOP
   * Called every frame (60FPS).
   * Reads from mutable cityStateRef - NO React re-renders.
   */
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const state = getBuildingState(serviceName);
    if (!state) return;

    // --- 1. HEIGHT LOGIC ---
    // Calculate visual height from interpolated current value with safety clamp
    const rawHeight = state.currentHeight;
    const safeHeight = Number.isFinite(rawHeight) ? Math.max(0, rawHeight) : 0;

    const targetScale = BASE_HEIGHT + safeHeight * HEIGHT_MULTIPLIER;

    // Update mesh scale (Y = height)
    mesh.scale.y = targetScale;

    // Position Y so building sits on ground (pivot at bottom)
    mesh.position.y = targetScale / 2;

    // --- 2. COLOR LOGIC ---
    // Priority 1: Check lifecycle status - decaying buildings turn grey immediately
    if (state.status === 'decaying') {
      if (material instanceof MeshStandardMaterial) {
        material.color.copy(COLOR_DECAYING);
        material.emissive.copy(COLOR_DECAYING);
        // No bloom for decaying buildings - they're dead
        material.emissiveIntensity = 0.1;
      }
      return; // Skip health-based coloring
    }

    // Priority 2: Health-based coloring for active buildings
    const rawHealth = state.currentHealth;
    const safeHealth = Number.isFinite(rawHealth) ? MathUtils.clamp(rawHealth, 0, 1) : 0.5;

    // Lerp color
    // 0.0 health = 0.0 mix factor (Dormant/Dark Color)
    // 1.0 health = 1.0 mix factor (Active/Neon Color)
    const mixFactor = safeHealth;

    // We clone the dormant color and lerp towards active color
    const currentColor = COLOR_DORMANT.clone().lerp(COLOR_ACTIVE, mixFactor);

    // BLOOM EFFECT: When health is high (neon mode), multiply color intensity
    // This pushes RGB values above 1.0, triggering the Bloom post-processing effect
    // Health 0.0 = scalar 1.0 (no bloom)
    // Health 1.0 = scalar 2.0 (full bloom glow)
    const bloomScalar = 1.0 + safeHealth;
    currentColor.multiplyScalar(bloomScalar);

    if (material instanceof MeshStandardMaterial) {
      material.color.copy(currentColor);
      // Update emissive color to match, creating the glow effect
      material.emissive.copy(currentColor);
      material.emissiveIntensity = 0.6; // Restore bloom for active buildings
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      material={material}
      castShadow
      receiveShadow
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <boxGeometry args={[BUILDING_WIDTH, 1, BUILDING_DEPTH]} />
    </mesh>
  );
}
