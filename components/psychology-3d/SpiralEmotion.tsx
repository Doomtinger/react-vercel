'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
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
    cycleCount: 2.5,    // 轻度：2-3圈宽松大螺旋
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
    cycleCount: 5,      // 中度：4-6圈紧密螺旋
    tightness: 0.7,     // 较紧密
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
    cycleCount: 8,      // 重度：7圈以上密集缠绕
    tightness: 0.95,    // 非常紧密
    direction: 'inward',
    colors: {
      primary: '#4A3A5F',    // 深灰紫
      secondary: '#3A4A6A',  // 深灰蓝
      accent: '#8B2A4A',     // 暗红（代表自我攻击）
      glow: '#5A4A6F'
    },
    hasSpikes: true,
    hasFractures: true,
    secondaryEmotions: ['恐慌', '无力感', '自我攻击']
  }
};

// 生成螺旋路径点
function generateSpiralPoints(config: SpiralEmotionConfig): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const { cycleCount, tightness, hasSpikes, hasFractures } = config;

  const segments = Math.floor(cycleCount * 50);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * cycleCount * Math.PI * 2;

    // 基础半径
    const baseRadius = 5 * (1 - t * tightness);

    // 尖角效果
    const spike = hasSpikes && Math.sin(angle * 4) > 0.7 ? 0.25 : 0;

    // 断裂效果
    const fracture = hasFractures && i % 25 < 2;

    if (!fracture) {
      const radius = baseRadius + spike;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = t * 1.5 - 0.75 + Math.sin(angle * 2) * 0.2;

      points.push(new THREE.Vector3(x, y, z));
    }
  }

  return points;
}

// 主螺旋组件
export function SpiralVisualization({ config }: { config: SpiralEmotionConfig }) {
  const spiralRef = useRef<THREE.Group>(null);

  // 生成主螺旋点
  const mainPoints = useMemo(() => generateSpiralPoints(config), [config]);

  // 生成副螺旋点（复合情绪）
  const secondaryPoints = useMemo(() => {
    if (config.secondaryEmotions.length === 0) return [];
    const points = generateSpiralPoints(config);
    // 稍微偏移
    return points.map(p => new THREE.Vector3(p.x * 0.85, p.y * 0.85, p.z));
  }, [config]);

  // 生成攻击线条点
  const attackPoints = useMemo(() => {
    if (config.intensity !== 'severe') return [];
    const points = generateSpiralPoints(config);
    return points.filter((_, i) => i % 3 === 0);
  }, [config]);

  useFrame((state) => {
    if (spiralRef.current) {
      // 根据情绪等级设置动画
      if (config.intensity === 'mild') {
        // 轻度：缓慢旋转
        spiralRef.current.rotation.z = state.clock.elapsedTime * 0.1;
      } else if (config.intensity === 'moderate') {
        // 中度：轻微收缩扩张
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        spiralRef.current.scale.set(pulse, pulse, 1);
        spiralRef.current.rotation.z = state.clock.elapsedTime * 0.15;
      } else {
        // 重度：高频抖动+向内收紧
        spiralRef.current.rotation.z = state.clock.elapsedTime * 0.2;
        const tightPulse = 1 - Math.sin(state.clock.elapsedTime * 4) * 0.03;
        spiralRef.current.scale.set(tightPulse, tightPulse, 1);

        // 高频抖动
        spiralRef.current.position.x = Math.sin(state.clock.elapsedTime * 15) * 0.03;
        spiralRef.current.position.y = Math.cos(state.clock.elapsedTime * 15) * 0.03;
      }
    }
  });

  return (
    <group ref={spiralRef}>
      {/* 主螺旋 - 用更大的球体组成的路径 */}
      {mainPoints.map((point, i) => (
        <Sphere
          key={`main-${i}`}
          position={point}
          args={[0.12, 16, 16]}
        >
          <meshStandardMaterial
            color={config.colors.primary}
            roughness={0.5}
            metalness={0.2}
            transparent
            opacity={0.9}
            emissive={config.colors.glow}
            emissiveIntensity={0.3}
          />
        </Sphere>
      ))}

      {/* 附着螺旋（复合情绪） */}
      {secondaryPoints.map((point, i) => (
        <Sphere
          key={`sec-${i}`}
          position={point}
          args={[0.08, 16, 16]}
        >
          <meshStandardMaterial
            color={config.colors.secondary}
            roughness={0.6}
            metalness={0.1}
            transparent
            opacity={0.7}
          />
        </Sphere>
      ))}

      {/* 暗红线条（自我攻击） */}
      {attackPoints.length > 0 && (
        <Line
          points={attackPoints}
          color={config.colors.accent}
          lineWidth={4}
          transparent
          opacity={0.8}
        />
      )}
    </group>
  );
}

// 氛围云雾（压抑情绪）
export function FogCloud({ intensity }: { intensity: SpiralIntensity }) {
  const cloudRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  if (intensity !== 'severe' && intensity !== 'moderate') return null;

  return (
    <group ref={cloudRef}>
      <Sphere args={[7, 32, 32]} position={[0, 0, -1]}>
        <meshBasicMaterial
          color={intensity === 'severe' ? '#3A2A4A' : '#5A5A7A'}
          transparent
          opacity={0.08}
        />
      </Sphere>
    </group>
  );
}

// 完整螺旋情绪场景
export function SpiralEmotionScene({ config }: { config: SpiralEmotionConfig }) {
  return (
    <>
      {/* 氛围云雾 */}
      <FogCloud intensity={config.intensity} />

      {/* 主螺旋可视化 */}
      <SpiralVisualization config={config} />

      {/* 环境光 */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 5]} intensity={0.4} color={config.colors.glow} />
      <pointLight position={[-10, -10, -5]} intensity={0.2} color={config.colors.secondary} />
    </>
  );
}
