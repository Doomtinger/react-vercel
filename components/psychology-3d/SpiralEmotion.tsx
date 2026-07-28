'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line, Cylinder, Grid } from '@react-three/drei';
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
    cycleCount: 2.5,
    tightness: 0.3,
    direction: 'inward',
    colors: {
      primary: '#9B8CBF',
      secondary: '#A8B5D6',
      accent: '#C4B5D9',
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
      primary: '#6B5B7F',
      secondary: '#5B6B8A',
      accent: '#8B7BA0',
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
      primary: '#4A3A5F',
      secondary: '#3A4A6A',
      accent: '#8B2A4A',
      glow: '#5A4A6F'
    },
    hasSpikes: true,
    hasFractures: true,
    secondaryEmotions: ['恐慌', '无力感', '自我攻击']
  }
};

// 生成螺旋路径点 - 螺旋楼梯效果
function generateSpiralPoints(config: SpiralEmotionConfig): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const { cycleCount, tightness, hasSpikes, hasFractures } = config;

  const segments = Math.floor(cycleCount * 60); // 增加点数让曲线更平滑

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * cycleCount * Math.PI * 2;

    // 基础半径 - 从外向内收缩
    const baseRadius = 5 * (1 - t * tightness);

    // 尖角效果
    const spike = hasSpikes && Math.sin(angle * 4) > 0.7 ? 0.25 : 0;

    // 断裂效果
    const fracture = hasFractures && i % 30 < 2;

    if (!fracture) {
      const radius = baseRadius + spike;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // 螺旋楼梯效果
      const stairHeight = t * cycleCount * 0.8;
      const wobble = Math.sin(angle * 2) * 0.15;
      const z = stairHeight + wobble - 2;

      points.push(new THREE.Vector3(x, y, z));
    }
  }

  return points;
}

// 螺旋楼梯的支撑柱 - 优化版
function SpiralStairSupports({ points, color }: { points: THREE.Vector3[]; color: string }) {
  const supports = useMemo(() => {
    const step = 18;
    return points.filter((_, i) => i % step === 0);
  }, [points]);

  return (
    <>
      {supports.map((point, i) => (
        <Cylinder
          key={`support-${i}`}
          position={[point.x, point.y, -2]}
          args={[0.04, 0.04, point.z + 2, 16]} // 增加细分度
        >
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={0.5}
            roughness={0.6}
            metalness={0.2}
            clearcoat={0.3}
            envMapIntensity={0.5}
          />
        </Cylinder>
      ))}
    </>
  );
}

