'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// 中性梦境场景 - 优化版
export default function NeutralDreamScene({ config }: { config?: any }) {
  const groupRef = useRef<THREE.Group>(null);

  const windStrength = config?.windStrength || 0.5;
  const grassCount = config?.grassCount || 1000;
  const treeSize = config?.treeSize || 1;

  // 生成优化的平衡元素
  const balanceElements = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        Math.random() * 7 + 2,
        (Math.random() - 0.5) * 10
      ] as [number, number, number],
      phase: Math.random() * Math.PI * 2,
      radius: 0.25 + Math.random() * 0.35
    }));
  }, []);

  // 生成草地粒子
  const grassParticles = useMemo(() => {
    const count = Math.min(Math.floor(grassCount / 50), 30); // 限制数量优化性能
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 16,
        0,
        (Math.random() - 0.5) * 16
      ] as [number, number, number],
      phase: Math.random() * Math.PI * 2,
      height: 0.3 + Math.random() * 0.5
    }));
  }, [grassCount]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      // 缓慢整体旋转
      groupRef.current.rotation.y = time * 0.02;

      // 元素浮动动画
      groupRef.current.children.forEach((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          // 平衡元素动画
          if (child.userData.isBalanceElement) {
            const element = child.userData.element;

            // 轻微上下浮动
            child.position.y = element.position[1] + Math.sin(time + element.phase) * 0.6 * windStrength;
            child.position.x = element.position[0] + Math.cos(time * 0.5 + element.phase) * 0.4;

            // 缓慢旋转
            child.rotation.y += 0.01;
            child.rotation.x = Math.sin(time * 0.3 + element.phase) * 0.1;

            // 动态发光效果
            if (child.material instanceof THREE.MeshPhysicalMaterial) {
              child.material.emissiveIntensity = 0.3 + Math.sin(time * 2 + element.phase) * 0.2;
            }
          }

          // 草地粒子动画
          if (child.userData.isGrass) {
            const grass = child.userData.grass;
            const sway = Math.sin(time * 2 + grass.phase) * 0.3 * windStrength;

            child.rotation.z = sway;
            child.rotation.x = sway * 0.5;
          }

          // 树叶动画
          if (child.userData.isLeaves) {
            const treePhase = child.userData.treePhase;
            child.rotation.z = Math.sin(time * 1.5 + treePhase) * 0.1 * windStrength;
          }
        }
      });
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* 优化的背景天空 */}
        <Sphere args={[30, 96, 96]} position={[0, -2, 0]}>
          <meshPhysicalMaterial
            color="#87CEEB"
            roughness={0.95}
            metalness={0.05}
            transparent
            opacity={0.9}
            side={THREE.BackSide}
            envMapIntensity={0.3}
          />
        </Sphere>

        {/* 地面 */}
        <Sphere args={[20, 64, 32]} position={[0, -0.5, 0]} scale={[1, 0.3, 1]}>
          <meshPhysicalMaterial
            color="#90EE90"
            roughness={0.95}
            metalness={0.05}
            transparent
            opacity={0.85}
          />
        </Sphere>

        {/* 平衡元素 - 优化的球体 */}
        {balanceElements.map((element, i) => (
          <Sphere
            key={i}
            position={element.position}
            args={[element.radius, 48, 48]}
            userData={{ isBalanceElement: true, element }}
          >
            <meshPhysicalMaterial
              color="#90EE90"
              roughness={0.4}
              metalness={0.15}
              transparent
              opacity={0.75}
              emissive="#98FB98"
              emissiveIntensity={0.3}
              transmission={0.2}
              thickness={0.3}
              clearcoat={0.4}
              clearcoatRoughness={0.2}
              envMapIntensity={0.6}
            />
          </Sphere>
        ))}

        {/* 中心平衡核心 - 高质量 */}
        <Sphere args={[1.5, 64, 64]} position={[0, 3, 0]}>
          <meshPhysicalMaterial
            color="#B0C4DE"
            roughness={0.3}
            metalness={0.2}
            transparent
            opacity={0.85}
            emissive="#B0C4DE"
            emissiveIntensity={0.4}
            clearcoat={0.6}
            clearcoatRoughness={0.1}
            envMapIntensity={0.8}
            transmission={0.15}
            thickness={0.5}
          />
        </Sphere>

        {/* 内层核心 */}
        <Sphere args={[1.0, 48, 48]} position={[0, 3, 0]}>
          <meshPhysicalMaterial
            color="#E6E6FA"
            roughness={0.2}
            metalness={0.1}
            transparent
            opacity={0.7}
            emissive="#E6E6FA"
            emissiveIntensity={0.5}
          />
        </Sphere>

        {/* 优化的树木1 */}
        <Cylinder position={[4, 1.5 * treeSize, 3]} args={[0.4, 0.5, 10 * treeSize], 24}>
          <meshPhysicalMaterial
            color="#8B7355"
            roughness={0.9}
            metalness={0.05}
            clearcoat={0.1}
          />
        </Cylinder>
        <Sphere
          position={[4, 4.5 * treeSize, 3]}
          args={[1.2, 64, 64]}
          userData={{ isLeaves: true, treePhase: 0 }}
        >
          <meshPhysicalMaterial
            color="#228B22"
            roughness={0.8}
            metalness={0.1}
            transparent
            opacity={0.9}
            emissive="#32CD32"
            emissiveIntensity={0.2}
            clearcoat={0.3}
          />
        </Sphere>

        {/* 优化的树木2 */}
        <Cylinder position={[-5, 1.2 * treeSize, -4]} args={[0.35, 0.45, 8 * treeSize], 20}>
          <meshPhysicalMaterial
            color="#8B7355"
            roughness={0.9}
            metalness={0.05}
            clearcoat={0.1}
          />
        </Cylinder>
        <Sphere
          position={[-5, 3.5 * treeSize, -4]}
          args={[1.0, 56, 56]}
          userData={{ isLeaves: true, treePhase: 2 }}
        >
          <meshPhysicalMaterial
            color="#228B22"
            roughness={0.8}
            metalness={0.1}
            transparent
            opacity={0.9}
            emissive="#32CD32"
            emissiveIntensity={0.2}
            clearcoat={0.3}
          />
        </Sphere>

        {/* 优化的树木3 */}
        <Cylinder position={[2, 1.0 * treeSize, -6]} args={[0.3, 0.4, 7 * treeSize], 18}>
          <meshPhysicalMaterial
            color="#8B7355"
            roughness={0.9}
            metalness={0.05}
            clearcoat={0.1}
          />
        </Cylinder>
        <Sphere
          position={[2, 3.0 * treeSize, -6]}
          args={[0.85, 52, 52]}
          userData={{ isLeaves: true, treePhase: 4 }}
        >
          <meshPhysicalMaterial
            color="#228B22"
            roughness={0.8}
            metalness={0.1}
            transparent
            opacity={0.9}
            emissive="#32CD32"
            emissiveIntensity={0.2}
            clearcoat={0.3}
          />
        </Sphere>

        {/* 草地粒子 - 简化表示 */}
        {grassParticles.map((grass, i) => (
          <Cylinder
            key={`grass-${i}`}
            position={grass.position}
            args={[0.05, 0.02, grass.height], 8}
            userData={{ isGrass: true, grass }}
          >
            <meshPhysicalMaterial
              color="#90EE90"
              roughness={0.8}
              metalness={0.05}
              transparent
              opacity={0.7}
              emissive="#98FB98"
              emissiveIntensity={0.15}
            />
          </Cylinder>
        ))}

        {/* 添加一些漂浮的叶子 */}
        {Array.from({ length: 12 }, (_, i) => (
          <Sphere
            key={`leaf-${i}`}
            position={[
              (Math.random() - 0.5) * 8,
              1 + Math.random() * 3,
              (Math.random() - 0.5) * 8
            ]}
            args={[0.08 + Math.random() * 0.12, 24, 24]}
            userData={{ isBalanceElement: true, element: { phase: Math.random() * Math.PI * 2, position: [0, 0, 0] } }}
          >
            <meshPhysicalMaterial
              color={new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.6, 0.5)}
              roughness={0.6}
              metalness={0.1}
              transparent
              opacity={0.8}
              emissive={new THREE.Color().setHSL(0.35, 0.5, 0.6)}
              emissiveIntensity={0.25}
              clearcoat={0.3}
            />
          </Sphere>
        ))}
      </group>

      {/* 优化的照明系统 */}
      <ambientLight intensity={0.5} color={new THREE.Color().setHSL(0.3, 0.4, 0.95)} />

      <directionalLight
        position={[8, 12, 5]}
        intensity={0.8}
        color={new THREE.Color().setHSL(0.15, 0.3, 0.98)}
        castShadow
      />

      <pointLight
        position={[-6, 6, -6]}
        intensity={0.4}
        color="#90EE90"
        distance={18}
      />

      <pointLight
        position={[5, 4, 5]}
        intensity={0.3}
        color={new THREE.Color().setHSL(0.6, 0.4, 0.9)}
        distance={15}
      />

      {/* 柔和的环境补充光 */}
      <pointLight
        position={[0, 8, 0]}
        intensity={0.2}
        color={new THREE.Color().setHSL(0.3, 0.5, 0.95)}
        distance={20}
      />

      {/* 后处理效果 - 柔和Bloom */}
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.85}
          radius={0.7}
        />
      </EffectComposer>
    </>
  );
}