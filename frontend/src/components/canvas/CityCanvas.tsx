/**
 * CityCanvas Component
 *
 * The main 3D canvas wrapper.
 * Sets up the scene, camera, lighting, and controls.
 *
 * PRODUCTION MODE: Standard lighting and rendering.
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { CityGrid } from './CityGrid';
import { TrafficSystem } from './TrafficSystem';
import { EffectsLayer } from './EffectsLayer';

interface CityCanvasProps {
  showStats?: boolean;
}

export function CityCanvas({ showStats = false }: CityCanvasProps) {
  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: '#1a1a2e' }}
    >
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[15, 15, 15]}
        fov={50}
        near={0.1}
        far={1000}
      />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, 1, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.8} color="#6677aa" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={3.0}
        color="#fff8f0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-8, 8, -8]}
        intensity={0.4}
        color="#aaccff"
      />

      {/* The City */}
      <CityGrid />

      {/* Traffic particles - data flowing to buildings */}
      <TrafficSystem />

      {/* Performance stats (toggle with prop) */}
      {showStats && <Stats />}

      {/* Post-processing effects (MUST be last child) */}
      <EffectsLayer />
    </Canvas>
  );
}
