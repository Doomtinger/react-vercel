'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Icosahedron, Torus, Octahedron, Tetrahedron, Box, Cylinder, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 性格测试结果接口
interface PersonalityResultData {
  mbti: string;
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  description: string;
  strengths: string[];
  weaknesses: string[];
  careerSuggestions: string[];
}

// MBTI类型对应的颜色和形状
const mbtiStyles: Record<string, {
  primaryColor: string;
  secondaryColor: string;
  shape: 'sphere' | 'icosahedron' | 'torus' | 'octahedron' | 'tetrahedron' | 'box' | 'cylinder';
  animationSpeed: number;
  complexity: number;
}> = {
  'ISTJ': { primaryColor: '#4A7ABA', secondaryColor: '#3A6A9A', shape: 'box', animationSpeed: 0.5, complexity: 0.3 },
  'ISFJ': { primaryColor: '#7BA89A', secondaryColor: '#6B988A', shape: 'sphere', animationSpeed: 0.4, complexity: 0.4 },
  'INFJ': { primaryColor: '#9B7BBA', secondaryColor: '#8B6BAA', shape: 'icosahedron', animationSpeed: 0.6, complexity: 0.8 },
  'INTJ': { primaryColor: '#5B8BBA', secondaryColor: '#4B7BAA', shape: 'octahedron', animationSpeed: 0.7, complexity: 0.9 },
  'ISTP': { primaryColor: '#6B9B7A', secondaryColor: '#5B8B6A', shape: 'tetrahedron', animationSpeed: 0.6, complexity: 0.5 },
  'ISFP': { primaryColor: '#CB8B7A', secondaryColor: '#BB7B6A', shape: 'sphere', animationSpeed: 0.5, complexity: 0.6 },
  'INFP': { primaryColor: '#DB9BBA', secondaryColor: '#CB8BAA', shape: 'torus', animationSpeed: 0.5, complexity: 0.7 },
  'INTP': { primaryColor: '#7B9BCA', secondaryColor: '#6B8BBA', shape: 'icosahedron', animationSpeed: 0.8, complexity: 0.9 },
  'ESTP': { primaryColor: '#DB7B5A', secondaryColor: '#CB6B4A', shape: 'tetrahedron', animationSpeed: 0.9, complexity: 0.6 },
  'ESFP': { primaryColor: '#FB9B6A', secondaryColor: '#EB8B5A', shape: 'sphere', animationSpeed: 1.0, complexity: 0.5 },
  'ENFP': { primaryColor: '#FBAB8A', secondaryColor: '#EB9B7A', shape: 'torus', animationSpeed: 1.1, complexity: 0.8 },
  'ENTP': { primaryColor: '#BB9B7A', secondaryColor: '#AB8B6A', shape: 'icosahedron', animationSpeed: 1.2, complexity: 0.9 },
  'ESTJ': { primaryColor: '#5A8B9A', secondaryColor: '#4A7B8A', shape: 'box', animationSpeed: 0.8, complexity: 0.4 },
  'ESFJ': { primaryColor: '#8BAA9A', secondaryColor: '#7B9A8A', shape: 'sphere', animationSpeed: 0.7, complexity: 0.5 },
  'ENFJ': { primaryColor: '#BB8AAA', secondaryColor: '#AB7A9A', shape: 'torus', animationSpeed: 0.9, complexity: 0.7 },
  'ENTJ': { primaryColor: '#8A6A9A', secondaryColor: '#7A5A8A', shape: 'octahedron', animationSpeed: 1.0, complexity: 0.9 }
};

// 性格核心组件
export function PersonalityCore({ result }: { result: PersonalityResultData }) {
  const meshRef = useRef<THREE.Group>(null);
  const style = mbtiStyles[result.mbti] || mbtiStyles['ISTJ'];

  // 根据大五人格调整参数
  const opennessScale = 1 + (result.bigFive.openness - 50) / 100;
  const conscientiousnessGeometry = result.bigFive.conscientiousness / 100;
  const extraversionRotation = result.bigFive.extraversion / 50;
  const agreeablenessSmoothness = 1 - result.bigFive.agreeableness / 200;
  const neuroticismJitter = result.bigFive.neuroticism / 100;

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;

      // 基础旋转
      meshRef.current.rotation.y += style.animationSpeed * 0.01;
      meshRef.current.rotation.x = Math.sin(time * style.animationSpeed) * 0.2;

      // 外向性影响旋转速度
      meshRef.current.rotation.z += extraversionRotation * 0.005;

      // 神经质影响抖动
      if (neuroticismJitter > 0.5) {
        meshRef.current.position.x = Math.sin(time * 10) * neuroticismJitter * 0.1;
        meshRef.current.position.y = Math.cos(time * 12) * neuroticismJitter * 0.1;
      }

      // 开放性影响整体大小
      const scale = opennessScale * (1 + Math.sin(time * 2) * 0.1);
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  // 根据MBTI类型选择不同的几何形状
  const getGeometry = () => {
    switch (style.shape) {
      case 'icosahedron':
        return <Icosahedron args={[2, 2]} />;
      case 'torus':
        return <Torus args={[1.5, 0.6, 16, 32]} />;
      case 'octahedron':
        return <Octahedron args={[2, 0]} />;
      case 'tetrahedron':
        return <Tetrahedron args={[2, 0]} />;
      case 'box':
        return <Box args={[2.5, 2.5, 2.5]} />;
      case 'cylinder':
        return <Cylinder args={[1.5, 1.5, 3, 16]} />;
      default:
        return <Sphere args={[2, 32, 32]} />;
    }
  };

  return (
    <group ref={meshRef}>
      {getGeometry()}
      <meshStandardMaterial
        color={style.primaryColor}
        roughness={agreeablenessSmoothness}
        metalness={0.3}
        transparent
        opacity={0.8}
        emissive={style.secondaryColor}
        emissiveIntensity={0.3}
      />
    </group>
  );
}

