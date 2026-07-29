'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars, Grid, Torus, Icosahedron } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { EmotionType, emotionColorProfiles } from '@/lib/use-face-detection';

// 情感核心球体 - 优化版
export function EmotionCore({ emotion, intensity }: { emotion: EmotionType; intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorProfile = emotionColorProfiles[emotion];

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;

      switch (emotion) {
        case 'happy':
          meshRef.current.rotation.y += 0.02 * intensity;
          meshRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.15 * intensity);
          break;
        case 'sad':
          meshRef.current.position.y = Math.sin(time * 0.5) * 0.3 - 0.5;
          meshRef.current.scale.setScalar(0.8 + Math.sin(time * 1) * 0.1);
          break;
        case 'angry':
          meshRef.current.rotation.x += 0.05;
          meshRef.current.rotation.y += 0.08;
          meshRef.current.scale.setScalar(1 + Math.sin(time * 8) * 0.2 * intensity);
          meshRef.current.position.x = Math.sin(time * 10) * 0.1;
          meshRef.current.position.y = Math.cos(time * 12) * 0.1;
          break;
        case 'fearful':
          meshRef.current.position.x = Math.sin(time * 15) * 0.15 * intensity;
          meshRef.current.position.y = Math.cos(time * 18) * 0.15 * intensity;
          meshRef.current.scale.setScalar(0.9 + Math.sin(time * 20) * 0.1);
          break;
        case 'surprised':
          meshRef.current.scale.setScalar(1 + Math.sin(time * 6) * 0.25 * intensity);
          meshRef.current.rotation.z += 0.03;
          break;
        case 'disgusted':
          meshRef.current.rotation.x += 0.01;
          meshRef.current.scale.setScalar(0.7 + Math.sin(time * 2) * 0.05);
          break;
        default:
          meshRef.current.rotation.y += 0.005;
          meshRef.current.scale.setScalar(1 + Math.sin(time * 1.5) * 0.08);
      }
    }
  });

  const getGeometry = () => {
    switch (emotion) {
      case 'angry':
        return <Icosahedron args={[1.5, 2]} />; // 增加细节
      case 'surprised':
        return <Torus args={[1.2, 0.4, 32, 64]} />; // 提高细分度
      case 'fearful':
        return <Icosahedron args={[1.3, 1]} />; // 增加细节
      default:
        return <Sphere args={[1.5, 64, 64]} />; // 大幅提高细分度
    }
  };

  return (
    <group ref={meshRef}>
      {getGeometry()}
      <MeshDistortMaterial
        color={colorProfile.primary}
        distort={0.2 + intensity * 0.4}
        speed={1 + intensity * 2}
        roughness={emotion === 'angry' ? 0.15 : 0.35}
        metalness={emotion === 'happy' ? 0.5 : 0.35}
        transparent
        opacity={emotion === 'sad' ? 0.65 : 0.85}
        emissive={colorProfile.glow}
        emissiveIntensity={0.4 + intensity * 0.6}
      />
    </group>
  );
}

