'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GeoData, pushGrid, pushGeometry, finalize, mulberry32 } from './geometryUtils';

/**
 * 快乐梦境场景 —— 漫天樱花 🌸 与玫瑰 🌹，飘落的花瓣与闪烁光尘。
 *
 * 两种花各自只有一份共享几何体（构建时把花瓣/花心/花茎/叶片合并，
 * 颜色写进顶点色），所以每朵花只占一次 draw call。
 */

interface HappyDreamSceneProps {
  config?: {
    elementCount?: number;
    blossomCount?: number;
    roseCount?: number;
    colorSaturation?: number;
    brightness?: number;
    movementSpeed?: number;
    sparkleIntensity?: number;
  };
}

/* ------------------------------------------------------------------ *
 * 🌸 樱花：5 枚带凹口的卷曲花瓣 + 花心
 * ------------------------------------------------------------------ */

const BLOSSOM_PETAL_BASE = new THREE.Color('#ff9ec7');
const BLOSSOM_PETAL_TIP = new THREE.Color('#ffe3f1');
const BLOSSOM_CENTER = new THREE.Color('#ffcf5c');

const blossomGeometry = (() => {
  const data: GeoData = { positions: [], colors: [], indices: [] };
  const petals = 5;
  const L = 0.58;      // 花瓣长度
  const W = 0.30;      // 花瓣最宽处的半宽
  const tilt = 0.45;   // 花瓣上翘角度
  const curl = 0.24;   // 花瓣卷曲

  for (let p = 0; p < petals; p++) {
    const phi = (p / petals) * Math.PI * 2;

    pushGrid(
      data,
      (t, u) => {
        const safeT = Math.min(Math.max(t, 0.001), 0.999);
        const hw = W * Math.pow(Math.sin(Math.PI * safeT), 0.62) * (1 - 0.22 * t);
        const absU = Math.abs(u);

        // 局部：x 横向，y 沿花瓣长度，z 卷曲
        const lx = u * hw;
        // 尖端凹口（樱花的标志性缺口）
        const ly = L * t - 0.17 * Math.pow(t, 3) * (1 - absU);
        const lz = curl * t * t * (1 - absU * 0.45);

        // 绕 X 轴上翘
        const y1 = ly * Math.cos(tilt) - lz * Math.sin(tilt);
        const z1 = ly * Math.sin(tilt) + lz * Math.cos(tilt);
        // 绕 Y 轴转到花瓣方位
        const x2 = lx * Math.cos(phi) + z1 * Math.sin(phi);
        const z2 = -lx * Math.sin(phi) + z1 * Math.cos(phi);

        return [x2, y1, z2];
      },
      10,
      6,
      (t, u) =>
        BLOSSOM_PETAL_BASE.clone().lerp(
          BLOSSOM_PETAL_TIP,
          Math.max(0, Math.min(1, 0.2 + t * 0.65 - Math.abs(u) * 0.2))
        )
    );
  }

  // 花心
  pushGeometry(
    data,
    new THREE.SphereGeometry(0.075, 12, 8),
    new THREE.Matrix4().makeTranslation(0, 0.02, 0),
    BLOSSOM_CENTER
  );

  return finalize(data);
})();

/* ------------------------------------------------------------------ *
 * 🌹 玫瑰：多层螺旋排列的弧面花瓣 + 花茎 + 叶片
 * ------------------------------------------------------------------ */

const ROSE_CORE = new THREE.Color('#a10f36');
const ROSE_EDGE = new THREE.Color('#ff7a9c');
const ROSE_STEM = new THREE.Color('#3f7a34');
const ROSE_LEAF = new THREE.Color('#5aa84a');

