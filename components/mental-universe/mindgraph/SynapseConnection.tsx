import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity } from '../core/MentalEntity';

/**
 * SynapseConnection renders active neural pathways between cognitive nodes.
 * Features pulsing signals, variable thickness based on connection strength, and activity-based brightness.
 */

interface SynapseConnectionProps {
  from: MentalEntity;
  to: MentalEntity;
  strength: number;
  activity: number;
  type?: 'structural' | 'functional' | 'plastic';
}

export const SynapseConnection: React.FC<SynapseConnectionProps> = ({
  from,
  to,
  strength,
  activity,
  type = 'functional'
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const signalRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Line>(null);

  // Connection color based on type and activity
  const connectionColor = useMemo(() => {
    const baseColor = new THREE.Color();

    switch (type) {
      case 'structural':
        baseColor.setHex(0x6366f1); // Purple
        break;
      case 'functional':
        baseColor.setHex(0x06b6d4); // Cyan
        break;
      case 'plastic':
        baseColor.setHex(0xfbbf24); // Yellow
        break;
      default:
        baseColor.setHex(0x6366f1);
    }

    // Modify based on activity
    if (activity > 0.7) {
      baseColor.offsetHSL(0, 0, 0.2); // Brighter
    } else if (activity < 0.3) {
      baseColor.offsetHSL(0, 0, -0.2); // Darker
    }

    return baseColor;
  }, [type, activity]);

  // Line thickness based on strength
  const lineThickness = useMemo(() => {
    return 1 + strength * 3; // 1-4 range
  }, [strength]);

  // Update connection animation
  useFrame((state) => {
    if (!lineRef.current || !signalRef.current) return;

    const time = state.clock.getElapsedTime();

    // Update line positions
    const positions = lineRef.current.geometry.attributes.position.array as Float32Array;
    positions[0] = from.physics.position.x;
    positions[1] = from.physics.position.y;
    positions[2] = from.physics.position.z;
    positions[3] = to.physics.position.x;
    positions[4] = to.physics.position.y;
    positions[5] = to.physics.position.z;
    lineRef.current.geometry.attributes.position.needsUpdate = true;

    // Update glow line
    if (glowRef.current) {
      const glowPositions = glowRef.current.geometry.attributes.position.array as Float32Array;
      glowPositions[0] = from.physics.position.x;
      glowPositions[1] = from.physics.position.y;
      glowPositions[2] = from.physics.position.z;
      glowPositions[3] = to.physics.position.x;
      glowPositions[4] = to.physics.position.y;
      glowPositions[5] = to.physics.position.z;
      glowRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Pulsing effect
    const pulseSpeed = 2 + activity * 3;
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2;

    // Update opacity
    const baseOpacity = strength * 0.6;
    const pulseOpacity = pulse * activity * 0.4;
    const finalOpacity = Math.min(1, baseOpacity + pulseOpacity);

    if (lineRef.current.material instanceof THREE.LineBasicMaterial) {
      lineRef.current.material.opacity = finalOpacity * 0.7;
    }

    if (glowRef.current && glowRef.current.material instanceof THREE.LineBasicMaterial) {
      glowRef.current.material.opacity = finalOpacity * 0.3;
    }

    // Signal transmission animation
    if (signalRef.current && activity > 0.2) {
      const signalSpeed = 1 + activity * 2;
      const signalPos = (time * signalSpeed) % 1;

      // Interpolate position along line
      const x = from.physics.position.x + (to.physics.position.x - from.physics.position.x) * signalPos;
      const y = from.physics.position.y + (to.physics.position.y - from.physics.position.y) * signalPos;
      const z = from.physics.position.z + (to.physics.position.z - from.physics.position.z) * signalPos;

      signalRef.current.position.set(x, y, z);

      // Signal size and opacity
      const signalSize = 0.1 + activity * 0.2;
      signalRef.current.scale.setScalar(signalSize);

      if (signalRef.current.material instanceof THREE.MeshBasicMaterial) {
        signalRef.current.material.opacity = activity * 0.8;
      }
    }

    // Hide signal if not active
    if (signalRef.current && activity <= 0.2) {
      signalRef.current.visible = false;
    } else if (signalRef.current) {
      signalRef.current.visible = true;
    }
  });

  // Create curved path for visualization
  const curvePoints = useMemo(() => {
    const midpoint = new THREE.Vector3()
      .addVectors(from.physics.position, to.physics.position)
      .multiplyScalar(0.5);

    // Add slight curve based on activity
    const curveAmount = activity * 2;
    midpoint.y += curveAmount;

    return [
      from.physics.position,
      midpoint,
      to.physics.position
    ];
  }, [from.physics.position, to.physics.position, activity]);

  return (
    <group>
      {/* Main connection line */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={curvePoints.length}
            array={new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z]))}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={connectionColor}
          transparent
          opacity={strength * 0.6}
          blending={THREE.AdditiveBlending}
          linewidth={lineThickness}
        />
      </line>

      {/* Glow effect */}
      <line ref={glowRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={curvePoints.length}
            array={new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z]))}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={connectionColor}
          transparent
          opacity={strength * 0.3}
          blending={THREE.AdditiveBlending}
          linewidth={lineThickness + 2}
        />
      </line>

      {/* Signal particle */}
      {activity > 0.2 && (
        <mesh ref={signalRef}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial
            color={connectionColor}
            transparent
            opacity={activity * 0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
};

/**
 * SynapseNetwork manages all neural connections in the mind graph
 */
interface SynapseNetworkProps {
  entityManager: EntityManager;
  connectionThreshold?: number;
  maxConnections?: number;
}

import { EntityManager } from '../core/EntityManager';

export const SynapseNetwork: React.FC<SynapseNetworkProps> = ({
  entityManager,
  connectionThreshold = 0.3,
  maxConnections = 200
}) => {
  const [connections, setConnections] = useState<Array<{
    from: MentalEntity;
    to: MentalEntity;
    strength: number;
    activity: number;
    type: 'structural' | 'functional' | 'plastic';
  }>>([]);

  // Update connections periodically
  useFrame(() => {
    const entities = entityManager.getActiveEntities();
    const cognitiveEntities = entities.filter(e =>
      e.type === 'thought' ||
      e.type === 'memory' ||
      e.type === 'belief' ||
      e.type === 'goal' ||
      e.type === 'need' ||
      e.type === 'habit' ||
      e.type === 'attention'
    );

    const newConnections: typeof connections = [];
    const processedPairs = new Set<string>();

    for (const entity of cognitiveEntities) {
      for (const relationship of entity.relationships) {
        // Skip weak connections
        if (relationship.strength < connectionThreshold) continue;

        const target = entityManager.getEntity(relationship.targetId);
        if (!target || !target.isAlive()) continue;

        // Avoid duplicates
        const pairKey = [entity.id, target.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Only include if target is also cognitive
        if (!cognitiveEntities.includes(target)) continue;

        // Determine connection type
        let connectionType: 'structural' | 'functional' | 'plastic' = 'functional';
        if (relationship.strength > 0.8) {
          connectionType = 'structural';
        } else if (relationship.activation > 0.7) {
          connectionType = 'plastic';
        }

        newConnections.push({
          from: entity,
          to: target,
          strength: relationship.strength,
          activity: relationship.activation,
          type: connectionType
        });

        // Limit connections
        if (newConnections.length >= maxConnections) break;
      }

      if (newConnections.length >= maxConnections) break;
    }

    setConnections(newConnections);
  });

  return (
    <group>
      {connections.map((connection, index) => (
        <SynapseConnection
          key={`${connection.from.id}-${connection.to.id}`}
          from={connection.from}
          to={connection.to}
          strength={connection.strength}
          activity={connection.activity}
          type={connection.type}
        />
      ))}
    </group>
  );
};

export default SynapseConnection;