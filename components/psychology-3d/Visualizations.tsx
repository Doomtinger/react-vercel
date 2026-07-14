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

// 压力水平可视化 - 增强版山脉
export function StressVisualization({ level = 0.5 }: { level?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  // 生成山脉数据 - 根据压力水平调整形状
  const mountains = useMemo(() => {
    const mountainData = [];
    const rows = 5;
    const cols = 7;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const distanceFromCenter = Math.sqrt(Math.pow(col - cols/2, 2) + Math.pow(row - rows/2, 2));
        const height = (1 - distanceFromCenter / 4) * (2 + level * 3) + Math.random() * 0.5;
        mountainData.push({
          id: `${row}-${col}`,
          baseHeight: Math.max(0.3, height),
          position: [(col - cols/2) * 1.5, 0, (row - rows/2) * 1.5],
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5
        });
      }
    }
    return mountainData;
  }, [level]);

  // 根据压力水平的颜色
  const getStressColor = (height: number, idx: number) => {
    if (level > 0.7) {
      // 高压力 - 红色渐变
      const colors = ['#8B0000', '#DC143C', '#FF4500', '#FF6B6B', '#FF8C8C'];
      return colors[Math.floor((height / 4) * colors.length) % colors.length];
    } else if (level > 0.4) {
      // 中等压力 - 橙黄色渐变
      const colors = ['#FF8C00', '#FFA500', '#FFB347', '#FFD700', '#FFEC8B'];
      return colors[Math.floor((height / 4) * colors.length) % colors.length];
    } else {
      // 低压力 - 绿色渐变
      const colors = ['#2E8B57', '#3CB371', '#6BCB77', '#90EE90', '#98FB98'];
      return colors[Math.floor((height / 4) * colors.length) % colors.length];
    }
  };

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      groupRef.current.children.forEach((child: THREE.Object3D, i) => {
        if (child instanceof THREE.Mesh && mountains[i]) {
          const mountain = mountains[i];

          // 根据压力水平调整呼吸动画
          const breathSpeed = level > 0.7 ? 3 : level > 0.4 ? 2 : 1;
          const breathDepth = level > 0.7 ? 0.3 : level > 0.4 ? 0.2 : 0.1;

          const scale = 1 + Math.sin(time * breathSpeed + mountain.phase) * breathDepth * level;
          child.scale.y = Math.max(0.5, scale);

          // 高压力时添加轻微抖动
          if (level > 0.7) {
            child.position.x = mountain.position[0] + Math.sin(time * 10 + mountain.phase) * 0.05;
            child.position.z = mountain.position[2] + Math.cos(time * 12 + mountain.phase) * 0.05;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* 地面基座 */}
      <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[12, 0.2, 10]} />
        <meshStandardMaterial
          color={level > 0.7 ? '#8B0000' : level > 0.4 ? '#FF8C00' : '#2E8B57'}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* 山脉 */}
      {mountains.map((mountain, i) => (
        <mesh
          key={mountain.id}
          position={mountain.position as [number, number, number]}
          scale={[1, 1, 1]}
        >
          <coneGeometry args={[0.6, mountain.baseHeight, 8]} />
          <meshStandardMaterial
            color={getStressColor(mountain.baseHeight, i)}
            roughness={0.7}
            metalness={0.2}
            emissive={getStressColor(mountain.baseHeight, i)}
            emissiveIntensity={level > 0.7 ? 0.3 : level > 0.4 ? 0.2 : 0.1}
          />
        </mesh>
      ))}

      {/* 压力粒子效果 - 高压力时显示 */}
      {level > 0.6 && Array.from({ length: Math.floor(level * 20) }, (_, i) => (
        <Sphere
          key={`stress-particle-${i}`}
          position={[
            (Math.random() - 0.5) * 10,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 8
          ]}
          args={[0.05, 4, 4]}
        >
          <meshStandardMaterial
            color="#FF4444"
            emissive="#FF0000"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
          />
        </Sphere>
      ))}

      {/* 放松粒子效果 - 低压力时显示 */}
      {level < 0.4 && Array.from({ length: Math.floor((1 - level) * 15) }, (_, i) => (
        <Sphere
          key={`calm-particle-${i}`}
          position={[
            (Math.random() - 0.5) * 10,
            Math.random() * 4 + 2,
            (Math.random() - 0.5) * 8
          ]}
          args={[0.08, 6, 6]}
        >
          <meshStandardMaterial
            color="#90EE90"
            emissive="#6BCB77"
            emissiveIntensity={0.3}
            transparent
            opacity={0.5}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 时间感知可视化 - 快乐时光飞逝 vs 压力时光缓慢
export function TimePerception() {
  const happyGroupRef = useRef<THREE.Group>(null);
  const stressGroupRef = useRef<THREE.Group>(null);

  // 快乐时间粒子 - 快速旋转，象征时光飞逝
  const happyParticles = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      angle: (i / 16) * Math.PI * 2,
      radius: 2.5 + Math.random() * 1.5,
      speed: 0.003 + Math.random() * 0.002,
      color: Math.random() > 0.5 ? '#FFD700' : '#FFA500',
      size: 0.15 + Math.random() * 0.15
    }));
  }, []);

  // 压力时间粒子 - 缓慢移动，象征时间拖延
  const stressParticles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      radius: 4 + Math.random() * 1,
      speed: 0.0005 + Math.random() * 0.0005,
      color: Math.random() > 0.5 ? '#8B0000' : '#DC143C',
      size: 0.12 + Math.random() * 0.12
    }));
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // 快乐时间组 - 快速旋转
    if (happyGroupRef.current) {
      happyGroupRef.current.rotation.y = time * 0.15;
      happyGroupRef.current.children.forEach((child: THREE.Object3D, i) => {
        if (child instanceof THREE.Mesh && happyParticles[i]) {
          const particle = happyParticles[i];
          const angle = particle.angle + time * particle.speed * 2;
          child.position.x = Math.cos(angle) * particle.radius;
          child.position.z = Math.sin(angle) * particle.radius;
          child.position.y = Math.sin(time * 3 + particle.angle) * 0.5;
        }
      });
    }

    // 压力时间组 - 缓慢移动
    if (stressGroupRef.current) {
      stressGroupRef.current.rotation.y = time * 0.02;
      stressGroupRef.current.children.forEach((child: THREE.Object3D, i) => {
        if (child instanceof THREE.Mesh && stressParticles[i]) {
          const particle = stressParticles[i];
          const angle = particle.angle + time * particle.speed * 0.3;
          child.position.x = Math.cos(angle) * particle.radius;
          child.position.z = Math.sin(angle) * particle.radius;
          child.position.y = Math.sin(time * 0.5 + particle.angle) * 0.3 + Math.cos(time * 0.8) * 0.2;
        }
      });
    }
  });

  return (
    <group>
      {/* 快乐时光 - 左侧 */}
      <group ref={happyGroupRef} position={[-3, 0, 0]}>
        {/* 快乐时光标签 */}
        <mesh position={[0, 3.5, 0]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* 快速旋转的粒子 */}
        {happyParticles.map((particle, i) => (
          <Sphere
            key={`happy-${i}`}
            args={[particle.size, 8, 8]}
          >
            <meshStandardMaterial
              color={particle.color}
              emissive={particle.color}
              emissiveIntensity={0.4}
              transparent
              opacity={0.8}
            />
          </Sphere>
        ))}

        {/* 快速轨迹线 */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2, 2.1, 32]} />
          <meshStandardMaterial
            color="#FFD700"
            transparent
            opacity={0.3}
            emissive="#FFD700"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      {/* 压力时光 - 右侧 */}
      <group ref={stressGroupRef} position={[3, 0, 0]}>
        {/* 压力时光标签 */}
        <mesh position={[0, 4, 0]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial
            color="#8B0000"
            emissive="#8B0000"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* 缓慢移动的粒子 */}
        {stressParticles.map((particle, i) => (
          <Sphere
            key={`stress-${i}`}
            args={[particle.size, 8, 8]}
          >
            <meshStandardMaterial
              color={particle.color}
              emissive={particle.color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.6}
            />
          </Sphere>
        ))}

        {/* 缓慢轨迹线 */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.8, 3.9, 32]} />
          <meshStandardMaterial
            color="#DC143C"
            transparent
            opacity={0.2}
            emissive="#DC143C"
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>

      {/* 中心时钟 - 时间感知的核心 */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color="#A78BFA"
          emissive="#A78BFA"
          emissiveIntensity={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 时间流动粒子 */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <Sphere
            key={`time-flow-${i}`}
            position={[
              Math.cos(angle) * 5.5,
              Math.sin(angle * 2) * 0.5,
              Math.sin(angle) * 5.5
            ]}
            args={[0.1, 8, 8]}
          >
            <meshStandardMaterial
              color="#E6B3FF"
              emissive="#A78BFA"
              emissiveIntensity={0.4}
              transparent
              opacity={0.6}
            />
          </Sphere>
        );
      })}
    </group>
  );
}
