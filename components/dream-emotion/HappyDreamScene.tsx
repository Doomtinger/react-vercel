'use client';

import { useRef, useMemo, useFrame } from 'react';
import * as THREE from 'three';

// 快乐场景组件
export default function HappyDreamScene({ config }: { config: any }) {
  const groupRef = useRef<THREE.Group>(null);

  // 生成快乐的随机元素
  const happyElements = useMemo(() => {
    const elements: THREE.Mesh[] = [];
    const count = config?.elementCount || 30;

    for (let i = 0; i < count; i++) {
      const type = Math.floor(Math.random() * 4);
      let geometry: THREE.BufferGeometry;
      let material: THREE.Material;

      const hue = Math.random() * 0.3 + 0.0; // 红色到黄色
      const saturation = config?.colorSaturation || 0.8;
      const brightness = config?.brightness || 0.9;

      switch (type) {
        case 0: // 球形
          geometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 16, 16);
          break;
        case 1: // 星形
          geometry = new THREE.OctahedronGeometry(0.3 + Math.random() * 0.4, 0);
          break;
        case 2: // 立方体
          geometry = new THREE.BoxGeometry(0.4 + Math.random() * 0.4, 0.4 + Math.random() * 0.4, 0.4 + Math.random() * 0.4);
          break;
        default: // 圆环
          geometry = new THREE.TorusGeometry(0.3 + Math.random() * 0.3, 0.1 + Math.random() * 0.1, 8, 16);
      }

      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, saturation, brightness),
        roughness: 0.3,
        metalness: 0.7,
        emissive: new THREE.Color().setHSL(hue, saturation, brightness * 0.3),
        emissiveIntensity: config?.sparkleIntensity || 0.5,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 15,
        (Math.random() - 0.5) * 20
      );
      mesh.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        },
        floatSpeed: Math.random() * 0.01 + 0.005,
        floatOffset: Math.random() * Math.PI * 2
      };
      elements.push(mesh);
    }

    return elements;
  }, [config]);

  // 动画
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      const movementSpeed = config?.movementSpeed || 0.2;

      happyElements.forEach((element, index) => {
        // 旋转
        element.rotation.x += element.userData.rotationSpeed.x * movementSpeed;
        element.rotation.y += element.userData.rotationSpeed.y * movementSpeed;
        element.rotation.z += element.userData.rotationSpeed.z * movementSpeed;

        // 漂浮
        element.position.y += Math.sin(time + element.userData.floatOffset) * element.userData.floatSpeed * movementSpeed;

        // 闪烁效果
        if (element.material.emissiveIntensity !== undefined) {
          const sparkleBase = config?.sparkleIntensity || 0.5;
          element.material.emissiveIntensity = sparkleBase + Math.sin(time * 2 + index) * 0.3;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* 快乐元素 */}
      {happyElements.map((element, index) => (
        <primitive key={`happy-${index}`} object={element} />
      ))}

      {/* 彩虹光效 */}
      <mesh position={[0, 8, 0]}>
        <sphereGeometry args={[15, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color().setHSL(0.6, 0.8, 0.9)}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 光晕 */}
      <pointLight
        position={[0, 5, 0]}
        intensity={0.5}
        color={new THREE.Color().setHSL(0.1, 0.8, 0.9)}
        distance={20}
      />
    </group>
  );
}
