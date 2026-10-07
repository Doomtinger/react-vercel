'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
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
