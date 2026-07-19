import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { MeshDistortMaterial, Html } from '@react-three/drei';

/**
 * ThoughtNode represents cognitive entities as neural network nodes.
 * Features activation states, pulsing animations, and dynamic connections.
 */

interface ThoughtNodeProps {
  entity: MentalEntity;
  isHovered?: boolean;
  onActivate?: (entity: MentalEntity) => void;
  onHover?: (entity: MentalEntity) => void;
}

const NODE_COLORS: Record<EntityType, THREE.ColorRepresentation> = {
  [EntityType.THOUGHT]: 0x06b6d4,      // Cyan
  [EntityType.MEMORY]: 0xf59e0b,       // Amber
  [EntityType.BELIEF]: 0x8b5cf6,       // Violet
  [EntityType.GOAL]: 0x10b981,         // Emerald
  [EntityType.NEED]: 0xef4444,         // Red
  [EntityType.HABIT]: 0x64748b,       // Slate
  [EntityType.ATTENTION]: 0xfbbf24,    // Yellow
  [EntityType.SELF]: 0xffffff,         // White
  [EntityType.EMOTION]: 0x6366f1       // Purple
};

const NODE_SHAPES: Record<EntityType, string> = {
  [EntityType.THOUGHT]: 'octahedron',
  [EntityType.MEMORY]: 'sphere',
  [EntityType.BELIEF]: 'box',
  [EntityType.GOAL]: 'cone',
  [EntityType.NEED]: 'cylinder',
  [EntityType.HABIT]: 'torus',
  [EntityType.ATTENTION]: 'diamond',
  [EntityType.SELF]: 'icosahedron',
  [EntityType.EMOTION]: 'sphere'
};

