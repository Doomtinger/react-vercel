'use client';

import { useRef, useMemo, useFrame } from 'react';
import * as THREE from 'three';

// 大树组件
function BigTree({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  // 程序化生成大树
  const treeData = useMemo(() => {
    const branches: THREE.Mesh[] = [];
    const leaves: THREE.Mesh[] = [];

    // 递归生成树枝
    function createBranch(
      startPoint: THREE.Vector3,
      direction: THREE.Vector3,
      length: number,
      depth: number,
      parentRadius?: number
    ) {
      if (depth > 6 || length < 0.1) return;

      const endPoint = startPoint.clone().add(direction.clone().multiplyScalar(length));
      const radius = parentRadius ? parentRadius * 0.7 : Math.max(0.15, length * 0.12);

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
        color: new THREE.Color().setHSL(0.08, 0.4, 0.25 + depth * 0.02),
        roughness: 0.95,
        metalness: 0.0,
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      branch.position.copy(startPoint);
      branch.lookAt(endPoint);
      branch.rotateX(Math.PI / 2);
      branches.push(branch);

      // 在末端生成叶子
      if (depth >= 4) {
        createLeaves(endPoint, depth);
      }

      // 生成子树枝
      const branchCount = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < branchCount; i++) {
        const angle = (Math.PI / (branchCount + 1)) * (i + 1) + (Math.random() - 0.5) * 0.3;
        const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.6;

        const newDirection = direction.clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
          .applyAxisAngle(new THREE.Vector3(1, 0, 0), spreadAngle)
          .normalize();

        const newLength = length * (0.65 + Math.random() * 0.15);
        createBranch(endPoint, newDirection, newLength, depth + 1, radius);
      }
    }

    // 创建叶子
    function createLeaves(position: THREE.Vector3, depth: number) {
      const leafCount = Math.floor(Math.random() * 4) + 3;

      for (let i = 0; i < leafCount; i++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 1.2
        );

        const leafPos = position.clone().add(offset);

        // 绿色叶子
        const leafGeometry = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.28 + Math.random() * 0.12, 0.55, 0.35 + Math.random() * 0.1),
          roughness: 0.8,
          metalness: 0.0,
          transparent: true,
          opacity: 0.9,
        });

        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.copy(leafPos);
        leaves.push(leaf);
      }
    }

    // 从树干开始生成
    const trunkHeight = 5 + Math.random() * 1.5;
    const trunkDirection = new THREE.Vector3(0, 1, 0);
    createBranch(
      new THREE.Vector3(0, 0, 0),
      trunkDirection,
      trunkHeight,
      0,
      0.4
    );

    return { branches, leaves };
  }, []);

  // 树的风吹动画
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();

      // 为树枝添加风吹效果
      treeData.branches.forEach((branch, index) => {
        const windStrength = Math.sin(time * 0.8 + index * 0.1) * 0.008;
        branch.rotation.z += windStrength;
        branch.rotation.x += Math.sin(time * 0.6 + index * 0.15) * 0.005;
      });

      // 叶子轻微摆动
      treeData.leaves.forEach((leaf, index) => {
        const swayStrength = Math.sin(time * 0.9 + index * 0.05) * 0.003;
        leaf.position.x += swayStrength;
        leaf.position.z += Math.cos(time * 0.7 + index * 0.05) * 0.002;
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group>
        {treeData.branches.map((branch, index) => (
          <primitive key={`branch-${index}`} object={branch} />
        ))}
        {treeData.leaves.map((leaf, index) => (
          <primitive key={`leaf-${index}`} object={leaf} />
        ))}
      </group>
    </group>
  );
}

// 草原地面
function GrassGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial
        color={new THREE.Color().setHSL(0.25, 0.45, 0.28)}
        roughness={0.95}
      />
    </mesh>
  );
}

// 草的粒子效果
function GrassParticles({ count = 1000 }: { count?: number }) {
  const grassRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 在一定范围内随机分布
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 40 + 5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 0.5 + 0.1;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // 绿色系
      const hue = 0.25 + Math.random() * 0.15;
      const color = new THREE.Color().setHSL(hue, 0.5, 0.35 + Math.random() * 0.15);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [count]);

  // 草的摆动动画
  useFrame((state) => {
    if (grassRef.current) {
      const time = state.clock.getElapsedTime();
      const geometry = grassRef.current.geometry;
      const positions = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        // 模拟风吹草动
        positions[i * 3] += Math.sin(time * 0.5 + i * 0.01) * 0.002;
        positions[i * 3 + 2] += Math.cos(time * 0.4 + i * 0.01) * 0.002;
      }

      geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={grassRef}>
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
        size={0.08}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// 云朵组件
function Cloud({ position = [0, 0, 0], scale = 1 }: { position?: [number, number, number], scale?: number }) {
  const cloudRef = useRef<THREE.Group>(null);

  const cloudGeometry = useMemo(() => {
    const group = new THREE.Group();

    // 创建云朵的多个球体
    const cloudBalls = [
      { pos: [0, 0, 0], size: 1 },
      { pos: [0.8, 0.2, 0], size: 0.7 },
      { pos: [-0.8, 0.1, 0], size: 0.6 },
      { pos: [0.3, 0.4, 0.3], size: 0.5 },
      { pos: [-0.4, 0.3, -0.2], size: 0.6 },
      { pos: [0.2, -0.1, 0.4], size: 0.4 },
    ];

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.6, 0.15, 0.95),
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.8,
    });

    cloudBalls.forEach(({ pos, size }) => {
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...pos as [number, number, number]);
      group.add(mesh);
    });

    return group;
  }, []);

  // 云朵移动
  useFrame((state) => {
    if (cloudRef.current) {
      const time = state.clock.getElapsedTime();
      cloudRef.current.position.x = position[0] + Math.sin(time * 0.05) * 2;
      cloudRef.current.position.y = position[1] + Math.sin(time * 0.03 + 1) * 0.3;
    }
  });

  return (
    <group ref={cloudRef} position={position} scale={scale}>
      <primitive object={cloudGeometry} />
    </group>
  );
}

// 光照组件
function NeutralLighting() {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (directionalLightRef.current) {
      const time = state.clock.getElapsedTime();
      directionalLightRef.current.position.x = Math.sin(time * 0.08) * 8;
      directionalLightRef.current.position.z = Math.cos(time * 0.08) * 8;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        ref={directionalLightRef}
        position={[8, 12, 8]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <hemisphereLight
        args={['#87ceeb', '#90ee90', 0.4]}
      />
    </>
  );
}

// 主中立场景组件
export default function NeutralDreamScene({ config }: { config: any }) {
  return (
    <>
      <NeutralLighting />
      <GrassGround />
      <GrassParticles count={config?.grassCount || 1000} />
      <BigTree position={[0, 0, 0]} />

      {/* 添加一些云朵 */}
      <Cloud position={[10, 15, -5]} scale={2} />
      <Cloud position={[-8, 12, -10]} scale={1.5} />
      <Cloud position={[5, 18, 8]} scale={1.8} />
      <Cloud position={[-12, 14, 6]} scale={1.2} />

      {/* 淡淡的雾气 */}
      <fog args={['#98fb98', 30, 80]} />
    </>
  );
}