const roseGeometry = (() => {
  const data: GeoData = { positions: [], colors: [], indices: [] };

  // 由内到外：花瓣逐渐变大、变矮、向外张开
  const layers = [
    { count: 3, r: 0.17, h: 0.32, open: 0.05 },
    { count: 4, r: 0.25, h: 0.27, open: 0.24 },
    { count: 5, r: 0.34, h: 0.22, open: 0.48 },
    { count: 6, r: 0.43, h: 0.17, open: 0.76 }
  ];

  let petalIndex = 0;
  layers.forEach((layer, li) => {
    for (let p = 0; p < layer.count; p++) {
      // 黄金角螺旋排列，形成玫瑰的层层包裹感
      const phiCenter = petalIndex * 2.39996 + li * 0.45;
      petalIndex++;

      pushGrid(
        data,
        (t, u) => {
          const halfAngle = 1.25 - 0.55 * t;
          const phi = phiCenter + u * halfAngle;

          let r = layer.r * (0.25 + 1.05 * t);
          let y = layer.h * (t - 0.5 * t * t);
          // 外层花瓣向外张开并下翻
          r += layer.open * t * t * 0.24;
          y -= layer.open * t * t * 0.30;

          return [Math.cos(phi) * r, y, Math.sin(phi) * r];
        },
        9,
        7,
        (t) =>
          ROSE_CORE.clone().lerp(
            ROSE_EDGE,
            Math.max(0, Math.min(1, 0.1 + t * 0.9 - li * 0.07))
          )
      );
    }
  });

  // 花茎
  pushGeometry(
    data,
    new THREE.CylinderGeometry(0.032, 0.048, 1.0, 8),
    new THREE.Matrix4().makeTranslation(0, -0.55, 0),
    ROSE_STEM
  );

  // 两片叶子
  const leaf = new THREE.SphereGeometry(1, 8, 6);
  [0.35, 2.4].forEach((angle, i) => {
    const m = new THREE.Matrix4()
      .makeRotationY(angle)
      .multiply(new THREE.Matrix4().makeTranslation(0, -0.62 - i * 0.24, 0.52))
      .multiply(new THREE.Matrix4().makeRotationX(0.25))
      .multiply(new THREE.Matrix4().makeScale(0.3, 0.075, 0.6));
    pushGeometry(data, leaf, m, ROSE_LEAF);
  });

  return finalize(data);
})();

/* ------------------------------------------------------------------ *
 * ✨ 原本的“快乐元素”几何体：球 / 八面体 / 方块 / 圆环 / 十二面体 / 圆柱
 * ------------------------------------------------------------------ */

type ShapeKind = 0 | 1 | 2 | 3 | 4 | 5;

interface ShapeItem {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation: [number, number, number];
  rotationSpeed: [number, number, number];
  floatAmp: number;
  floatOffset: number;
  sparklePhase: number;
  color: THREE.Color;
  emissive: THREE.Color;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

function createShape(kind: ShapeKind, rnd: () => number): THREE.BufferGeometry {
  switch (kind) {
    case 0:
      return new THREE.SphereGeometry(0.3 + rnd() * 0.5, 32, 32);
    case 1:
      return new THREE.OctahedronGeometry(0.3 + rnd() * 0.4, 2);
    case 2:
      return new THREE.BoxGeometry(
        0.4 + rnd() * 0.4,
        0.4 + rnd() * 0.4,
        0.4 + rnd() * 0.4,
        2, 2, 2
      );
    case 3:
      return new THREE.TorusGeometry(0.3 + rnd() * 0.3, 0.1 + rnd() * 0.1, 20, 40);
    case 4:
      return new THREE.DodecahedronGeometry(0.3 + rnd() * 0.4, 1);
    case 5:
    default:
      return new THREE.CylinderGeometry(
        0.2 + rnd() * 0.2,
        0.2 + rnd() * 0.2,
        0.6 + rnd() * 0.4,
        24
      );
  }
}

/* ------------------------------------------------------------------ *
 * 🌸 飘落的花瓣（合并几何体 + 顶点着色器，单次 draw call）
 * ------------------------------------------------------------------ */

const PETAL_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uTop;
  uniform float uBottom;

  attribute vec3 aOffset;
  attribute float aPhase;
  attribute float aSpeed;

  varying float vAlpha;
  varying float vShade;

  void main() {
    float t = fract(uTime * aSpeed + aPhase);

    // 自身旋转
    vec3 local = position;
    float a = uTime * aSpeed * 6.0 + aPhase * 6.283;
    float ca = cos(a), sa = sin(a);
    local = vec3(local.x * ca - local.z * sa, local.y, local.x * sa + local.z * ca);
    float b = uTime * aSpeed * 4.0 + aPhase * 3.14;
    float cb = cos(b), sb = sin(b);
    local = vec3(local.x, local.y * cb - local.z * sb, local.y * sb + local.z * cb);

    // 自上而下飘落 + 左右打旋
    vec3 p = aOffset;
    p.y = uTop - t * (uTop - uBottom);
    p.x += sin(uTime * 0.6 + aPhase * 6.283) * 1.7;
    p.z += cos(uTime * 0.45 + aPhase * 6.283) * 1.7;

    vAlpha = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.80, 1.0, t));
    vShade = 0.5 + 0.5 * sin(a + aPhase);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p + local, 1.0);
  }
