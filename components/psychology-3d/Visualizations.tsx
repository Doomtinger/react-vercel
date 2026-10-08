'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * 心流状态：Gerstner 波海面 + 随风摆动的浪沫
 * ------------------------------------------------------------------ */

// 海面尺寸刻意收小：同样振幅下浪看起来更大，视野里能放下更多个波峰
const OCEAN_SIZE = 40;
const OCEAN_SEG = 120;

/**
 * Gerstner 波：和普通正弦波不同，它同时在水平方向上位移顶点，
 * 所以浪尖会变尖、浪谷变宽 —— 这才是真实海浪的形状。
 * 平面局部坐标是 XY，+Z 是法线方向（网格旋转 -90° 后变成世界 +Y）。
 */
const OCEAN_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform float uDir;
  uniform float uAmp;
  uniform float uChoppy;

  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vHeight;
  varying float vDist;

  const int WAVES = 5;

  vec3 waveAt(vec2 p) {
    vec3 acc = vec3(p.x, p.y, 0.0);

    for (int i = 0; i < WAVES; i++) {
      float fi = float(i);
      // 一条很长的主涌浪主导，叠加越来越短的碎浪 —— 像真实海面那样层层滚动
      float wavelength = 18.0 / (1.0 + fi * 1.15);
      float k = 6.283185 / wavelength;
      // 主浪占比大幅提高，起伏夸张、绝不会“平静”
      float amp = uAmp * (0.8 / (1.0 + fi * 1.4));
      float c = sqrt(9.8 / k) * 0.6;                   // 深水波相速度（再乘 uTime 里的频率倍率）
      float a = uDir + (fi - 2.0) * 0.5;               // 各层方向绕主风向散开
      vec2 d = vec2(cos(a), sin(a));
      float q = uChoppy / (k * amp * float(WAVES) + 1.0); // 陡度，避免自交

      // 时间再乘一个倍率，让浪持续推进、有涌动感（调小后更舒缓）
      float f = k * dot(d, p) - c * k * uTime * 0.9;

      acc.x += q * amp * d.x * cos(f);
      acc.y += q * amp * d.y * cos(f);
      acc.z += amp * sin(f);
    }

    return acc;
  }

  void main() {
    vec2 p = position.xy;
    vec3 disp = waveAt(p);

    // 有限差分求法线（比解析式好写好调）
    float e = 0.45;
    vec3 dx = waveAt(p + vec2(e, 0.0));
    vec3 dy = waveAt(p + vec2(0.0, e));
    vec3 n = normalize(cross(dx - disp, dy - disp));

    vHeight = disp.z;
    vNrm = normalize(mat3(modelMatrix) * n);
    vDist = length(p);
    vWorld = (modelMatrix * vec4(disp, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(disp, 1.0);
  }
`;

const OCEAN_FRAGMENT = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec3 uSun;
  uniform float uAmp;
  uniform float uRadius;

  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vHeight;
  varying float vDist;

  void main() {
    vec3 n = normalize(vNrm);
    vec3 view = normalize(cameraPosition - vWorld);

    float d = clamp(vHeight / max(uAmp, 0.001) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, d);

    // 菲涅尔：掠射角更亮更反光
    float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    col = mix(col, uShallow * 1.4, fres * 0.5);

    // 浪尖泡沫：阈值放低，让白色浪脊连成线
    float crest = smoothstep(0.58, 0.92, d);
    float ripple = 0.5 + 0.5 * sin(vWorld.x * 2.3 + vWorld.z * 1.9 + vHeight * 3.0);
    col += uFoam * crest * ripple;

    // 阳光高光
    vec3 h = normalize(uSun + view);
    col += vec3(1.0, 0.95, 0.86) * pow(max(dot(n, h), 0.0), 70.0) * 1.3;

    // 主光漫反射：对比拉大，浪的起伏才看得出来（明暗随浪面法线流动）
    col *= 0.15 + max(dot(n, uSun), 0.0) * 1.35;

    // 侧后方补光，勾出浪的背光面轮廓
    float back = max(dot(n, normalize(vec3(-0.6, 0.45, -0.55))), 0.0);
    col += uShallow * back * 0.18;

    // 远处淡出到天空，避免出现方形硬边
    float edge = 1.0 - smoothstep(uRadius * 0.5, uRadius * 0.92, vDist);

    gl_FragColor = vec4(col, edge);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------ *
 * 天空渐变
 * ------------------------------------------------------------------ */

const SKY_VERTEX = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;

  varying vec3 vPos;

  void main() {
    float h = normalize(vPos).y;
    vec3 c = mix(uHorizon, uTop, smoothstep(0.0, 0.6, h));
    c = mix(uBottom, c, smoothstep(-0.4, 0.0, h));

    gl_FragColor = vec4(c, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------ *
 * 浪沫：被风从浪尖吹起来的水花
 * ------------------------------------------------------------------ */

const SPRAY_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform vec2 uWindDir;
  uniform float uBottom;
  uniform float uTop;

  attribute vec3 aOffset;
  attribute float aPhase;
  attribute float aSpeed;

  varying float vAlpha;

  void main() {
    float t = fract(uTime * aSpeed + aPhase);

    vec3 p = aOffset;
    p.y = uBottom + t * (uTop - uBottom);
    // 被风推着走
    p.xz += uWindDir * (t * uWind * 8.0);
    p.x += sin(uTime * 1.6 + aPhase * 6.283) * 0.4;
    p.z += cos(uTime * 1.3 + aPhase * 6.283) * 0.4;

    vAlpha = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.55, 1.0, t));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p + position, 1.0);
  }
`;

const SPRAY_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createSprayGeometry(count: number, spread: number, size: number) {
  const positions: number[] = [];
  const offsets: number[] = [];
  const phases: number[] = [];
  const speeds: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < count; i++) {
    const base = i * 4;
    positions.push(0, size, 0, size, 0, 0, 0, -size, 0, -size, 0, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);

    // 用确定性散列铺开，避免每次渲染位置乱跳
    const ox = (((i * 6151) % 1000) / 1000 - 0.5) * spread;
    const oz = (((i * 8231) % 1000) / 1000 - 0.5) * spread;
    for (let k = 0; k < 4; k++) offsets.push(ox, 0, oz);

    const phase = ((i * 3571) % 1000) / 1000;
    const speed = 0.05 + (((i * 2311) % 1000) / 1000) * 0.11;
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

let sprayTexture: THREE.Texture | null = null;

function getSprayTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (sprayTexture) return sprayTexture;

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
  gradient.addColorStop(0.0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  sprayTexture = new THREE.CanvasTexture(canvas);
  sprayTexture.needsUpdate = true;
  return sprayTexture;
}

interface FlowStateProps {
  /** 波动频率倍率：1 = 默认，越大浪推进得越快 */
  frequency?: number;
  /** 配色色相偏移：0 = 青蓝海水，可旋转到绿 / 紫 / 暖色 */
  hue?: number;
}

// 心流状态可视化 - 随风起伏的海面
export function FlowStateVisualization({ frequency = 1.2, hue = 0 }: FlowStateProps) {
  const oceanUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0.6 },
      uDir: { value: 0.6 },
      uAmp: { value: 0.9 },
      uChoppy: { value: 1.0 },
      uRadius: { value: OCEAN_SIZE / 2 },
      uDeep: { value: new THREE.Color('#0a3350') },
      uShallow: { value: new THREE.Color('#3fa9c4') },
      uFoam: { value: new THREE.Color('#dff6ff') },
      uSun: { value: new THREE.Vector3(0.4, 0.75, 0.5).normalize() }
    }),
    []
  );

  const oceanMatRef = useRef<THREE.ShaderMaterial>(null);
  const sprayMatRef = useRef<THREE.ShaderMaterial>(null);

  const skyUniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color('#123a5e') },
      uHorizon: { value: new THREE.Color('#6aa8c8') },
      uBottom: { value: new THREE.Color('#0a1c2e') }
    }),
    []
  );

  const sprayGeometry = useMemo(
    () => createSprayGeometry(150, 30, 0.075),
    []
  );
  useEffect(() => () => sprayGeometry.dispose(), [sprayGeometry]);

  const sprayMap = useMemo(() => getSprayTexture(), []);

  const sprayUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0.6 },
      uWindDir: { value: new THREE.Vector2(1, 0) },
      uBottom: { value: 0.1 },
      uTop: { value: 3.6 },
      uColor: { value: new THREE.Color('#eafaff') },
      uOpacity: { value: 0.55 }
    }),
    []
  );

  // 色相偏移：改写海面 / 天空 / 浪沫的颜色（滑块里就是“颜色”这一项）
  useEffect(() => {
    const wrap = (h: number) => ((h % 1) + 1) % 1;

    oceanUniforms.uDeep.value.setHSL(wrap(0.55 + hue), 0.72, 0.16);
    oceanUniforms.uShallow.value.setHSL(wrap(0.52 + hue), 0.62, 0.5);
    oceanUniforms.uFoam.value.setHSL(wrap(0.5 + hue), 0.32, 0.9);

    skyUniforms.uTop.value.setHSL(wrap(0.58 + hue), 0.5, 0.22);
    skyUniforms.uHorizon.value.setHSL(wrap(0.55 + hue), 0.45, 0.55);
    skyUniforms.uBottom.value.setHSL(wrap(0.6 + hue), 0.6, 0.1);

    sprayUniforms.uColor.value.setHSL(wrap(0.5 + hue), 0.25, 0.92);
  }, [hue, oceanUniforms, skyUniforms, sprayUniforms]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // 频率只作用在波浪推进上（uTime 在着色器里只参与波相位）
    // 基础倍率调小，让浪更舒缓、频率更低
    const waveTime = time * (0.3 + frequency * 0.35);

    // 风：两个不同周期的正弦叠加出阵风感，风向也缓慢摆动
    const gust =
      0.55 +
      Math.sin(time * 0.23) * 0.25 +
      Math.sin(time * 0.081 + 1.7) * 0.2;
    const dir = 0.6 + Math.sin(time * 0.043) * 1.1;

    oceanUniforms.uTime.value = waveTime;
    oceanUniforms.uWind.value = gust;
    oceanUniforms.uDir.value = dir;
    // 风大 → 浪更高更陡（陡度高才会出现尖浪脊，而不是圆滑的鼓包）
    // 振幅与陡度调小，浪更平缓舒展
    oceanUniforms.uAmp.value = 1.5 + gust * 1.6;
    oceanUniforms.uChoppy.value = 1.0 + gust * 0.6;

    sprayUniforms.uTime.value = waveTime;
    sprayUniforms.uWind.value = gust;
    sprayUniforms.uWindDir.value.set(Math.cos(dir), Math.sin(dir));
    sprayUniforms.uOpacity.value = 0.3 + gust * 0.45;

    // 直接更新材质实例自己的 uniforms。某些 R3F 版本下，通过 props 传入的
    // uniforms 与材质真正使用的对象不是同一引用，导致 useFrame 改了值、着色器
    // 却读不到 —— 海面就会一直停在初始（无波动）。拿 ref 写材质本体最稳。
    if (oceanMatRef.current?.uniforms) {
      const u = oceanMatRef.current.uniforms;
      if (u.uTime) u.uTime.value = waveTime;
      if (u.uWind) u.uWind.value = gust;
      if (u.uDir) u.uDir.value = dir;
      if (u.uAmp) u.uAmp.value = oceanUniforms.uAmp.value;
      if (u.uChoppy) u.uChoppy.value = oceanUniforms.uChoppy.value;
    }
    if (sprayMatRef.current?.uniforms) {
      const u = sprayMatRef.current.uniforms;
      if (u.uTime) u.uTime.value = waveTime;
      if (u.uWind) u.uWind.value = gust;
      if (u.uWindDir) u.uWindDir.value.set(Math.cos(dir), Math.sin(dir));
      if (u.uOpacity) u.uOpacity.value = sprayUniforms.uOpacity.value;
    }
  });

  return (
    <>
      {/* 渐变天空 */}
      <mesh>
        <sphereGeometry args={[90, 32, 32]} />
        <shaderMaterial
          vertexShader={SKY_VERTEX}
          fragmentShader={SKY_FRAGMENT}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* 海面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEG, OCEAN_SEG]} />
        <shaderMaterial
          ref={oceanMatRef}
          vertexShader={OCEAN_VERTEX}
          fragmentShader={OCEAN_FRAGMENT}
          uniforms={oceanUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 被风从浪尖吹起的浪沫 */}
      <mesh geometry={sprayGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={sprayMatRef}
          vertexShader={SPRAY_VERTEX}
          fragmentShader={SPRAY_FRAGMENT}
          uniforms={sprayUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 海面是自定义着色器，不吃灯光；这些灯留给将来加物体时用 */}
      <hemisphereLight args={['#7fc4dd', '#0a3350', 0.7]} />
      <directionalLight position={[8, 12, 6]} intensity={0.6} color="#fff0d8" />
    </>
  );
}

