'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Trail, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { EmotionType, emotionColors } from '@/lib/use-face-detection';

// 情感核心球体 - 展示当前主要情感
export function EmotionCore({ emotion, intensity }: { emotion: EmotionType; intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // 根据情感强度调整旋转速度
      const rotationSpeed = 0.5 + intensity * 2;
      meshRef.current.rotation.y += rotationSpeed * 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;

      // 呼吸效果
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05 * intensity;
      meshRef.current.scale.set(scale, scale, scale);
    }

    if (innerRef.current) {
      // 内核反向旋转
      innerRef.current.rotation.y -= 0.02;
      const scale = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      innerRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      {/* 外层球体 - 主要情感颜色 */}
      <Sphere ref={meshRef} args={[1.5, 32, 32]}>
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

      {/* 内核 - 能量核心 */}
      <Sphere ref={innerRef} args={[0.8, 16, 16]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#ffffff"
          distort={0.2}
          speed={2}
          transparent
          opacity={0.6 - intensity * 0.3}
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </Sphere>

      {/* 光晕效果 */}
      <Sphere args={[2, 16, 16]}>
        <meshBasicMaterial
          color={emotionColors[emotion]}
          transparent
          opacity={0.1 + intensity * 0.2}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

// 情感粒子系统
export function EmotionParticles({ emotion, intensity, volatility }: {
  emotion: EmotionType;
  intensity: number;
  volatility: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const particleCount = 50;

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      basePosition: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      ] as [number, number, number],
      baseSpeed: 0.001 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      radius: 0.1 + Math.random() * 0.3,
    }));
  }, [particleCount]);

  useFrame((state) => {
    if (groupRef.current) {
      // 根据波动程度调整整体旋转速度
      const rotationSpeed = 0.002 + volatility * 0.005;
      groupRef.current.rotation.y += rotationSpeed;
      groupRef.current.rotation.x += rotationSpeed * 0.5;

      // 粒子运动
      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && particles[i]) {
          const particle = particles[i];

          // 复杂的运动轨迹
          const time = state.clock.elapsedTime;
          const emotionFactor = {
            happy: 1.2,      // 快乐时向上浮动
            sad: 0.8,        // 悲伤时向下沉
            angry: 1.5,      // 愤怒时快速运动
            fearful: 0.6,   // 恐惧时颤抖
            neutral: 1,      // 平静时稳定
            surprised: 1.8,  // 惊讶时爆发
            disgusted: 0.7,  // 厌恶时收缩
          }[emotion] || 1;

          const verticalOffset = Math.sin(time * particle.baseSpeed * 1000 + particle.phase) * 0.5 * intensity * emotionFactor;
          const horizontalOffset = Math.cos(time * particle.baseSpeed * 800 + particle.phase) * 0.3 * volatility;

          child.position.y = particle.basePosition[1] + verticalOffset;
          child.position.x = particle.basePosition[0] + horizontalOffset;

          // 根据情感强度调整粒子大小
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

// 情感波浪背景
export function EmotionWaves({ emotion, intensity }: { emotion: EmotionType; intensity: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const waves = useMemo(() => {
    return [0, 1, 2].map((i) => ({
      radius: 3 + i * 1.5,
      speed: 0.5 + i * 0.2,
      amplitude: 0.3 + i * 0.1,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && waves[i]) {
          const wave = waves[i];
          const scale = 1 + Math.sin(state.clock.elapsedTime * wave.speed) * wave.amplitude * intensity;
          child.scale.set(scale, scale, 1);
          if (child.material instanceof THREE.Material) {
            child.material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * wave.speed + i) * 0.05 * intensity;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {waves.map((wave, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[wave.radius, wave.radius + 0.3, 64]} />
          <meshBasicMaterial
            color={emotionColors[emotion]}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// 情感轨迹 - 显示情感变化历史
export function EmotionTrail({
  emotions,
  currentEmotion
}: {
  emotions: Array<{ emotion: EmotionType; timestamp: number }>;
  currentEmotion: EmotionType;
}) {
  const trailRef = useRef<THREE.Group>(null);

  // 显示最近10个情感点
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
        const opacity = Math.max(0, 1 - age / 10000); // 10秒后消失
        const scale = 0.3 + (i / recentEmotions.length) * 0.5;

        // 螺旋排列
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

// 心流场 - 多个流动的球体形成心流效果
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
        happy: 1.2,      // 快乐时轻快流动
        sad: 0.6,        // 悲伤时缓慢流动
        angry: 1.8,      // 愤怒时激烈流动
        fearful: 0.4,   // 恐惧时断续流动
        neutral: 0.8,    // 平静时稳定流动
        surprised: 2.0,  // 惊讶时爆发流动
        disgusted: 0.5,  // 厌恶时缓慢流动
      }[currentEmotion] || 1;

      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && spheres[i]) {
          const sphere = spheres[i];
          const time = state.clock.elapsedTime;

          // 复杂的流动轨迹
          const angle = sphere.baseAngle + time * sphere.speed * emotionSpeed * intensity;
          const y = sphere.verticalOffset + Math.sin(time * 2 + sphere.baseAngle) * volatility;
          const x = Math.cos(angle) * sphere.radius;
          const z = Math.sin(angle) * sphere.radius;

          child.position.set(x, y, z);

          // 自转
          child.rotation.x += 0.02;
          child.rotation.y += 0.03;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {spheres.map((sphere) => (
        <Trail
          key={sphere.id}
          width={0.2}
          color={emotionColors[currentEmotion]}
          attenuation={0.3}
          length={15 + intensity * 10 as number}
        >
          <Sphere args={[0.3, 8, 8]}>
            <MeshDistortMaterial
              color={emotionColors[currentEmotion]}
              distort={0.3}
              speed={2}
              emissive={emotionColors[currentEmotion]}
              emissiveIntensity={0.4}
            />
          </Sphere>
        </Trail>
      ))}
    </group>
  );
}

// 情感氛围 - 环境光效
export function EmotionAtmosphere({ emotion, intensity }: { emotion: EmotionType; intensity: number }) {
  return (
    <>
      {/* 环境光 - 使用原生THREE对象 */}
      <ambientLight
        intensity={0.3 + intensity * 0.2}
        color={emotionColors[emotion]}
      />

      {/* 主光源 */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.5 + intensity * 0.5}
        color={emotionColors[emotion]}
      />

      {/* 补光 */}
      <pointLight
        position={[-10, -10, -5]}
        intensity={0.3}
        color="#ffffff"
      />
    </>
  );
}

// 综合情感可视化场景
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
      {/* 情感氛围 */}
      <EmotionAtmosphere emotion={currentEmotion} intensity={intensity} />

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

      {/* 情感波浪 */}
      <EmotionWaves emotion={currentEmotion} intensity={intensity} />

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
