import React, { useRef, useMemo, useEffect, useState, useReducer } from 'react';
import { useFrame } from '@react-three/fiber';
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

/**
 * Aggregate galaxy metrics. Kept in a ref instead of React state: writing them
 * into state every frame re-rendered every galaxy in the scene 60x per second.
 */
interface GalaxyMetrics {
  anxiety: number;     // 0-1, affects galaxy contraction
  confidence: number;  // 0-1, affects galaxy expansion
  activity: number;    // 0-1, affects animation speed
  scale: number;       // resulting global scale
}

/** Cap on how many galaxies get rendered - past this the frame rate dies. */
const MAX_RENDERED_GALAXIES = 32;

/** How often the rendered entity list is refreshed (seconds). */
const ENTITY_REFRESH_INTERVAL = 0.25;

export const GalaxyController: React.FC<GalaxyControllerProps> = ({
  entityManager,
  onEntitySelect,
  onEntityHover
}) => {
  const [focusEntity, setFocusEntity] = useState<MentalEntity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<MentalEntity | null>(null);
  const [, refreshEntities] = useReducer((c: number) => c + 1, 0);

  const groupRef = useRef<THREE.Group>(null);
  const metricsRef = useRef<GalaxyMetrics>({
    anxiety: 0.3,
    confidence: 0.7,
    activity: 0.5,
    scale: 1.06
  });
  const refreshAcc = useRef(0);

  // Aggregate metrics are written into a ref and applied straight to the
  // scene graph - no React state, no re-render.
  useFrame((_, delta) => {
    const entities = entityManager.getActiveEntities();

    let totalActivity = 0;
    let anxietyCount = 0;
    let confidenceCount = 0;

    for (const entity of entities) {
      totalActivity += entity.state.activity;

      if (entity.metadata.tags.includes('anxiety')) {
        anxietyCount += entity.state.intensity;
      }
      if (entity.metadata.tags.includes('confidence')) {
        confidenceCount += entity.state.intensity;
      }
    }

    const count = Math.max(1, entities.length);
    const metrics = metricsRef.current;
    metrics.anxiety = Math.min(1, (anxietyCount / count) * 3);
    metrics.confidence = Math.min(1, (confidenceCount / count) * 3);
    metrics.activity = entities.length > 0 ? totalActivity / entities.length : 0.5;
    metrics.scale = 1 - metrics.anxiety * 0.3 + metrics.confidence * 0.2;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(metrics.scale);
    }

    // Entities are spawned/destroyed imperatively, so the rendered list is
    // refreshed a few times per second rather than every frame.
    refreshAcc.current += delta;
    if (refreshAcc.current >= ENTITY_REFRESH_INTERVAL) {
      refreshAcc.current = 0;
      refreshEntities();
    }
  });

  // Get Self entity.
  // NOTE: these are read on every render on purpose - the entity manager is
  // mutated in place, so a useMemo keyed on `entityManager` never refreshes
  // and no galaxy would ever be rendered.
  const selfEntity = entityManager.getEntitiesByType(EntityType.SELF)[0] || null;

  // Get all entities for rendering (capped so the scene stays interactive)
  const allEntities = entityManager
    .getActiveEntities()
    .slice(0, MAX_RENDERED_GALAXIES);

  // Handle entity interactions
  const handleEntityHover = (entity: MentalEntity) => {
    setHoveredEntity(entity);
    onEntityHover?.(entity);
  };

  const handleEntityClick = (entity: MentalEntity) => {
    setFocusEntity(entity);
    onEntitySelect?.(entity);
  };

  const clearFocus = () => {
    setFocusEntity(null);
  };

  return (
    <>
      {/* Global galaxy transform - scale is driven from useFrame */}
      <group ref={groupRef}>
        {/* NOTE: the background starfield lives in MentalUniverse's Canvas -
            rendering it twice just doubles the glare. */}

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
            isFocused={focusEntity?.id === entity.id}
            onHover={handleEntityHover}
            onClick={handleEntityClick}
          />
        ))}

        {/* Ambient particle field */}
        <AmbientParticles metricsRef={metricsRef} />
      </group>
    </>
  );
};

/**
 * AmbientParticles adds subtle floating particles for depth
 */
interface AmbientParticlesProps {
  metricsRef: React.RefObject<GalaxyMetrics>;
}

const AmbientParticles: React.FC<AmbientParticlesProps> = ({ metricsRef }) => {
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
      // dim, tinted dust - near-white particles glared under additive blending
      col[i * 3] = 0.25 + Math.random() * 0.3;
      col[i * 3 + 1] = 0.3 + Math.random() * 0.3;
      col[i * 3 + 2] = 0.55 + Math.random() * 0.35;
    }
    return col;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;

    const time = state.clock.getElapsedTime();
    const activity = metricsRef.current?.activity ?? 0.5;
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
        size={0.08}
        transparent
        opacity={0.35}
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