'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 樱花树 - 简化版本，避免狂闪
function SakuraTree({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  // 生成静态樱花树
  const treeData = useMemo(() => {
    const branches = [];
    const blossoms = [];

    // 简化的树枝结构 - 只生成主干和几个大分支
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const height = 2 + Math.random() * 2;
      const x = Math.cos(angle) * 0.8;
      const z = Math.sin(angle) * 0.8;

      branches.push({
        position: [x, height, z],
        scale: [0.15, height, 0.15]
      });

      // 在每个分支末端生成樱花
      for (let j = 0; j < 5; j++) {
        const blossomAngle = Math.random() * Math.PI * 2;
        const blossomRadius = 0.5 + Math.random() * 0.5;
        blossoms.push({
          position: [
            x + Math.cos(blossomAngle) * blossomRadius,
            height + (Math.random() - 0.5) * 0.5,
            z + Math.sin(blossomAngle) * blossomRadius
          ],
          color: Math.random() > 0.5 ? '#FFB7C5' : '#FFC0CB'
        });
      }
    }

    return { branches, blossoms };
  }, []);

  return (
    <group ref={groupRef} position={position}>
      {/* 树干 */}
      <Sphere args={[0.3, 8, 8]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </Sphere>

      {/* 树枝 */}
      {treeData.branches.map((branch, i) => (
        <group key={i} position={branch.position as [number, number, number]}>
          <Sphere args={[0.15, 6, 6]} scale={branch.scale as [number, number, number]}>
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </Sphere>
        </group>
      ))}

      {/* 樱花花朵 */}
      {treeData.blossoms.map((blossom, i) => (
        <Sphere
          key={i}
          position={blossom.position as [number, number, number]}
          args={[0.12, 8, 8]}
        >
          <meshStandardMaterial
            color={blossom.color}
            roughness={0.6}
            metalness={0.1}
            emissive={blossom.color}
            emissiveIntensity={0.2}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 落花粒子 - 简化版本
function FallingPetals({ count = 50 }: { count?: number }) {
  const petalsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = Math.random() * 8 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = -0.02 - Math.random() * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      // 粉色渐变
      const color = new THREE.Color().setHSL(0.9 + Math.random() * 0.1, 0.6, 0.85);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, velocities, colors };
  }, [count]);

  return (
    <points ref={petalsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// 地面
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        color="#90EE90"
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

// 稳定的光照系统
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={['#FFB6C1', '#87CEEB', 0.3]} />
    </>
  );
}

// 主樱花场景组件 - 优化版本
export default function SakuraScene() {
  return (
    <>
      <Lighting />
      <Ground />
      <SakuraTree position={[0, 0, 0]} />
      <SakuraTree position={[6, 0, 4]} />
      <SakuraTree position={[-5, 0, -3]} />
      <FallingPetals count={50} />

      {/* 雾气效果 */}
      <fog args={['#ffe4e1', 20, 50]} />
    </>
  );
}
