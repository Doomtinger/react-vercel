'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Trail } from '@react-three/drei';
import * as THREE from 'three';

// 心流状态可视化 - 连续流动的球体
export function FlowStateVisualization() {
  const spheres = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      baseAngle: (i / 8) * Math.PI * 2,
      radius: 3,
      speed: 0.5 + Math.random() * 0.3,
    }));
  }, []);

  const sphereRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    spheres.forEach((sphere, i) => {
      const mesh = sphereRefs.current[i];
      if (mesh) {
        // 螺旋运动
        const angle = sphere.baseAngle + state.clock.elapsedTime * sphere.speed;
        const y = Math.sin(angle * 2) * 1.5;
        const x = Math.cos(angle) * sphere.radius;
        const z = Math.sin(angle) * sphere.radius;

        mesh.position.set(x, y, z);
        mesh.rotation.x += 0.02;
        mesh.rotation.y += 0.03;
      }
    });
  });

  return (
    <group>
      {spheres.map((sphere, i) => (
        <group key={sphere.id}>
          <Trail
            width={0.3}
            color="#6BCB77"
            attenuation={0.5}
            length={8}
          >
            <Sphere
              ref={(el) => {
                if (el) sphereRefs.current[i] = el;
              }}
              args={[0.4, 16, 16]}
            >
              <MeshDistortMaterial
                color="#6BCB77"
                distort={0.3}
                speed={2}
                emissive="#6BCB77"
                emissiveIntensity={0.2}
              />
            </Sphere>
          </Trail>
        </group>
      ))}
    </group>
  );
}

// MBTI性格类型3D展示
export function MBTIVisualization({ personality }: { personality: string }) {
  const dimensions = useMemo(() => {
    // 根据MBTI类型生成4个维度
    const types: Record<string, [number, number, number, number]> = {
      'INTJ': [0.8, 0.9, 0.7, 0.6], // 分析型
      'ENFP': [0.9, 0.3, 0.8, 0.7], // 热情型
      'ISTJ': [0.2, 0.9, 0.3, 0.9], // 传统型
      'ESFP': [0.8, 0.2, 0.9, 0.4], // 表演型
    };
    return types[personality] || [0.5, 0.5, 0.5, 0.5];
  }, [personality]);

  const dimensionsNames = ['外向', '直觉', '思考', '判断'];

  return (
    <group>
      {dimensions.map((value, i) => (
        <group key={i} position={[i * 2 - 3, 0, 0]}>
          {/* 轴线 */}
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 4]} />
            <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
          </mesh>

          {/* 值指示器 */}
          <Sphere position={[0, value * 2, 0]} args={[0.3, 16, 16]}>
            <MeshDistortMaterial
              color={value > 0.6 ? '#FF6B6B' : value > 0.4 ? '#FFD93D' : '#4D96FF'}
              distort={0.2}
              speed={1.5}
            />
          </Sphere>

          {/* 标签（需要用2D覆盖层显示） */}
        </group>
      ))}
    </group>
  );
}

// 压力水平可视化 - 呼吸山脉
export function StressVisualization({ level = 0.5 }: { level?: number }) {
  const mountains = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      id: i,
      baseHeight: 1 + Math.random() * 2,
      position: [(i - 3) * 2, 0, 0],
    }));
  }, []);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // 根据压力水平调整动画速度
      const stressFactor = level * 2;
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const mountain = mountains[i];
          // 呼吸动画
          const scale = 1 + Math.sin(state.clock.elapsedTime * (1 + stressFactor) + i) * 0.1 * level;
          child.scale.y = scale;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {mountains.map((mountain) => (
        <mesh key={mountain.id} position={mountain.position as [number, number, number]}>
          <coneGeometry args={[1, mountain.baseHeight, 4]} />
          <meshStandardMaterial
            color={level > 0.7 ? '#FF6B6B' : level > 0.4 ? '#FFD93D' : '#6BCB77'}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// 时间感知可视化 - 动态时钟
export function TimePerception() {
  const ringRef = useRef<THREE.Group>(null);
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      radius: 3,
      speed: 0.001 + Math.random() * 0.002,
    }));
  }, []);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      ringRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const particle = particles[i];
          // 每个粒子有不同的速度
          const newAngle = particle.angle + state.clock.elapsedTime * particle.speed;
          child.position.x = Math.cos(newAngle) * particle.radius;
          child.position.z = Math.sin(newAngle) * particle.radius;
        }
      });
    }
  });

  return (
    <group ref={ringRef}>
      {particles.map((particle, i) => (
        <Sphere key={i} args={[0.2, 8, 8]}>
          <MeshDistortMaterial
            color="#A78BFA"
            distort={0.4}
            speed={2}
            emissive="#A78BFA"
            emissiveIntensity={0.3}
          />
        </Sphere>
      ))}
      {/* 中心时钟 */}
      <Sphere args={[1, 32, 32]}>
        <MeshDistortMaterial
          color="#FFD93D"
          distort={0.2}
          speed={1}
          transparent
          opacity={0.8}
        />
      </Sphere>
    </group>
  );
}