// 情感粒子系统 - 优化版
export function EmotionParticles({ emotion, intensity, volatility }: {
  emotion: EmotionType;
  intensity: number;
  volatility: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const colorProfile = emotionColorProfiles[emotion];

  const particleConfig = useMemo(() => {
    switch (emotion) {
      case 'happy':
        return { count: 50, speed: 1.5, spread: 8, color: colorProfile.gradient };
      case 'sad':
        return { count: 20, speed: 0.3, spread: 4, color: [colorProfile.primary, colorProfile.secondary] };
      case 'angry':
        return { count: 60, speed: 2.5, spread: 10, color: [colorProfile.primary, '#FF0000', colorProfile.accent] };
      case 'fearful':
        return { count: 35, speed: 0.8, spread: 6, color: [colorProfile.primary, colorProfile.secondary] };
      case 'surprised':
        return { count: 40, speed: 2.0, spread: 7, color: [colorProfile.primary, colorProfile.accent] };
      default:
        return { count: 30, speed: 1.0, spread: 5, color: [colorProfile.primary, colorProfile.secondary] };
    }
  }, [emotion, colorProfile]);

  const particles = useMemo(() => {
    return Array.from({ length: particleConfig.count }, (_, i) => ({
      id: i,
      basePosition: [
        (Math.random() - 0.5) * particleConfig.spread,
        (Math.random() - 0.5) * particleConfig.spread,
        (Math.random() - 0.5) * particleConfig.spread,
      ] as [number, number, number],
      baseSpeed: 0.001 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      radius: 0.1 + Math.random() * 0.3,
      colorIndex: Math.floor(Math.random() * particleConfig.color.length),
    }));
  }, [particleConfig]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      const rotationSpeed = {
        happy: 0.003,
        sad: 0.001,
        angry: 0.008,
        fearful: 0.012,
        surprised: 0.006,
        neutral: 0.002,
        disgusted: 0.0015,
      }[emotion] || 0.002;

      groupRef.current.rotation.y += rotationSpeed * volatility;
      groupRef.current.rotation.x += rotationSpeed * 0.5;

      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && particles[i]) {
          const particle = particles[i];
          const emotionFactor = {
            happy: 1.5,
            sad: 0.5,
            angry: 2.0,
            fearful: 0.8,
            surprised: 1.8,
            neutral: 1.0,
            disgusted: 0.6,
          }[emotion] || 1.0;

          let verticalOffset, horizontalOffset;
          switch (emotion) {
            case 'happy':
              verticalOffset = Math.sin(time * particle.baseSpeed * 1200 + particle.phase) * 0.8 * intensity;
              horizontalOffset = Math.cos(time * particle.baseSpeed * 1000 + particle.phase) * 0.4;
              break;
            case 'sad':
              verticalOffset = -Math.abs(Math.sin(time * particle.baseSpeed * 500 + particle.phase)) * 0.3;
              horizontalOffset = Math.sin(time * particle.baseSpeed * 600 + particle.phase) * 0.2;
              break;
            case 'angry':
              verticalOffset = Math.sin(time * particle.baseSpeed * 2000 + particle.phase) * 1.2 * intensity;
              horizontalOffset = Math.cos(time * particle.baseSpeed * 1800 + particle.phase) * 0.8;
              break;
            case 'fearful':
              verticalOffset = Math.sin(time * particle.baseSpeed * 2500 + particle.phase) * 0.4 * intensity;
              horizontalOffset = Math.cos(time * particle.baseSpeed * 2200 + particle.phase) * 0.3;
              break;
            default:
              verticalOffset = Math.sin(time * particle.baseSpeed * 1000 + particle.phase) * 0.5 * intensity;
              horizontalOffset = Math.cos(time * particle.baseSpeed * 800 + particle.phase) * 0.3;
          }

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
          args={[particle.radius, 32, 32]} // 提高细分度
        >
          <meshPhysicalMaterial // 升级到物理材质
            color={particleConfig.color[particle.colorIndex]}
            roughness={0.4}
            metalness={0.3}
            transparent
            opacity={emotion === 'sad' ? 0.45 : 0.65}
            emissive={particleConfig.color[particle.colorIndex]}
            emissiveIntensity={0.3 + intensity * 0.4}
            clearcoat={0.4}
            envMapIntensity={0.6}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 情感轨迹 - 优化版
export function EmotionTrail({
  emotions,
  currentEmotion
}: {
  emotions: Array<{ emotion: EmotionType; timestamp: number }>;
  currentEmotion: EmotionType;
}) {
  const trailRef = useRef<THREE.Group>(null);
  const recentEmotions = emotions.slice(-15);
  const currentTime = Date.now();

  useFrame(() => {
    if (trailRef.current) {
      trailRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group ref={trailRef}>
      {recentEmotions.map((data, i) => {
        const age = currentTime - data.timestamp;
        const opacity = Math.max(0, 1 - age / 15000);
        const scale = 0.3 + (i / recentEmotions.length) * 0.7;
        const angle = (i / recentEmotions.length) * Math.PI * 2;
        const radius = 4 + (i / recentEmotions.length) * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (i / recentEmotions.length) * 3 - 1.5;

        const emotionProfile = emotionColorProfiles[data.emotion];

        return (
          <Sphere key={`${data.timestamp}-${i}`} position={[x, y, z]} args={[scale, 32, 32]}>
            <MeshDistortMaterial
              color={emotionProfile.primary}
              distort={0.2}
              speed={1}
              transparent
              opacity={opacity * 0.65}
              emissive={emotionProfile.glow}
              emissiveIntensity={0.35}
            />
          </Sphere>
        );
      })}
    </group>
  );
}

// 心流场 - 优化版
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
  const colorProfile = emotionColorProfiles[currentEmotion];

  const fieldConfig = useMemo(() => {
    switch (currentEmotion) {
      case 'happy':
        return { count: 16, radius: [3, 5], speed: 1.5, vertical: 2, pattern: 'expanding' };
      case 'sad':
        return { count: 8, radius: [2, 3], speed: 0.4, vertical: 1, pattern: 'sinking' };
      case 'angry':
        return { count: 20, radius: [4, 6], speed: 2.5, vertical: 3, pattern: 'explosive' };
      case 'fearful':
        return { count: 12, radius: [3, 4], speed: 0.8, vertical: 1.5, pattern: 'trembling' };
      case 'surprised':
        return { count: 14, radius: [3.5, 5], speed: 2.2, vertical: 2.5, pattern: 'burst' };
      default:
        return { count: 10, radius: [2.5, 4], speed: 0.8, vertical: 1.5, pattern: 'smooth' };
    }
  }, [currentEmotion]);

  const spheres = useMemo(() => {
    return Array.from({ length: fieldConfig.count }, (_, i) => ({
      id: i,
      baseAngle: (i / fieldConfig.count) * Math.PI * 2,
      radius: fieldConfig.radius[0] + Math.random() * (fieldConfig.radius[1] - fieldConfig.radius[0]),
      speed: 0.3 + Math.random() * 0.4,
      verticalOffset: (Math.random() - 0.5) * fieldConfig.vertical,
      colorIndex: Math.floor(Math.random() * colorProfile.gradient.length),
    }));
  }, [fieldConfig, colorProfile.gradient.length]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && spheres[i]) {
          const sphere = spheres[i];

          let angle, x, y, z;
          switch (fieldConfig.pattern) {
            case 'expanding':
              angle = sphere.baseAngle + time * sphere.speed * fieldConfig.speed * intensity;
              const expandRadius = sphere.radius * (1 + Math.sin(time) * 0.3);
              x = Math.cos(angle) * expandRadius;
              z = Math.sin(angle) * expandRadius;
              y = sphere.verticalOffset + Math.sin(time * 2 + sphere.baseAngle) * 0.5;
              break;

            case 'sinking':
              angle = sphere.baseAngle + time * sphere.speed * fieldConfig.speed * 0.5;
              x = Math.cos(angle) * sphere.radius;
              z = Math.sin(angle) * sphere.radius;
              y = sphere.verticalOffset - Math.abs(Math.sin(time * 0.5)) * 2;
              break;

            case 'explosive':
              angle = sphere.baseAngle + time * sphere.speed * fieldConfig.speed * intensity * 1.5;
              const explosiveRadius = sphere.radius * (1 + Math.sin(time * 3) * 0.5 * intensity);
              x = Math.cos(angle) * explosiveRadius;
              z = Math.sin(angle) * explosiveRadius;
              y = sphere.verticalOffset + Math.sin(time * 4 + sphere.baseAngle) * volatility * 2;
              break;

            case 'trembling':
              angle = sphere.baseAngle + time * sphere.speed * fieldConfig.speed;
              x = Math.cos(angle) * sphere.radius + Math.sin(time * 10) * 0.3;
              z = Math.sin(angle) * sphere.radius + Math.cos(time * 12) * 0.3;
              y = sphere.verticalOffset + Math.sin(time * 8) * 0.2;
              break;

            case 'burst':
              angle = sphere.baseAngle + time * sphere.speed * fieldConfig.speed;
              const burstRadius = sphere.radius * (1 + (Math.sin(time * 6) > 0.8 ? 0.4 : 0));
              x = Math.cos(angle) * burstRadius;
              z = Math.sin(angle) * burstRadius;
              y = sphere.verticalOffset + Math.cos(time * 5 + sphere.baseAngle) * 0.8;
              break;

            default:
              angle = sphere.baseAngle + time * sphere.speed * fieldConfig.speed;
              x = Math.cos(angle) * sphere.radius;
              z = Math.sin(angle) * sphere.radius;
              y = sphere.verticalOffset + Math.sin(time * 2 + sphere.baseAngle) * volatility;
          }

          child.position.set(x, y, z);
          child.rotation.x += 0.02 * intensity;
          child.rotation.y += 0.03 * intensity;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {spheres.map((sphere) => (
        <Sphere key={sphere.id} args={[0.3, 32, 32]}>
          <meshPhysicalMaterial // 升级到物理材质
            color={colorProfile.gradient[sphere.colorIndex % colorProfile.gradient.length]}
            roughness={0.35}
            metalness={0.4}
            distort={0.2 + intensity * 0.3}
            speed={1 + fieldConfig.speed}
            emissive={colorProfile.glow}
            emissiveIntensity={0.35 + intensity * 0.45}
            transparent
            opacity={currentEmotion === 'sad' ? 0.55 : 0.75}
            clearcoat={0.5}
            envMapIntensity={0.7}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 格子背景 - 优化版
function EmotionGridBackground({ emotion, intensity }: { emotion: EmotionType; intensity: number }) {
  const colorProfile = emotionColorProfiles[emotion];

  const gridConfig = {
    angry: { cellSize: 1.2, speed: 2.0, opacity: 0.3 },
    happy: { cellSize: 1.5, speed: 1.2, opacity: 0.15 },
    sad: { cellSize: 0.8, speed: 0.5, opacity: 0.2 },
    fearful: { cellSize: 0.6, speed: 1.5, opacity: 0.25 },
    surprised: { cellSize: 1.8, speed: 2.5, opacity: 0.2 },
    neutral: { cellSize: 1.0, speed: 0.8, opacity: 0.1 },
    disgusted: { cellSize: 0.7, speed: 0.6, opacity: 0.15 },
  }[emotion] || { cellSize: 1.0, speed: 1.0, opacity: 0.15 };

  return (
    <group>
      <Grid
        args={[20, 20]}
        cellSize={gridConfig.cellSize}
        cellThickness={0.06}
        cellColor={colorProfile.secondary}
        sectionSize={5}
        sectionThickness={0.12}
        sectionColor={colorProfile.primary}
        fadeDistance={15}
        fadeStrength={1}
        position={[0, 0, -3]}
        rotation={[0, 0, 0]}
        infiniteGrid
      />

      <Grid
        args={[15, 15]}
        cellSize={gridConfig.cellSize * 0.8}
        cellThickness={0.04}
        cellColor={colorProfile.glow}
        sectionSize={5}
        sectionThickness={0.08}
        sectionColor={colorProfile.secondary}
        fadeDistance={12}
        fadeStrength={1.2}
        position={[0, 0, -5]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

// 综合情感可视化场景 - 优化版
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
  const colorProfile = emotionColorProfiles[currentEmotion];

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

      {/* 格子背景 */}
      <EmotionGridBackground emotion={currentEmotion} intensity={intensity} />

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

      {/* 优化的照明系统 */}
      <ambientLight intensity={0.35} />
      <pointLight
        position={[10, 10, 5]}
        intensity={0.55}
        color={colorProfile.primary}
        distance={20}
        decay={2}
      />
      <pointLight
        position={[-10, -10, -5]}
        intensity={0.35}
        color={colorProfile.secondary}
        distance={18}
        decay={2}
      />
      <pointLight
        position={[0, 8, 8]}
        intensity={0.25}
        color={colorProfile.glow}
        distance={15}
        decay={2}
      />

      {/* Bloom后处理效果 */}
      <EffectComposer>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          radius={0.8}
        />
      </EffectComposer>
    </>
  );
}