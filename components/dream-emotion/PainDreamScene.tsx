'use client';

import { useRef, useMemo, useFrame, useState } from 'react';
import * as THREE from 'three';

// 雨滴组件
function RainDrops({ count = 100 }: { count?: number }) {
  const rainRef = useRef<THREE.Points>(null);

  const rainData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      velocities[i] = Math.random() * 0.3 + 0.2;
    }

    return { positions, velocities };
  }, [count]);

  useFrame(() => {
    if (rainRef.current) {
      const geometry = rainRef.current.geometry;
      const positions = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= rainData.velocities[i];

        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 30;
          positions[i * 3] = (Math.random() - 0.5) * 30;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
      }

      geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={rainData.positions.length / 3}
          array={rainData.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#4a6fa5"
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// 闪电效果
function Lightning({ frequency = 0.1 }: { frequency?: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const [isActive, setIsActive] = React.useState(false);

  useFrame((state) => {
    if (Math.random() < frequency * 0.01) {
      setIsActive(true);
      setTimeout(() => setIsActive(false), 100);
    }

    if (lightRef.current) {
      lightRef.current.intensity = isActive ? 5 : 0;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 20, 0]}
      color="#7b8cff"
      intensity={0}
      distance={50}
    />
  );
}

// 波浪效果
function WaveEffect({ height = 1 }: { height?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const positions = meshRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        positions[i + 2] = Math.sin(x * 0.5 + time) * height * 0.5 +
                          Math.sin(y * 0.3 + time * 0.8) * height * 0.3;
      }

      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[30, 30, 32, 32]} />
      <meshStandardMaterial
        color={new THREE.Color().setHSL(0.6, 0.4, 0.15)}
        roughness={0.8}
        metalness={0.2}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// 痛苦场景组件
export default function PainDreamScene({ config }: { config: any }) {
  const groupRef = useRef<THREE.Group>(null);

  // 生成痛苦的元素
  const painElements = useMemo(() => {
    const elements: THREE.Mesh[] = [];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.8, 0);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.65, 0.4, 0.15),
        roughness: 0.9,
        metalness: 0.3,
        transparent: true,
        opacity: 0.6,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 15,
        Math.random() * 10 - 3,
        (Math.random() - 0.5) * 15
      );
      mesh.userData = {
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        floatSpeed: Math.random() * 0.02 + 0.01,
        floatOffset: Math.random() * Math.PI * 2
      };
      elements.push(mesh);
    }

    return elements;
  }, []);

  // 动画
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      const floatSpeed = config?.floatSpeed || 0.3;

      painElements.forEach((element) => {
        element.rotation.x += element.userData.rotationSpeed;
        element.rotation.y += element.userData.rotationSpeed * 0.8;
        element.position.y += Math.sin(time + element.userData.floatOffset) * element.userData.floatSpeed * floatSpeed;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* 痛苦元素 */}
      {painElements.map((element, index) => (
        <primitive key={`pain-${index}`} object={element} />
      ))}

      {/* 雨滴 */}
      <RainDrops count={config?.rainDensity || 100} />

      {/* 波浪效果 */}
      <WaveEffect height={config?.waveHeight || 1} />

      {/* 闪电 */}
      <Lightning frequency={config?.lightningFreq || 0.1} />

      {/* 暗淡的环境光 */}
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.3}
        color="#4a5568"
      />

      {/* 深色雾气 */}
      <fog args={['#1a202c', 10, 30]} />
    </group>
  );
}
