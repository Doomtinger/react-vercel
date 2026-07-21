import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { EntityManager } from '../core/EntityManager';
import CelestialEntity from './CelestialEntity';
import { SelfOrbit } from './SelfOrbit';
import { NeuralConnection } from './NeuralConnection';

/**
 * GalaxyController orchestrates the Mental Galaxy visualization.
 * Manages the global state and coordinates all celestial objects.
 */

interface GalaxyControllerProps {
  entityManager: EntityManager;
  onEntitySelect?: (entity: MentalEntity) => void;
  onEntityHover?: (entity: MentalEntity | null) => void;
}

interface GalaxyState {
  anxietyLevel: number;     // 0-1, affects galaxy contraction
  confidenceLevel: number;  // 0-1, affects galaxy expansion
  activityLevel: number;    // 0-1, affects animation speed
  focusEntity: MentalEntity | null;
}

export const GalaxyController: React.FC<GalaxyControllerProps> = ({
  entityManager,
  onEntitySelect,
  onEntityHover
}) => {
  const [galaxyState, setGalaxyState] = useState<GalaxyState>({
    anxietyLevel: 0.3,
    confidenceLevel: 0.7,
    activityLevel: 0.5,
    focusEntity: null
  });

  const [hoveredEntity, setHoveredEntity] = useState<MentalEntity | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Update galaxy state based on entity states
  useFrame((state) => {
    const entities = entityManager.getActiveEntities();

    // Calculate aggregate metrics
    let totalIntensity = 0;
    let totalActivity = 0;
    let anxietyCount = 0;
    let confidenceCount = 0;

    for (const entity of entities) {
      totalIntensity += entity.state.intensity;
      totalActivity += entity.state.activity;

      if (entity.metadata.tags.includes('anxiety')) {
        anxietyCount += entity.state.intensity;
      }
      if (entity.metadata.tags.includes('confidence')) {
        confidenceCount += entity.state.intensity;
      }
    }

    const avgIntensity = entities.length > 0 ? totalIntensity / entities.length : 0.5;
    const avgActivity = entities.length > 0 ? totalActivity / entities.length : 0.5;

    // Update state
    setGalaxyState(prev => ({
      ...prev,
      anxietyLevel: Math.min(1, anxietyCount / Math.max(1, entities.length) * 3),
      confidenceLevel: Math.min(1, confidenceCount / Math.max(1, entities.length) * 3),
      activityLevel: avgActivity
    }));
  });

  // Galaxy expansion/contraction based on psychological state
  const galaxyScale = useMemo(() => {
    const baseScale = 1.0;
    const anxietyContraction = galaxyState.anxietyLevel * 0.3;
    const confidenceExpansion = galaxyState.confidenceLevel * 0.2;
    return baseScale - anxietyContraction + confidenceExpansion;
  }, [galaxyState.anxietyLevel, galaxyState.confidenceLevel]);

  // Get Self entity
  const selfEntity = useMemo(() => {
    const selfEntities = entityManager.getEntitiesByType(EntityType.SELF);
    return selfEntities[0] || null;
  }, [entityManager]);

  // Get all entities for rendering
  const allEntities = useMemo(() => {
    return entityManager.getActiveEntities();
  }, [entityManager]);

  // Handle entity interactions
  const handleEntityHover = (entity: MentalEntity) => {
    setHoveredEntity(entity);
    onEntityHover?.(entity);
  };

  const handleEntityClick = (entity: MentalEntity) => {
    setGalaxyState(prev => ({ ...prev, focusEntity: entity }));
    onEntitySelect?.(entity);
  };

  const clearFocus = () => {
    setGalaxyState(prev => ({ ...prev, focusEntity: null }));
  };

  return (
    <>
      {/* Global galaxy transform */}
      <group ref={groupRef} scale={galaxyScale}>
        {/* Starfield background */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Neural connections */}
        <NeuralConnection entityManager={entityManager} />

        {/* Self and orbital system */}
        {selfEntity && (
          <SelfOrbit
            entityManager={entityManager}
            selfEntity={selfEntity}
          />
        )}

        {/* Render all entities */}
        {allEntities.map((entity) => (
          <CelestialEntity
            key={entity.id}
            entity={entity}
            isHovered={hoveredEntity?.id === entity.id}
            isFocused={galaxyState.focusEntity?.id === entity.id}
            onHover={handleEntityHover}
            onClick={handleEntityClick}
          />
        ))}

        {/* Ambient particle field */}
        <AmbientParticles activity={galaxyState.activityLevel} />
      </group>
    </>
  );
};

/**
 * AmbientParticles adds subtle floating particles for depth
 */
interface AmbientParticlesProps {
  activity: number;
}

const AmbientParticles: React.FC<AmbientParticlesProps> = ({ activity }) => {
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const col = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      col[i * 3] = 0.5 + Math.random() * 0.5;
      col[i * 3 + 1] = 0.5 + Math.random() * 0.5;
      col[i * 3 + 2] = 1.0;
    }
    return col;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;

    const time = state.clock.getElapsedTime();
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    // Gentle floating motion
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3 + 1] += Math.sin(time + positions[i3] * 0.1) * 0.01;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    // Rotation based on activity
    particlesRef.current.rotation.y = time * 0.01 * (1 + activity);
    particlesRef.current.rotation.x = time * 0.005 * (1 + activity);
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        transparent
        opacity={0.6}
        vertexColors
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

/**
 * MentalGalaxy - Content component without Canvas (designed to be used inside a parent Canvas)
 */
export const MentalGalaxy: React.FC<MentalGalaxyProps> = ({
  entityManager,
  onEntitySelect,
  onEntityHover
}) => {
  return (
    <GalaxyController
      entityManager={entityManager}
      onEntitySelect={onEntitySelect}
      onEntityHover={onEntityHover}
    />
  );
};

export default MentalGalaxy;