export const ThoughtNode: React.FC<ThoughtNodeProps> = ({
  entity,
  isHovered = false,
  onActivate,
  onHover
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.PointLight>(null);
  const orbitRef = useRef<THREE.Group>(null);

  // Node color
  const nodeColor = useMemo(() => {
    return NODE_COLORS[entity.type] || NODE_COLORS[entity.type];
  }, [entity.type]);

  // Node shape
  const nodeShape = useMemo(() => {
    return NODE_SHAPES[entity.type] || 'sphere';
  }, [entity.type]);

  // Create geometry based on shape
  const geometry = useMemo(() => {
    const detail = entity.state.intensity > 0.7 ? 1 : 0;

    switch (nodeShape) {
      case 'octahedron':
        return new THREE.OctahedronGeometry(1, detail);
      case 'sphere':
        return new THREE.SphereGeometry(1, 16 + detail * 16, 16 + detail * 16);
      case 'box':
        return new THREE.BoxGeometry(1, 1, 1);
      case 'cone':
        return new THREE.ConeGeometry(1, 2, 16 + detail * 16);
      case 'cylinder':
        return new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
      case 'torus':
        return new THREE.TorusGeometry(0.7, 0.3, 16, 32);
      case 'diamond':
        return new THREE.OctahedronGeometry(1, 0);
      case 'icosahedron':
        return new THREE.IcosahedronGeometry(1, detail);
      default:
        return new THREE.SphereGeometry(1, 16, 16);
    }
  }, [nodeShape, entity.state.intensity]);

  // Calculate base size
  const baseSize = useMemo(() => {
    const sizeMap = {
      [EntityType.THOUGHT]: 0.8,
      [EntityType.MEMORY]: 0.6,
      [EntityType.BELIEF]: 0.9,
      [EntityType.GOAL]: 1.0,
      [EntityType.NEED]: 0.7,
      [EntityType.HABIT]: 0.5,
      [EntityType.ATTENTION]: 0.85,
      [EntityType.SELF]: 1.5,
      [EntityType.EMOTION]: 1.0
    };
    const base = sizeMap[entity.type] || 1.0;
    return base * (1 + entity.state.intensity * 0.5);
  }, [entity.type, entity.state.intensity]);

  // Set mesh reference
  useEffect(() => {
    if (meshRef.current) {
      entity.setMesh(meshRef.current, meshRef.current.material as THREE.Material);
    }
  }, [entity]);

  // Activation animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const isActive = entity.state.activity > 0.5;

    // Pulsing effect for active nodes
    const pulsePhase = time * (isActive ? 4 : 2);
    const pulseAmount = Math.sin(pulsePhase) * 0.1 * entity.state.activity;
    const scale = baseSize * (1 + pulseAmount);

    meshRef.current.scale.setScalar(scale);

    // Update position
    meshRef.current.position.copy(entity.physics.position);

    // Subtle rotation
    const rotationSpeed = 0.5 + entity.state.activity * 1.5;
    meshRef.current.rotation.x += rotationSpeed * 0.01;
    meshRef.current.rotation.y += rotationSpeed * 0.015;

    // Activation glow
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scale * 1.4);

      if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
        const glowOpacity = isActive ? 0.8 : 0.3;
        glowRef.current.material.opacity = glowOpacity * entity.state.certainty;
      }
    }

    // Point light for very active nodes
    if (pulseRef.current) {
      pulseRef.current.intensity = isActive ? entity.state.activity * 2 : 0;
      pulseRef.current.distance = isActive ? 5 : 0;
    }

    // Orbital rings for attention/goal nodes
    if (orbitRef.current && (entity.type === EntityType.ATTENTION || entity.type === EntityType.GOAL)) {
      orbitRef.current.rotation.z = time * 0.5;
      orbitRef.current.rotation.x = time * 0.3;
    }

    // Hover effect
    if (isHovered && meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      meshRef.current.material.emissiveIntensity = 0.8;
      meshRef.current.material.roughness = 0.1;
    } else if (meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      meshRef.current.material.emissiveIntensity = entity.state.activity * 0.5;
      meshRef.current.material.roughness = 0.3;
    }
  });

  // Handle interactions
  const handleClick = () => {
    // Activate node on click
    entity.modifyActivity(0.3);
    onActivate?.(entity);
  };

  const handlePointerOver = (e: THREE.Event) => {
    e.stopPropagation();
    onHover?.(entity);
  };

  return (
    <group position={entity.physics.position}>
      {/* Main node */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
      >
        <MeshDistortMaterial
          color={nodeColor}
          transparent
          opacity={entity.state.certainty * 0.9}
          roughness={0.3}
          metalness={0.2}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          distort={0.2 + entity.state.activity * 0.3}
          speed={1 + entity.state.activity}
          emissive={nodeColor}
          emissiveIntensity={entity.state.activity * 0.5}
        />
      </mesh>

      {/* Outer glow for active nodes */}
      {entity.state.activity > 0.3 && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshBasicMaterial
            color={nodeColor}
            transparent
            opacity={entity.state.activity * 0.4}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Point light for highly active nodes */}
      {entity.state.activity > 0.7 && (
        <pointLight
          ref={pulseRef}
          color={nodeColor}
          intensity={entity.state.activity * 2}
          distance={5}
          decay={2}
        />
      )}

      {/* Orbital rings for special node types */}
      {(entity.type === EntityType.ATTENTION || entity.type === EntityType.GOAL) && (
        <group ref={orbitRef}>
          {entity.type === EntityType.ATTENTION && (
            <>
              {[...Array(3)].map((_, i) => (
                <mesh
                  key={i}
                  rotation={[
                    (i / 3) * Math.PI,
                    (i / 3) * Math.PI * 2,
                    0
                  ]}
                >
                  <torusGeometry args={[baseSize * 1.5, 0.02, 8, 32]} />
                  <meshBasicMaterial
                    color={nodeColor}
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              ))}
            </>
          )}

          {entity.type === EntityType.GOAL && (
            <>
              {[...Array(4)].map((_, i) => (
                <mesh
                  key={i}
                  position={[
                    Math.cos((i / 4) * Math.PI * 2) * baseSize * 2,
                    Math.sin((i / 4) * Math.PI * 2) * baseSize * 2,
                    0
                  ]}
                >
                  <sphereGeometry args={[0.1, 8, 8]} />
                  <meshBasicMaterial
                    color={nodeColor}
                    transparent
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              ))}
            </>
          )}
        </group>
      )}

      {/* Label on hover */}
      {isHovered && (
        <Html position={[0, baseSize + 0.5, 0]} center>
          <div className="node-label">
            <div className="label-type">{entity.type}</div>
            <div className="label-text">{entity.metadata.label}</div>
            <div className="label-activity">
              Activity: {(entity.state.activity * 100).toFixed(0)}%
            </div>
          </div>
          <style jsx>{`
            .node-label {
              background: rgba(0, 0, 0, 0.9);
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 8px;
              padding: 8px 12px;
              backdrop-filter: blur(10px);
              color: white;
              text-align: center;
              pointer-events: none;
              font-size: 12px;
            }
            .label-type {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.7;
              margin-bottom: 4px;
            }
            .label-text {
              font-weight: 500;
              margin-bottom: 4px;
            }
            .label-activity {
              opacity: 0.8;
            }
          `}</style>
        </Html>
      )}
    </group>
  );
};

export default ThoughtNode;