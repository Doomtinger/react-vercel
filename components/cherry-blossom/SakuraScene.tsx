'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 樱花树组件
function SakuraTree({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  // 程序化生成樱花树
  const treeData = useMemo(() => {
    const branches: THREE.Mesh[] = [];
    const blossoms: THREE.Mesh[] = [];

    // 递归生成树枝
    function createBranch(
      startPoint: THREE.Vector3,
      direction: THREE.Vector3,
      length: number,
      depth: number,
      parentRadius?: number
    ) {
      if (depth > 5 || length < 0.1) return;

      const endPoint = startPoint.clone().add(direction.clone().multiplyScalar(length));
      const radius = parentRadius ? parentRadius * 0.7 : Math.max(0.1, length * 0.15);

      // 创建树枝几何体
      const branchGeometry = new THREE.CylinderGeometry(
        radius * 0.7,
        radius,
        length,
        8
      );

      // 设置树枝位置和旋转
      branchGeometry.translate(0, length / 2, 0);
      branchGeometry.rotateX(Math.PI / 2);

      const branchMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.3, 0.25 + depth * 0.03),
        roughness: 0.9,
        metalness: 0.0,
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      branch.position.copy(startPoint);
      branch.lookAt(endPoint);
      branch.rotateX(Math.PI / 2);
      branches.push(branch);

      // 在末端生成樱花
      if (depth >= 4) {
        createBlossoms(endPoint, depth);
      }

      // 生成子树枝
      const branchCount = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < branchCount; i++) {
        const angle = (Math.PI / (branchCount + 1)) * (i + 1) + (Math.random() - 0.5) * 0.5;
        const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.8;

        const newDirection = direction.clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
          .applyAxisAngle(new THREE.Vector3(1, 0, 0), spreadAngle)
          .normalize();

        const newLength = length * (0.6 + Math.random() * 0.2);
        createBranch(endPoint, newDirection, newLength, depth + 1, radius);
      }
    }

    // 创建樱花
    function createBlossoms(position: THREE.Vector3, depth: number) {
      const blossomCount = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < blossomCount; i++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.8
        );

        const blossomPos = position.clone().add(offset);

        // 樱花花瓣
        const petalGeometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 8, 8);
        const petalMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.92 + Math.random() * 0.05, 0.6, 0.85),
          roughness: 0.8,
          metalness: 0.0,
          transparent: true,
          opacity: 0.9,
        });

        const blossom = new THREE.Mesh(petalGeometry, petalMaterial);
        blossom.position.copy(blossomPos);
        blossoms.push(blossom);

        // 花簇中心
        if (Math.random() > 0.5) {
          const centerGeometry = new THREE.SphereGeometry(0.02, 6, 6);
          const centerMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.1, 0.8, 0.6),
            roughness: 0.6,
          });
          const center = new THREE.Mesh(centerGeometry, centerMaterial);
          center.position.copy(blossomPos);
          blossoms.push(center);
        }
      }
    }

    // 从树干开始生成
    const trunkHeight = 3 + Math.random() * 1;
    const trunkDirection = new THREE.Vector3(0, 1, 0);
    createBranch(
      new THREE.Vector3(0, 0, 0),
      trunkDirection,
      trunkHeight,
      0,
      0.3
    );

    return { branches, blossoms };
  }, []);

  // 树的风吹动画
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.02;

      // 为树枝添加轻微的风吹效果
      treeData.branches.forEach((branch, index) => {
        const windStrength = Math.sin(time * 0.5 + index * 0.1) * 0.01;
        branch.rotation.z += windStrength * 0.1;
      });

      // 樱花轻微摆动
      treeData.blossoms.forEach((blossom, index) => {
        const swayStrength = Math.sin(time * 0.8 + index * 0.05) * 0.005;
        blossom.position.x += swayStrength;
        blossom.position.z += Math.cos(time * 0.6 + index * 0.05) * 0.003;
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group>
        {treeData.branches.map((branch, index) => (
          <primitive key={`branch-${index}`} object={branch} />
        ))}
        {treeData.blossoms.map((blossom, index) => (
          <primitive key={`blossom-${index}`} object={blossom} />
        ))}
      </group>
    </group>
  );
}

// 落花组件
function FallingPetals({ count = 200 }: { count?: number }) {
  const petalsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const rotations = new Float32Array(count);
    const rotationSpeeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 15 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = -Math.random() * 0.03 - 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      rotations[i] = Math.random() * Math.PI * 2;
      rotationSpeeds[i] = (Math.random() - 0.5) * 0.02;

      // 粉色系
      const hue = 0.92 + Math.random() * 0.06;
      const color = new THREE.Color().setHSL(hue, 0.6, 0.85);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, velocities, rotations, rotationSpeeds, colors };
  }, [count]);

  useFrame((state) => {
    if (petalsRef.current) {
      const geometry = petalsRef.current.geometry;
      const positions = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        // 更新位置
        positions[i * 3] += particles.velocities[i * 3] + Math.sin(state.clock.getElapsedTime() + i) * 0.01;
        positions[i * 3 + 1] += particles.velocities[i * 3 + 1];
        positions[i * 3 + 2] += particles.velocities[i * 3 + 2] + Math.cos(state.clock.getElapsedTime() + i) * 0.01;

        // 重置落到地面的花瓣
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3] = (Math.random() - 0.5) * 20;
          positions[i * 3 + 1] = Math.random() * 5 + 15;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }

        // 更新旋转
        particles.rotations[i] += particles.rotationSpeeds[i];
      }

      geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={petalsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// 地面组件
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        color={new THREE.Color().setHSL(0.3, 0.4, 0.3)}
        roughness={0.9}
      />
    </mesh>
  );
}

// 光照组件
function Lighting() {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (directionalLightRef.current) {
      const time = state.clock.getElapsedTime();
      directionalLightRef.current.position.x = Math.sin(time * 0.1) * 5;
      directionalLightRef.current.position.z = Math.cos(time * 0.1) * 5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        ref={directionalLightRef}
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight
        args={['#ffe4e1', '#87ceeb', 0.3]}
      />
    </>
  );
}

// 主樱花场景组件
export default function SakuraScene() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <Lighting />
      <Ground />
      <SakuraTree position={[0, 0, 0]} />
      <SakuraTree position={[5, 0, 3]} />
      <SakuraTree position={[-4, 0, -2]} />
      <FallingPetals count={300} />

      {/* 雾气效果 */}
      <fog args={['#ffe4e1', 15, 40]} />
    </>
  );
}
