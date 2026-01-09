/**
 * TrafficSystem Component
 *
 * Renders data traffic as vehicle-like particles using InstancedMesh.
 * Uses "Manhattan Skyways" logic - strict right-angle paths through
 * elevated lanes, simulating a cyberpunk traffic network.
 *
 * Path: Origin -> Ascend -> Cruise X -> Cruise Z -> Land at Building
 *
 * PERFORMANCE: Uses object pooling with 2000 pre-allocated instances.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  BoxGeometry,
  MeshBasicMaterial,
  Object3D,
  Vector3,
  Color,
} from 'three';
import { cityStateRef } from '../../stores/cityStore';

// Pool configuration
const POOL_SIZE = 2000;
const SPAWN_RADIUS = 60;
const SPAWN_RATE = 0.05;
const BASE_SPEED = 0.3;
const SPEED_VARIANCE = 0.15;

// Lane altitudes for the skyway network
const LANE_ALTITUDES = [15, 25, 35, 45];

// Waypoint stages
// 0: Origin -> Ascend
// 1: Ascend -> Cruise X
// 2: Cruise X -> Cruise Z
// 3: Cruise Z -> Land
interface Particle {
  active: boolean;
  position: Vector3;
  // Waypoints: [Start, Ascend, Corner1, Corner2, Target]
  waypoints: [Vector3, Vector3, Vector3, Vector3, Vector3];
  currentStage: number; // 0-3
  speed: number;
}

/**
 * Generate a random point on a circle at y=0
 */
function randomPointOnCircle(radius: number): Vector3 {
  const angle = Math.random() * Math.PI * 2;
  return new Vector3(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius
  );
}

/**
 * Select a random lane altitude
 */
function randomLane(): number {
  return LANE_ALTITUDES[Math.floor(Math.random() * LANE_ALTITUDES.length)];
}

export function TrafficSystem() {
  const meshRef = useRef<InstancedMesh>(null);

  // Pre-allocate geometry and material
  // BoxGeometry simulates vehicle shape
  const geometry = useMemo(() => new BoxGeometry(0.5, 0.25, 1.2), []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color('#00ffff'),
        toneMapped: false, // Important for bloom - allows HDR values
      }),
    []
  );

  // Object pool - particles are recycled, never garbage collected
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      position: new Vector3(),
      waypoints: [
        new Vector3(),
        new Vector3(),
        new Vector3(),
        new Vector3(),
        new Vector3(),
      ],
      currentStage: 0,
      speed: BASE_SPEED,
    }));
  }, []);

  // Dummy object for matrix calculations
  const dummy = useMemo(() => new Object3D(), []);
  const tempTarget = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const buildings = cityStateRef.buildings;
    const buildingOrder = cityStateRef.buildingOrder;

    // --- SPAWN LOGIC ---
    // For each active/healthy building, possibly spawn a particle
    for (const serviceName of buildingOrder) {
      const building = buildings.get(serviceName);
      if (!building) continue;

      // Only spawn traffic for healthy buildings (health > 0.5)
      if (building.currentHealth < 0.5) continue;

      // Random spawn chance, scaled by health
      if (Math.random() > SPAWN_RATE * building.currentHealth) continue;

      // Find an inactive particle to activate
      for (const particle of particles) {
        if (particle.active) continue;

        // Activate this particle
        particle.active = true;
        particle.currentStage = 0;
        particle.speed = BASE_SPEED + (Math.random() - 0.5) * SPEED_VARIANCE;

        // Calculate target building position
        const targetY = building.currentHeight * 4 + 0.5; // Match Building.tsx scaling
        const targetX = building.gridX;
        const targetZ = building.gridZ;

        // Select a lane altitude
        const lane = randomLane();

        // Generate origin point on spawn circle
        const origin = randomPointOnCircle(SPAWN_RADIUS);

        // Build the 5-waypoint path:
        // WP[0]: Origin (x, 0, z)
        particle.waypoints[0].set(origin.x, 0, origin.z);

        // WP[1]: Ascend (x, lane, z) - go straight up to lane altitude
        particle.waypoints[1].set(origin.x, lane, origin.z);

        // WP[2]: Cruise X (target.x, lane, z) - travel along X axis
        particle.waypoints[2].set(targetX, lane, origin.z);

        // WP[3]: Cruise Z (target.x, lane, target.z) - travel along Z axis
        particle.waypoints[3].set(targetX, lane, targetZ);

        // WP[4]: Land (target.x, target.height, target.z) - descend to building
        particle.waypoints[4].set(targetX, targetY, targetZ);

        // Start at origin
        particle.position.copy(particle.waypoints[0]);

        break; // Only spawn one particle per building per frame
      }
    }

    // --- UPDATE LOGIC ---
    for (let i = 0; i < POOL_SIZE; i++) {
      const particle = particles[i];

      if (particle.active) {
        // Get the next waypoint
        const nextWaypointIndex = particle.currentStage + 1;
        const nextWaypoint = particle.waypoints[nextWaypointIndex];

        // Calculate direction and distance to next waypoint
        tempTarget.copy(nextWaypoint).sub(particle.position);
        const distance = tempTarget.length();

        if (distance < particle.speed) {
          // Snap to waypoint and advance stage
          particle.position.copy(nextWaypoint);
          particle.currentStage++;

          if (particle.currentStage >= 4) {
            // Reached final destination - deactivate
            particle.active = false;
            dummy.scale.set(0, 0, 0);
          }
        } else {
          // Move towards waypoint
          tempTarget.normalize().multiplyScalar(particle.speed);
          particle.position.add(tempTarget);
        }

        if (particle.active) {
          // Update dummy transform
          dummy.position.copy(particle.position);

          // Rotate to face the next waypoint (crucial for 90-degree turns)
          dummy.lookAt(nextWaypoint);

          dummy.scale.set(1, 1, 1);
        }
      } else {
        // Inactive particles are hidden
        dummy.scale.set(0, 0, 0);
      }

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    // Tell Three.js the instance matrices have changed
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, POOL_SIZE]}
      frustumCulled={false} // Particles can be anywhere
    />
  );
}