// MBTI性格类型3D展示
export function MBTIVisualization({ personality }: { personality: string }) {
  const dimensions = useMemo(() => {
    // 根据MBTI类型生成4个维度
    const types: Record<string, [number, number, number, number]> = {
      'INTJ': [0.8, 0.9, 0.7, 0.6], // 分析型
      'ENFP': [0.9, 0.3, 0.8, 0.7], // 热情型
      'ISTJ': [0.2, 0.9, 0.3, 0.9], // 传统型
      'ESFP': [0.8, 0.2, 0.9, 0.4], // 表演型
    };
    return types[personality] || [0.5, 0.5, 0.5, 0.5];
  }, [personality]);

  const dimensionsNames = ['外向', '直觉', '思考', '判断'];

  return (
    <group>
      {dimensions.map((value, i) => (
        <group key={i} position={[i * 2 - 3, 0, 0]}>
          {/* 轴线 */}
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 4]} />
            <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
          </mesh>

          {/* 值指示器 */}
          <Sphere position={[0, value * 2, 0]} args={[0.3, 16, 16]}>
            <MeshDistortMaterial
              color={value > 0.6 ? '#FF6B6B' : value > 0.4 ? '#FFD93D' : '#4D96FF'}
              distort={0.2}
              speed={1.5}
            />
          </Sphere>

          {/* 标签（需要用2D覆盖层显示） */}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * 压力山脉：真正的地形网格
 * ------------------------------------------------------------------ */

const TERRAIN_SIZE = 26;
const TERRAIN_SEG = 64;
const TERRAIN_SEED = 1337;

function hash2(ix: number, iz: number, seed: number): number {
  let n = ix * 1619 + iz * 31337 + seed * 6971;
  n = (n << 13) ^ n;
  return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
}

/** 值噪声，返回 -1 ~ 1 */
function noise2(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);

  return (a * (1 - ux) + b * ux) * (1 - uz) + (c * (1 - ux) + d * ux) * uz;
}

/** 分形噪声，返回 -1 ~ 1 */
function fbm(x: number, z: number, seed: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;

  for (let o = 0; o < octaves; o++) {
    sum += noise2(x * freq, z * freq, seed + o * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

interface TerrainShape {
  amplitude: number;
  sharpness: number;
}

function terrainShape(level: number): TerrainShape {
  return {
    amplitude: 1.1 + level * 4.0,   // 压力越大，山越高
    sharpness: 0.2 + level * 0.8    // 压力越大，山脊越尖锐
  };
}

/** 任意点的地形高度（用于摆放树木和岩石） */
function terrainHeightAt(x: number, z: number, level: number): number {
  const { amplitude, sharpness } = terrainShape(level);
  const half = TERRAIN_SIZE / 2;

  const base = fbm(x * 0.085, z * 0.085, TERRAIN_SEED, 5) * 0.5 + 0.5;
  const ridge = Math.pow(1 - Math.abs(fbm(x * 0.115 + 12.3, z * 0.115 - 7.1, TERRAIN_SEED + 37, 4)), 2);

  let h = base * (1 - sharpness) + ridge * sharpness;

  const d = Math.min(1, Math.sqrt(x * x + z * z) / half);
  h *= Math.max(0, 1 - Math.pow(d, 2.2));

  return h * amplitude;
}

function stressPalette(level: number) {
  if (level > 0.7) {
    return {
      valley: '#ff6a2a',   // 山谷里透出的岩浆
      low: '#8f1d24',
      mid: '#b8323a',
      rock: '#5c1a1e',
      snow: '#f2d6d2'
    };
  }
  if (level > 0.4) {
    return {
      valley: '#c98a35',
      low: '#a8802f',
      mid: '#c69a45',
      rock: '#8a7350',
      snow: '#f6e9cd'
    };
  }
  return {
    valley: '#2f7d55',
    low: '#3f8f5f',
    mid: '#57a06a',
    rock: '#7f8b78',
    snow: '#eef6ff'
  };
}

interface TerrainResult {
  geometry: THREE.BufferGeometry;
  maxHeight: number;
}

function buildTerrain(level: number): TerrainResult {
  const { amplitude, sharpness } = terrainShape(level);
  const half = TERRAIN_SIZE / 2;
  const row = TERRAIN_SEG + 1;
  const count = row * row;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const indices: number[] = [];

  const pal = stressPalette(level);
  const cValley = new THREE.Color(pal.valley);
  const cLow = new THREE.Color(pal.low);
  const cMid = new THREE.Color(pal.mid);
  const cRock = new THREE.Color(pal.rock);
  const cSnow = new THREE.Color(pal.snow);
  const c = new THREE.Color();

  let maxHeight = 0;

  for (let i = 0; i <= TERRAIN_SEG; i++) {
    for (let j = 0; j <= TERRAIN_SEG; j++) {
      const x = (i / TERRAIN_SEG) * TERRAIN_SIZE - half;
      const z = (j / TERRAIN_SEG) * TERRAIN_SIZE - half;

      const base = fbm(x * 0.085, z * 0.085, TERRAIN_SEED, 5) * 0.5 + 0.5;
      const ridge = Math.pow(
        1 - Math.abs(fbm(x * 0.115 + 12.3, z * 0.115 - 7.1, TERRAIN_SEED + 37, 4)),
        2
      );

      let h = base * (1 - sharpness) + ridge * sharpness;
      const d = Math.min(1, Math.sqrt(x * x + z * z) / half);
      h *= Math.max(0, 1 - Math.pow(d, 2.2));

      const y = h * amplitude;
      if (y > maxHeight) maxHeight = y;

      const vi = i * row + j;
      positions[vi * 3] = x;
      positions[vi * 3 + 1] = y;
      positions[vi * 3 + 2] = z;

      // 按海拔分段上色：谷底 → 山腰 → 岩壁 → 雪顶
      const t = Math.min(1, y / amplitude);
      if (t < 0.3) {
        c.copy(cValley).lerp(cLow, t / 0.3);
      } else if (t < 0.72) {
        c.copy(cLow).lerp(cMid, (t - 0.3) / 0.42).lerp(cRock, Math.max(0, (t - 0.5) / 0.22));
      } else {
        c.copy(cRock).lerp(cSnow, Math.min(1, (t - 0.72) / 0.2));
      }

      // 轻微色斑，避免出现塑料感
      c.offsetHSL(0, 0, noise2(i * 0.35, j * 0.35, 99) * 0.035);

      colors[vi * 3] = c.r;
      colors[vi * 3 + 1] = c.g;
      colors[vi * 3 + 2] = c.b;
    }
  }

  for (let i = 0; i < TERRAIN_SEG; i++) {
    for (let j = 0; j < TERRAIN_SEG; j++) {
      const a = i * row + j;
      const b = a + 1;
      const cc = a + row;
      const d = cc + 1;
      indices.push(a, b, cc, b, d, cc);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return { geometry, maxHeight };
}

/* ------------------------------------------------------------------ *
 * 漂浮粒子（余烬 / 静谧微尘）
 * ------------------------------------------------------------------ */

const DRIFT_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uBottom;
  uniform float uTop;

  attribute vec3 aOffset;
  attribute float aPhase;
  attribute float aSpeed;

  varying float vAlpha;

  void main() {
    float t = fract(uTime * aSpeed + aPhase);

    vec3 p = aOffset;
    p.y = uBottom + t * (uTop - uBottom);
    p.x += sin(uTime * 0.7 + aPhase * 6.283) * 1.2;
    p.z += cos(uTime * 0.5 + aPhase * 6.283) * 1.2;

    vAlpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.75, 1.0, t));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p + position, 1.0);
  }
`;

const DRIFT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createDriftGeometry(count: number, spread: number, size: number) {
  const positions: number[] = [];
  const offsets: number[] = [];
  const phases: number[] = [];
  const speeds: number[] = [];
  const indices: number[] = [];
  const s = size;

  for (let i = 0; i < count; i++) {
    const base = i * 4;
    positions.push(0, s, 0, s, 0, 0, 0, -s, 0, -s, 0, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);

    const ox = ((i * 7919) % 1000 / 1000 - 0.5) * spread;
    const oz = ((i * 6271) % 1000 / 1000 - 0.5) * spread;
    for (let k = 0; k < 4; k++) offsets.push(ox, 0, oz);

    const phase = ((i * 3571) % 1000) / 1000;
    const speed = 0.06 + (((i * 2311) % 1000) / 1000) * 0.12;
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

// 压力水平可视化 - 地形山脉
export function StressVisualization({ level = 0.5 }: { level?: number }) {
  const terrainRef = useRef<THREE.Group>(null);

  // 量化后再生成地形：拖滑块时不会每一帧都重建 4000+ 个顶点
  const quantized = Math.round(level * 20) / 20;

  const { geometry: terrainGeometry, maxHeight } = useMemo(
    () => buildTerrain(quantized),
    [quantized]
  );

  useEffect(() => {
    return () => terrainGeometry.dispose();
  }, [terrainGeometry]);

  // 树木：只长在坡度平缓的中低海拔；压力越高越荒芜，但不会消失。
  // 阈值必须随地形起伏自适应 —— 写死的话在高压力下地形太陡，所有候选点都会被过滤掉。
  const trees = useMemo(() => {
    const { amplitude } = terrainShape(quantized);
    // 保底 14 棵：压力再高也要有树，只是变少、变枯
    const count = Math.max(14, Math.round(34 * (1 - quantized * 0.55)));
    const hMin = 0.3;
    const hMax = 0.35 + amplitude * 0.55;
    const slopeLimit = 0.18 + amplitude * 0.09;

    type TreeItem = { position: [number, number, number]; scale: number; rotation: number };
    const good: TreeItem[] = [];
    const fallback: TreeItem[] = [];

    for (let i = 0; i < count * 40 && good.length < count; i++) {
      const x = (((i * 4253) % 997) / 997 - 0.5) * (TERRAIN_SIZE - 4);
      const z = (((i * 6151) % 991) / 991 - 0.5) * (TERRAIN_SIZE - 4);
      const h = terrainHeightAt(x, z, quantized);
      if (h < hMin || h > hMax) continue;

      const entry: TreeItem = {
        position: [x, h, z],
        scale: 0.7 + (((i * 1777) % 100) / 100) * 0.6,
        rotation: ((i * 911) % 360) * (Math.PI / 180)
      };

      // 有限差分估算坡度
      const hx = terrainHeightAt(x + 0.4, z, quantized);
      const hz = terrainHeightAt(x, z + 0.4, quantized);
      if (Math.abs(hx - h) <= slopeLimit && Math.abs(hz - h) <= slopeLimit) {
        good.push(entry);
      } else if (fallback.length < count) {
        fallback.push(entry);
      }
    }

    // 缓坡点够多就只用缓坡点，否则用陡坡点补足，保证极端压力下仍有树
    return good.length >= Math.ceil(count * 0.6)
      ? good.slice(0, count)
      : good.concat(fallback).slice(0, count);
  }, [quantized]);

  // 岩石：压力越高越多
  const rocks = useMemo(() => {
    const count = Math.round(10 + quantized * 20);
    const list: { position: [number, number, number]; scale: number; rotation: [number, number, number] }[] = [];

    for (let i = 0; i < count * 12 && list.length < count; i++) {
      const x = (((i * 3391) % 983) / 983 - 0.5) * (TERRAIN_SIZE - 3);
      const z = (((i * 7919) % 977) / 977 - 0.5) * (TERRAIN_SIZE - 3);
      const h = terrainHeightAt(x, z, quantized);
      if (h < 0.2) continue;

      list.push({
        position: [x, h + 0.05, z],
        scale: 0.18 + (((i * 2447) % 100) / 100) * 0.42,
        rotation: [
          ((i * 131) % 100) / 100 * Math.PI,
          ((i * 277) % 100) / 100 * Math.PI * 2,
          ((i * 379) % 100) / 100 * Math.PI
        ]
      });
    }
    return list;
  }, [quantized]);

  // 极限压力下地表裂开的岩浆缝：压力越高越多、越亮
  const fissures = useMemo(() => {
    if (quantized <= 0.7) return [];

    const count = Math.round((quantized - 0.7) * 70);
    const list: { position: [number, number, number]; rotation: number; length: number }[] = [];

    for (let i = 0; i < count * 30 && list.length < count; i++) {
      const x = (((i * 5231) % 991) / 991 - 0.5) * (TERRAIN_SIZE - 5);
      const z = (((i * 8837) % 997) / 997 - 0.5) * (TERRAIN_SIZE - 5);
      const h = terrainHeightAt(x, z, quantized);
      // 只出现在低洼处，看起来像是从谷底裂开的
      if (h > 0.9) continue;

      list.push({
        position: [x, h + 0.07, z],
        rotation: ((i * 1451) % 360) * (Math.PI / 180),
        length: 1.1 + (((i * 3191) % 100) / 100) * 1.9
      });
    }
    return list;
  }, [quantized]);

  // 漂浮粒子：任何压力档位都要有（中间档位原本是空白）
  const drift = useMemo(() => {
    if (quantized > 0.6) {
      // 高压力：上升的余烬，数量随压力一路涨到极限
      return {
        count: Math.round(70 + quantized * 90),
        color: '#ff7a2a',
        bottom: -0.5,
        top: maxHeight + 4,
        size: 0.07 + (quantized - 0.6) * 0.06,
        opacity: 0.85
      };
    }
    if (quantized < 0.4) {
      // 低压力：缓慢的静谧微尘
      return {
        count: 55,
        color: '#bff5c8',
        bottom: -0.5,
        top: maxHeight + 2,
        size: 0.06,
        opacity: 0.6
      };
    }
    // 中等压力：温和的浮尘
    return {
      count: 48,
      color: '#f0dfb8',
      bottom: -0.5,
      top: maxHeight + 3,
      size: 0.058,
      opacity: 0.55
    };
  }, [quantized, maxHeight]);

  const driftGeometry = useMemo(
    () => (drift ? createDriftGeometry(drift.count, TERRAIN_SIZE - 6, drift.size) : null),
    [drift]
  );

  useEffect(() => {
    if (!driftGeometry) return;
    return () => driftGeometry.dispose();
  }, [driftGeometry]);

  const driftUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBottom: { value: 0 },
      uTop: { value: 6 },
      uColor: { value: new THREE.Color('#ff7a2a') },
      uOpacity: { value: 0.8 }
    }),
    []
  );

  // 天空与雾随压力变化：到了极限几乎全黑，只剩岩浆的光
  const atmosphere = useMemo(() => {
    const sky = new THREE.Color();
    const ground = new THREE.Color();
    if (quantized >= 0.9) {
      sky.set('#2a070c');
      ground.set('#170407');
    } else if (quantized > 0.7) {
      sky.set('#4a1018');
      ground.set('#2a0a0e');
    } else if (quantized > 0.4) {
      sky.set('#a3763f');
      ground.set('#5c4526');
    } else {
      sky.set('#5c93b8');
      ground.set('#2f4a35');
    }
    return { sky, ground };
  }, [quantized]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // 山体呼吸（只缩放地形，避免把树和岩石拉变形）
    if (terrainRef.current) {
      const breathSpeed = 1 + level * 1.2;
      const breathDepth = 0.012 + level * 0.03;
      terrainRef.current.scale.y =
        1 + Math.sin(time * breathSpeed) * breathDepth * (0.4 + level);
    }

    // 只保留平缓的山体呼吸，不做位移晃动

    if (drift) {
      driftUniforms.uTime.value = time;
      driftUniforms.uBottom.value = drift.bottom;
      driftUniforms.uTop.value = drift.top;
      driftUniforms.uColor.value.set(drift.color);
      driftUniforms.uOpacity.value = drift.opacity;
    }
  });

  return (
    <>
      <color attach="background" args={[atmosphere.sky.getHex()]} />
      <fog attach="fog" args={[atmosphere.sky.getHex(), 22, 62]} />

      <group>
        {/* 基座 */}
        <mesh position={[0, -0.45, 0]}>
          <boxGeometry args={[TERRAIN_SIZE + 1.4, 0.8, TERRAIN_SIZE + 1.4]} />
          <meshStandardMaterial
            color={level > 0.7 ? '#4a1416' : level > 0.4 ? '#6b5330' : '#33502f'}
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>

        {/* 地形山脉 */}
        <group ref={terrainRef}>
          <mesh geometry={terrainGeometry}>
            <meshStandardMaterial
              vertexColors
              flatShading
              roughness={0.92}
              metalness={0.05}
            />
          </mesh>
        </group>

        {/* 水面：压力越低越明显 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.32, 0]}>
          <planeGeometry args={[TERRAIN_SIZE, TERRAIN_SIZE]} />
          <meshStandardMaterial
            color={level > 0.7 ? '#8a2b1e' : '#3f8fa8'}
            transparent
            opacity={0.18 + (1 - level) * 0.42}
            roughness={0.18}
            metalness={0.5}
          />
        </mesh>

        {/* 松树 */}
        {trees.map((tree, i) => (
          <group
            key={`pine-${i}`}
            position={tree.position}
            rotation={[0, tree.rotation, 0]}
            scale={tree.scale}
          >
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.055, 0.085, 0.45, 6]} />
              <meshStandardMaterial color="#4a3524" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.78, 0]}>
              <coneGeometry args={[0.34, 0.95, 7]} />
              <meshStandardMaterial
                color={level > 0.7 ? '#4a3a26' : '#2f6b3f'}
                roughness={0.9}
                flatShading
              />
            </mesh>
            <mesh position={[0, 1.22, 0]}>
              <coneGeometry args={[0.24, 0.7, 7]} />
              <meshStandardMaterial
                color={level > 0.7 ? '#5a452c' : '#397a4a'}
                roughness={0.9}
                flatShading
              />
            </mesh>
          </group>
        ))}

        {/* 碎石 */}
        {rocks.map((rock, i) => (
          <mesh
            key={`rock-${i}`}
            position={rock.position}
            rotation={rock.rotation}
            scale={rock.scale}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={level > 0.7 ? '#4d1c1c' : '#7c8177'}
              roughness={0.95}
              flatShading
            />
          </mesh>
        ))}

        {/* 岩浆裂缝（极限压力） */}
        {fissures.map((f, i) => (
          <mesh
            key={`fissure-${i}`}
            position={f.position}
            rotation={[-Math.PI / 2, 0, f.rotation]}
          >
            <planeGeometry args={[0.32, f.length]} />
            <meshBasicMaterial
              color="#ff7a1f"
              transparent
              opacity={0.55 + (level - 0.7) * 1.2}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}

        {/* 余烬 / 微尘 */}
        {driftGeometry && (
          <mesh geometry={driftGeometry} frustumCulled={false}>
            <shaderMaterial
              vertexShader={DRIFT_VERTEX}
              fragmentShader={DRIFT_FRAGMENT}
              uniforms={driftUniforms}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}
      </group>

      {/* 照明 */}
      {/* 注意：Canvas 里已经有一盏环境光和两盏点光，这里的强度是叠加后的补光 */}
      <hemisphereLight
        args={[atmosphere.sky.getHex(), atmosphere.ground.getHex(), 0.5]}
      />
      <directionalLight
        position={[10, 14, 6]}
        intensity={0.85}
        color={level > 0.7 ? '#ffb08a' : '#fff2d8'}
      />
      <directionalLight position={[-9, 5, -7]} intensity={0.25} color="#7fa8e0" />
      {/* 谷底岩浆的照明：压力越高越亮 */}
      {level > 0.7 && (
        <pointLight
          position={[0, 0.6, 0]}
          intensity={1.6 + (level - 0.7) * 9}
          color="#ff5a1f"
          distance={18 + (level - 0.7) * 30}
          decay={2}
        />
      )}
    </>
  );
}

// 时间感知可视化 - 快乐时光飞逝 vs 压力时光缓慢
/* ------------------------------------------------------------------ *
 * 时间感知：主观时钟 vs 客观时钟 + 分布式脑区网络
 * ------------------------------------------------------------------ */

// 「大脑没有单一钟表」——时间由多个脑区协作编码，这里用一组互联节点表示
const BRAIN_REGIONS: { name: string; pos: [number, number, number]; color: string }[] = [
  { name: '基底神经节', pos: [-1.3, 0.7, 0.3], color: '#A78BFA' },
  { name: '小脑', pos: [1.2, -0.6, 0.4], color: '#6BCB77' },
  { name: '前额叶', pos: [0.3, 1.3, -0.5], color: '#FFD93D' },
  { name: '下丘脑SCN', pos: [-0.5, -1.2, -0.4], color: '#4D96FF' },
  { name: '颞上回', pos: [1.1, 0.4, -1.1], color: '#FF6B6B' },
];
const BRAIN_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 3], [2, 4], [3, 4],
];

export function TimePerception({
  mood = 0, // -1 焦虑/无聊 .. +1 快乐/专注
  memoryDensity = 0.5, // 0 单调重复 .. 1 充满新鲜
  age = 0.2, // 0 青少年 .. 1 老年
}: {
  mood?: number;
  memoryDensity?: number;
  age?: number;
}) {
  const objectiveRingRef = useRef<THREE.Group>(null);
  const subjectiveRingRef = useRef<THREE.Group>(null);
  const brainNodesRef = useRef<THREE.Group>(null);
  const subAngle = useRef(0);

  // 情绪：快乐/专注→时间飞逝(>1)，焦虑/无聊→度秒如年(<1)
  const moodFactor = 0.35 + (mood + 1) * 0.775; // -1→0.35, 0→1.0, 1→1.9
  // 年龄：越老，主观时间越快（一年比一年短）
  const ageFactor = 1.0 + age * 1.2; // 0→1.0, 1→2.2

  // 记忆密度：密度越高，时间线（主观环上的节点）越饱满
  const memCount = Math.round(8 + memoryDensity * 34); // 8..42

  // 主观环颜色：焦虑偏红、平静偏紫、快乐偏金
  const subColor = useMemo(() => {
    const c = new THREE.Color('#A78BFA');
    if (mood >= 0) c.lerp(new THREE.Color('#FFD93D'), mood);
    else c.lerp(new THREE.Color('#FF4D4D'), -mood);
    return c;
  }, [mood]);

  const memNodes = useMemo(
    () => Array.from({ length: memCount }, (_, i) => (i / memCount) * Math.PI * 2),
    [memCount]
  );

  const edgePositions = useMemo(
    () =>
      new Float32Array(
        BRAIN_EDGES.flatMap(([a, b]) => [...BRAIN_REGIONS[a].pos, ...BRAIN_REGIONS[b].pos])
      ),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // 客观时钟：绝对恒速，作为参照
    if (objectiveRingRef.current) {
      objectiveRingRef.current.rotation.y += dt * 0.4;
    }

    // 主观时钟：累计角度，速率 = 客观速率 × 情绪因子 × 年龄因子
    subAngle.current += dt * 0.4 * moodFactor * ageFactor;
    if (subjectiveRingRef.current) {
      subjectiveRingRef.current.rotation.y = subAngle.current;
    }

    // 脑区网络脉动：体现分散、动态协作的计时
    if (brainNodesRef.current) {
      brainNodesRef.current.children.forEach((child, i) => {
        child.scale.setScalar(1 + Math.sin(t * 1.6 + i * 0.9) * 0.14);
      });
    }
  });

  return (
    <group>
      {/* 客观时钟：恒定旋转的刻度环（真实时间） */}
      <group ref={objectiveRingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.2, 0.04, 8, 96]} />
          <meshStandardMaterial color="#ffffff" emissive="#9db4ff" emissiveIntensity={0.35} />
        </mesh>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <mesh
              key={`tick-${i}`}
              position={[Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2]}
              rotation={[0, -a, 0]}
            >
              <boxGeometry args={[0.06, 0.32, 0.06]} />
              <meshStandardMaterial color="#cdd6ff" emissive="#6688ff" emissiveIntensity={0.45} />
            </mesh>
          );
        })}
      </group>

      {/* 主观时间环：节点数=记忆密度，速度=情绪×年龄 */}
      <group ref={subjectiveRingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.6, 0.02, 8, 80]} />
          <meshStandardMaterial
            color={subColor}
            emissive={subColor}
            emissiveIntensity={0.6}
            transparent
            opacity={0.5}
          />
        </mesh>
        {memNodes.map((a, i) => (
          <Sphere
            key={`mem-${i}`}
            args={[0.12, 12, 12]}
            position={[Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6]}
          >
            <meshStandardMaterial color={subColor} emissive={subColor} emissiveIntensity={0.8} />
          </Sphere>
        ))}
      </group>

      {/* 中心脑区网络：体现「无单一钟表」 */}
      <group ref={brainNodesRef}>
        {BRAIN_REGIONS.map((r, i) => (
          <Sphere key={`region-${i}`} args={[0.3, 18, 18]} position={r.pos}>
            <meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={0.6} />
          </Sphere>
        ))}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#8b7be0" transparent opacity={0.45} />
        </lineSegments>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * 时间感知2：线性扭曲管道模型（方案1 · 内部时钟模型）
 *   展示「当下」主观时间流速如何被情绪/注意力扭曲
 *   - 专注/愉悦：管道收窄、顺滑、流动快（时光飞逝）
 *   - 焦虑/煎熬：管道膨胀、凹凸褶皱、流动慢（时间拉长）
 *   - 走神/放空：管道断点、半透明虚化，粒子断断续续
 *   文献要点：形状畸变是第一位，动画速度其次。
 * ------------------------------------------------------------------ */

const tubeVertex = `
varying vec2 vUv;
varying float vR;
varying vec3 vNormal;
varying vec3 vView;
uniform float uTime;
uniform float uMood;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main(){
  vUv = uv;
  float along = uv.x;
  float ang = uv.y;
  float focus = clamp(uMood, 0.0, 1.0);
  float anx = clamp(-uMood, 0.0, 1.0);
  // 基础半径：专注收窄、焦虑膨胀
  float rFactor = 1.0 - focus * 0.45 + anx * 0.75;
  // 流动凹凸：焦虑越多越碎越乱，专注越顺滑（幅度收敛，更柔和）
  float freq = 5.0 + anx * 14.0;
  float flow = uTime * (0.4 + focus * 1.6);
  float bump = (vnoise(vec2(along * freq, ang * 4.0) + vec2(flow, 0.0)) - 0.5);
  bump *= (0.1 + anx * 0.5);
  // 平静时极轻微涟漪
  float ripple = sin(along * 22.0 - uTime * (0.6 + focus * 1.2)) * 0.04 * (1.0 - anx);
  float r = max(0.2, rFactor + bump + ripple);
  vR = r;
  vec3 p = position;
  p.x *= r; p.y *= r;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const tubeFragment = `
varying vec2 vUv;
varying float vR;
varying vec3 vNormal;
varying vec3 vView;
uniform float uMood;
uniform float uTime;
uniform float uAttention;
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uCalm;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main(){
  float focus = clamp(uMood, 0.0, 1.0);
  float anx = clamp(-uMood, 0.0, 1.0);
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vView);

  // 基础色：焦虑暖红、专注冷蓝、平静青；沿长度柔和呼吸渐变
  vec3 base = mix(uCool, uWarm, anx);
  base = mix(base, uCalm, focus);
  base *= 0.85 + 0.15 * sin(vUv.x * 6.2831 + uTime * 0.2);

  // 主光 + 环境，赋予管道体积感
  vec3 L = normalize(vec3(0.4, 0.7, 0.6));
  float diff = max(dot(N, L), 0.0);
  vec3 lit = base * (0.35 + 0.9 * diff);

  // 菲涅尔边缘辉光（玻璃质感）
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  vec3 rim = mix(mix(uCool, uWarm, anx), vec3(1.0), 0.3);
  lit += rim * fres * 0.9;

  // 沿管道流动的柔和高光（时光脉冲·彗星状）
  float band = fract(vUv.x * 3.0 - uTime * (0.12 + focus * 0.4));
  float comet = smoothstep(0.0, 0.04, band) * (1.0 - smoothstep(0.04, 0.13, band));
  lit += vec3(0.5, 0.7, 0.95) * comet * (0.5 + focus * 0.7);

  // 走神/放空：低注意力→断点
  float gapCut = (1.0 - uAttention) * 0.7;
  if (vnoise(vec2(vUv.x * 11.0, 3.3)) < gapCut) discard;

  // 两端柔化淡出，避免开口空洞
  float ends = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);

  float alpha = mix(0.35, 0.95, uAttention);
  alpha = max(alpha, fres * 0.6 + comet * 0.6) * ends;
  gl_FragColor = vec4(lit, alpha);
}
`;

// 管道外发光晕：菲涅尔柔光环（替代原来的平板光壳）
const tubeGlowFragment = `
varying vec3 vNormal;
varying vec3 vView;
uniform float uMood;
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uCalm;
void main(){
  float focus = clamp(uMood, 0.0, 1.0);
  float anx = clamp(-uMood, 0.0, 1.0);
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vView);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  vec3 col = mix(uCool, uWarm, anx);
  col = mix(col, uCalm, focus);
  gl_FragColor = vec4(col, fres * 0.5);
}
`;

// 客观时间参照管：规整等长刻度 + 冷色渐变 + 发光流动（不再是一根死灰管）
const refVertex = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const refFragment = `
varying vec2 vUv;
uniform float uTime;
void main(){
  // 等间隔小刻度：客观匀速时间的规整刻度
  float minor = 1.0 - smoothstep(0.0, 0.06, fract(vUv.y * 20.0));
  // 每 1/4 一段大刻度
  float major = 1.0 - smoothstep(0.0, 0.10, fract(vUv.y * 4.0));
  // 沿长度的冷色渐变（稳定、规整）
  vec3 grad = mix(vec3(0.30, 0.50, 0.95), vec3(0.55, 0.90, 0.98), vUv.y);
  // 缓慢流动的闪光，让参照管也"闪亮"一些
  float flow = 0.5 + 0.5 * sin(vUv.y * 6.2831 - uTime * 1.6);
  vec3 col = grad + minor * 0.6 + major * 0.5 + flow * 0.12;
  float alpha = 0.45 + minor * 0.35 + major * 0.25 + flow * 0.05;
  gl_FragColor = vec4(col, alpha);
}
`;

function ReferenceTube() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh position={[0, -2.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.22, 0.22, 16, 32, 1, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={refVertex}
        fragmentShader={refFragment}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// 生成柔和的圆形光点贴图（用于脉冲粒子，避免方块感）
let _circleTex: THREE.Texture | null = null;
function getCircleTexture() {
  if (_circleTex) return _circleTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _circleTex = new THREE.CanvasTexture(c);
  return _circleTex;
}

// 管道内漂浮的「注意力采样脉冲」粒子
function TubeParticles({ mood, attention }: { mood: number; attention: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const N = 500;
  // 粒子颜色随情绪微调：专注偏冷、焦虑偏暖
  const pColor = mood > 0.2 ? '#bfe9ff' : mood < -0.2 ? '#ffd2b0' : '#bff7ff';
  const data = useMemo(() => {
    const phase = new Float32Array(N);
    const ang = new Float32Array(N);
    const rad = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      phase[i] = Math.random();
      ang[i] = Math.random() * Math.PI * 2;
      rad[i] = 0.15 + Math.random() * 0.55;
    }
    return { phase, ang, rad, positions: new Float32Array(N * 3) };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const focus = Math.max(0, mood);
    const anx = Math.max(0, -mood);
    const speed = 0.03 + focus * 0.22; // 专注/愉悦→粒子流更快（时光飞逝）
    const rFactor = 1.0 - focus * 0.45 + anx * 0.75; // 跟随管道半径
    const pos = data.positions;
    for (let i = 0; i < N; i++) {
      const a = (data.phase[i] + t * speed) % 1;
      const z = (a - 0.5) * 16;
      const r = data.rad[i] * rFactor;
      pos[i * 3] = Math.cos(data.ang[i]) * r;
      pos[i * 3 + 1] = Math.sin(data.ang[i]) * r;
      pos[i * 3 + 2] = z;
    }
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      // 注意力低→粒子稀疏
      const count = Math.floor(N * (0.1 + attention * 0.9));
      pointsRef.current.geometry.setDrawRange(0, count);
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.2 + attention * 0.7;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={pColor}
        map={getCircleTexture()}
        size={0.18}
        sizeAttenuation
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function TimePerception2({
  mood = 0, // -1 焦虑/煎熬 .. 0 平静 .. +1 专注/愉悦
  attention = 1, // 0 走神/放空 .. 1 高度专注
}: {
  mood?: number;
  attention?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const curve = useMemo(
    () => new THREE.LineCurve3(new THREE.Vector3(0, 0, -8), new THREE.Vector3(0, 0, 8)),
    []
  );
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 260, 1.0, 30, false), [curve]);
  const geoGlow = useMemo(() => new THREE.TubeGeometry(curve, 220, 1.5, 30, false), [curve]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMood: { value: mood },
      uAttention: { value: attention },
      uCool: { value: new THREE.Color('#5BD1C9') },
      uWarm: { value: new THREE.Color('#FF6B6B') },
      uCalm: { value: new THREE.Color('#6BA6FF') },
    }),
    [] // 初始值，逐帧在 useFrame 中覆盖
  );

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uMood.value = mood;
      matRef.current.uniforms.uAttention.value = attention;
    }
  });

  return (
    <group>
      {/* 星空背景，增加纵深 */}
      <Stars radius={45} depth={25} count={350} factor={3.5} saturation={0} fade speed={0.6} />

      {/* 客观时间参照管：规整刻度 + 冷色渐变 + 发光（与主观管道对比） */}
      <ReferenceTube />

      {/* 外发光晕：柔化管道轮廓 */}
      <mesh>
        <primitive object={geoGlow} attach="geometry" />
        <shaderMaterial
          vertexShader={tubeVertex}
          fragmentShader={tubeGlowFragment}
          uniforms={uniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 主观时间管道：随情绪/注意力实时形变 */}
      <mesh>
        <primitive object={geo} attach="geometry" />
        <shaderMaterial
          ref={matRef}
          vertexShader={tubeVertex}
          fragmentShader={tubeFragment}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <TubeParticles mood={mood} attention={attention} />
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * 时间感知3：记忆时间云 / 分形节点模型（方案2 · 记忆痕迹理论）
 *   解释「回忆里的时间」由事件密度决定，而非物理时长。
 *   - 充满新鲜事件：大量节点、分叉、占据大体积 → 回忆起来很长
 *   - 平淡重复日常：节点极少、压缩成光滑小球 → 一晃而过
 *   经典现象：童年新事件密度高→一年很长；成年重复→一年飞快
 * ------------------------------------------------------------------ */

// 记忆云中的「命名事件」：每颗大球代表一件可被回忆的事
export interface MemoryEvent {
  id: number;
  title: string;
  date: string;
  desc: string;
  dir: [number, number, number]; // 单位方向，决定事件球在云中的位置
  hue: number;
}

const MEMORY_EVENTS: MemoryEvent[] = [
  {
    id: 0,
    title: '第一次离家上学',
    date: '2003年9月1日',
    desc: '小学第一天，母亲松开手转身离开。那天格外漫长，每一分钟都被放大——陌生的走廊、发亮的铃铛。新事件密度极高，所以童年的一年在回忆里显得很「长」。',
    dir: [0.0, 0.9, 0.4],
    hue: 0.58,
  },
  {
    id: 1,
    title: '搬到陌生城市',
    date: '2015年7月',
    desc: '工作调动，拖着两个箱子落地一个听不懂方言的地方。前三个月每天都是新的：新路线、新同事、新口味。密集的新鲜感让这段日子在回忆里占了很大一块。',
    dir: [-0.8, -0.2, 0.5],
    hue: 0.66,
  },
  {
    id: 2,
    title: '日复一日的工作',
    date: '2016 – 2018',
    desc: '连续两年几乎同样的上下班、同样的午饭、同样的会议。没有标记性的事件，记忆被压缩成一团模糊的光滑小球——回想时只觉得「一晃就过去了」。',
    dir: [0.7, 0.1, -0.7],
    hue: 0.75,
  },
  {
    id: 3,
    title: '和重要的人告别',
    date: '2020年1月',
    desc: '在车站送别，列车开走后我站在原地很久。强烈的情绪让这一刻被牢牢刻下，成为一个发亮的重大节点；而围绕它的平淡日子反而淡去了。',
    dir: [-0.3, -0.8, -0.5],
    hue: 0.92,
  },
];

export function TimePerception3({
  density = 0.5,
  onSelectEvent,
  selectedEventId = null,
}: {
  density?: number;
  onSelectEvent?: (e: MemoryEvent | null) => void;
  selectedEventId?: number | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // 事件密度 → 节点数量与占据体积
  const { nodes, R, eventPos } = useMemo(() => {
    const count = Math.round(6 + density * 130); // 6..136
    const radius = 1.3 + density * 3.4; // 1.3..4.7
    const arr: { pos: [number, number, number]; major: boolean; size: number; hue: number }[] = [];
    let s = 9871;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < count; i++) {
      const u = rnd(), v = rnd(), w = rnd();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const rr = radius * Math.cbrt(w); // 均匀分布于球内
      const x = rr * Math.sin(phi) * Math.cos(theta);
      const y = rr * Math.sin(phi) * Math.sin(theta);
      const z = rr * Math.cos(phi);
      const major = rnd() < 0.16; // 重大事件节点
      const size = major ? 0.26 + rnd() * 0.22 : 0.08 + rnd() * 0.12;
      arr.push({ pos: [x, y, z], major, size, hue: 0.55 + rnd() * 0.18 });
    }
    // 命名事件球：固定方向 × 半径（略向内，留在云内）
    const ev: [number, number, number][] = MEMORY_EVENTS.map((e) => {
      const len = Math.hypot(e.dir[0], e.dir[1], e.dir[2]) || 1;
      const k = (radius * 0.7) / len;
      return [e.dir[0] * k, e.dir[1] * k, e.dir[2] * k];
    });
    return { nodes: arr, R: radius, eventPos: ev };
  }, [density]);

  // 记忆关联：每个节点连接最近的 2 个邻居
  const edgePositions = useMemo(() => {
    const pts: number[] = [];
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const a = nodes[i].pos;
      let d1 = Infinity, d2 = Infinity, j1 = -1, j2 = -1;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = nodes[j].pos;
        const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
        if (d < d1) { d2 = d1; j2 = j1; d1 = d; j1 = j; }
        else if (d < d2) { d2 = d; j2 = j; }
      }
      if (j1 >= 0) pts.push(a[0], a[1], a[2], nodes[j1].pos[0], nodes[j1].pos[1], nodes[j1].pos[2]);
      if (j2 >= 0) pts.push(a[0], a[1], a[2], nodes[j2].pos[0], nodes[j2].pos[1], nodes[j2].pos[2]);
    }
    return new Float32Array(pts);
  }, [nodes]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.12;
  });

  // 低密度时「压缩的光滑外壳」更显著
  const shellOpacity = 0.4 - density * 0.3;

  return (
    <group ref={groupRef}>
      {/* 记忆关联连线 */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#7fd4ff" transparent opacity={0.18 + density * 0.12} />
      </lineSegments>

      {/* 背景记忆尘埃：随机的小事节点 */}
      {nodes.map((nd, i) => {
        const color = new THREE.Color().setHSL(nd.hue, 0.6, nd.major ? 0.6 : 0.5);
        return (
          <Sphere key={i} args={[nd.size, 16, 16]} position={nd.pos}>
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={nd.major ? 0.9 : 0.35}
              roughness={0.6}
              metalness={0.1}
            />
          </Sphere>
        );
      })}

      {/* 命名事件球：可点击，球上方有标题 */}
      {MEMORY_EVENTS.map((ev, i) => {
        const p = eventPos[i];
        const selected = selectedEventId === ev.id;
        const hovered = hoveredId === ev.id;
        const size = 0.42;
        const color = new THREE.Color().setHSL(ev.hue, 0.7, 0.62);
        return (
          <group key={ev.id} position={p}>
            <Sphere
              args={[selected ? size * 1.25 : size, 24, 24]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent?.(selected ? null : ev);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(ev.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredId((cur) => (cur === ev.id ? null : cur));
                document.body.style.cursor = 'auto';
              }}
            >
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={selected ? 1.4 : hovered ? 1.2 : 0.9}
                roughness={0.45}
                metalness={0.15}
              />
            </Sphere>
            {/* 仅悬停（触摸）时才显示事件标题 */}
            {hovered && (
              <Html position={[0, size + 0.32, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                <div className="flex flex-col items-center">
                  <div className="px-2 py-0.5 rounded-full bg-black/60 text-white text-xs whitespace-nowrap border border-white/20">
                    {ev.title}
                  </div>
                  <div className="mt-1 px-2 py-0.5 rounded bg-black/40 text-gray-300 text-[10px] whitespace-nowrap">
                    📅 {ev.date}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* 压缩的平淡日常：低密度时显著的光滑外壳 */}
      <mesh>
        <sphereGeometry args={[R * 1.04, 32, 32]} />
        <meshStandardMaterial
          color="#9fb4ff"
          transparent
          opacity={shellOpacity}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * 催眠具象化：意识透镜模型（方案A）
 *   三层：外部干扰层 / 意识空间 / 内在意象（DMN）
 *   对应理论：注意力收缩、背外侧前额叶抑制、默认模式网络(DMN)激活
 *   核心叙事：催眠是注意力的重新分配，不是控制；
 *            隐蔽观察者（后台觉察）始终在场。
 * ------------------------------------------------------------------ */

const fresnelVertex = `
varying vec3 vN;
varying vec3 vV;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;
const sphereFresnelFragment = `
varying vec3 vN;
varying vec3 vV;
uniform vec3 uColor;
uniform float uOpacity;
void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vV);
  float f = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  gl_FragColor = vec4(uColor, f * uOpacity);
}
`;
const lensFragment = `
varying vec3 vN;
varying vec3 vV;
uniform vec3 uColor;
uniform float uOpacity;
void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vV);
  float f = pow(1.0 - max(dot(N, V), 0.0), 1.5);
  gl_FragColor = vec4(uColor, f * uOpacity);
}
`;

export function HypnosisVisualization({ depth = 0, color = '#9fc4ff' }: { depth?: number; color?: string }) {
  const extRef = useRef<THREE.Points>(null);
  const intRef = useRef<THREE.Points>(null);
  const intBase = useRef<Float32Array | null>(null);
  const lensRef = useRef<THREE.Mesh>(null);
  const curtainRef = useRef<THREE.MeshStandardMaterial>(null);
  const extMatRef = useRef<THREE.PointsMaterial>(null);
  const intMatRef = useRef<THREE.PointsMaterial>(null);
  const sphereMatRef = useRef<THREE.ShaderMaterial>(null);
  const observerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const R = 4.2;

  // 主题色：自由可选，统一驱动内在光晕（球壳、透镜、内部思绪、评判光幕、隐蔽观察者）
  const mainColor = useMemo(() => new THREE.Color(color), [color]);
  const sphereUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.5 } }),
    [] // 颜色在 effect 内更新
  );
  const lensUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } }),
    []
  );

  useEffect(() => {
    mainColor.set(color);
    if (sphereMatRef.current) (sphereMatRef.current.uniforms.uColor.value as THREE.Color).copy(mainColor);
    if (lensRef.current) ((lensRef.current.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color).copy(mainColor);
    if (intMatRef.current) intMatRef.current.color.copy(mainColor);
    if (curtainRef.current) {
      curtainRef.current.color.copy(mainColor);
      curtainRef.current.emissive.copy(mainColor);
    }
    if (observerMatRef.current) observerMatRef.current.color.copy(mainColor.clone().lerp(new THREE.Color('#ffffff'), 0.45));
  }, [color, mainColor]);

  // 外部干扰粒子（球外，清醒时多，深化时淡出、被挡在球外）
  const extPositions = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    let s = 1234;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
      const u = rnd(), v = rnd();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const rr = R * (1.06 + rnd() * 0.55);
      pos[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = rr * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = rr * Math.cos(phi);
    }
    return pos;
  }, [R]);

  // 内部思绪/记忆/想象粒子（球内，深化时收拢向中心并增亮 = DMN 激活）
  const intData = useMemo(() => {
    const n = 800;
    const base = new Float32Array(n * 3);
    let s = 777;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
      const u = rnd(), v = rnd(), w = rnd();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const rr = R * 0.92 * Math.cbrt(w);
      base[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
      base[i * 3 + 1] = rr * Math.sin(phi) * Math.sin(theta);
      base[i * 3 + 2] = rr * Math.cos(phi);
    }
    intBase.current = base;
    return { pos: base.slice() };
  }, [R]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const d = depth; // 0 清醒 .. 1 深度催眠

    // 外部干扰：深化时淡出，清醒时更乱（旋转更快）
    if (extRef.current) {
      extRef.current.rotation.y += 0.0008 + (1 - d) * 0.0016;
      extRef.current.rotation.x += (1 - d) * 0.0006;
      if (extMatRef.current) extMatRef.current.opacity = (1 - d) * 0.5 + 0.02;
    }

    // 内部粒子：随深化向中心收拢并增亮，整体缓慢旋绕
    if (intRef.current && intBase.current) {
      const base = intBase.current;
      const attr = intRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const pos = attr.array as Float32Array;
      const cluster = 1 - 0.55 * d;
      const swirl = t * 0.05;
      const ca = Math.cos(swirl), sa = Math.sin(swirl);
      for (let i = 0; i < pos.length; i += 3) {
        const x = base[i] * cluster;
        const y = base[i + 1] * cluster;
        const z = base[i + 2] * cluster;
        pos[i] = x * ca - z * sa;
        pos[i + 1] = y;
        pos[i + 2] = x * sa + z * ca;
      }
      attr.needsUpdate = true;
      if (intMatRef.current) intMatRef.current.opacity = 0.35 + d * 0.5;
    }

    // 意识透镜：深化时浮现并增强聚焦（柔光曲面，无尖锐边缘）
    if (lensRef.current) {
      const s = 0.4 + d * 1.5;
      lensRef.current.scale.set(s, s, s * 0.45);
      const m = lensRef.current.material as THREE.ShaderMaterial;
      m.uniforms.uOpacity.value = d * 0.55;
    }

    // 前额叶评判光幕：深化时调暗但保留微弱微光（非消失，人仍保有自主判断）
    if (curtainRef.current) {
      curtainRef.current.emissiveIntensity = 0.15 + (1 - d) * 0.85;
      curtainRef.current.opacity = 0.12 + (1 - d) * 0.4;
    }
  });

  return (
    <group>
      <Stars radius={60} depth={30} count={400} factor={3} saturation={0} fade speed={0.4} />

      {/* 意识空间：半透明大球（仅边缘柔光，内部通透） */}
      <mesh>
        <sphereGeometry args={[R, 48, 48]} />
        <shaderMaterial
          ref={sphereMatRef}
          vertexShader={fresnelVertex}
          fragmentShader={sphereFresnelFragment}
          uniforms={sphereUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 外部干扰粒子：环境噪音 / 当下现实琐事 */}
      <points ref={extRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[extPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={extMatRef}
          color="#aeb6c2"
          map={getCircleTexture()}
          size={0.16}
          sizeAttenuation
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 内部思绪/记忆/想象粒子（DMN） */}
      <points ref={intRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[intData.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={intMatRef}
          color="#bfe6ff"
          map={getCircleTexture()}
          size={0.14}
          sizeAttenuation
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 意识透镜：柔光曲面，代表注意力聚焦（无尖锐边缘） */}
      <mesh ref={lensRef} scale={[0.4, 0.4, 0.18]}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          vertexShader={fresnelVertex}
          fragmentShader={lensFragment}
          uniforms={lensUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 背外侧前额叶：评判光幕（深化时调暗，保留隐蔽观察者微光） */}
      <mesh position={[R * 0.62, R * 0.55, R * 0.1]} rotation={[0, 0, -0.5]}>
        <circleGeometry args={[1.15, 32]} />
        <meshStandardMaterial
          ref={curtainRef}
          color="#cfe0ff"
          emissive="#cfe0ff"
          emissiveIntensity={1}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 隐蔽观察者：球体角落持续微弱光点，后台觉察始终在场 */}
      <mesh position={[-R * 0.7, -R * 0.72, R * 0.18]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial ref={observerMatRef} color="#dfe9ff" transparent opacity={0.55} />
      </mesh>

      {/* 暗示信号：柔和扩散波纹（非射线、非魔法光束） */}
      <HypnosisRipples color={color} />
    </group>
  );
}

// 缓慢扩散的柔和波纹，代表暗示信号
function HypnosisRipples({ color = '#bfe9ff' }: { color?: string }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const items = useMemo(() => [0, 1, 2], []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.12 + i / 3) % 1;
      const s = 0.6 + phase * 4.4;
      m.scale.set(s, s, s);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.22;
    });
  });
  return (
    <>
      {items.map((i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          rotation={[i * 0.7, i * 1.1, i * 0.4]}
        >
          <ringGeometry args={[0.96, 1.0, 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 催眠具象化：意识河流模型（方案B · 时间线催眠）
 *   一条宽阔的 3D 河流 = 意识；
 *   清醒时波涛多、河岸干扰侵入；深化时水面平静、河底记忆浮现。
 *   同样对应：注意力收缩、前额叶抑制、DMN 激活；隐蔽观察者始终在场。
 * ------------------------------------------------------------------ */

const riverVertex = `
varying vec2 vUv;
varying float vH;
uniform float uTime;
uniform float uWave;
void main(){
  vUv = uv;
  vec3 p = position;
  float w = sin(p.x * 0.5 + uTime * 1.1)
          + sin(p.y * 0.35 + uTime * 0.7)
          + 0.5 * sin((p.x + p.y) * 0.4 + uTime * 1.4);
  float h = w * uWave;
  p.z += h;
  vH = h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
const riverFragment = `
varying vec2 vUv;
varying float vH;
uniform float uDepth;
uniform vec3 uColor;
void main(){
  // 沿河流长度(vUv.y)做柔和渐变；近处亮、远处暗，引导视线向过去延伸
  // 颜色由主题色驱动，uColor 为水面本色，远处取其压暗版本
  vec3 farC = uColor * 0.30;
  vec3 nearC = uColor;
  vec3 col = mix(farC, nearC, vUv.y);
  col += vH * 0.25;                 // 波峰高光
  float alpha = 0.55 - uDepth * 0.18 + abs(vH) * 0.15;
  gl_FragColor = vec4(col, alpha);
}
`;

export function HypnosisRiverVisualization({ depth = 0, color = '#9fd9ff' }: { depth?: number; color?: string }) {
  const waterRef = useRef<THREE.ShaderMaterial>(null);
  const bankRef = useRef<THREE.Points>(null);
  const bankMat = useRef<THREE.PointsMaterial>(null);
  const nodeMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const curtainRef = useRef<THREE.MeshStandardMaterial>(null);
  const observerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const L = 40;
  const W = 7;

  // 主题色：自由可选，驱动河流本色、河底记忆、评判光幕与观察者
  const mainColor = useMemo(() => new THREE.Color(color), [color]);
  const waterUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uWave: { value: 0.5 }, uDepth: { value: 0 }, uColor: { value: new THREE.Color(color) } }),
    []
  );

  useEffect(() => {
    mainColor.set(color);
    if (waterRef.current) (waterRef.current.uniforms.uColor.value as THREE.Color).copy(mainColor);
    if (curtainRef.current) {
      curtainRef.current.color.copy(mainColor);
      curtainRef.current.emissive.copy(mainColor);
    }
    if (observerMatRef.current) observerMatRef.current.color.copy(mainColor.clone().lerp(new THREE.Color('#ffffff'), 0.45));
  }, [color, mainColor]);

  // 河岸 / 外部干扰粒子（清醒时多，深化时淡出、被挡在岸外）
  const bankPoints = useMemo(() => {
    const n = 500;
    const pos = new Float32Array(n * 3);
    let s = 4242;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
      const z = (rnd() - 0.5) * L;
      const side = rnd() < 0.5 ? -1 : 1;
      const off = 0.4 + rnd() * 1.8;
      const x = side * (W / 2 + off);
      const y = rnd() < 0.3 ? rnd() * 0.6 : 0.1; // 少量高出水面 = 侵入的干扰
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, [L, W]);

  // 河底记忆节点（DMN）：沿河流长度分布，深化时浮现增亮
  const { nodeData, edges } = useMemo(() => {
    const n = 14;
    const arr: { pos: [number, number, number]; hue: number }[] = [];
    let s = 2468;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
      const z = -L / 2 + 2 + (i / (n - 1)) * (L - 4) + (rnd() - 0.5) * 1.5;
      const x = (rnd() - 0.5) * (W - 1.5);
      const y = -0.9 - rnd() * 0.4;
      arr.push({ pos: [x, y, z], hue: 0.55 + rnd() * 0.2 });
    }
    const pts: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = arr[i].pos, b = arr[i + 1].pos;
      pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    return { nodeData: arr, edges: new Float32Array(pts) };
  }, [L, W]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const d = depth;
    if (waterRef.current) {
      waterRef.current.uniforms.uTime.value = t;
      waterRef.current.uniforms.uWave.value = (1 - d) * 0.5; // 清醒波涛多，深化变平缓
      waterRef.current.uniforms.uDepth.value = d;
    }
    if (bankMat.current) bankMat.current.opacity = (1 - d) * 0.5 + 0.02;
    if (bankRef.current) bankRef.current.rotation.y += (1 - d) * 0.0008;
    nodeMats.current.forEach((m) => { if (m) m.emissiveIntensity = 0.12 + d * 0.95; });
    if (curtainRef.current) {
      curtainRef.current.emissiveIntensity = 0.15 + (1 - d) * 0.85; // 调暗但保留微光
      curtainRef.current.opacity = 0.12 + (1 - d) * 0.4;
    }
  });

  return (
    <group>
      <Stars radius={70} depth={35} count={400} factor={3} saturation={0} fade speed={0.4} />

      {/* 河流表面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, L, 40, 120]} />
        <shaderMaterial
          ref={waterRef}
          vertexShader={riverVertex}
          fragmentShader={riverFragment}
          uniforms={waterUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 河底记忆节点 + 时间线连线 */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edges, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.25} />
      </lineSegments>
      {nodeData.map((nd, i) => {
        const c = mainColor.clone();
        c.offsetHSL(0, 0, (i - nodeData.length / 2) * 0.015); // 轻微明暗起伏
        return (
          <Sphere key={i} args={[0.28, 18, 18]} position={nd.pos}>
            <meshStandardMaterial
              ref={(el) => { nodeMats.current[i] = el; }}
              color={c}
              emissive={c}
              emissiveIntensity={0.12}
              roughness={0.5}
              metalness={0.1}
            />
          </Sphere>
        );
      })}

      {/* 河岸 / 外部干扰粒子 */}
      <points ref={bankRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[bankPoints, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={bankMat}
          color="#aeb6c2"
          map={getCircleTexture()}
          size={0.2}
          sizeAttenuation
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 前额叶评判光幕：近处“当下”一端，深化时调暗但保留微光 */}
      <mesh position={[0, 0.6, L / 2 - 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial
          ref={curtainRef}
          color="#cfe0ff"
          emissive="#cfe0ff"
          emissiveIntensity={1}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 隐蔽观察者：始终在场的微弱光点 */}
      <mesh position={[-W / 2 - 0.5, 0.4, -L / 2 + 2]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial ref={observerMatRef} color="#dfe9ff" transparent opacity={0.55} />
      </mesh>

      <RiverRipples depth={depth} color={color} />
    </group>
  );
}

// 河面上的柔和扩散波纹（暗示信号）
function RiverRipples({ depth, color = '#bfe9ff' }: { depth: number; color?: string }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const items = useMemo(() => [0, 1, 2, 3], []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.12 + i / 4) % 1;
      const s = 0.5 + phase * 6;
      m.scale.set(s, s, s);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.2 * (0.4 + depth * 0.6);
    });
  });
  return (
    <>
      {items.map((i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
        >
          <ringGeometry args={[0.96, 1.0, 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
}
