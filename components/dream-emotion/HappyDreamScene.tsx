'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// 快乐场景组件 - 优化版
export default function HappyDreamScene({ config }: { config: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  // 生成高质量的快乐元素
  const happyElements = useMemo(() => {
    const elements: THREE.Mesh[] = [];
    const count = config?.elementCount || 30;

    for (let i = 0; i < count; i++) {
      const type = Math.floor(Math.random() * 6); // 增加更多形状类型
      let geometry: THREE.BufferGeometry;
      let material: THREE.Material;

      const hue = Math.random() * 0.3 + 0.0; // 红色到黄色
      const saturation = config?.colorSaturation || 0.8;
      const brightness = config?.brightness || 0.9;

      switch (type) {
        case 0: // 高质量球形 - 增加细分度
          geometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 64, 64);
          break;
        case 1: // 星形 - 增加细节
          geometry = new THREE.OctahedronGeometry(0.3 + Math.random() * 0.4, 2);
          break;
        case 2: // 立方体 - 增加平滑倒角效果
          geometry = new THREE.BoxGeometry(
            0.4 + Math.random() * 0.4,
            0.4 + Math.random() * 0.4,
            0.4 + Math.random() * 0.4,
            4, 4, 4
          );
          break;
        case 3: // 高质量圆环
          geometry = new THREE.TorusGeometry(
            0.3 + Math.random() * 0.3,
            0.1 + Math.random() * 0.1,
            32, 64
          );
          break;
        case 4: // 十二面体 - 更有棱角美
          geometry = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 1);
          break;
        case 5: // 圆柱体 - 增加多样性
          geometry = new THREE.CylinderGeometry(
            0.2 + Math.random() * 0.2,
            0.2 + Math.random() * 0.2,
            0.6 + Math.random() * 0.4,
            32
          );
          break;
        default:
          geometry = new THREE.SphereGeometry(0.4, 64, 64);
      }

      // 使用物理材质获得更真实的效果
      material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(hue, saturation, brightness),
        roughness: 0.2 + Math.random() * 0.3, // 更光滑的表面
        metalness: 0.3 + Math.random() * 0.4, // 适度的金属感
        emissive: new THREE.Color().setHSL(hue, saturation, brightness * 0.4),
        emissiveIntensity: config?.sparkleIntensity || 0.8,
        clearcoat: 0.8 + Math.random() * 0.2, // 清漆层
        clearcoatRoughness: 0.1 + Math.random() * 0.2,
        envMapIntensity: 1.5, // 增强环境反射
        transmission: Math.random() * 0.3, // 轻微透光性
        thickness: 0.5,
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
        floatOffset: Math.random() * Math.PI * 2,
        sparklePhase: Math.random() * Math.PI * 2
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

        // 更自然的闪烁效果
        if (element.material.emissiveIntensity !== undefined) {
          const sparkleBase = config?.sparkleIntensity || 0.8;
          const sparkle = sparkleBase + Math.sin(time * 3 + element.userData.sparklePhase) * 0.4;
          element.material.emissiveIntensity = Math.max(0.1, sparkle);
        }

        // 清漆层的动态效果
        if (element.material.clearcoat !== undefined) {
          element.material.clearcoat = 0.8 + Math.sin(time * 2 + index) * 0.1;
        }
      });
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* 快乐元素 */}
        {happyElements.map((element, index) => (
          <primitive key={`happy-${index}`} object={element} />
        ))}

        {/* 高质量彩虹光晕 - 增加细分度 */}
        <mesh position={[0, 8, 0]}>
          <sphereGeometry args={[15, 128, 128]} />
          <meshPhysicalMaterial
            color={new THREE.Color().setHSL(0.6, 0.8, 0.9)}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
            roughness={0.8}
            metalness={0.2}
            emissive={new THREE.Color().setHSL(0.6, 0.6, 0.8)}
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* 内层光晕 */}
        <mesh position={[0, 8, 0]}>
          <sphereGeometry args={[12, 96, 96]} />
          <meshPhysicalMaterial
            color={new THREE.Color().setHSL(0.1, 0.7, 0.95)}
            transparent
            opacity={0.06}
            side={THREE.BackSide}
            roughness={0.9}
            metalness={0.1}
            emissive={new THREE.Color().setHSL(0.1, 0.5, 0.9)}
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* 外层微弱光晕 */}
        <mesh position={[0, 8, 0]}>
          <sphereGeometry args={[18, 96, 96]} />
          <meshPhysicalMaterial
            color={new THREE.Color().setHSL(0.8, 0.6, 0.85)}
            transparent
            opacity={0.04}
            side={THREE.BackSide}
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
      </group>

      {/* 改进的照明系统 */}
      <ambientLight intensity={0.4} color={new THREE.Color().setHSL(0.1, 0.3, 0.9)} />

      <pointLight
        position={[0, 5, 0]}
        intensity={1.2}
        color={new THREE.Color().setHSL(0.1, 0.8, 0.9)}
        distance={30}
        decay={2}
      />

      <pointLight
        position={[5, 8, 5]}
        intensity={0.6}
        color={new THREE.Color().setHSL(0.6, 0.7, 0.9)}
        distance={20}
        decay={2}
      />

      <pointLight
        position={[-5, 6, -5]}
        intensity={0.4}
        color={new THREE.Color().setHSL(0.0, 0.8, 1.0)}
        distance={25}
        decay={2}
      />

      {/* 柔和的方向光 */}
      <directionalLight
        position={[0, 10, 5]}
        intensity={0.3}
        color={new THREE.Color().setHSL(0.1, 0.5, 0.95)}
        castShadow
      />

      {/* 后处理效果 - Bloom */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          radius={0.8}
        />
      </EffectComposer>
    </>
  );
}