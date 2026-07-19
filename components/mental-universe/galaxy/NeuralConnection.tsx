import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity } from '../core/MentalEntity';
import { EntityManager } from '../core/EntityManager';

/**
 * NeuralConnection renders glowing neural lines between related entities.
 * Connection brightness and thickness indicate relationship strength.
 */

interface NeuralConnectionProps {
  entityManager: EntityManager;
  maxConnections?: number;
  connectionThreshold?: number;
}

interface ConnectionData {
  from: MentalEntity;
  to: MentalEntity;
  strength: number;
  distance: number;
  midpoint: THREE.Vector3;
}

export const NeuralConnection: React.FC<NeuralConnectionProps> = ({
  entityManager,
  maxConnections = 100,
  connectionThreshold = 0.2
}) => {
  const lineRefs = useRef<Map<string, THREE.Line>>(new Map());
  const groupRef = useRef<THREE.Group>(null);

  // Gather connection data
  const connections = useMemo((): ConnectionData[] => {
    const connections: ConnectionData[] = [];
    const entities = entityManager.getActiveEntities();
    const processedPairs = new Set<string>();

    for (const entity of entities) {
      if (!entity.isAlive()) continue;

      for (const relationship of entity.relationships) {
        // Skip weak connections
        if (relationship.strength < connectionThreshold) continue;

        const target = entityManager.getEntity(relationship.targetId);
        if (!target || !target.isAlive()) continue;

        // Avoid duplicate connections
        const pairKey = [entity.id, target.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        connections.push({
          from: entity,
          to: target,
          strength: relationship.strength,
          distance: relationship.distance || 5,
          midpoint: new THREE.Vector3()
            .addVectors(entity.physics.position, target.physics.position)
            .multiplyScalar(0.5)
        });
      }

      // Limit connections
      if (connections.length >= maxConnections) break;
    }

    return connections;
  }, [entityManager, maxConnections, connectionThreshold]);

  // Update connections
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    for (const connection of connections) {
      const connectionKey = [connection.from.id, connection.to.id].sort().join('-');
      let line = lineRefs.current.get(connectionKey);

      // Create line if it doesn't exist
      if (!line) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
          connection.from.physics.position.x,
          connection.from.physics.position.y,
          connection.from.physics.position.z,
          connection.to.physics.position.x,
          connection.to.physics.position.y,
          connection.to.physics.position.z
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
          transparent: true,
          opacity: connection.strength * 0.6,
          blending: THREE.AdditiveBlending,
          linewidth: 1
        });

        line = new THREE.Line(geometry, material);
        lineRefs.current.set(connectionKey, line);
        groupRef.current.add(line);
      }

      // Update positions
      const positions = line.geometry.attributes.position.array as Float32Array;
      positions[0] = connection.from.physics.position.x;
      positions[1] = connection.from.physics.position.y;
      positions[2] = connection.from.physics.position.z;
      positions[3] = connection.to.physics.position.x;
      positions[4] = connection.to.physics.position.y;
      positions[5] = connection.to.physics.position.z;
      line.geometry.attributes.position.needsUpdate = true;

      // Update material
      const material = line.material as THREE.LineBasicMaterial;

      // Calculate activation
      const fromActivity = connection.from.state.activity;
      const toActivity = connection.to.state.activity;
      const activation = (fromActivity + toActivity) / 2;

      // Pulse effect
      const pulse = Math.sin(time * 3 + connection.from.id.length) * 0.5 + 0.5;
      const opacity = connection.strength * 0.4 + activation * 0.4 + pulse * 0.2;

      material.opacity = Math.min(1, opacity);

      // Color based on activation
      if (activation > 0.7) {
        material.color.setHex(0x00ffff); // Cyan for highly active
      } else if (activation > 0.4) {
        material.color.setHex(0x8b5cf6); // Purple for moderately active
      } else {
        material.color.setHex(0x6366f1); // Blue for low activity
      }

      // Visibility based on entity states
      line.visible = connection.from.isVisible() && connection.to.isVisible();
    }

    // Clean up old connections
    const currentKeys = new Set(
      connections.map(c => [c.from.id, c.to.id].sort().join('-'))
    );

    for (const [key, line] of lineRefs.current) {
      if (!currentKeys.has(key)) {
        groupRef.current.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        lineRefs.current.delete(key);
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const line of lineRefs.current.values()) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      lineRefs.current.clear();
    };
  }, []);

  return <group ref={groupRef} />;
};

