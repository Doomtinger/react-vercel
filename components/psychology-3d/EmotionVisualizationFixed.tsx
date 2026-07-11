'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { EmotionType, emotionColors } from '@/lib/use-face-detection';

// 情感核心球体
export function EmotionCore({ emotion, intensity }: { emotion: EmotionType; intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const rotationSpeed = 0.5 + intensity * 2;
      meshRef.current.rotation.y += rotationSpeed * 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;

      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05 * intensity;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Sphere args={[1.5, 32, 32]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color={emotionColors[emotion]}
        distort={0.3 + intensity * 0.3}
        speed={1 + intensity * 2}
        roughness={0.3}
        metalness={0.4}
        transparent
        opacity={0.8}
        emissive={emotionColors[emotion]}
        emissiveIntensity={0.3 + intensity * 0.4}
      />
    </Sphere>
  );
}

// 情感粒子系统
export function EmotionParticles({ emotion, intensity, volatility }: {
  emotion: EmotionType;
  intensity: number;
  volatility: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const particleCount = 30;

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      basePosition: [
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      ] as [number, number, number],
      baseSpeed: 0.001 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      radius: 0.1 + Math.random() * 0.3,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const rotationSpeed = 0.002 + volatility * 0.005;
      groupRef.current.rotation.y += rotationSpeed;
      groupRef.current.rotation.x += rotationSpeed * 0.5;

      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && particles[i]) {
          const particle = particles[i];
          const time = state.clock.elapsedTime;
          const emotionFactor = {
            happy: 1.2,
            sad: 0.8,
            angry: 1.5,
            fearful: 0.6,
            neutral: 1,
            surprised: 1.8,
            disgusted: 0.7,
          }[emotion] || 1;

          const verticalOffset = Math.sin(time * particle.baseSpeed * 1000 + particle.phase) * 0.5 * intensity * emotionFactor;
          const horizontalOffset = Math.cos(time * particle.baseSpeed * 800 + particle.phase) * 0.3 * volatility;

          child.position.y = particle.basePosition[1] + verticalOffset;
          child.position.x = particle.basePosition[0] + horizontalOffset;

          const scale = 1 + Math.sin(time * 2 + particle.phase) * 0.3 * intensity;
          child.scale.setScalar(scale * (particle.radius / 0.2));
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle) => (
        <Sphere
          key={particle.id}
          position={particle.basePosition}
          args={[particle.radius, 8, 8]}
        >
          <meshStandardMaterial
            color={emotionColors[emotion]}
            transparent
            opacity={0.6}
            emissive={emotionColors[emotion]}
            emissiveIntensity={0.2 + intensity * 0.3}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 情感轨迹
export function EmotionTrail({
  emotions,
  currentEmotion
}: {
  emotions: Array<{ emotion: EmotionType; timestamp: number }>;
  currentEmotion: EmotionType;
}) {
  const trailRef = useRef<THREE.Group>(null);
  const recentEmotions = emotions.slice(-10);
  const currentTime = Date.now();

  useFrame(() => {
    if (trailRef.current) {
      trailRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={trailRef}>
      {recentEmotions.map((data, i) => {
        const age = currentTime - data.timestamp;
        const opacity = Math.max(0, 1 - age / 10000);
        const scale = 0.3 + (i / recentEmotions.length) * 0.5;
        const angle = (i / recentEmotions.length) * Math.PI * 2;
        const radius = 4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (i / recentEmotions.length) * 2 - 1;

        return (
          <Sphere key={`${data.timestamp}-${i}`} position={[x, y, z]} args={[scale, 8, 8]}>
            <MeshDistortMaterial
              color={emotionColors[data.emotion]}
              distort={0.2}
              speed={1}
              transparent
              opacity={opacity * 0.5}
              emissive={emotionColors[data.emotion]}
              emissiveIntensity={0.3}
            />
          </Sphere>
        );
      })}
    </group>
  );
}

// 心流场 - 简化版本，不使用 Trail
export function FlowField({
  currentEmotion,
  intensity,
  volatility
}: {
  currentEmotion: EmotionType;
  intensity: number;
  volatility: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const spheres = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      baseAngle: (i / 12) * Math.PI * 2,
      radius: 3 + Math.random() * 2,
      speed: 0.3 + Math.random() * 0.4,
      verticalOffset: Math.random() * 2 - 1,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const emotionSpeed = {
        happy: 1.2,
        sad: 0.6,
        angry: 1.8,
        fearful: 0.4,
        neutral: 0.8,
        surprised: 2.0,
        disgusted: 0.5,
      }[currentEmotion] || 1;

      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && spheres[i]) {
          const sphere = spheres[i];
          const time = state.clock.elapsedTime;
          const angle = sphere.baseAngle + time * sphere.speed * emotionSpeed * intensity;
          const y = sphere.verticalOffset + Math.sin(time * 2 + sphere.baseAngle) * volatility;
          const x = Math.cos(angle) * sphere.radius;
          const z = Math.sin(angle) * sphere.radius;

          child.position.set(x, y, z);
          child.rotation.x += 0.02;
          child.rotation.y += 0.03;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {spheres.map((sphere) => (
        <Sphere key={sphere.id} args={[0.3, 8, 8]}>
          <MeshDistortMaterial
            color={emotionColors[currentEmotion]}
            distort={0.3}
            speed={2}
            emissive={emotionColors[currentEmotion]}
            emissiveIntensity={0.4}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 综合情感可视化场景（不包含可能导致问题的灯光组件）
export function EmotionVisualizationScene({
  currentEmotion,
  intensity,
  volatility,
  emotionHistory,
}: {
  currentEmotion: EmotionType;
  intensity: number;
  volatility: number;
  emotionHistory: Array<{ emotion: EmotionType; timestamp: number }>;
}) {
  return (
    <>
      {/* 星空背景 */}
      <Stars
        radius={50}
        depth={50}
        count={500}
        factor={4}
        saturation={0}
        fade
        speed={0.5 + intensity * 0.5}
      />

      {/* 情感核心 */}
      <EmotionCore emotion={currentEmotion} intensity={intensity} />

      {/* 心流场 */}
      <FlowField
        currentEmotion={currentEmotion}
        intensity={intensity}
        volatility={volatility}
      />

      {/* 情感粒子 */}
      <EmotionParticles
        emotion={currentEmotion}
        intensity={intensity}
        volatility={volatility}
      />

      {/* 情感轨迹 */}
      <EmotionTrail
        emotions={emotionHistory}
        currentEmotion={currentEmotion}
      />
    </>
  );
}
