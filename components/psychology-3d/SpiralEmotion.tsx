'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
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
  // 可选：由分析结果动态生成的配色，传入后覆盖按强度预设的配色
  palette?: {
    tread: string;
    deep: string;
    rail: string;
    shaft: string;
    core: string;
    accent: string;
  };
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

// 每种强度对应的"深度"——越严重，螺旋井越深
const DEPTH_SCALE: Record<SpiralIntensity, number> = {
  mild: 9,
  moderate: 12,
  severe: 15,
};

// 每层台阶数量（越多越密、越深的螺旋楼梯感）
const STEPS_PER_LAYER: Record<SpiralIntensity, number> = {
  mild: 18,
  moderate: 26,
  severe: 34,
};

// 井口最大半径（螺旋外侧半径，越小越像紧凑的旋转楼梯）
const MAX_RADIUS = 1.8;

// 中央空心半径：楼梯环绕其间，可一眼望到底部
const INNER_RADIUS = 0.7;

// 栏杆高度（踏面到扶手）
const RAIL_HEIGHT = 0.95;

// 生成向下盘旋的楼梯台阶：每级为一片环形扇区踏面，
// 内圈固定留空形成井道，沿螺旋向下、向内收束，可一眼望到底。
function generateSpiralStairs(config: SpiralEmotionConfig) {
  const { cycleCount, tightness, intensity, direction } = config;
  const depthScale = DEPTH_SCALE[intensity];
  const stepsPerLayer = STEPS_PER_LAYER[intensity];
  const totalSteps = Math.max(8, Math.floor(cycleCount * stepsPerLayer));

  const steps = [];

  for (let i = 0; i < totalSteps; i++) {
    const progress = i / totalSteps;
    const angle = progress * Math.PI * 2 * cycleCount;

    // 向下深入：越往下（progress 越大）越深
    const wobble = Math.sin(angle * 3) * 0.12 * (intensity === 'severe' ? 1.5 : 1);
    const y = -progress * depthScale - wobble;

    // 半径收束：向内螺旋，但始终保持中央空洞
    const radiusFactor = direction === 'outward' ? progress : 1 - progress * tightness;
    const outerR = Math.max(INNER_RADIUS + 0.6, MAX_RADIUS * radiusFactor);
    const innerR = INNER_RADIUS;

    // 踏面弧长（留出微小间隙，避免完全咬合的僵硬感）
    const arc = (Math.PI * 2 * outerR) / stepsPerLayer * 0.9;

    steps.push({
      y,
      angle,
      arc,
      innerR,
      outerR,
      radius: outerR,        // 供扶手/栏杆柱使用
      depthT: progress,      // 0=井口, 1=井底深处
      thick: 0.22
    });
  }

  return steps;
}

// 细采样生成平滑的扶手螺旋线（比台阶更密，保证圆润连续）
function generateRailPoints(config: SpiralEmotionConfig, samplesPerStep = 6) {
  const { cycleCount, tightness, intensity, direction } = config;
  const depthScale = DEPTH_SCALE[intensity];
  const stepsPerLayer = STEPS_PER_LAYER[intensity];
  const totalSteps = Math.max(8, Math.floor(cycleCount * stepsPerLayer));
  const totalSamples = totalSteps * samplesPerStep;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= totalSamples; i++) {
    const progress = i / totalSamples;
    const angle = progress * Math.PI * 2 * cycleCount;
    const y = -progress * depthScale;
    const radiusFactor = direction === 'outward' ? progress : 1 - progress * tightness;
    const outerR = Math.max(INNER_RADIUS + 0.6, MAX_RADIUS * radiusFactor);
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * outerR,
        y + RAIL_HEIGHT,
        Math.sin(angle) * outerR
      )
    );
  }

  return points;
}

// 环形扇区踏面几何：内圈空心，形成可透视的螺旋井
function makeStepGeometry(innerR: number, outerR: number, arc: number, angle: number, thick: number) {
  const a1 = angle - arc / 2;
  const a2 = angle + arc / 2;
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
  shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
  shape.absarc(0, 0, outerR, a1, a2, false);
  shape.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
  shape.absarc(0, 0, innerR, a2, a1, true);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: false,
    curveSegments: 20
  });
  geo.rotateX(Math.PI / 2);     // 平铺到 XZ 平面，且角度不镜像，保证与扶手/栏杆同向
  geo.translate(0, thick / 2, 0); // 将厚度沿 Y 居中
  geo.computeVertexNormals();
  return geo;
}

