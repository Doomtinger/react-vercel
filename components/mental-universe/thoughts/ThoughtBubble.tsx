import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { MeshDistortMaterial, Html } from '@react-three/drei';

/**
 * ThoughtBubble represents thoughts as floating, breathing bubbles.
 * Properties: size=importance, opacity=certainty, velocity=mental activity.
 */

interface ThoughtBubbleProps {
  entity: MentalEntity;
  isHovered?: boolean;
  onPop?: (entity: MentalEntity) => void;
}

export const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({
  entity,
  isHovered = false,
  onPop
}) => {
  const bubbleRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Bubble size based on importance (intensity)
  const bubbleSize = useMemo(() => {
    // Acts as the glowing nucleus sitting inside the galaxy disc
    const baseSize = 0.16;
    const importanceScale = entity.state.intensity * 0.26;
    return baseSize + importanceScale;
  }, [entity.state.intensity]);

  // Bubble color based on mood and activity
  const bubbleColor = useMemo(() => {
    const baseColor = new THREE.Color();

    // Color based on mood valence
    if (entity.state.mood.valence > 0.6) {
      baseColor.setHex(0x10b981); // Positive - green
    } else if (entity.state.mood.valence < 0.4) {
      baseColor.setHex(0xef4444); // Negative - red
    } else {
      baseColor.setHex(0x6366f1); // Neutral - purple
    }

    // Adjust based on activity
    if (entity.state.activity > 0.7) {
      baseColor.offsetHSL(0, 0, 0.2); // Brighter
    }

    return baseColor;
  }, [entity.state.mood.valence, entity.state.activity]);

  // Opacity based on certainty
  const bubbleOpacity = useMemo(() => {
    return entity.state.certainty * 0.8;
  }, [entity.state.certainty]);

  // Set mesh reference
  useEffect(() => {
    if (bubbleRef.current) {
      entity.setMesh(bubbleRef.current, bubbleRef.current.material as THREE.Material);
    }
  }, [entity]);

  // Floating animation
  useFrame((state) => {
    if (!bubbleRef.current || !groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Gentle floating motion
    const floatX = Math.sin(time * 0.5 + entity.id.length * 0.1) * 0.5;
    const floatY = Math.cos(time * 0.3 + entity.id.length * 0.1) * 0.3;
    const floatZ = Math.sin(time * 0.4 + entity.id.length * 0.1) * 0.2;

    groupRef.current.position.set(
      entity.physics.position.x + floatX,
      entity.physics.position.y + floatY,
      entity.physics.position.z + floatZ
    );

    // Breathing animation
    const breathPhase = time * (1 + entity.state.activity);
    const breathAmount = Math.sin(breathPhase) * 0.1;
    bubbleRef.current.scale.setScalar(bubbleSize * (1 + breathAmount));

    // Gentle rotation
    bubbleRef.current.rotation.x = time * 0.1;
    bubbleRef.current.rotation.y = time * 0.15;

    // Update glow
    if (glowRef.current) {
      const glowScale = bubbleSize * 1.3;
      glowRef.current.scale.setScalar(glowScale);

      if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
        const glowIntensity = entity.state.intensity * 0.26;
        glowRef.current.material.opacity = glowIntensity * (isHovered ? 0.6 : 0.28);
      }
    }

    // Hover effect
    if (isHovered && bubbleRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      bubbleRef.current.material.emissiveIntensity = 0.4;
      bubbleRef.current.material.roughness = 0.1;
    } else if (bubbleRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      bubbleRef.current.material.emissiveIntensity = entity.state.activity * 0.15;
      bubbleRef.current.material.roughness = 0.3;
    }

    // Thought velocity affects upward drift
    const upwardDrift = entity.state.activity * 0.2;
    entity.physics.position.y += upwardDrift * 0.01;
  });

  // Handle interactions
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Pop thought on click (remove it)
    onPop?.(entity);
  };

  const handlePointerOver = (event: React.PointerEvent) => {
    event.stopPropagation();
    entity.setHover(true);
  };

  const handlePointerOut = (event: React.PointerEvent) => {
    event.stopPropagation();
    entity.setHover(false);
  };

  return (
    <group ref={groupRef}>
      {/* Main bubble */}
      <mesh
        ref={bubbleRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 16, 16]} />
        {/*
          Gentle surface motion only, so the bubble reads as a smooth galactic
          bulge rather than a wobbling blob.
        */}
        <MeshDistortMaterial
          color={bubbleColor}
          transparent
          opacity={bubbleOpacity}
          roughness={0.2}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={0.9}
          thickness={0.5}
          distort={0.1 + entity.state.activity * 0.1}
          speed={1 + entity.state.activity}
          emissive={bubbleColor}
          emissiveIntensity={entity.state.activity * 0.15}
        />
      </mesh>

      {/* Outer glow for important thoughts */}
      {entity.state.intensity > 0.5 && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.2, 12, 12]} />
          <meshBasicMaterial
            color={bubbleColor}
            transparent
            opacity={entity.state.intensity * 0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/*
        NOTE: the offset specular-highlight sphere was removed - a detached
        pure-white ball read as stray geometry and glared under additive
        blending. The nucleus glow in CelestialEntity provides the highlight.
      */}

      {/* Label on hover */}
      {isHovered && (
        <Html position={[0, bubbleSize + 0.3, 0]} center>
          <div className="thought-label">
            <div className="thought-text">{entity.metadata.label}</div>
            <div className="thought-importance">
              Importance: {(entity.state.intensity * 100).toFixed(0)}%
            </div>
            <div className="thought-certainty">
              Certainty: {(entity.state.certainty * 100).toFixed(0)}%
            </div>
          </div>
          <style jsx>{`
            .thought-label {
              background: rgba(0, 0, 0, 0.85);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              padding: 6px 10px;
              backdrop-filter: blur(10px);
              color: white;
              text-align: center;
              pointer-events: none;
              font-size: 11px;
            }
            .thought-text {
              font-weight: 500;
              margin-bottom: 3px;
            }
            .thought-importance,
            .thought-certainty {
              opacity: 0.7;
              font-size: 10px;
            }
          `}</style>
        </Html>
      )}
    </group>
  );
};