// 主螺旋组件 - 优化版
export function SpiralVisualization({ config }: { config: SpiralEmotionConfig }) {
  const spiralRef = useRef<THREE.Group>(null);

  // 生成主螺旋点
  const mainPoints = useMemo(() => generateSpiralPoints(config), [config]);

  // 生成副螺旋点（复合情绪）
  const secondaryPoints = useMemo(() => {
    if (config.secondaryEmotions.length === 0) return [];
    const points = generateSpiralPoints(config);
    return points.map(p => new THREE.Vector3(p.x * 0.85, p.y * 0.85, p.z));
  }, [config]);

  // 生成攻击线条点
  const attackPoints = useMemo(() => {
    if (config.intensity !== 'severe') return [];
    const points = generateSpiralPoints(config);
    return points.filter((_, i) => i % 4 === 0);
  }, [config]);

  useFrame((state) => {
    if (spiralRef.current) {
      if (config.intensity === 'mild') {
        spiralRef.current.rotation.z = state.clock.elapsedTime * 0.1;
      } else if (config.intensity === 'moderate') {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        spiralRef.current.scale.set(pulse, pulse, 1);
        spiralRef.current.rotation.z = state.clock.elapsedTime * 0.15;
      } else {
        spiralRef.current.rotation.z = state.clock.elapsedTime * 0.2;
        const tightPulse = 1 - Math.sin(state.clock.elapsedTime * 4) * 0.03;
        spiralRef.current.scale.set(tightPulse, tightPulse, 1);
        spiralRef.current.position.x = Math.sin(state.clock.elapsedTime * 15) * 0.03;
        spiralRef.current.position.y = Math.cos(state.clock.elapsedTime * 15) * 0.03;
      }
    }
  });

  // 根据强度调整发光强度
  const glowIntensity = config.intensity === 'mild' ? 0.4 :
                       config.intensity === 'moderate' ? 0.6 : 0.8;

  return (
    <group ref={spiralRef}>
      {/* 螺旋楼梯的支撑柱 */}
      <SpiralStairSupports points={mainPoints} color={config.colors.secondary} />

      {/* 主螺旋 - 使用高质量球体 */}
      {mainPoints.map((point, i) => (
        <Sphere
          key={`main-${i}`}
          position={point}
          args={[0.15, 48, 48]} // 提高细分度
        >
          <meshPhysicalMaterial
            color={config.colors.primary}
            roughness={0.4}
            metalness={0.3}
            transparent
            opacity={0.92}
            emissive={config.colors.glow}
            emissiveIntensity={glowIntensity}
            clearcoat={0.6}
            clearcoatRoughness={0.2}
            envMapIntensity={0.7}
            transmission={0.1}
            thickness={0.3}
          />
        </Sphere>
      ))}

      {/* 附着螺旋（复合情绪）- 优化材质 */}
      {secondaryPoints.map((point, i) => (
        <Sphere
          key={`sec-${i}`}
          position={point}
          args={[0.10, 42, 42]} // 提高细分度
        >
          <meshPhysicalMaterial
            color={config.colors.secondary}
            roughness={0.5}
            metalness={0.2}
            transparent
            opacity={0.75}
            emissive={config.colors.glow}
            emissiveIntensity={0.3}
            clearcoat={0.4}
            envMapIntensity={0.5}
          />
        </Sphere>
      ))}

      {/* 暗红线条（自我攻击）- 使用TubeGeometry获得更好的效果 */}
      {attackPoints.length > 1 && (
        <Line
          points={attackPoints}
          color={config.colors.accent}
          lineWidth={6}
          transparent
          opacity={0.9}
        />
      )}

      {/* 添加一些漂浮的情绪粒子 */}
      {config.intensity !== 'mild' && Array.from({ length: 15 }, (_, i) => (
        <Sphere
          key={`particle-${i}`}
          position={[
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            Math.random() * 3
          ]}
          args={[0.05 + Math.random() * 0.08, 32, 32]}
        >
          <meshPhysicalMaterial
            color={config.intensity === 'severe' ? config.colors.accent : config.colors.secondary}
            roughness={0.6}
            metalness={0.2}
            transparent
            opacity={0.4 + Math.random() * 0.3}
            emissive={config.colors.glow}
            emissiveIntensity={0.2 + Math.random() * 0.3}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 氛围云雾（压抑情绪）- 优化版
export function FogCloud({ intensity, config }: { intensity: SpiralIntensity; config: SpiralEmotionConfig }) {
  const cloudRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.z = state.clock.elapsedTime * 0.02;
      // 动态雾的透明度
      cloudRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhysicalMaterial) {
          const baseOpacity = intensity === 'severe' ? 0.12 : 0.08;
          child.material.opacity = baseOpacity + Math.sin(state.clock.elapsedTime + i) * 0.02;
        }
      });
    }
  });

  if (intensity !== 'severe' && intensity !== 'moderate') return null;

  const cloudColor = intensity === 'severe' ? '#3A2A4A' : '#5A5A7A';

  return (
    <group ref={cloudRef}>
      <Sphere args={[8, 64, 64]} position={[0, 0, -1]}>
        <meshPhysicalMaterial
          color={cloudColor}
          transparent
          opacity={0.1}
          roughness={0.95}
          metalness={0.05}
          envMapIntensity={0.2}
        />
      </Sphere>

      {/* 外层轻雾 */}
      <Sphere args={[12, 48, 48]} position={[0, 0, -2]}>
        <meshPhysicalMaterial
          color={config.colors.secondary}
          transparent
          opacity={0.05}
          roughness={0.98}
          metalness={0.02}
        />
      </Sphere>
    </group>
  );
}

// 格子背景组件 - 优化版
function SpiralGridBackground({ config }: { config: SpiralEmotionConfig }) {
  return (
    <group>
      {/* 底部格子 */}
      <Grid
        args={[25, 25]}
        cellSize={1}
        cellThickness={0.06}
        cellColor={config.colors.secondary}
        sectionSize={5}
        sectionThickness={0.12}
        sectionColor={config.colors.primary}
        fadeDistance={18}
        fadeStrength={1}
        position={[0, 0, -2.5]}
        rotation={[0, 0, 0]}
        infiniteGrid
      />

      {/* 背面格子 */}
      <Grid
        args={[18, 18]}
        cellSize={1}
        cellThickness={0.04}
        cellColor={config.colors.secondary}
        sectionSize={5}
        sectionThickness={0.1}
        sectionColor={config.colors.primary}
        fadeDistance={15}
        fadeStrength={1.2}
        position={[0, 0, -4]}
        rotation={[0, 0, 0]}
      />

      {/* 侧面的格子 */}
      <Grid
        args={[18, 12]}
        cellSize={1}
        cellThickness={0.03}
        cellColor={config.colors.glow}
        sectionSize={5}
        sectionThickness={0.06}
        sectionColor={config.colors.secondary}
        fadeDistance={12}
        fadeStrength={1.5}
        position={[0, -10, -2]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

// 完整螺旋情绪场景 - 优化版
export function SpiralEmotionScene({ config }: { config: SpiralEmotionConfig }) {
  return (
    <>
      {/* 格子背景 */}
      <SpiralGridBackground config={config} />

      {/* 氛围云雾 */}
      <FogCloud intensity={config.intensity} config={config} />

      {/* 主螺旋可视化 */}
      <SpiralVisualization config={config} />

      {/* 优化的照明系统 */}
      <ambientLight intensity={0.4} />
      <pointLight
        position={[10, 10, 5]}
        intensity={0.5}
        color={config.colors.glow}
        distance={20}
        decay={2}
      />
      <pointLight
        position={[-10, -10, -5]}
        intensity={0.3}
        color={config.colors.secondary}
        distance={18}
        decay={2}
      />
      <pointLight
        position={[0, 5, 8]}
        intensity={0.25}
        color={config.colors.primary}
        distance={15}
        decay={2}
      />

      {/* Bloom后处理效果 */}
      <EffectComposer>
        <Bloom
          intensity={1.3}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.9}
          radius={0.75}
        />
      </EffectComposer>
    </>
  );
}