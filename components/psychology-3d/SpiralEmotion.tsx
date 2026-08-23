'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Sphere, Torus } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// 情绪强度类型
export type SpiralIntensity = 'mild' | 'moderate' | 'severe';

// 螺旋情绪配置
export interface SpiralEmotionConfig {
  intensity: SpiralIntensity;
  cycleCount: number;
  tightness: number;
  direction: 'inward' | 'outward';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
  hasSpikes: boolean;
  hasFractures: boolean;
  secondaryEmotions: string[];
}

// 预设情绪配置
export const emotionPresets: Record<SpiralIntensity, SpiralEmotionConfig> = {
  mild: {
    intensity: 'mild',
    cycleCount: 3.5,    // 轻度：3-4圈宽松大螺旋
    tightness: 0.3,     // 较宽松
    direction: 'inward',
    colors: {
      primary: '#9B8CBF',    // 浅紫灰
      secondary: '#A8B5D6',  // 灰蓝
      accent: '#C4B5D9',     // 淡紫
      glow: '#B8A8C9'
    },
    hasSpikes: false,
    hasFractures: false,
    secondaryEmotions: []
  },
  moderate: {
    intensity: 'moderate',
    cycleCount: 5,
    tightness: 0.7,
    direction: 'inward',
    colors: {
      primary: '#6B5B7F',    // 暗紫
      secondary: '#5B6B8A',  // 灰蓝
      accent: '#8B7BA0',     // 中紫
      glow: '#7A6A8F'
    },
    hasSpikes: true,
    hasFractures: false,
    secondaryEmotions: ['委屈', '压抑']
  },
  severe: {
    intensity: 'severe',
    cycleCount: 8,
    tightness: 0.95,
    direction: 'inward',
    colors: {
      primary: '#4A3A5F',    // 深灰紫
      secondary: '#3A4A6A',  // 深灰蓝
      accent: '#8B2A4A',     // 暗红
      glow: '#5A4A6F'
    },
    hasSpikes: true,
    hasFractures: true,
    secondaryEmotions: ['恐慌', '无力感', '自我攻击']
  }
};

// 旋转楼梯式螺旋生成函数
function generateSpiralStairs(config: SpiralEmotionConfig) {
  const stairs = [];
  const { cycleCount, tightness, intensity } = config;

  // 每层的台阶数量（根据情绪强度调整）
  const stepsPerLayer = intensity === 'mild' ? 24 : intensity === 'moderate' ? 36 : 48;
  const totalSteps = Math.floor(cycleCount * stepsPerLayer);

  for (let i = 0; i < totalSteps; i++) {
    const progress = i / totalSteps;
    const angle = progress * Math.PI * 2 * cycleCount;

    // 旋转楼梯式高度变化 - 每一圈上升
    const baseHeight = progress * 8;
    const wobbleHeight = Math.sin(angle * 2) * 0.3;
    const y = baseHeight + wobbleHeight;

    // 半径收缩 - 从外向内
    const baseRadius = 6 * (1 - progress * tightness);
    const radiusVar = Math.sin(angle * 3) * 0.3 * (intensity === 'severe' ? 1.5 : 1);
    const radius = baseRadius + radiusVar;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // 每个台阶的配置
    const stepSize = 0.8 + Math.random() * 0.4;
    const stepHeight = 0.15 + Math.random() * 0.1;
    const stepDepth = 0.3 + Math.random() * 0.2;

    stairs.push({
      position: [x, y, z],
      rotation: [0, angle, 0],
      size: stepSize,
      height: stepHeight,
      depth: stepDepth,
      layer: i % 2 // 0=内层, 1=外层
    });
  }

  return stairs;
}

