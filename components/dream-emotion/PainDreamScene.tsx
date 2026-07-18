'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 痛苦梦境场景 - 简化版本
export default function PainDreamScene({ config }: { config?: any }) {
  const groupRef = useRef<THREE.Group>(null);

  // 生成简化的痛苦元素
  const painElements = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      ] as [number, number, number],
      speed: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      // 整体缓慢旋转
      groupRef.current.rotation.y = time * 0.05;

      // 元素下落运动
      groupRef.current.children.forEach((child: THREE.Object3D, i) => {
        if (child instanceof THREE.Mesh && painElements[i]) {
          const element = painElements[i];

          // 下落
          child.position.y -= element.speed * 0.05;

          // 旋转
          child.rotation.x += element.speed * 0.02;
          child.rotation.z += element.speed * 0.02;

          // 重置落到地面的元素
          if (child.position.y < 0) {
            child.position.y = Math.random() * 8 + 10;
            child.position.x = (Math.random() - 0.5) * 10;
            child.position.z = (Math.random() - 0.5) * 10;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* 背景 */}
      <Sphere args={[20, 16, 16]} position={[0, -1, 0]}>
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.9}
        />
      </Sphere>

      {/* 痛苦元素 - 深色球体 */}
      {painElements.map((element, i) => (
        <Sphere
          key={i}
          position={element.position}
          args={[0.3, 16, 16]}
        >
          <meshStandardMaterial
            color="#4A4A4A"
            roughness={0.7}
            metalness={0.1}
            transparent
            opacity={0.6}
          />
        </Sphere>
      ))}

      {/* 中心痛苦核心 */}
      <Sphere args={[1.5, 32, 32]} position={[0, 3, 0]}>
        <meshStandardMaterial
          color="#2a2a4a"
          roughness={0.8}
          metalness={0.1}
          emissive="#8B0000"
          emissiveIntensity={0.3}
        />
      </Sphere>

      {/* 环境光 */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#8B0000" />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#4A4A4A" />
    </group>
  );
}