`;

const PETAL_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying float vAlpha;
  varying float vShade;

  void main() {
    vec3 c = mix(uColorA, uColorB, vShade);
    gl_FragColor = vec4(c, vAlpha * 0.85);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createPetalDriftGeometry(count: number, spread: number) {
  const positions: number[] = [];
  const offsets: number[] = [];
  const phases: number[] = [];
  const speeds: number[] = [];
  const indices: number[] = [];

  const rnd = mulberry32(778899);
  const w = 0.075;
  const h = 0.055;

  for (let i = 0; i < count; i++) {
    const base = i * 4;
    // 一片小花瓣：菱形四顶点
    positions.push(0, h, 0);
    positions.push(w, 0, -h * 0.4);
    positions.push(0, -h, 0);
    positions.push(-w, 0, h * 0.4);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);

    const ox = (rnd() - 0.5) * spread;
    const oz = (rnd() - 0.5) * spread;
    for (let k = 0; k < 4; k++) offsets.push(ox, 0, oz);
    const phase = rnd();
    const speed = 0.035 + rnd() * 0.05;
    for (let k = 0; k < 4; k++) {
      phases.push(phase);
      speeds.push(speed);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aOffset', new THREE.Float32BufferAttribute(offsets, 3));
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new THREE.Float32BufferAttribute(speeds, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

/* ------------------------------------------------------------------ *
 * 闪烁光尘
 * ------------------------------------------------------------------ */

let sparkleTexture: THREE.Texture | null = null;

function getSparkleTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (sparkleTexture) return sparkleTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  sparkleTexture = new THREE.CanvasTexture(canvas);
  sparkleTexture.needsUpdate = true;
  return sparkleTexture;
}

function createSparkleGeometry(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rnd = mulberry32(1357);
  const warm = new THREE.Color('#ffe9b0');
  const pink = new THREE.Color('#ffc2e2');
  const lilac = new THREE.Color('#d8c4ff');
  const mixed = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = radius * Math.pow(rnd(), 0.55);
    const theta = rnd() * Math.PI * 2;
    const phi = Math.acos(2 * rnd() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.7 + 2;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    mixed.copy(rnd() < 0.5 ? warm : rnd() < 0.7 ? pink : lilac);
    const b = 0.5 + rnd() * 0.5;
    colors[i * 3] = mixed.r * b;
    colors[i * 3 + 1] = mixed.g * b;
    colors[i * 3 + 2] = mixed.b * b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/* ------------------------------------------------------------------ *
 * 主场景
 * ------------------------------------------------------------------ */

interface FlowerItem {
  type: 'blossom' | 'rose';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  spin: number;
  phase: number;
  floatAmp: number;
  color: THREE.Color;
  emissive: THREE.Color;
}

export default function HappyDreamScene({ config }: HappyDreamSceneProps) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shapeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sparkleRef = useRef<THREE.Points>(null);

  // elementCount 保持原本的含义：几何快乐元素的数量
  const elementCount = config?.elementCount ?? 30;
  const blossomCount = config?.blossomCount ?? 18;
  const roseCount = config?.roseCount ?? 10;
  const saturation = config?.colorSaturation ?? 0.8;
  const brightness = config?.brightness ?? 0.9;
  const movementSpeed = config?.movementSpeed ?? 0.2;
  const sparkleIntensity = config?.sparkleIntensity ?? 0.5;

  // 原本的几何快乐元素（保留原有图案）
  const shapes = useMemo<ShapeItem[]>(() => {
    const rnd = mulberry32(90210);
    return Array.from({ length: elementCount }, () => {
      const kind = Math.floor(rnd() * 6) as ShapeKind;
      const hue = rnd() * 0.3;
      return {
        geometry: createShape(kind, rnd),
        position: [
          (rnd() - 0.5) * 20,
          rnd() * 15,
          (rnd() - 0.5) * 20
        ],
        rotation: [rnd() * Math.PI, rnd() * Math.PI * 2, rnd() * Math.PI],
        rotationSpeed: [
          (rnd() - 0.5) * 0.02,
          (rnd() - 0.5) * 0.02,
          (rnd() - 0.5) * 0.02
        ],
        floatAmp: 0.3 + rnd() * 0.9,
        floatOffset: rnd() * Math.PI * 2,
        sparklePhase: rnd() * Math.PI * 2,
        color: new THREE.Color().setHSL(hue, saturation, brightness),
        emissive: new THREE.Color().setHSL(hue, saturation, brightness * 0.4),
        roughness: 0.2 + rnd() * 0.3,
        metalness: 0.3 + rnd() * 0.4,
        clearcoat: 0.8 + rnd() * 0.2,
        clearcoatRoughness: 0.1 + rnd() * 0.2
      };
    });
  }, [elementCount, saturation, brightness]);

  // 数量变化时释放旧的几何体
  useEffect(() => {
    const list = shapes;
    return () => list.forEach((s) => s.geometry.dispose());
  }, [shapes]);

  const flowers = useMemo<FlowerItem[]>(() => {
    const rnd = mulberry32(24601);
    const list: FlowerItem[] = [];

    for (let i = 0; i < blossomCount; i++) {
      // 樱花偏高，营造“漫天”感
      const hue = 0.88 + rnd() * 0.06;
      list.push({
        type: 'blossom',
        position: [
          (rnd() - 0.5) * 20,
          1.5 + rnd() * 10,
          (rnd() - 0.5) * 20
        ],
        rotation: [rnd() * Math.PI, rnd() * Math.PI * 2, rnd() * Math.PI],
        scale: 0.75 + rnd() * 0.85,
        spin: (rnd() - 0.5) * 0.5,
        phase: rnd() * Math.PI * 2,
        floatAmp: 0.5 + rnd() * 0.7,
        color: new THREE.Color().setHSL(hue, saturation * 0.35, brightness * 0.92),
        emissive: new THREE.Color().setHSL(hue, saturation, 0.55)
      });
    }

    for (let i = 0; i < roseCount; i++) {
      // 玫瑰偏下，像是从下方生长出来
      const hue = (0.96 + rnd() * 0.05) % 1;
      list.push({
        type: 'rose',
        position: [
          (rnd() - 0.5) * 18,
          -1.5 + rnd() * 7,
          (rnd() - 0.5) * 18
        ],
        rotation: [(rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.5],
        scale: 0.9 + rnd() * 1.1,
        spin: (rnd() - 0.5) * 0.35,
        phase: rnd() * Math.PI * 2,
        floatAmp: 0.4 + rnd() * 0.6,
        color: new THREE.Color().setHSL(hue, saturation * 0.4, brightness * 0.9),
        emissive: new THREE.Color().setHSL(hue, saturation, 0.5)
      });
    }

    return list;
  }, [blossomCount, roseCount, saturation, brightness]);

  const petalGeometry = useMemo(() => createPetalDriftGeometry(220, 22), []);
  const petalUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: 15 },
      uBottom: { value: -8 },
      uColorA: { value: new THREE.Color('#ff8fbe') },
      uColorB: { value: new THREE.Color('#ffe0f0') }
    }),
    []
  );

  const sparkleGeometry = useMemo(() => createSparkleGeometry(320, 18), []);
  const sparkleMap = useMemo(() => getSparkleTexture(), []);

  // 梦幻背景光斑
  const bokeh = useMemo(() => {
    const rnd = mulberry32(31415);
    return Array.from({ length: 7 }, () => ({
      position: [
        (rnd() - 0.5) * 24,
        rnd() * 12,
        (rnd() - 0.5) * 24
      ] as [number, number, number],
      radius: 1.2 + rnd() * 1.6,
      color: new THREE.Color().setHSL(0.85 + rnd() * 0.2, 0.6, 0.7),
      opacity: 0.09 + rnd() * 0.09,
      phase: rnd() * Math.PI * 2
    }));
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // 花朵漂浮 / 旋转 / 闪烁
    for (let i = 0; i < flowers.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const f = flowers[i];

      mesh.rotation.y = f.rotation[1] + time * f.spin * movementSpeed;
      mesh.rotation.z = f.rotation[2] + Math.sin(time * 0.7 + f.phase) * 0.12 * movementSpeed;
      mesh.position.y = f.position[1] + Math.sin(time * 0.6 + f.phase) * f.floatAmp * movementSpeed;
      mesh.position.x = f.position[0] + Math.cos(time * 0.4 + f.phase) * f.floatAmp * 0.6 * movementSpeed;

      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = Math.max(
        0.08,
        sparkleIntensity * (0.45 + 0.55 * Math.sin(time * 2 + f.phase))
      );
    }

    // 原有几何元素：旋转 / 上下漂浮 / 闪烁 / clearcoat 呼吸
    for (let i = 0; i < shapes.length; i++) {
      const mesh = shapeRefs.current[i];
      if (!mesh) continue;
      const s = shapes[i];

      mesh.rotation.x = s.rotation[0] + time * s.rotationSpeed[0] * movementSpeed * 60;
      mesh.rotation.y = s.rotation[1] + time * s.rotationSpeed[1] * movementSpeed * 60;
      mesh.rotation.z = s.rotation[2] + time * s.rotationSpeed[2] * movementSpeed * 60;

      mesh.position.y =
        s.position[1] + Math.sin(time + s.floatOffset) * s.floatAmp * movementSpeed;

      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.emissiveIntensity = Math.max(
        0.1,
        sparkleIntensity + Math.sin(time * 3 + s.sparklePhase) * 0.4
      );
      material.clearcoat = s.clearcoat + Math.sin(time * 2 + i) * 0.1;
    }

    // 花瓣雨
    petalUniforms.uTime.value = time;

    // 光尘闪烁 + 缓慢旋转
    if (sparkleRef.current) {
      sparkleRef.current.rotation.y = time * 0.03;
      const material = sparkleRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.35 + Math.sin(time * 1.3) * 0.15 + sparkleIntensity * 0.25;
    }
  });

  return (
    <>
      {/* 梦幻紫粉背景 */}
      <color attach="background" args={['#4a2352']} />

      {/* 背景光斑 */}
      {bokeh.map((orb, i) => (
        <mesh key={`bokeh-${i}`} position={orb.position}>
          <sphereGeometry args={[orb.radius, 16, 16]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={orb.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* 原有的几何快乐元素 */}
      {shapes.map((s, i) => (
        <mesh
          key={`shape-${i}`}
          ref={(el) => {
            shapeRefs.current[i] = el;
          }}
          geometry={s.geometry}
          position={s.position}
          rotation={s.rotation}
        >
          <meshPhysicalMaterial
            color={s.color}
            emissive={s.emissive}
            emissiveIntensity={sparkleIntensity}
            roughness={s.roughness}
            metalness={s.metalness}
            clearcoat={s.clearcoat}
            clearcoatRoughness={s.clearcoatRoughness}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}

      {/* 樱花与玫瑰 */}
      {flowers.map((f, i) => (
        <mesh
          key={`flower-${i}`}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          geometry={f.type === 'rose' ? roseGeometry : blossomGeometry}
          position={f.position}
          rotation={f.rotation}
          scale={f.scale}
        >
          <meshStandardMaterial
            color={f.color}
            emissive={f.emissive}
            emissiveIntensity={sparkleIntensity}
            roughness={0.5}
            metalness={0.05}
            vertexColors
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* 飘落的花瓣 */}
      <mesh geometry={petalGeometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={PETAL_VERTEX}
          fragmentShader={PETAL_FRAGMENT}
          uniforms={petalUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 闪烁光尘 */}
      <points ref={sparkleRef} geometry={sparkleGeometry}>
        <pointsMaterial
          size={0.22}
          map={sparkleMap ?? undefined}
          vertexColors
          transparent
          opacity={0.5}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 梦幻照明 */}
      <ambientLight intensity={0.55} color="#ffd9ec" />
      <hemisphereLight args={['#ffd0e8', '#7a3f8f', 0.5]} />
      <pointLight position={[0, 6, 0]} intensity={1.4} color="#ffe0b0" distance={40} decay={2} />
      <pointLight position={[7, 9, 6]} intensity={0.7} color="#ff9ecb" distance={26} decay={2} />
      <pointLight position={[-7, 5, -6]} intensity={0.55} color="#c8a8ff" distance={28} decay={2} />
      <directionalLight position={[0, 12, 8]} intensity={0.4} color="#fff0f6" />

      <EffectComposer>
        <Bloom
          intensity={1.6}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.9}
          radius={0.85}
        />
      </EffectComposer>
    </>
  );
}
