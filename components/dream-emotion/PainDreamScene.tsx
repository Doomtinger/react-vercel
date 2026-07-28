'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 痛苦梦境场景 - 优化版
export default function PainDreamScene({ config }: { config?: any }) {
  const groupRef = useRef<THREE.Group>(null);

  const darkness = config?.darkness || 0.5;
  const rainDensity = config?.rainDensity || 50;
  const lightningFreq = config?.lightningFreq || 0.05;

  // 生成优化的痛苦元素
  const painElements = useMemo(() => {
    const count = Math.min(Math.floor(rainDensity / 2), 100); // 限制数量防止性能问题
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 12,
        Math.random() * 10 + 2,
        (Math.random() - 0.5) * 12
      ] as [number, number, number],
      speed: 0.8 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      size: 0.2 + Math.random() * 0.4
    }));
  }, [rainDensity]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      // 整体缓慢旋转
      groupRef.current.rotation.y = time * 0.05;

      // 元素下落运动
      groupRef.current.children.forEach((child: THREE.Object3D, i) => {
        if (child instanceof THREE.Mesh && child.userData.isPainElement) {
          const element = child.userData.element;

          // 下落
          child.position.y -= element.speed * 0.08;

          // 旋转
          child.rotation.x += element.speed * 0.03;
          child.rotation.z += element.speed * 0.03;

          // 重置落到地面的元素
          if (child.position.y < 0) {
            child.position.y = Math.random() * 8 + 12;
            child.position.x = (Math.random() - 0.5) * 12;
            child.position.z = (Math.random() - 0.5) * 12;
          }

          // 动态材质效果
          if (child.material instanceof THREE.MeshPhysicalMaterial) {
            child.material.opacity = 0.4 + Math.sin(time * 2 + element.phase) * 0.2;
            child.material.transmission = 0.3 + Math.sin(time + element.phase) * 0.2;
          }
        }
      });

      // 闪电效果
      if (Math.random() < lightningFreq * 0.1) {
        groupRef.current.children.forEach((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.userData.isLightning) {
            if (child.material instanceof THREE.MeshPhysicalMaterial) {
              child.material.emissiveIntensity = 2 + Math.random() * 3;
              setTimeout(() => {
                if (child.material) {
                  child.material.emissiveIntensity = 0.5;
                }
              }, 100);
            }
          }
        });
      }
    }
  });

  // 根据黑暗程度计算颜色
  const bgColor = new THREE.Color().setHSL(0.7, 0.6 + darkness * 0.3, 0.1 + darkness * 0.1);
  const painColor = new THREE.Color().setHSL(0.0, 0.3, 0.3 + darkness * 0.2);
  const coreColor = new THREE.Color().setHSL(0.0, 0.8, 0.2);

  return (
    <>
      <group ref={groupRef}>
        {/* 优化的背景 - 高细分度 */}
        <Sphere args={[20, 96, 96]} position={[0, -1, 0]} userData={{ isBackground: true }}>
          <meshPhysicalMaterial
            color={bgColor}
            roughness={0.95}
            metalness={0.1}
            transparent
            opacity={0.95}
            side={THREE.BackSide}
          />
        </Sphere>

        {/* 痛苦元素 - 优化的球体 */}
        {painElements.map((element, i) => (
          <Sphere
            key={i}
            position={element.position}
            args={[element.size, 48, 48]}
            userData={{ isPainElement: true, element }}
          >
            <meshPhysicalMaterial
              color={painColor}
              roughness={0.6 + Math.random() * 0.3}
              metalness={0.2}
              transparent
              opacity={0.5}
              transmission={0.3}
              thickness={0.5}
              envMapIntensity={0.5}
              clearcoat={0.3}
            />
          </Sphere>
        ))}

        {/* 中心痛苦核心 - 高质量 */}
        <Sphere args={[1.8, 64, 64]} position={[0, 3, 0]} userData={{ isLightning: true }}>
          <meshPhysicalMaterial
            color={coreColor}
            roughness={0.7}
            metalness={0.3}
            emissive="#8B0000"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
            clearcoat={0.5}
            envMapIntensity={1.2}
          />
        </Sphere>

        {/* 内层暗核 */}
        <Sphere args={[1.2, 48, 48]} position={[0, 3, 0]}>
          <meshPhysicalMaterial
            color="#1a0000"
            roughness={0.9}
            metalness={0.4}
            emissive="#4A0000"
            emissiveIntensity={0.8}
          />
        </Sphere>

        {/* 添加一些漂浮的碎片 */}
        {Array.from({ length: 8 }, (_, i) => (
          <Sphere
            key={`fragment-${i}`}
            position={[
              (Math.random() - 0.5) * 6,
              2 + Math.random() * 4,
              (Math.random() - 0.5) * 6
            ]}
            args={[0.15 + Math.random() * 0.2, 32, 32]}
            userData={{ isPainElement: true, element: { phase: Math.random() * Math.PI * 2, speed: 0.3 } }}
          >
            <meshPhysicalMaterial
              color={new THREE.Color().setHSL(0.0 + Math.random() * 0.1, 0.5, 0.3)}
              roughness={0.8}
              metalness={0.3}
              transparent
              opacity={0.6}
              emissive={new THREE.Color().setHSL(0.0, 0.8, 0.2)}
              emissiveIntensity={0.4 + Math.random() * 0.4}
            />
          </Sphere>
        ))}
      </group>

      {/* 优化的照明系统 */}
      <ambientLight intensity={0.2 + darkness * 0.2} color={new THREE.Color().setHSL(0.7, 0.5, 0.3)} />

      <directionalLight
        position={[5, 10, 5]}
        intensity={0.3}
        color="#8B0000"
        castShadow
      />

      <pointLight
        position={[-5, 5, -5]}
        intensity={0.4}
        color="#4A4A4A"
        distance={20}
      />

      <pointLight
        position={[0, 8, 0]}
        intensity={0.3}
        color={new THREE.Color().setHSL(0.0, 0.8, 0.2)}
        distance={15}
      />

      {/* 后处理效果 - 暗色Bloom */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.8}
          radius={0.6}
        />
      </EffectComposer>
    </>
  );
}