/**
 * ThoughtBubbleField manages all thought bubbles in the mental space
 */
interface ThoughtBubbleFieldProps {
  entityManager: EntityManager;
  maxBubbles?: number;
  spawnRate?: number; // bubbles per second
}

import { EntityManager } from '../core/EntityManager';

export const ThoughtBubbleField: React.FC<ThoughtBubbleFieldProps> = ({
  entityManager,
  maxBubbles = 16,
  spawnRate = 0.2
}) => {
  const [thoughts, setThoughts] = useState<MentalEntity[]>([]);
  const spawnAcc = useRef(0);
  const thoughtsKeyRef = useRef('');

  // Spawn new thoughts periodically
  useFrame((_, delta) => {
    const currentThoughts = entityManager.getEntitiesByType(EntityType.THOUGHT);

    // Spawn on a time accumulator rather than a per-frame dice roll, so the
    // rate is frame-rate independent.
    spawnAcc.current += delta;
    const interval = 1 / Math.max(0.01, spawnRate);

    if (spawnAcc.current >= interval) {
      spawnAcc.current = 0;

      if (currentThoughts.length < maxBubbles) {
        // Create new thought entity
        const position = new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 20
        );

        const thought = entityManager.createEntity(
          EntityType.THOUGHT,
          position,
          {
            label: `Thought ${Math.floor(Math.random() * 1000)}`,
            color: new THREE.Color(0x06b6d4),
            category: 'thought',
            tags: ['thought', 'stream']
          }
        );

        // Set random properties
        thought.state.intensity = 0.3 + Math.random() * 0.7;
        thought.state.certainty = 0.5 + Math.random() * 0.5;
        thought.state.activity = 0.2 + Math.random() * 0.8;
        thought.state.mood = {
          arousal: Math.random(),
          valence: Math.random(),
          dominance: Math.random()
        };
      }
    }

    // Only re-render when the set of thoughts actually changes - calling
    // setThoughts() unconditionally re-rendered the field 60x per second.
    const key = currentThoughts.map(t => t.id).join('|');
    if (key !== thoughtsKeyRef.current) {
      thoughtsKeyRef.current = key;
      setThoughts(currentThoughts);
    }
  });

  // Handle bubble interactions
  const handlePop = (entity: MentalEntity) => {
    // Pop sound effect could be added here
    entityManager.deactivateEntity(entity.id);
  };

  return (
    <group>
      {thoughts.map((thought) => (
        <ThoughtBubble
          key={thought.id}
          entity={thought}
          onPop={handlePop}
        />
      ))}
    </group>
  );
};

export default ThoughtBubble;