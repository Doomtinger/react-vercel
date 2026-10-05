'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { mulberry32 } from './geometryUtils';

/**
 * 中立梦境场景 —— 暮色草地、许多大树，以及其间游动的萤火虫。
 *
 * 草地用一整块合并几何体 + 顶点着色器摆动（单次 draw call，GPU 动画），
 * 树木按种子随机生成树干 + 多层低多边形树冠，
 * 萤火虫是一个着色器点精灵系统（游动 + 呼吸式明暗），
 * 其中几只会带真实的点光源，把光洒在草叶和树干上。
 */

interface NeutralDreamSceneProps {
  config?: {
    grassCount?: number;
    windStrength?: number;
    treeSize?: number;
    treeCount?: number;
    fireflyCount?: number;
  };
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

/** 地面半径：草地与树木都分布在这个圆盘内 */
const GROUND_RADIUS = 30;

/* ------------------------------------------------------------------ *
 * 草地：合并几何体 + 顶点着色器风摆
 * ------------------------------------------------------------------ */

const GRASS_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWind;

  attribute float aPhase;
  attribute float aFlex;   // 0 = 根部, 1 = 叶尖
  attribute float aTint;

  varying float vFlex;
  varying float vTint;

  void main() {
    vec3 p = position;

    // 只有越靠近叶尖摆动越大
    float f = aFlex * aFlex;
    float swayX = sin(uTime * 1.7 + aPhase) * 0.30 + sin(uTime * 0.6 + aPhase * 1.7) * 0.12;
    float swayZ = cos(uTime * 1.25 + aPhase * 0.8) * 0.18;

    p.x += swayX * uWind * f;
    p.z += swayZ * uWind * f;
    p.y -= (abs(swayX) * 0.12 + abs(swayZ) * 0.08) * uWind * f;

    vFlex = aFlex;
    vTint = aTint;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform vec3 uRootColor;
  uniform vec3 uTipColor;

  varying float vFlex;
  varying float vTint;

  void main() {
    vec3 c = mix(uRootColor, uTipColor, clamp(vFlex * 0.8 + vTint * 0.2, 0.0, 1.0));
    gl_FragColor = vec4(c, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function buildGrassGeometry(count: number, radius: number) {
  // 每根草 3 行 x 2 列 = 6 个顶点，4 个三角形
  const VERTS = 6;
  const positions = new Float32Array(count * VERTS * 3);
  const phases = new Float32Array(count * VERTS);
  const flexes = new Float32Array(count * VERTS);
  const tints = new Float32Array(count * VERTS);
  const indices = new Uint32Array(count * 12);

  const rows = [0, 0.5, 1];
  const rnd = mulberry32(20240501);

  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt(rnd());
    const a = rnd() * Math.PI * 2;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;

    const h = 0.5 + rnd() * 0.75;
    const w = 0.05 + rnd() * 0.05;
    const yaw = rnd() * Math.PI;
    const px = -Math.sin(yaw);
    const pz = Math.cos(yaw);
    const leanX = Math.cos(a * 1.7 + rnd());
    const leanZ = Math.sin(a * 1.7 + rnd());

    const phase = rnd() * Math.PI * 2;
    const tint = rnd();

    for (let row = 0; row < 3; row++) {
      const t = rows[row];
      const y = h * t;
      const shrink = 1 - t * 0.75;
      const lean = h * t * t * 0.22;
      const cx = bx + leanX * lean;
      const cz = bz + leanZ * lean;

      for (let col = 0; col < 2; col++) {
        const sign = col === 0 ? -1 : 1;
        const vi = i * VERTS + row * 2 + col;

        positions[vi * 3] = cx + px * w * shrink * sign;
        positions[vi * 3 + 1] = y;
        positions[vi * 3 + 2] = cz + pz * w * shrink * sign;

        phases[vi] = phase;
        flexes[vi] = t;
        tints[vi] = tint;
      }
    }

    const base = i * VERTS;
    const io = i * 12;
    indices[io] = base;
    indices[io + 1] = base + 1;
    indices[io + 2] = base + 2;
    indices[io + 3] = base + 2;
    indices[io + 4] = base + 1;
    indices[io + 5] = base + 3;
    indices[io + 6] = base + 2;
    indices[io + 7] = base + 3;
    indices[io + 8] = base + 4;
    indices[io + 9] = base + 4;
    indices[io + 10] = base + 3;
    indices[io + 11] = base + 5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aFlex', new THREE.BufferAttribute(flexes, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  return geometry;
}

/* ------------------------------------------------------------------ *
 * ✨ 萤火虫：点精灵 + 游动 + 呼吸式明暗
 * ------------------------------------------------------------------ */

let glowTexture: THREE.Texture | null = null;

function getGlowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (glowTexture) return glowTexture;

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
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.14)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.needsUpdate = true;
  return glowTexture;
}

const FIREFLY_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;

  attribute float aPhase;
  attribute float aSpeed;
  attribute float aScale;

  varying float vGlow;

  void main() {
    // 缓慢游动
    vec3 p = position;
    p.x += sin(uTime * 0.35 * aSpeed + aPhase * 6.283) * 1.7;
    p.y += sin(uTime * 0.27 * aSpeed + aPhase * 11.0) * 0.9;
    p.z += cos(uTime * 0.31 * aSpeed + aPhase * 8.50) * 1.7;

    // 呼吸式明暗：只有正半周发光，像萤火虫一闪一闪
    float blink = sin(uTime * (1.0 + aSpeed * 1.6) + aPhase * 6.283);
    vGlow = pow(max(blink, 0.0), 1.6);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * aScale * (0.55 + vGlow * 0.9) * (uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FIREFLY_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColorCore;
  uniform vec3 uColorGlow;

  varying float vGlow;

  void main() {
    float mask = texture2D(uMap, gl_PointCoord).a;
    vec3 c = mix(uColorGlow, uColorCore, vGlow);

    gl_FragColor = vec4(c * (0.6 + vGlow * 0.9), mask * (0.12 + vGlow * 0.95));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** 与着色器完全一致的游动公式，用于让几只“领头”萤火虫带动真实点光源 */
function fireflyOffset(time: number, phase: number, speed: number) {
  return {
    x: Math.sin(time * 0.35 * speed + phase * 6.283) * 1.7,
    y: Math.sin(time * 0.27 * speed + phase * 11.0) * 0.9,
    z: Math.cos(time * 0.31 * speed + phase * 8.5) * 1.7,
    glow: Math.pow(
      Math.max(Math.sin(time * (1.0 + speed * 1.6) + phase * 6.283), 0),
      1.6
    )
  };
}

interface FireflyData {
  positions: Float32Array;
  phases: Float32Array;
  speeds: Float32Array;
  scales: Float32Array;
  heroes: { base: [number, number, number]; phase: number; speed: number }[];
}

function createFireflyData(count: number, radius: number): FireflyData {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const scales = new Float32Array(count);
  const heroes: FireflyData['heroes'] = [];

  const rnd = mulberry32(24680);

  for (let i = 0; i < count; i++) {
    const r = 2 + rnd() * (radius - 2);
    const a = rnd() * Math.PI * 2;
    const base: [number, number, number] = [
      Math.cos(a) * r,
      0.4 + rnd() * 6.5,   // 分布在草丛与树冠之间
      Math.sin(a) * r
    ];

    positions[i * 3] = base[0];
    positions[i * 3 + 1] = base[1];
    positions[i * 3 + 2] = base[2];

    const phase = rnd();
    const speed = 0.5 + rnd() * 1.2;
    phases[i] = phase;
    speeds[i] = speed;
    scales[i] = 0.7 + rnd() * 0.8;

    if (i < 3) heroes.push({ base, phase, speed });
  }

  return { positions, phases, speeds, scales, heroes };
}

/* ------------------------------------------------------------------ *
 * 单棵树
 * ------------------------------------------------------------------ */

interface TreeProps {
  position: [number, number, number];
  scale: number;
  seed: number;
  windStrength: number;
}

const Tree: React.FC<TreeProps> = ({ position, scale, seed, windStrength }) => {
  const canopyRef = useRef<THREE.Group>(null);

  const tree = useMemo(() => {
    const rnd = mulberry32(Math.floor(seed * 100000));

    const height = 5 + rnd() * 3.2;              // 树干高度 5 ~ 8.2
    const trunkRadius = 0.26 + rnd() * 0.16;
    const canopyRadius = 1.7 + rnd() * 1.0;

    // 3~4 团树冠，围绕树顶错落分布
    const clusterCount = 3 + (rnd() > 0.5 ? 1 : 0);
    const clusters = Array.from({ length: clusterCount }, (_, i) => {
      const angle = (i / clusterCount) * Math.PI * 2 + rnd() * 0.9;
      const spread = canopyRadius * (0.35 + rnd() * 0.35);
      return {
        offset: [
          Math.cos(angle) * spread,
          (rnd() - 0.35) * canopyRadius * 0.55,
          Math.sin(angle) * spread
        ] as [number, number, number],
        radius: canopyRadius * (0.62 + rnd() * 0.3),
        color: new THREE.Color().setHSL(
          0.25 + rnd() * 0.09,       // 绿 ~ 黄绿
          0.45 + rnd() * 0.25,
          0.26 + rnd() * 0.16
        )
      };
    });

    // 两根侧枝，让树看起来更“大”
    const branches = Array.from({ length: 2 }, (_, i) => {
      const angle = rnd() * Math.PI * 2;
      return {
        angle,
        at: height * (0.55 + rnd() * 0.2),
        length: canopyRadius * (0.5 + rnd() * 0.3),
        tilt: 0.5 + rnd() * 0.35
      };
    });

    return { height, trunkRadius, canopyRadius, clusters, branches };
  }, [seed]);

  useFrame((state) => {
    if (!canopyRef.current) return;
    const t = state.clock.elapsedTime;
    canopyRef.current.rotation.z =
      Math.sin(t * 0.9 + seed * 6.2) * 0.06 * windStrength;
    canopyRef.current.rotation.x =
      Math.cos(t * 0.7 + seed * 4.4) * 0.05 * windStrength;
  });

  return (
    <group position={position} scale={scale}>
      {/* 树干 */}
      <mesh position={[0, tree.height / 2, 0]}>
        <cylinderGeometry
          args={[tree.trunkRadius * 0.72, tree.trunkRadius * 1.3, tree.height, 10]}
        />
        <meshStandardMaterial color="#6b4f2f" roughness={0.95} metalness={0} />
      </mesh>

      {/*
        侧枝：先绕 Z 转成水平，再绕 Y 转到枝条朝向；tilt 让它略微上扬
      */}
      {tree.branches.map((branch, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(branch.angle) * branch.length * 0.35,
            branch.at,
            Math.sin(branch.angle) * branch.length * 0.35
          ]}
          rotation={[0, -branch.angle, -Math.PI / 2 + branch.tilt * 0.6]}
        >
          <cylinderGeometry args={[0.07, 0.12, branch.length, 6]} />
          <meshStandardMaterial color="#6b4f2f" roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* 树冠（随风轻摆） */}
      <group ref={canopyRef} position={[0, tree.height, 0]}>
        {tree.clusters.map((cluster, i) => (
          <mesh key={i} position={cluster.offset}>
            <icosahedronGeometry args={[cluster.radius, 1]} />
            <meshStandardMaterial
              color={cluster.color}
              roughness={0.88}
              metalness={0}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ *
 * 主场景
 * ------------------------------------------------------------------ */

export default function NeutralDreamScene({ config }: NeutralDreamSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pollenRef = useRef<THREE.Group>(null);
  const heroLightRefs = useRef<(THREE.PointLight | null)[]>([]);

  const windStrength = config?.windStrength ?? 0.5;
  const grassCount = config?.grassCount ?? 2500;
  const treeSize = config?.treeSize ?? 1;
  const treeCount = config?.treeCount ?? 22;
  const fireflyCount = config?.fireflyCount ?? 140;

  // 草地几何体（一次性构建，之后只更新 uniform）
  const grassGeometry = useMemo(
    () => buildGrassGeometry(Math.min(grassCount, 6000), GROUND_RADIUS - 2),
    [grassCount]
  );

  const grassUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: windStrength },
      // 暮色调：比日光下更暗、更偏冷，才能让萤火虫的光看得见
      uRootColor: { value: new THREE.Color('#1e4520') },
      uTipColor: { value: new THREE.Color('#6ea855') }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 树木布局：环形分布，中间留空以便看清场景
  const trees = useMemo(() => {
    const rnd = mulberry32(913377);
    return Array.from({ length: treeCount }, (_, i) => {
      const angle = rnd() * Math.PI * 2;
      const radius = 6.5 + rnd() * (GROUND_RADIUS - 11);
      return {
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ] as [number, number, number],
        scale: (0.85 + rnd() * 0.7) * treeSize,
        seed: rnd()
      };
    });
  }, [treeCount, treeSize]);

  // 萤火虫
  const fireflies = useMemo(
    () => createFireflyData(Math.max(4, fireflyCount), GROUND_RADIUS - 4),
    [fireflyCount]
  );

  const fireflyGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(fireflies.positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(fireflies.phases, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(fireflies.speeds, 1));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(fireflies.scales, 1));
    geometry.computeBoundingSphere();
    return geometry;
  }, [fireflies]);

  useEffect(() => {
    return () => fireflyGeometry.dispose();
  }, [fireflyGeometry]);

  const fireflyUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 0.42 },
      uScale: { value: 300 },
      uMap: { value: getGlowTexture() },
      uColorCore: { value: new THREE.Color('#fff3b0') },
      uColorGlow: { value: new THREE.Color('#9ef01a') }
    }),
    []
  );

  // 空中飘浮的花粉
  const pollen = useMemo(() => {
    const rnd = mulberry32(4242);
    return Array.from({ length: 26 }, () => ({
      position: [
        (rnd() - 0.5) * 26,
        1.5 + rnd() * 7,
        (rnd() - 0.5) * 26
      ] as [number, number, number],
      radius: 0.05 + rnd() * 0.07
    }));
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // 草地摆动
    grassUniforms.uTime.value = time;
    grassUniforms.uWind.value = windStrength;

    // 整体缓慢旋转
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.015;
    }

    // 花粉缓慢上浮
    if (pollenRef.current) {
      pollenRef.current.rotation.y = time * 0.05;
      pollenRef.current.position.y = Math.sin(time * 0.4) * 0.4;
    }

    // 萤火虫：点尺寸需要按画布高度换算（与 three 的 sizeAttenuation 一致）
    fireflyUniforms.uTime.value = time;
    fireflyUniforms.uScale.value = state.size.height * state.gl.getPixelRatio() * 0.5;

    // 几只领头萤火虫带动真实点光源，把光洒在草叶和树干上
    for (let i = 0; i < fireflies.heroes.length; i++) {
      const light = heroLightRefs.current[i];
      if (!light) continue;
      const h = fireflies.heroes[i];
      const o = fireflyOffset(time, h.phase, h.speed);

      light.position.set(h.base[0] + o.x, h.base[1] + o.y, h.base[2] + o.z);
      light.intensity = 0.5 + o.glow * 3.2;
    }
  });

  return (
    <>
      {/* 暮色天空：萤火虫在日光下看不见，所以整体压到傍晚 */}
      <color attach="background" args={['#3a5680']} />

      <group ref={groupRef}>
        {/* 草地地面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <circleGeometry args={[GROUND_RADIUS, 72]} />
          <meshStandardMaterial color="#2f5a2c" roughness={1} metalness={0} />
        </mesh>

        {/* 草叶 */}
        <mesh geometry={grassGeometry} frustumCulled={false}>
          <shaderMaterial
            vertexShader={GRASS_VERTEX}
            fragmentShader={GRASS_FRAGMENT}
            uniforms={grassUniforms}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 大树 */}
        {trees.map((tree, i) => (
          <Tree
            key={i}
            position={tree.position}
            scale={tree.scale}
            seed={tree.seed}
            windStrength={windStrength}
          />
        ))}

        {/* ✨ 萤火虫 */}
        <points geometry={fireflyGeometry} frustumCulled={false}>
          <shaderMaterial
            vertexShader={FIREFLY_VERTEX}
            fragmentShader={FIREFLY_FRAGMENT}
            uniforms={fireflyUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        {/* 领头萤火虫的真实点光源（放在旋转组内，才能和点精灵位置一致） */}
        {fireflies.heroes.map((_, i) => (
          <pointLight
            key={`firefly-light-${i}`}
            ref={(el) => {
              heroLightRefs.current[i] = el;
            }}
            intensity={0.5}
            color="#c8ff8a"
            distance={9}
            decay={2}
          />
        ))}

        {/* 飘浮花粉 */}
        <group ref={pollenRef}>
          {pollen.map((p, i) => (
            <mesh key={i} position={p.position}>
              <sphereGeometry args={[p.radius, 8, 8]} />
              <meshStandardMaterial
                color="#dff3c8"
                emissive="#c8e6a0"
                emissiveIntensity={0.5}
                roughness={0.6}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
        </group>
      </group>

      {/* 照明：傍晚的余晖 + 冷色天光（整体压暗，让萤火虫的光凸显） */}
      <hemisphereLight args={['#7ea0d4', '#26471f', 0.45]} />
      <ambientLight intensity={0.22} color="#9fb4d8" />
      {/* 低角度的暖色夕照 */}
      <directionalLight position={[12, 5, 4]} intensity={0.5} color="#ffcf9a" />
      {/* 天光补色 */}
      <directionalLight position={[-10, 8, -8]} intensity={0.2} color="#7fa8e0" />

      {/* 柔和 Bloom */}
      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.85}
          radius={0.7}
        />
      </EffectComposer>
    </>
  );
}