/**
 * Enhanced neural connection with glow effect
 */
interface GlowingConnectionProps {
  from: MentalEntity;
  to: MentalEntity;
  strength: number;
  activation: number;
}

export const GlowingConnection: React.FC<GlowingConnectionProps> = ({
  from,
  to,
  strength,
  activation
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const glowRef = useRef<THREE.Line>(null);

  const midpoint = useMemo(() => {
    return new THREE.Vector3()
      .addVectors(from.physics.position, to.physics.position)
      .multiplyScalar(0.5);
  }, [from.physics.position, to.physics.position]);

  useFrame((state) => {
    if (!lineRef.current || !glowRef.current) return;

    const time = state.clock.getElapsedTime();

    // Update positions
    const positions = lineRef.current.geometry.attributes.position.array as Float32Array;
    positions[0] = from.physics.position.x;
    positions[1] = from.physics.position.y;
    positions[2] = from.physics.position.z;
    positions[3] = to.physics.position.x;
    positions[4] = to.physics.position.y;
    positions[5] = to.physics.position.z;
    lineRef.current.geometry.attributes.position.needsUpdate = true;

    // Update glow
    const glowPositions = glowRef.current.geometry.attributes.position.array as Float32Array;
    glowPositions[0] = from.physics.position.x;
    glowPositions[1] = from.physics.position.y;
    glowPositions[2] = from.physics.position.z;
    glowPositions[3] = to.physics.position.x;
    glowPositions[4] = to.physics.position.y;
    glowPositions[5] = to.physics.position.z;
    glowRef.current.geometry.attributes.position.needsUpdate = true;

    // Pulse effect
    const pulse = Math.sin(time * 3 + from.id.length) * 0.5 + 0.5;
    const opacity = strength * 0.4 + activation * 0.4 + pulse * 0.2;

    if (lineRef.current.material instanceof THREE.LineBasicMaterial) {
      lineRef.current.material.opacity = Math.min(1, opacity * 0.6);
    }

    if (glowRef.current.material instanceof THREE.LineBasicMaterial) {
      glowRef.current.material.opacity = Math.min(1, opacity * 0.3);
    }

    // Color based on activation
    const color = activation > 0.7 ? 0x00ffff :
                 activation > 0.4 ? 0x8b5cf6 : 0x6366f1;

    if (lineRef.current.material instanceof THREE.LineBasicMaterial) {
      lineRef.current.material.color.setHex(color);
    }

    if (glowRef.current.material instanceof THREE.LineBasicMaterial) {
      glowRef.current.material.color.setHex(color);
    }
  });

  const curve = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      from.physics.position,
      midpoint,
      to.physics.position
    );
    return curve;
  }, [from.physics.position, to.physics.position, midpoint]);

  const points = useMemo(() => {
    return curve.getPoints(20);
  }, [curve]);

  return (
    <group>
      {/* Main line */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          />
        </bufferGeometry>
        <lineBasicMaterial
          transparent
          opacity={strength * 0.6}
          blending={THREE.AdditiveBlending}
        />
      </line>

      {/* Glow effect */}
      <line ref={glowRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          />
        </bufferGeometry>
        <lineBasicMaterial
          transparent
          opacity={strength * 0.3}
          blending={THREE.AdditiveBlending}
          linewidth={2}
        />
      </line>
    </group>
  );
};

export default NeuralConnection;