// 中央：极细发光中轴 + 井底发光核心（中间保持空心，可望到底）
function CenterCore({ config }: { config: SpiralEmotionConfig }) {
  const profile = getProfile(config);
  const depthScale = DEPTH_SCALE[config.intensity];

  return (
    <group>
      {/* 极细发光中轴：纤细不遮挡视线，保留望向深处的螺旋感 */}
      <mesh position={[0, -depthScale / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, depthScale + 0.6, 12]} />
        <meshStandardMaterial
          color={profile.shaft}
          emissive={profile.shaft}
          emissiveIntensity={1.2}
          transparent
          opacity={0.5}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* 井底发光核心：吸引视线望向深处 */}
      <mesh position={[0, -depthScale - 0.6, 0]}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial
          color={profile.core}
          emissive={profile.core}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* 井底点光，把深处照亮 */}
      <pointLight
        position={[0, -depthScale, 0]}
        intensity={2.2}
        color={profile.core}
        distance={depthScale * 1.6}
        decay={1.5}
      />
    </group>
  );
}

// 单个台阶：环形扇区踏面（中间空心）+ 外缘栏杆柱
function SpiralStair({ step, config }: { step: any; config: SpiralEmotionConfig }) {
  const stepRef = useRef<THREE.Group>(null);
  const profile = getProfile(config);

  const geometry = useMemo(
    () => makeStepGeometry(step.innerR, step.outerR, step.arc, step.angle, step.thick),
    [step.innerR, step.outerR, step.arc, step.angle, step.thick]
  );

  const topColor = useMemo(() => new THREE.Color(profile.tread), [profile]);
  const deepColor = useMemo(() => new THREE.Color(profile.deep), [profile]);
  // 越深越暗，强化"望向深处"的纵深感
  const color = useMemo(
    () => topColor.clone().lerp(deepColor, step.depthT),
    [topColor, deepColor, step.depthT]
  );
  const opacity = 1 - step.depthT * 0.7;
  const emissiveIntensity = 0.55 * (1 - step.depthT) + 0.08;

  useFrame((state) => {
    if (stepRef.current) {
      const floatOffset = Math.sin(state.clock.elapsedTime * 0.8 + step.angle) * 0.03;
      stepRef.current.position.y = step.y + floatOffset;
    }
  });

  // 外缘位置（用于栏杆柱）
  const railX = Math.cos(step.angle) * step.radius;
  const railZ = Math.sin(step.angle) * step.radius;

  return (
    <group ref={stepRef} position={[0, step.y, 0]}>
      {/* 环形扇区踏面：中间空心，可透视井底 */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.45}
          metalness={0.3}
        />
      </mesh>

      {/* 外缘栏杆柱（竖向细柱，连接踏面与扶手） */}
      <mesh position={[railX, RAIL_HEIGHT / 2, railZ]}>
        <cylinderGeometry args={[0.05, 0.05, RAIL_HEIGHT, 8]} />
        <meshStandardMaterial
          color={profile.rail}
          emissive={profile.rail}
          emissiveIntensity={0.6 * (1 - step.depthT) + 0.1}
          transparent
          opacity={opacity}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

// 连续螺旋扶手：沿细采样螺旋线生成一条圆润平滑的扶手管，
// 这是真实旋转楼梯最重要的视觉特征，消除"散落台阶"的僵硬感。
function SpiralHandrail({ config }: { config: SpiralEmotionConfig }) {
  const profile = getProfile(config);

  const { geometry, start, end } = useMemo(() => {
    const points = generateRailPoints(config, 6);
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    const geo = new THREE.TubeGeometry(curve, points.length * 2, 0.1, 16, false);
    return { geometry: geo, start: points[0], end: points[points.length - 1] };
  }, [config]);

  return (
    <group>
      {/* 圆润平滑的连续扶手管 */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={profile.rail}
          emissive={profile.rail}
          emissiveIntensity={0.7}
          metalness={0.7}
          roughness={0.22}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* 两端圆润收口 */}
      <mesh position={start}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={profile.rail} emissive={profile.rail} emissiveIntensity={0.7} metalness={0.7} roughness={0.22} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={profile.rail} emissive={profile.rail} emissiveIntensity={0.7} metalness={0.7} roughness={0.22} />
      </mesh>
    </group>
  );
}

// 螺旋粒子系统：沿楼梯井向下飘旋，填充纵深空隙
function SpiralParticles({ config }: { config: SpiralEmotionConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const profile = getProfile(config);
  const depthScale = DEPTH_SCALE[config.intensity];

  const particles = useMemo(() => {
    const count = 55;
    return Array.from({ length: count }, () => {
      const radius = INNER_RADIUS + 0.3 + Math.random() * (MAX_RADIUS - INNER_RADIUS);
      const y = -Math.random() * depthScale;
      const angle = Math.random() * Math.PI * 2;
      return {
        baseRadius: radius,
        y,
        angle,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        size: 0.05 + Math.random() * 0.1,
        color: [profile.tread, profile.rail, profile.accent, '#FFE9A8', '#FFFFFF'][
          Math.floor(Math.random() * 5)
        ]
      };
    });
  }, [config, profile, depthScale]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      groupRef.current.rotation.y += 0.0015;

      groupRef.current.children.forEach((child: any, i: number) => {
        if (child.type === 'Mesh' && particles[i]) {
          const p = particles[i];
          const spiral = time * p.speed + p.phase;
          child.position.x = Math.cos(spiral + p.angle) * p.baseRadius;
          child.position.z = Math.sin(spiral + p.angle) * p.baseRadius;
          child.position.y = p.y + Math.sin(time + p.phase) * 0.4;
          const scale = 1 + Math.sin(time * 2 + p.phase) * 0.3;
          child.scale.setScalar(scale * (p.size / 0.08));
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <Sphere key={i} args={[p.size, 12, 12]}>
          <meshStandardMaterial
            color={p.color}
            roughness={0.5}
            metalness={0.3}
            transparent
            opacity={0.6}
            emissive={p.color}
            emissiveIntensity={0.5}
          />
        </Sphere>
      ))}
    </group>
  );
}

// 分层色彩配置
const emotionColorProfiles: Record<SpiralIntensity, any> = {
  mild: {
    tread: '#C9B8EC',   // 井口台阶：浅薰衣草（明亮）
    deep: '#2A2440',    // 井底深处：暗紫黑
    rail: '#E0D2FF',    // 栏杆：淡紫
    shaft: '#A6B0D8',   // 竖井：银蓝
    core: '#B8A8FF',    // 井底核心：柔光紫
    accent: '#DDA0DD'
  },
  moderate: {
    tread: '#B392DD',
    deep: '#1C1833',
    rail: '#C4B0F0',
    shaft: '#8A90BC',
    core: '#A78BFA',
    accent: '#BA55D3'
  },
  severe: {
    tread: '#9A6FB0',
    deep: '#100C20',
    rail: '#C97BA0',
    shaft: '#6A6A92',
    core: '#FF6B6B',    // 井底核心：警示红光，望向危险深处
    accent: '#8B2A4A'
  }
};

// 配色解析：优先使用分析结果动态生成的 palette，否则回退到按强度预设
function getProfile(config: SpiralEmotionConfig) {
  return config.palette ?? emotionColorProfiles[config.intensity];
}

// 完整旋转楼梯井场景
export function SpiralEmotionScene({ config }: { config: SpiralEmotionConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const profile = getProfile(config);

  // 生成向下盘旋的楼梯台阶
  const steps = useMemo(() => generateSpiralStairs(config), [config]);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      // 缓慢的螺旋转动 + 轻微来回摆动，避免匀速旋转的僵硬感
      groupRef.current.rotation.y = t * 0.04 + Math.sin(t * 0.25) * 0.18;
      // 整体轻微上下浮动（呼吸感）
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.25;
    }
  });

  return (
    <>
      {/* 深度雾：远处/深处台阶逐渐隐入黑暗，强化纵深 */}
      <fog attach="fog" args={['#140e28', 8, 28 + DEPTH_SCALE[config.intensity]]} />

      {/* 漂浮彩色粒子 */}
      <SpiralParticles config={config} />

      {/* 中央极细中轴 + 井底发光核心 */}
      <CenterCore config={config} />

      {/* 旋转楼梯（台阶 + 扶手随整体一同旋转） */}
      <group ref={groupRef}>
        {steps.map((step, i) => (
          <SpiralStair key={i} step={step} config={config} />
        ))}
        <SpiralHandrail config={config} />
      </group>

      {/* 环境光 - 斜向打光增强立体感 */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={0.6}
        color={profile.tread}
        castShadow
      />
      <pointLight
        position={[-8, 10, -5]}
        intensity={0.4}
        color={profile.rail}
      />
      <pointLight
        position={[0, 8, 0]}
        intensity={0.3}
        color={profile.core}
      />

      {/* Bloom辉光特效，让井底核心更醒目 */}
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
