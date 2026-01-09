/**
 * CityGrid Component
 *
 * Renders all buildings in the city.
 * - Subscribes to buildingNames for topology changes (spawns)
 * - Runs the interpolation loop every frame
 * - Renders ground plane and grid
 */

import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import {
  useCityStore,
  interpolateCityState,
} from '../../stores/cityStore';
import { Building } from './Building';

// Visual constants
const GROUND_SIZE = 50;
const GRID_CELL_SIZE = 2.5;

export function CityGrid() {
  // Subscribe to building list - re-renders only when buildings spawn/despawn
  const buildingNames = useCityStore((s) => s.buildingNames);
  const setSelected = useCityStore((s) => s.setSelected);

  // Click on ground clears selection
  const handleGroundClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelected(null);
  };

  /**
   * INTERPOLATION LOOP
   * Called every frame (60FPS).
   * Lerps all building values toward their targets.
   * Using 0.03 for a "heavy" feel - buildings grow/shrink slowly like physical structures.
   */
  useFrame((_, delta) => {
    // Only interpolate if we have buildings (small optimization)
    if (buildingNames.length > 0) {
      interpolateCityState(delta, 0.03);
    }
  });

  return (
    <group>
      {/* Ground plane - click to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        onClick={handleGroundClick}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Grid overlay */}
      <Grid
        position={[0, 0, 0]}
        args={[GROUND_SIZE, GROUND_SIZE]}
        cellSize={GRID_CELL_SIZE}
        cellThickness={0.5}
        cellColor="#2a2a4a"
        sectionSize={GRID_CELL_SIZE * 4}
        sectionThickness={1}
        sectionColor="#3a3a5a"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Buildings */}
      {buildingNames.map((name) => (
        <Building key={name} serviceName={name} />
      ))}
    </group>
  );
}
