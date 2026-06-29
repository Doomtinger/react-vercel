'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Stars, Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

// 情绪颜色映射
const emotionColors = {
  happy: '#FFD93D',      // 快乐 - 黄色
  calm: '#6BCB77',       // 平静 - 绿色
  sad: '#4D96FF',        // 悲伤 - 蓝色
  excited: '#FF6B6B',    // 兴奋 - 红色
  peaceful: '#A78BFA',    // 宁静 - 紫色
  energetic: '#F97316',   // 活力 - 橙色
};

// 情绪小球组件
function EmotionSphere({ emotion, position }: { emotion: keyof typeof emotionColors; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere
        ref={meshRef}
        position={position}
        args={[1, 32, 32]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <MeshDistortMaterial
          color={emotionColors[emotion]}
          distort={hovered ? 0.6 : 0.3}
          speed={2}
          roughness={0.4}
          metalness={0.2}
        />
      </Sphere>
    </Float>
  );
}

// 呼吸动画球体
function BreathingSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // 模拟呼吸节奏（4秒一个周期）
      const scale = 1 + Math.sin(state.clock.elapsedTime * (Math.PI / 2)) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Sphere ref={meshRef} args={[2, 32, 32]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color="#A78BFA"
        distort={0.2}
        speed={1}
        roughness={0.3}
        metalness={0.1}
        transparent
        opacity={0.8}
      />
    </Sphere>
  );
}

// 粒子云效果
function ParticleCloud({ count = 50, color = '#FFD93D' }: { count?: number; color?: string }) {
  const groupRef = useRef<THREE.Group>(null);

  const particles = Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
    ] as [number, number, number],
    scale: Math.random() * 0.3 + 0.1,
  }));

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <Sphere key={i} position={particle.position} args={[particle.scale, 8, 8]}>
          <meshStandardMaterial color={color} transparent opacity={0.6} />
        </Sphere>
      ))}
    </group>
  );
}

// 脉波效果
export function PulseWave() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      meshRef.current.scale.set(scale, scale, 1);
      meshRef.current.material.opacity = 0.3 - Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      <ringGeometry args={[2, 2.5, 32]} />
      <meshBasicMaterial color="#6BCB77" transparent opacity={0.3} />
    </mesh>
  );
}

// 主场景组件
export function PsychologyScene() {
  const [selectedEmotion, setSelectedEmotion] = useState<keyof typeof emotionColors | null>(null);

  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }}
      style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
    >
      {/* 环境光和方向光 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#FFD93D" />

      {/* 星空背景 */}
      <Stars radius={50} depth={50} count={500} factor={4} saturation={0} fade speed={1} />

      {/* 呼吸中心球体 */}
      <group>
        <BreathingSphere />

        {/* 脉波效果 */}
        <PulseWave />
      </group>

      {/* 情绪小球 */}
      <EmotionSphere emotion="happy" position={[3, 2, 0]} />
      <EmotionSphere emotion="calm" position={[-3, 2, 0]} />
      <EmotionSphere emotion="excited" position={[3, -2, 0]} />
      <EmotionSphere emotion="peaceful" position={[-3, -2, 0]} />
      <EmotionSphere emotion="sad" position={[0, 3.5, -2]} />
      <EmotionSphere emotion="energetic" position={[0, -3.5, -2]} />

      {/* 快乐粒子云 */}
      <ParticleCloud count={30} color="#FFD93D" />

      {/* 摄像机控制 */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        zoomSpeed={0.6}
        panSpeed={0.5}
        rotateSpeed={0.4}
      />
    </Canvas>
  );
}

// 情绪可视化卡片
export function EmotionCard({ emotion, label }: { emotion: keyof typeof emotionColors; label: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="p-4 rounded-xl bg-white dark:bg-gray-800 border-2 transition-all cursor-pointer"
      style={{
        borderColor: emotionColors[emotion],
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="w-12 h-12 rounded-full mx-auto mb-2"
        style={{ backgroundColor: emotionColors[emotion] }}
      />
      <p className="text-center text-sm font-medium text-gray-900 dark:text-white">{label}</p>
    </div>
  );
}
