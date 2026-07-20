import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { MeshDistortMaterial, Html } from '@react-three/drei';

/**
 * CelestialEntity represents psychological concepts as floating celestial objects.
 * Features organic breathing animation, soft glow, and spatial depth.
 */

interface CelestialEntityProps {
  entity: MentalEntity;
  isHovered?: boolean;
  isFocused?: boolean;
  onHover?: (entity: MentalEntity) => void;
  onClick?: (entity: MentalEntity) => void;
}

const CELESTIAL_COLORS: Record<EntityType, THREE.ColorRepresentation> = {
  [EntityType.SELF]: 0xffffff,        // White for Self
  [EntityType.EMOTION]: 0x6366f1,     // Purple for emotions
  [EntityType.THOUGHT]: 0x06b6d4,     // Cyan for thoughts
  [EntityType.BELIEF]: 0x8b5cf6,      // Violet for beliefs
  [EntityType.MEMORY]: 0xf59e0b,       // Amber for memories
  [EntityType.GOAL]: 0x10b981,         // Emerald for goals
  [EntityType.NEED]: 0xef4444,         // Red for needs
  [EntityType.HABIT]: 0x64748b,         // Slate for habits
  [EntityType.ATTENTION]: 0xfbbf24,     // Yellow for attention
};

export const CelestialEntity: React.FC<CelestialEntityProps> = ({
  entity,
  isHovered = false,
  isFocused = false,
  onHover,
  onClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);

  // Breathing animation phase
  const breathingPhase = useMemo(() => Math.random() * Math.PI * 2, []);
  const breathingSpeed = entity.type === EntityType.SELF ? 0.3 : 0.5;

  // Calculate base properties
  const baseSize = useMemo(() => {
    switch (entity.type) {
      case EntityType.SELF:
        return 2.5;
      case EntityType.EMOTION:
        return 1.0 + entity.state.intensity * 0.8;
      case EntityType.THOUGHT:
        return 0.6 + entity.state.intensity * 0.4;
      case EntityType.MEMORY:
        return 0.8;
      case EntityType.GOAL:
        return 1.2;
      default:
        return 1.0;
    }
  }, [entity.type, entity.state.intensity]);

  // Color based on entity type and mood
  const entityColor = useMemo(() => {
    const baseColor = new THREE.Color(CELESTIAL_COLORS[entity.type]);

    // Modify based on mood
    const moodShift = (entity.state.mood.valence - 0.5) * 0.2;
    baseColor.offsetHSL(0, 0, moodShift);

    return baseColor;
  }, [entity.type, entity.state.mood.valence]);

  // Create geometry based on entity type
  const geometry = useMemo(() => {
    if (entity.type === EntityType.SELF) {
      return new THREE.IcosahedronGeometry(1, 4); // More detail for Self
    } else if (entity.type === EntityType.EMOTION) {
      return new THREE.SphereGeometry(1, 32, 32); // Smooth sphere for emotions
    } else if (entity.type === EntityType.THOUGHT) {
      return new THREE.OctahedronGeometry(1, 0); // Sharp for thoughts
    } else {
      return new THREE.SphereGeometry(1, 24, 24);
    }
  }, [entity.type]);

  // Update entity mesh reference
  useEffect(() => {
    if (meshRef.current) {
      entity.setMesh(meshRef.current, (meshRef.current.material as THREE.Material));
    }
  }, [entity]);

  // Breathing animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const entityTime = time + breathingPhase;

    // Breathing effect - scale in and out
    const breathAmount = Math.sin(entityTime * breathingSpeed) * 0.05;
    const scaleMultiplier = 1 + breathAmount + (entity.state.intensity * 0.2);

    // Activity-based vibration
    const vibrationAmount = entity.state.activity * 0.02;
    const vibrationX = Math.sin(entityTime * 10) * vibrationAmount;
    const vibrationY = Math.cos(entityTime * 8) * vibrationAmount;
    const vibrationZ = Math.sin(entityTime * 12) * vibrationAmount;

    // Apply scale
    const finalScale = baseSize * scaleMultiplier;
    meshRef.current.scale.setScalar(finalScale);

    // Apply vibration
    meshRef.current.position.set(
      entity.physics.position.x + vibrationX,
      entity.physics.position.y + vibrationY,
      entity.physics.position.z + vibrationZ
    );

    // Update rotation based on mood
    const rotationSpeed = 0.2 + entity.state.mood.arousal * 0.5;
    meshRef.current.rotation.x += rotationSpeed * 0.01;
    meshRef.current.rotation.y += rotationSpeed * 0.015;

    // Update glow
    if (glowRef.current) {
      const glowScale = finalScale * 1.3;
      const glowIntensity = entity.state.intensity * 0.5;
      glowRef.current.scale.setScalar(glowScale);

      if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
        glowRef.current.material.opacity = glowIntensity * (isHovered ? 0.8 : 0.4);
      }
    }

    // Focus effect
    if (isFocused && orbitRef.current) {
      orbitRef.current.rotation.y += 0.005;
    }

    // Hover effect
    if (isHovered && meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(entityTime * 5) * 0.3;
    } else if (meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      meshRef.current.material.emissiveIntensity = entity.state.activity * 0.3;
    }
  });

  // Handle interactions
  const handlePointerOver = (e: THREE.Event) => {
    e.stopPropagation();
    onHover?.(entity);
  };

  const handlePointerOut = (e: THREE.Event) => {
    e.stopPropagation();
  };

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation();
    onClick?.(entity);
  };

  return (
    <group ref={orbitRef}>
      {/* Main celestial body */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <MeshDistortMaterial
          color={entityColor}
          transparent
          opacity={entity.state.certainty * entity.visibility}
          roughness={0.2}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={entity.type === EntityType.SELF ? 0.3 : 0.8}
          thickness={0.5}
          distort={0.3 + entity.state.activity * 0.5}
          speed={1 + entity.state.mood.arousal * 2}
          emissive={entityColor}
          emissiveIntensity={entity.state.activity * 0.3}
        />
      </mesh>

      {/* Outer glow for strong entities */}
      {entity.state.intensity > 0.6 && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshBasicMaterial
            color={entityColor}
            transparent
            opacity={entity.state.intensity * 0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Orbiting particles for Self */}
      {entity.type === EntityType.SELF && (
        <>
          {[...Array(8)].map((_, i) => (
            <mesh key={i} position={[
              Math.cos((i / 8) * Math.PI * 2) * 3,
              Math.sin((i / 8) * Math.PI * 2) * 3,
              Math.sin((i / 8) * Math.PI * 4) * 0.5
            ]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial
                color={0xffffff}
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </>
      )}

      {/* Focus ring */}
      {isFocused && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * 1.5, baseSize * 1.6, 32]} />
          <meshBasicMaterial
            color={0x00ffff}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Label on hover */}
      {isHovered && (
        <Html position={[0, baseSize + 0.5, 0]} center>
          <div className="celestial-label">
            <div className="label-text">{entity.metadata.label}</div>
            <div className="label-intensity">
              {(entity.state.intensity * 100).toFixed(0)}%
            </div>
          </div>
          <style jsx>{`
            .celestial-label {
              background: rgba(0, 0, 0, 0.8);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              padding: 8px 12px;
              backdrop-filter: blur(10px);
              color: white;
              text-align: center;
              pointer-events: none;
            }
            .label-text {
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 4px;
            }
            .label-intensity {
              font-size: 12px;
              opacity: 0.7;
            }
          `}</style>
        </Html>
      )}
    </group>
  );
};

export default CelestialEntity;