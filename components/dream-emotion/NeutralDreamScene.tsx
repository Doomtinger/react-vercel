'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// 中性梦境场景 - 简化版本
export default function NeutralDreamScene({ config }: { config?: any }) {
  const groupRef = useRef<THREE.Group>(null);

  // 生成平衡元素
  const balanceElements = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      ] as [number, number, number],
      phase: Math.random() * Math.PI * 2,
      radius: 0.2 + Math.random() * 0.3
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      // 缓慢整体旋转
      groupRef.current.rotation.y = time * 0.03;

      // 元素浮动动画
      groupRef.current.children.forEach((child: THREE.Object3D, i) => {
        if (child instanceof THREE.Mesh && balanceElements[i]) {
          const element = balanceElements[i];

          // 轻微上下浮动
          child.position.y = element.position[1] + Math.sin(time + element.phase) * 0.5;
          child.position.x = element.position[0] + Math.cos(time * 0.5 + element.phase) * 0.3;

          // 缓慢旋转
          child.rotation.y += 0.01;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* 背景 */}
      <Sphere args={[25, 16, 16]} position={[0, -0.5, 0]}>
        <meshStandardMaterial
          color="#87CEEB"
          roughness={0.9}
        />
      </Sphere>

      {/* 平衡元素 - 中性色彩 */}
      {balanceElements.map((element, i) => (
        <Sphere
          key={i}
          position={element.position}
          args={[element.radius, 16, 16]}
        >
          <meshStandardMaterial
            color="#90EE90"
            roughness={0.6}
            metalness={0.1}
            transparent
            opacity={0.8}
            emissive="#90EE90"
            emissiveIntensity={0.2}
          />
        </Sphere>
      ))}

      {/* 中心平衡核心 */}
      <Sphere args={[1.2, 32, 32]} position={[0, 2.5, 0]}>
        <meshStandardMaterial
          color="#B0C4DE"
          roughness={0.7}
          metalness={0.1}
          transparent
          opacity={0.9}
          emissive="#B0C4DE"
          emissiveIntensity={0.3}
        />
      </Sphere>

      {/* 简单的树木 */}
      <Cylinder position={[3, 1.5, 2]} args={[0.3, 3, 8]}>
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </Cylinder>
      <Sphere position={[3, 3, 2]} args={[0.8, 12, 12]}>
        <meshStandardMaterial color="#228B22" roughness={0.8} />
      </Sphere>

      <Cylinder position={[-4, 1.2, -3]} args={[0.25, 2.5, 6]}>
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </Cylinder>
      <Sphere position={[-4, 2.5, -3]} args={[0.6, 10, 10]}>
        <meshStandardMaterial color="#228B22" roughness={0.8} />
      </Sphere>

      {/* 环境光 */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 10, 5]} intensity={0.6} />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#90EE90" />
    </group>
  );
}
