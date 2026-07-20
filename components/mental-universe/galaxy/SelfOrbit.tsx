import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { EntityManager } from '../core/EntityManager';
import CelestialEntity from './CelestialEntity';

/**
 * SelfOrbit manages the orbital system around the Self entity.
 * Emotions orbit at different distances based on their psychological influence.
 */

interface SelfOrbitProps {
  entityManager: EntityManager;
  selfEntity: MentalEntity;
}

interface OrbitalPlane {
  radius: number;
  inclination: number;
  ascendingNode: number;
  entities: MentalEntity[];
  color: THREE.Color;
}

export const SelfOrbit: React.FC<SelfOrbitProps> = ({
  entityManager,
  selfEntity
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate orbital planes based on emotion types
  const orbitalPlanes = useMemo((): OrbitalPlane[] => {
    const emotions = entityManager.getEntitiesByType(EntityType.EMOTION);

    // Group emotions by valence (positive/negative/neutral)
    const positive = emotions.filter(e => e.state.mood.valence > 0.6);
    const negative = emotions.filter(e => e.state.mood.valence < 0.4);
    const neutral = emotions.filter(e => e.state.mood.valence >= 0.4 && e.state.mood.valence <= 0.6);

    return [
      {
        radius: 6,
        inclination: 0,
        ascendingNode: 0,
        entities: positive,
        color: new THREE.Color(0x10b981) // Emerald green
      },
      {
        radius: 8,
        inclination: Math.PI / 6,
        ascendingNode: Math.PI / 4,
        entities: neutral,
        color: new THREE.Color(0x6366f1) // Purple
      },
      {
        radius: 10,
        inclination: -Math.PI / 6,
        ascendingNode: Math.PI / 2,
        entities: negative,
        color: new THREE.Color(0xef4444) // Red
      }
    ];
  }, [entityManager]);

  // Update orbital physics
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Rotate the entire orbital system slowly
    groupRef.current.rotation.y = time * 0.02;

    // Update positions of orbiting entities
    for (const plane of orbitalPlanes) {
      for (const entity of plane.entities) {
        if (!entity.isAlive()) continue;

        // Calculate orbital position
        const orbitSpeed = 0.5 + entity.state.mood.arousal * 0.5;
        const angle = time * orbitSpeed + entity.id.length * 0.1;

        // Position in orbital plane
        const x = Math.cos(angle) * plane.radius;
        const y = Math.sin(angle) * plane.radius * Math.sin(plane.inclination);
        const z = Math.sin(angle) * plane.radius * Math.cos(plane.inclination);

        // Apply ascending node rotation
        const cosNode = Math.cos(plane.ascendingNode);
        const sinNode = Math.sin(plane.ascendingNode);

        entity.physics.position.set(
          x * cosNode - y * sinNode,
          x * sinNode + y * cosNode,
          z
        );

        // Set velocity for orbital motion
        const velocityAngle = angle + Math.PI / 2;
        entity.physics.velocity.set(
          Math.cos(velocityAngle) * orbitSpeed * plane.radius,
          Math.sin(velocityAngle) * orbitSpeed * plane.radius * Math.sin(plane.inclination),
          Math.sin(velocityAngle) * orbitSpeed * plane.radius * Math.cos(plane.inclination)
        );
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Render orbital paths */}
      {orbitalPlanes.map((plane, planeIndex) => (
        <group key={planeIndex}>
          {/* Orbital ring */}
          <mesh rotation={[plane.inclination, plane.ascendingNode, 0]}>
            <ringGeometry args={[plane.radius - 0.02, plane.radius + 0.02, 64]} />
            <meshBasicMaterial
              color={plane.color}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Orbital particles */}
          {[...Array(32)].map((_, i) => {
            const angle = (i / 32) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * plane.radius,
                  Math.sin(angle) * plane.radius * Math.sin(plane.inclination),
                  Math.sin(angle) * plane.radius * Math.cos(plane.inclination)
                ]}
                rotation={[plane.inclination, plane.ascendingNode, 0]}
              >
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial
                  color={plane.color}
                  transparent
                  opacity={0.4}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Self entity at center */}
      <CelestialEntity entity={selfEntity} />
    </group>
  );
};

export default SelfOrbit;