// 大五人格可视化环
export function BigFiveRings({ result }: { result: PersonalityResultData }) {
  const groupRef = useRef<THREE.Group>(null);

  const rings = useMemo(() => {
    return [
      {
        trait: '开放性',
        value: result.bigFive.openness,
        color: '#9B7BBA',
        radius: 3.5,
        rotation: [0, 0, 0]
      },
      {
        trait: '尽责性',
        value: result.bigFive.conscientiousness,
        color: '#5B8B9A',
        radius: 4.2,
        rotation: [Math.PI / 6, 0, 0]
      },
      {
        trait: '外向性',
        value: result.bigFive.extraversion,
        color: '#FB9B6A',
        radius: 4.9,
        rotation: [Math.PI / 3, 0, 0]
      },
      {
        trait: '宜人性',
        value: result.bigFive.agreeableness,
        color: '#7BAA8A',
        radius: 5.6,
        rotation: [Math.PI / 2, 0, 0]
      },
      {
        trait: '神经质',
        value: result.bigFive.neuroticism,
        color: '#BB6B8A',
        radius: 6.3,
        rotation: [Math.PI * 2/3, 0, 0]
      }
    ];
  }, [result.bigFive]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, index) => (
        <group key={index} rotation={ring.rotation as [number, number, number]}>
          <Torus
            args={[ring.radius, 0.05, 8, 32]}
            position={[0, 0, 0]}
          >
            <meshStandardMaterial
              color={ring.color}
              transparent
              opacity={0.6}
              emissive={ring.color}
              emissiveIntensity={0.3}
            />
          </Torus>
          {/* 基于值的发光点 */}
          <Sphere
            args={[0.15, 8, 8]}
            position={[
              Math.cos(ring.value / 100 * Math.PI * 2) * ring.radius,
              Math.sin(ring.value / 100 * Math.PI * 2) * ring.radius,
              0
            ]}
          >
            <meshStandardMaterial
              color={ring.color}
              emissive={ring.color}
              emissiveIntensity={0.8}
            />
          </Sphere>
        </group>
      ))}
    </group>
  );
}

// 优势特质粒子
export function StrengthParticles({ result }: { result: PersonalityResultData }) {
  const groupRef = useRef<THREE.Group>(null);
  const style = mbtiStyles[result.mbti] || mbtiStyles['ISTJ'];

  const particles = useMemo(() => {
    return result.strengths.map((_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      ] as [number, number, number],
      speed: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      size: 0.1 + Math.random() * 0.2
    }));
  }, [result.strengths]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      groupRef.current.rotation.y += 0.003;

      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        if (child instanceof THREE.Mesh && particles[i]) {
          const particle = particles[i];
          child.position.y = particle.position[1] + Math.sin(time * particle.speed + particle.phase) * 0.3;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle) => (
        <Sphere
          key={particle.id}
          position={particle.position}
          args={[particle.size, 8, 8]}
        >
          <meshStandardMaterial
            color={style.primaryColor}
            transparent
            opacity={0.7}
            emissive={style.secondaryColor}
            emissiveIntensity={0.4}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 性格可视化背景网格
export function PersonalityGrid({ result }: { result: PersonalityResultData }) {
  const style = mbtiStyles[result.mbti] || mbtiStyles['ISTJ'];

  return (
    <group>
      <Grid
        args={[15, 15]}
        cellSize={1}
        cellThickness={0.05}
        cellColor={style.secondaryColor}
        sectionSize={5}
        sectionThickness={0.1}
        sectionColor={style.primaryColor}
        fadeDistance={12}
        fadeStrength={1}
        position={[0, 0, -2]}
        infiniteGrid
      />
    </group>
  );
}

// 完整性格可视化场景
export function PersonalityVisualizationScene({ result }: { result: PersonalityResultData }) {
  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 5]} intensity={0.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} />

      {/* 背景网格 */}
      <PersonalityGrid result={result} />

      {/* 大五人格环 */}
      <BigFiveRings result={result} />

      {/* 性格核心 */}
      <PersonalityCore result={result} />

      {/* 优势粒子 */}
      <StrengthParticles result={result} />
    </>
  );
}