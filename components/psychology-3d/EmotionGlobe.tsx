'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

// 情绪颜色映射
const emotionColors = {
  happy: '#FFD93D', // 快乐 - 暖黄
  calm: '#6BCB77', // 平静 - 绿
  sad: '#4D96FF', // 悲伤 - 蓝
  excited: '#FF6B6B', // 兴奋 - 红
  peaceful: '#A78BFA', // 宁静 - 紫
  energetic: '#F97316', // 活力 - 橙
};

type PlanetStyle = 'bands' | 'spots' | 'swirl';

// 用 canvas 程序化生成行星表面纹理（避免依赖外部贴图）
function makePlanetTexture(base: string, style: PlanetStyle, seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const baseCol = new THREE.Color(base);

  ctx.fillStyle = `#${baseCol.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  let s = seed * 1000 + 7;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  if (style === 'bands') {
    // 气态行星：横向条带 + 一处大红斑风暴
    for (let i = 0; i < 26; i++) {
      const y = rnd() * size;
      const h = 4 + rnd() * 20;
      const light = (rnd() - 0.5) * 0.45;
      const c = baseCol.clone().offsetHSL(0, 0, light);
      ctx.fillStyle = `#${c.getHexString()}`;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(0, y, size, h);
    }
    const sx = rnd() * size;
    const sy = size * (0.4 + rnd() * 0.2);
    const sr = 14 + rnd() * 14;
    const sc = baseCol.clone().offsetHSL(0, 0.05, -0.22);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = `#${sc.getHexString()}`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr, sr * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'spots') {
    // 岩石/海洋行星：零散的亮暗斑（风暴、陆地、海面反光）
    for (let i = 0; i < 46; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 3 + rnd() * 16;
      const light = (rnd() - 0.5) * 0.5;
      const c = baseCol.clone().offsetHSL(0, 0.08 * (rnd() - 0.5), light);
      ctx.fillStyle = `#${c.getHexString()}`;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 多云行星：柔和的云絮层
    for (let i = 0; i < 34; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 8 + rnd() * 30;
      const c = baseCol.clone().offsetHSL(0, 0, 0.22);
      ctx.fillStyle = `#${c.getHexString()}`;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 单颗行星：自转 + 大气辉光（背面加色形成边缘光） + 可选光环
function Planet({
  emotion,
  colorOverride,
  radius,
  ring,
  style,
  seed,
  spin,
  intensity = 0.5,
}: {
  emotion: keyof typeof emotionColors;
  colorOverride?: string;
  radius: number;
  ring?: boolean;
  style: PlanetStyle;
  seed: number;
  spin: number;
  intensity?: number;
}) {
  const spinRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const baseColor = colorOverride ?? emotionColors[emotion];
  const tex = useMemo(
    () => makePlanetTexture(baseColor, style, seed),
    [baseColor, style, seed]
  );
  const color = baseColor;

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * spin;
    if (groupRef.current) {
      const target = hovered ? 1.18 : 1;
      const cur = groupRef.current.scale.x;
      const next = cur + (target - cur) * Math.min(1, delta * 8);
      groupRef.current.scale.setScalar(next);
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere
        ref={spinRef}
        args={[radius, 64, 64]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          map={tex}
          roughness={0.9}
          metalness={0.05}
          emissive={color}
          emissiveIntensity={intensity * 0.45}
        />
      </Sphere>

      {/* 大气辉光 */}
      <mesh>
        <sphereGeometry args={[radius * 1.13, 48, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.3 : 0.1 + intensity * 0.22}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 光环 */}
      {ring && (
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <ringGeometry args={[radius * 1.15, radius * 1.4, 80]} />
          <meshBasicMaterial color={color} transparent opacity={0.18 + intensity * 0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// 点击情绪卡片：展示该情绪的「多颗星球」，不同色调、散布于球面（不排成一行）
function EmotionConstellation({ emotion, intensity }: { emotion: keyof typeof emotionColors; intensity: number }) {
  const styleMap: Record<keyof typeof emotionColors, PlanetStyle> = {
    happy: 'swirl',
    calm: 'swirl',
    sad: 'spots',
    excited: 'bands',
    peaceful: 'bands',
    energetic: 'bands',
  };
  const seedMap: Record<keyof typeof emotionColors, number> = {
    happy: 22,
    calm: 44,
    sad: 11,
    excited: 33,
    peaceful: 55,
    energetic: 66,
  };
  // 程度滑块缩放整组大小
  const scale = 0.85 + intensity * 0.4;

  const planets = useMemo(() => {
    const base = new THREE.Color(emotionColors[emotion]);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    const N = 6;
    return Array.from({ length: N }, (_, i) => {
      // 不同色调：在基础色相两侧展开，并拉开明度，确保彼此明显不同
      const hue = (hsl.h + (i - (N - 1) / 2) * 0.11 + 1) % 1;
      const light = 0.42 + (i % 3) * 0.16;
      const c = new THREE.Color().setHSL(hue, Math.min(1, hsl.s * 1.1), light);
      // 散布在球面（黄金角），避免连成一行
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * 2.39996;
      const dist = 3.4 * scale;
      const pos: [number, number, number] = [
        Math.cos(theta) * rad * dist,
        y * dist * 0.75,
        Math.sin(theta) * rad * dist,
      ];
      const radius = (0.7 + (i % 3) * 0.45) * scale;
      return {
        color: '#' + c.getHexString(),
        pos,
        radius,
        seed: seedMap[emotion] + i * 13,
        spin: 0.3 + (i % 4) * 0.22,
      };
    });
  }, [emotion, scale]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef}>
      {planets.map((p, i) => (
        <group key={i} position={p.pos}>
          <Planet
            emotion={emotion}
            colorOverride={p.color}
            radius={p.radius}
            ring={emotion === 'peaceful' || emotion === 'energetic'}
            style={styleMap[emotion]}
            seed={p.seed}
            spin={p.spin}
            intensity={0.5 + (i % 3) * 0.18}
          />
        </group>
      ))}
    </group>
  );
}

// 中心恒星：自发光球 + 日冕，照亮整个星系
function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshBasicMaterial color="#FFE7A0" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color="#FFB347"
          transparent
          opacity={0.14}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// 公转轨道：绕中心恒星旋转，并附带一圈淡淡的轨道导引线。
// inclination / node 让每条轨道拥有各自倾斜的平面 → 轨迹在 3D 中各异。
// 关键：每条轨道半径各不相同（=不同同心球面），轨道之间永不相交；同一条轨道上的
// 多颗行星以固定 120° 等距、同速公转，因此始终保持间距、永不碰撞。
function Orbit({
  radius,
  speed,
  startAngle = 0,
  inclination = 0,
  node = 0,
  children,
}: {
  radius: number;
  speed: number;
  startAngle?: number;
  inclination?: number;
  node?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });
  return (
    <group rotation={[inclination, node, 0]}>
      <group ref={ref} rotation={[0, startAngle, 0]}>
        {children}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.015, radius + 0.015, 128]} />
          <meshBasicMaterial color="#33406b" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// 把某颗行星放到轨道上指定角度处（绕中心恒星公转）
function OrbitSlot({ radius, angle, children }: { radius: number; angle: number; children: ReactNode }) {
  return (
    <group rotation={[0, angle, 0]}>
      <group position={[radius, 0, 0]}>{children}</group>
    </group>
  );
}

// 星系布局：5 条不同半径（=不同同心球面，互不相交）的轨道，每条轨道有各自明显不同的
// 倾角/升交点，行星数量与起始角也各不相同（3/4/3/3/2，按各自半径做均匀角分布）→
// 整体呈立体的“星系”而非扁平表盘，共 15 颗大星球，永不重叠。
const galaxyOrbits = [
  { radius: 4.6, speed: 0.20, startAngle: 0.3, inclination: 0.35, node: 0.0, count: 3, start: 0 },
  { radius: 7.6, speed: 0.16, startAngle: 1.0, inclination: -0.50, node: 1.2, count: 4, start: 3 },
  { radius: 10.6, speed: 0.13, startAngle: 2.2, inclination: 0.60, node: 2.4, count: 3, start: 7 },
  { radius: 13.6, speed: 0.11, startAngle: 0.7, inclination: -0.30, node: 3.6, count: 3, start: 10 },
  { radius: 16.6, speed: 0.095, startAngle: 3.1, inclination: 0.45, node: 4.8, count: 2, start: 13 },
];

// 15 颗星球：保留原有大尺寸（半径 0.85~1.15），颜色取情绪色与补充色板。
type GalaxyPlanet = {
  emotion: keyof typeof emotionColors;
  color: string;
  radius: number;
  style: PlanetStyle;
  seed: number;
  ring: boolean;
  spin: number;
};

const galaxyPlanets: GalaxyPlanet[] = [
  { emotion: 'sad', color: emotionColors.sad, radius: 1.0, style: 'spots', seed: 11, ring: false, spin: 0.5 },
  { emotion: 'calm', color: '#e0c3fc', radius: 0.95, style: 'swirl', seed: 71, ring: false, spin: 0.6 },
  { emotion: 'calm', color: '#a0e7e5', radius: 1.05, style: 'bands', seed: 72, ring: true, spin: 0.45 },
  { emotion: 'happy', color: emotionColors.happy, radius: 0.95, style: 'swirl', seed: 22, ring: false, spin: 0.6 },
  { emotion: 'calm', color: '#fbc687', radius: 1.0, style: 'spots', seed: 73, ring: false, spin: 0.5 },
  { emotion: 'calm', color: '#ffaaa5', radius: 1.05, style: 'bands', seed: 74, ring: true, spin: 0.45 },
  { emotion: 'excited', color: emotionColors.excited, radius: 1.15, style: 'bands', seed: 33, ring: false, spin: 0.45 },
  { emotion: 'calm', color: '#b5ead7', radius: 0.95, style: 'swirl', seed: 75, ring: false, spin: 0.55 },
  { emotion: 'calm', color: '#c7ceea', radius: 1.0, style: 'spots', seed: 76, ring: false, spin: 0.5 },
  { emotion: 'calm', color: emotionColors.calm, radius: 0.85, style: 'swirl', seed: 44, ring: false, spin: 0.7 },
  { emotion: 'calm', color: '#ffd1dc', radius: 1.0, style: 'bands', seed: 77, ring: true, spin: 0.5 },
  { emotion: 'calm', color: '#caffbf', radius: 0.95, style: 'spots', seed: 78, ring: false, spin: 0.55 },
  { emotion: 'peaceful', color: emotionColors.peaceful, radius: 1.0, style: 'bands', seed: 55, ring: true, spin: 0.4 },
  { emotion: 'energetic', color: emotionColors.energetic, radius: 0.9, style: 'bands', seed: 66, ring: true, spin: 0.55 },
  { emotion: 'calm', color: '#a3c4f3', radius: 1.05, style: 'swirl', seed: 79, ring: false, spin: 0.5 },
];

// 主场景：未选中情绪时显示完整星系；选中后聚焦该情绪的单颗行星
export function PsychologyScene({
  selectedEmotion = null,
  intensity = 0.5,
}: {
  selectedEmotion?: keyof typeof emotionColors | null;
  intensity?: number;
}) {
  return (
    <Canvas
      camera={{ position: [0, 8, 24], fov: 50 }}
      style={{ background: 'linear-gradient(to bottom, #05060f, #0b1026)' }}
    >
      <ambientLight intensity={0.3} />
      <Stars radius={80} depth={60} count={1200} factor={4} saturation={0} fade speed={0.6} />

      {selectedEmotion ? (
        <>
          {/* 偏置光源，让聚焦行星呈现昼夜分界 */}
          <pointLight position={[6, 5, 4]} intensity={2.4} decay={0} color="#fff4d6" />
          <EmotionConstellation emotion={selectedEmotion} intensity={intensity} />
        </>
      ) : (
        <>
          {/* 中心恒星点光（decay=0 让远近行星受光均匀） */}
          <pointLight position={[0, 0, 0]} intensity={2.4} decay={0} color="#fff4d6" />
          <pointLight position={[10, 12, 8]} intensity={0.4} color="#9bb8ff" />

          <Sun />

          {/* 15 颗大星球：5 条倾斜轨道，每条行星数/起始角不同（3/4/3/3/2，均匀角分布），
              不同半径=不同球面，永不重叠 */}
          {galaxyOrbits.map((oc) => (
            <Orbit key={oc.start} radius={oc.radius} speed={oc.speed} startAngle={oc.startAngle} inclination={oc.inclination} node={oc.node}>
              {galaxyPlanets.slice(oc.start, oc.start + oc.count).map((p, k) => (
                <OrbitSlot key={k} radius={oc.radius} angle={(k * 2 * Math.PI) / oc.count}>
                  <Planet
                    emotion={p.emotion}
                    colorOverride={p.color}
                    radius={p.radius}
                    style={p.style}
                    seed={p.seed}
                    spin={p.spin}
                    ring={p.ring}
                  />
                </OrbitSlot>
              ))}
            </Orbit>
          ))}
        </>
      )}

      <OrbitControls
        enableZoom
        enablePan
        enableRotate
        zoomSpeed={0.6}
        panSpeed={0.5}
        rotateSpeed={0.4}
        minDistance={8}
        maxDistance={80}
      />
    </Canvas>
  );
}

// 情绪可视化卡片（供页面底部面板使用）
export function EmotionCard({ emotion, label }: { emotion: keyof typeof emotionColors; label: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="p-4 rounded-xl bg-white dark:bg-gray-800 border-2 transition-all cursor-pointer"
      style={{
        borderColor: emotionColors[emotion],
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="w-12 h-12 rounded-full mx-auto mb-2"
        style={{ backgroundColor: emotionColors[emotion] }}
      />
      <p className="text-center text-sm font-medium text-gray-900 dark:text-white">{label}</p>
    </div>
  );
}
