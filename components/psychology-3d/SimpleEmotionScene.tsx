'use client';

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';

// 简化的情感核心 - 避免使用可能导致错误的组件
export function SimpleEmotionCore({ color, intensity }: { color: string; intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.4}
        emissive={color}
        emissiveIntensity={0.3 + intensity * 0.4}
      />
    </mesh>
  );
}

// 简化的粒子系统
export function SimpleParticles({ color, count = 20 }: { color: string; count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
    ],
    scale: 0.1 + Math.random() * 0.2,
  }));

  return (
    <group>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position}>
          <sphereGeometry args={[p.scale, 8, 8]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.6}
            emissive={color}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// 简化版场景
export function SimpleEmotionScene({ emotionColor = '#6BCB77', intensity = 0.5 }: {
  emotionColor?: string;
  intensity?: number;
}) {
  return (
    <>
      <color attach="background" args={['#1a1a2e']} />

      {/* 使用primitive灯光 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color="#ffffff" />

      {/* 情感核心 */}
      <SimpleEmotionCore color={emotionColor} intensity={intensity} />

      {/* 粒子系统 */}
      <SimpleParticles color={emotionColor} count={30} />

      {/* 星空背景 */}
      <Stars radius={50} depth={50} count={500} factor={4} fade speed={0.5} />

      {/* 控制器 */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        zoomSpeed={0.6}
        panSpeed={0.5}
        rotateSpeed={0.4}
      />
    </>
  );
}