// 中心立柱组件
function CenterColumn({ config }: { config: SpiralEmotionConfig }) {
  const colorProfile = emotionColorProfiles[config.intensity];

  return (
    <group>
      {/* 主立柱 - 渐变银蓝 */}
      <Cylinder
        args={[0.3, 0.4, 12, 32]}
        position={[0, 6, 0]}
      >
        <meshPhysicalMaterial
          color={colorProfile.column}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.6}
          emissive={colorProfile.column}
          emissiveIntensity={0.4}
          clearcoat={1.0}
          envMapIntensity={1.0}
          transmission={0.2}
        />
      </Cylinder>

      {/* 立柱顶部发光装饰 */}
      <Sphere
        args={[0.6, 32, 32]}
        position={[0, 12.3, 0]}
      >
        <meshPhysicalMaterial
          color={colorProfile.glow}
          roughness={0.3}
          metalness={0.5}
          emissive={colorProfile.glow}
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </Sphere>
    </group>
  );
}

// 单个台阶组件 - 真实楼梯质感
function SpiralStair({ step, config, layer }: {
  step: any;
  config: SpiralEmotionConfig;
  layer: number;
}) {
  const stepRef = useRef<THREE.Group>(null);
  const colorProfile = emotionColorProfiles[config.intensity];

  // 根据层级选择配色
  const layerColors = layer === 0
    ? [colorProfile.innerLayer, colorProfile.innerLayer2] // 内层：粉橙系
    : [colorProfile.outerLayer, colorProfile.outerLayer2]; // 外层：绿蓝紫系

  useFrame((state) => {
    if (stepRef.current) {
      // 微微的浮动动画，让楼梯看起来更有生机
      const floatOffset = Math.sin(state.clock.elapsedTime + step.position[1]) * 0.05;
      stepRef.current.position.y = step.position[1] + floatOffset;
    }
  });

  const stairWidth = step.size;
  const stairHeight = step.height;
  const stairDepth = step.depth;

  return (
    <group ref={stepRef} position={step.position} rotation={step.rotation}>
      {/* 台阶踏面 */}
      <Cylinder
        args={[stairWidth * 0.4, stairWidth * 0.4, stairHeight * 0.3, 24]}
        position={[0, stairHeight * 0.15, stairDepth * 0.2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshPhysicalMaterial
          color={layerColors[0]}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.85}
          emissive={layerColors[0]}
          emissiveIntensity={0.2 + Math.random() * 0.3}
          clearcoat={0.6}
        />
      </Cylinder>

      {/* 护栏 */}
      <Torus
        args={[stairWidth * 0.35, stairHeight * 0.15, 8, 24]}
        position={[0, stairHeight * 0.3, stairDepth * 0.35]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshPhysicalMaterial
          color="#FFFFFF"
          roughness={0.7}
          metalness={0.1}
          transparent
          opacity={0.3}
          emissive="#FFFFFF"
          emissiveIntensity={0.5}
        />
      </Torus>

      {/* 侧边装饰 */}
      <Sphere
        args={[stairHeight * 0.12, 16, 16]}
        position={[stairWidth * 0.3, stairHeight * 0.25, stairDepth * 0.4]}
      >
        <meshPhysicalMaterial
          color={layerColors[1]}
          roughness={0.4}
          metalness={0.3}
          emissive={layerColors[1]}
          emissiveIntensity={0.4}
          transparent
          opacity={0.7}
        />
      </Sphere>
    </group>
  );
}

// 螺旋粒子系统 - 填充空隙，增强层次感
function SpiralParticles({ config }: { config: SpiralEmotionConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const colorProfile = emotionColorProfiles[config.intensity];

  const particles = useMemo(() => {
    const count = 60;
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      ],
      basePosition: [
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      ],
      speed: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      size: 0.05 + Math.random() * 0.1,
      color: [
        colorProfile.innerLayer,
        colorProfile.outerLayer,
        colorProfile.accent,
        '#FFD700',
        '#FFFFFF'
      ][Math.floor(Math.random() * 5)]
    }));
  }, [config, colorProfile]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      groupRef.current.rotation.y += 0.002;

      groupRef.current.children.forEach((child: any, i: number) => {
        if (child.type === 'Mesh' && particles[i]) {
          const particle = particles[i];
          // 顺着螺旋轨迹流动
          const spiralMotion = time * 0.5 + particle.phase;
          child.position.x = particle.basePosition[0] + Math.cos(spiralMotion) * 0.5;
          child.position.z = particle.basePosition[2] + Math.sin(spiralMotion) * 0.5;
          child.position.y = particle.basePosition[1] + Math.sin(time + particle.phase) * 0.3;

          const scale = 1 + Math.sin(time * 2 + particle.phase) * 0.3;
          child.scale.setScalar(scale * (particle.size / 0.08));
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <Sphere
          key={i}
          position={particle.basePosition}
          args={[particle.size, 16, 16]}
        >
          <meshPhysicalMaterial
            color={particle.color}
            roughness={0.5}
            metalness={0.3}
            transparent
            opacity={0.6}
            emissive={particle.color}
            emissiveIntensity={0.5 + Math.random() * 0.3}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 分层色彩配置
const emotionColorProfiles: Record<SpiralIntensity, any> = {
  mild: {
    // 内层螺旋：浅粉、蜜桃橙、淡洋红
    innerLayer: '#FFB6C1',
    innerLayer2: '#FFDAB9',
    // 中层螺旋主体：青柠绿、薄荷蓝、薰衣草紫
    primary: '#98FB98',
    secondary: '#87CEEB',
    accent: '#DDA0DD',
    // 外层螺旋：冰蓝、紫罗兰、暖橘黄
    outerLayer: '#B0E0E6',
    outerLayer2: '#9370DB',
    // 辅助色
    column: '#C0C0C0',
    glow: '#F0E68C',
    gradient: ['#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD']
  },
  moderate: {
    innerLayer: '#FF6B8A',
    innerLayer2: '#FF8C69',
    primary: '#90EE90',
    secondary: '#00CED1',
    accent: '#BA55D3',
    outerLayer: '#4682B4',
    outerLayer2: '#9932CC',
    column: '#A9A9A9',
    glow: '#FFA500',
    gradient: ['#FF6B8A', '#90EE90', '#00CED1', '#BA55D3']
  },
  severe: {
    innerLayer: '#DC143C',
    innerLayer2: '#FF4500',
    primary: '#32CD32',
    secondary: '#4169E1',
    accent: '#800080',
    outerLayer: '#0000FF',
    outerLayer2: '#FF8C00',
    column: '#808080',
    glow: '#FF0000',
    gradient: ['#DC143C', '#32CD32', '#4169E1', '#800080']
  }
};

// 完整旋转楼梯式螺旋场景
export function SpiralEmotionScene({ config }: { config: SpiralEmotionConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const colorProfile = emotionColorProfiles[config.intensity];

  // 生成旋转楼梯台阶
  const stairs = useMemo(() => generateSpiralStairs(config), [config]);

  useFrame((state) =>{
    if (groupRef.current) {
      // 整体旋转动画
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;

      // 整体轻微浮动
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <>
      {/* 漂浮彩色粒子 */}
      <SpiralParticles config={config} />

      {/* 中心立柱 */}
      <CenterColumn config={config} />

      {/* 旋转楼梯台阶 */}
      <group ref={groupRef}>
        {stairs.map((step, i) => (
          <SpiralStair
            key={i}
            step={step}
            config={config}
            layer={step.layer}
          />
        ))}
      </group>

      {/* 环境光 - 斜向打光增强立体感 */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={0.6}
        color={colorProfile.primary}
        castShadow
      />
      <pointLight
        position={[-8, 10, -5]}
        intensity={0.4}
        color={colorProfile.secondary}
      />
      <pointLight
        position={[0, 8, 0]}
        intensity={0.3}
        color={colorProfile.glow}
      />

      {/* Bloom辉光特效 */}
      <EffectComposer>
        <Bloom
          intensity={1.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.8}
          radius={0.9}
        />
      </EffectComposer>
    </>
  );
}
