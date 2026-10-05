'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GeoData, pushGeometry, finalize, mulberry32 } from './geometryUtils';

/**
 * 痛苦梦境场景 —— 暴风雨中的黑色海面、枯树、雨幕、闪电与漂浮碎片。
 *
 * 保留原有的下坠球体与中心痛苦核心，并补上：
 *   海浪（顶点着色器位移）、枯树（合并几何体）、雨丝（合并几何体 + 着色器）、
 *   闪电（折线 + 闪光补光）、碎片、暗涡环。
 */

interface PainDreamSceneProps {
  config?: {
    rainDensity?: number;
    darkness?: number;
    lightningFreq?: number;
    waveHeight?: number;
    floatSpeed?: number;
  };
}

const SEA_Y = -3.5;
const RAIN_TOP = 20;
const RAIN_BOTTOM = -4;

/* ------------------------------------------------------------------ *
 * 🌊 暴风海面
 * ------------------------------------------------------------------ */

const SEA_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWaveHeight;

  varying float vHeight;
  varying float vDist;

  void main() {
    vec3 p = position;   // 平面在局部 XY，+Z 是法线方向（旋转后朝上）

    float w = 0.0;
    w += sin(p.x * 0.35 + uTime * 1.20) * 0.55;
    w += sin(p.y * 0.28 - uTime * 0.90) * 0.45;
    w += sin((p.x + p.y) * 0.18 + uTime * 1.70) * 0.35;
    w += sin((p.x - p.y) * 0.52 - uTime * 2.10) * 0.18;

    p.z += w * uWaveHeight;

    vHeight = w;
    vDist = length(position.xy);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const SEA_FRAGMENT = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uCrest;
  uniform float uRadius;

  varying float vHeight;
  varying float vDist;

  void main() {
    float t = clamp(vHeight * 0.45 + 0.5, 0.0, 1.0);
    vec3 c = mix(uDeep, uCrest, pow(t, 3.0));

    // 边缘淡出，避免出现生硬的方形边界
    float edge = 1.0 - smoothstep(uRadius * 0.45, uRadius * 0.72, vDist);

    gl_FragColor = vec4(c, edge);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------ *
 * 🌧 雨丝（合并几何体 + 顶点着色器，单次 draw call）
 * ------------------------------------------------------------------ */

const RAIN_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uTop;
  uniform float uBottom;

  attribute vec3 aOffset;
  attribute float aPhase;
  attribute float aSpeed;

  varying float vAlpha;

  void main() {
    float t = fract(uTime * aSpeed + aPhase);

    vec3 p = aOffset;
    p.y = uTop - t * (uTop - uBottom);
    // 风把雨吹斜
    p.x += sin(uTime * 0.5 + aPhase * 6.283) * 0.8 - t * 2.2;

    vAlpha = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.90, 1.0, t));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p + position, 1.0);
  }
`;

const RAIN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createRainGeometry(count: number, spread: number) {
  const positions: number[] = [];
  const offsets: number[] = [];
  const phases: number[] = [];
  const speeds: number[] = [];
  const indices: number[] = [];

  const rnd = mulberry32(555111);
  const w = 0.014;
  const h = 0.45;

  for (let i = 0; i < count; i++) {
    const base = i * 8;
    // 两片交叉的四边形，保证从任何角度看都不会消失
    positions.push(-w, h, 0, w, h, 0, w, -h, 0, -w, -h, 0);
    positions.push(0, h, -w, 0, h, w, 0, -h, w, 0, -h, -w);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    indices.push(base + 4, base + 5, base + 6, base + 4, base + 6, base + 7);

    const ox = (rnd() - 0.5) * spread;
    const oz = (rnd() - 0.5) * spread;
    for (let k = 0; k < 8; k++) offsets.push(ox, 0, oz);
    const phase = rnd();
    const speed = 0.22 + rnd() * 0.18;
    for (let k = 0; k < 8; k++) {
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
 * 🌲 枯树（递归分枝，合并成一份几何体）
 * ------------------------------------------------------------------ */

const BARK_BASE = new THREE.Color('#241d1a');
const BARK_TIP = new THREE.Color('#4a3a30');

function addBranch(
  data: GeoData,
  rnd: () => number,
  x: number,
  y: number,
  z: number,
  len: number,
  radius: number,
  tilt: number,
  yaw: number,
  depth: number
) {
  const base = new THREE.Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new THREE.Matrix4().makeRotationY(yaw))
    .multiply(new THREE.Matrix4().makeRotationZ(tilt));

  const cylinder = new THREE.CylinderGeometry(radius * 0.62, radius, len, 6);
  pushGeometry(
    data,
    cylinder,
    base.clone().multiply(new THREE.Matrix4().makeTranslation(0, len / 2, 0)),
    BARK_BASE.clone().lerp(BARK_TIP, Math.min(1, depth * 0.35))
  );
  cylinder.dispose();

  if (depth >= 2 || len < 0.7) return;

  const children = depth === 0 ? 3 : 2;
  for (let i = 0; i < children; i++) {
    const t = 0.6 + rnd() * 0.32;
    const tip = new THREE.Vector3(0, len * t, 0).applyMatrix4(base);
    addBranch(
      data,
      rnd,
      tip.x,
      tip.y,
      tip.z,
      len * (0.45 + rnd() * 0.25),
      radius * 0.55,
      tilt + (rnd() - 0.5) * 1.35,
      yaw + rnd() * Math.PI * 2,
      depth + 1
    );
  }
}

function createDeadTreeGeometry(seed: number): THREE.BufferGeometry {
  const data: GeoData = { positions: [], colors: [], indices: [] };
  const rnd = mulberry32(seed);
  addBranch(
    data,
    rnd,
    0,
    0,
    0,
    4.6 + rnd() * 2.2,
    0.24 + rnd() * 0.12,
    (rnd() - 0.5) * 0.12,
    rnd() * Math.PI * 2,
    0
  );
  return finalize(data);
}

/* ------------------------------------------------------------------ *
 * ⚡ 闪电折线
 * ------------------------------------------------------------------ */

function createBoltGeometry(rnd: () => number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  let x = (rnd() - 0.5) * 20;
  let z = (rnd() - 0.5) * 20;
  const steps = 14;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(new THREE.Vector3(x, RAIN_TOP + (2 - RAIN_TOP) * t, z));
    x += (rnd() - 0.5) * 2.0;
    z += (rnd() - 0.5) * 2.0;
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

/* ------------------------------------------------------------------ *
 * 主场景
 * ------------------------------------------------------------------ */

interface BoltState {
  next: number;
  until: number;
  rnd: () => number;
  geometry: THREE.BufferGeometry;
}

export default function PainDreamScene({ config }: PainDreamSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shardRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dropRefs = useRef<(THREE.Mesh | null)[]>([]);
  const boltRefs = useRef<(THREE.Line | null)[]>([]);
  const vortexRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);

  const darkness = config?.darkness ?? 0.5;
  const rainDensity = config?.rainDensity ?? 120;
  const lightningFreq = config?.lightningFreq ?? 0.05;
  const waveHeight = config?.waveHeight ?? 1;
  const floatSpeed = config?.floatSpeed ?? 0.4;

  /* ---------------- 海面 ---------------- */
  const seaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveHeight: { value: waveHeight },
      uRadius: { value: 45 },
      uDeep: { value: new THREE.Color('#050b16') },
      uCrest: { value: new THREE.Color('#6d7f96') }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ---------------- 雨丝 ---------------- */
  const rainCount = Math.min(rainDensity, 400);
  const rainGeometry = useMemo(() => createRainGeometry(rainCount, 26), [rainCount]);
  const rainUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: RAIN_TOP },
      uBottom: { value: RAIN_BOTTOM },
      uColor: { value: new THREE.Color('#9fb6d6') },
      uOpacity: { value: 0.55 }
    }),
    []
  );

  /* ---------------- 原有的下坠球体 ---------------- */
  const painElements = useMemo(() => {
    const rnd = mulberry32(1919);
    const count = Math.min(Math.floor(rainDensity / 5), 40);
    return Array.from({ length: count }, () => ({
      position: [
        (rnd() - 0.5) * 12,
        rnd() * 10 + 2,
        (rnd() - 0.5) * 12
      ] as [number, number, number],
      speed: 0.8 + rnd() * 0.7,
      phase: rnd() * Math.PI * 2,
      size: 0.2 + rnd() * 0.4,
      roughness: 0.6 + rnd() * 0.3
    }));
  }, [rainDensity]);

  /* ---------------- 枯树 ---------------- */
  const deadTreeGeometries = useMemo(
    () => [
      createDeadTreeGeometry(101),
      createDeadTreeGeometry(202),
      createDeadTreeGeometry(303)
    ],
    []
  );
  const deadTrees = useMemo(() => {
    const rnd = mulberry32(70707);
    return Array.from({ length: 6 }, (_, i) => ({
      geometry: deadTreeGeometries[i % deadTreeGeometries.length],
      position: [
        Math.cos((i / 6) * Math.PI * 2 + rnd()) * (6 + rnd() * 8),
        SEA_Y - 0.6,
        Math.sin((i / 6) * Math.PI * 2 + rnd()) * (6 + rnd() * 8)
      ] as [number, number, number],
      rotation: [0, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.12] as [number, number, number],
      scale: 0.8 + rnd() * 0.6
    }));
  }, [deadTreeGeometries]);

  /* ---------------- 漂浮碎片 ---------------- */
  const shardGeometries = useMemo(
    () => [
      new THREE.TetrahedronGeometry(0.42, 0),
      new THREE.OctahedronGeometry(0.38, 0),
      new THREE.BoxGeometry(0.62, 0.1, 0.34)
    ],
    []
  );
  const shards = useMemo(() => {
    const rnd = mulberry32(818181);
    return Array.from({ length: 18 }, () => ({
      geometry: shardGeometries[Math.floor(rnd() * shardGeometries.length)],
      position: [
        (rnd() - 0.5) * 14,
        0.5 + rnd() * 7,
        (rnd() - 0.5) * 14
      ] as [number, number, number],
      rotation: [rnd() * Math.PI, rnd() * Math.PI * 2, rnd() * Math.PI] as [number, number, number],
      spin: [(rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5] as [number, number, number],
      phase: rnd() * Math.PI * 2,
      floatAmp: 0.4 + rnd() * 0.9,
      scale: 0.7 + rnd() * 0.9,
      color: new THREE.Color().setHSL(0.0 + rnd() * 0.08, 0.35 + rnd() * 0.3, 0.18 + rnd() * 0.14)
    }));
  }, [shardGeometries]);

  /* ---------------- 暗涡环 ---------------- */
  const vortexRings = useMemo(() => {
    const rnd = mulberry32(606060);
    return Array.from({ length: 4 }, (_, i) => ({
      radius: 2.4 + i * 0.9 + rnd() * 0.3,
      tube: 0.05 + rnd() * 0.04,
      rotation: [Math.PI / 2 + (rnd() - 0.5) * 0.9, rnd() * Math.PI, (rnd() - 0.5) * 0.9] as [
        number,
        number,
        number
      ],
      speed: 0.1 + rnd() * 0.2,
      color: new THREE.Color().setHSL(0.98 + rnd() * 0.03, 0.7, 0.22 + rnd() * 0.1)
    }));
  }, []);

  /* ---------------- 闪电 ---------------- */
  const bolts = useMemo<BoltState[]>(
    () =>
      Array.from({ length: 3 }, (_, i) => {
        const rnd = mulberry32(4000 + i * 137);
        return {
          next: 0.5 + i * 1.7,
          until: 0,
          rnd,
          geometry: createBoltGeometry(rnd)
        };
      }),
    []
  );

  useEffect(() => {
    return () => {
      deadTreeGeometries.forEach((g) => g.dispose());
      shardGeometries.forEach((g) => g.dispose());
      bolts.forEach((b) => b.geometry.dispose());
    };
  }, [deadTreeGeometries, shardGeometries, bolts]);

  // 雨量变化时释放旧几何体
  useEffect(() => {
    return () => rainGeometry.dispose();
  }, [rainGeometry]);

  /* ---------------- 材质颜色 ---------------- */
  const bgColor = useMemo(
    () => new THREE.Color().setHSL(0.7, 0.6 + darkness * 0.3, 0.04 + darkness * 0.06),
    [darkness]
  );
  const painColor = useMemo(
    () => new THREE.Color().setHSL(0.0, 0.3, 0.3 + darkness * 0.2),
    [darkness]
  );
  const coreColor = useMemo(() => new THREE.Color().setHSL(0.0, 0.8, 0.2), []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.05;
    }

    // 海浪
    seaUniforms.uTime.value = time;
    seaUniforms.uWaveHeight.value = waveHeight;
    rainUniforms.uTime.value = time;

    // 原有的下坠球体
    for (let i = 0; i < painElements.length; i++) {
      const mesh = dropRefs.current[i];
      if (!mesh) continue;
      const e = painElements[i];

      mesh.position.y -= e.speed * 0.08;
      mesh.rotation.x += e.speed * 0.03;
      mesh.rotation.z += e.speed * 0.03;

      if (mesh.position.y < SEA_Y) {
        mesh.position.y = Math.random() * 8 + 12;
        mesh.position.x = (Math.random() - 0.5) * 12;
        mesh.position.z = (Math.random() - 0.5) * 12;
      }

      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.opacity = Math.max(0.15, 0.4 + Math.sin(time * 2 + e.phase) * 0.2);
    }

    // 碎片漂浮 + 旋转
    for (let i = 0; i < shards.length; i++) {
      const mesh = shardRefs.current[i];
      if (!mesh) continue;
      const s = shards[i];

      mesh.rotation.x = s.rotation[0] + time * s.spin[0] * floatSpeed;
      mesh.rotation.y = s.rotation[1] + time * s.spin[1] * floatSpeed;
      mesh.rotation.z = s.rotation[2] + time * s.spin[2] * floatSpeed;
      mesh.position.y =
        s.position[1] + Math.sin(time * 0.6 + s.phase) * s.floatAmp * floatSpeed;
    }

    // 暗涡环旋转
    if (vortexRef.current) {
      vortexRef.current.children.forEach((ring, i) => {
        ring.rotation.z += delta * (vortexRings[i]?.speed ?? 0.2);
      });
    }

    // 闪电
    let flashing = false;
    for (let i = 0; i < bolts.length; i++) {
      const line = boltRefs.current[i];
      if (!line) continue;
      const bolt = bolts[i];

      if (time > bolt.next) {
        bolt.next = time + 0.4 + Math.random() * Math.max(0.6, 4.5 - lightningFreq * 30);
        bolt.until = time + 0.1 + Math.random() * 0.18;

        // 换一个新的折线形状
        line.geometry.dispose();
        line.geometry = createBoltGeometry(bolt.rnd);
      }

      const on = time < bolt.until;
      line.visible = on;
      if (on) {
        (line.material as THREE.LineBasicMaterial).opacity = 0.35 + Math.random() * 0.65;
        flashing = true;
      }
    }

    // 闪电补光
    if (flashLightRef.current) {
      flashLightRef.current.intensity = flashing ? 9 + Math.random() * 8 : 0;
    }

    // 核心随闪电一起搏动
    if (coreRef.current) {
      const material = coreRef.current.material as THREE.MeshPhysicalMaterial;
      material.emissiveIntensity = flashing
        ? 2.5 + Math.random() * 3
        : 0.5 + Math.sin(time * 1.5) * 0.15;
    }
  });

  return (
    <>
      {/* 背景改为纯色，省掉一个 96x96 的天空球 */}
      <color attach="background" args={[bgColor.getHex()]} />

      <group ref={groupRef}>
        {/* 🌊 暴风海面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y, 0]}>
          <planeGeometry args={[90, 90, 90, 90]} />
          <shaderMaterial
            vertexShader={SEA_VERTEX}
            fragmentShader={SEA_FRAGMENT}
            uniforms={seaUniforms}
            transparent
          />
        </mesh>

        {/* 🌧 雨丝 */}
        <mesh geometry={rainGeometry} frustumCulled={false}>
          <shaderMaterial
            vertexShader={RAIN_VERTEX}
            fragmentShader={RAIN_FRAGMENT}
            uniforms={rainUniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 🌲 枯树 */}
        {deadTrees.map((tree, i) => (
          <mesh
            key={`tree-${i}`}
            geometry={tree.geometry}
            position={tree.position}
            rotation={tree.rotation}
            scale={tree.scale}
          >
            <meshStandardMaterial
              vertexColors
              roughness={0.95}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

        {/* 原有的痛苦元素（下坠球体） */}
        {painElements.map((element, i) => (
          <mesh
            key={`drop-${i}`}
            ref={(el) => {
              dropRefs.current[i] = el;
            }}
            position={element.position}
          >
            <sphereGeometry args={[element.size, 24, 24]} />
            <meshPhysicalMaterial
              color={painColor}
              roughness={element.roughness}
              metalness={0.2}
              transparent
              opacity={0.5}
              clearcoat={0.3}
              envMapIntensity={0.5}
            />
          </mesh>
        ))}

        {/* 中心痛苦核心 */}
        <mesh ref={coreRef} name="painCore" position={[0, 3, 0]}>
          <sphereGeometry args={[1.8, 48, 48]} />
          <meshPhysicalMaterial
            color={coreColor}
            roughness={0.7}
            metalness={0.3}
            emissive="#8B0000"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
            clearcoat={0.5}
            envMapIntensity={1.2}
          />
        </mesh>

        {/* 内层暗核 */}
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshPhysicalMaterial
            color="#1a0000"
            roughness={0.9}
            metalness={0.4}
            emissive="#4A0000"
            emissiveIntensity={0.8}
          />
        </mesh>

        {/* 漂浮碎片 */}
        {shards.map((s, i) => (
          <mesh
            key={`shard-${i}`}
            ref={(el) => {
              shardRefs.current[i] = el;
            }}
            geometry={s.geometry}
            position={s.position}
            rotation={s.rotation}
            scale={s.scale}
          >
            <meshStandardMaterial
              color={s.color}
              roughness={0.85}
              metalness={0.35}
              emissive="#3a0000"
              emissiveIntensity={0.25}
              flatShading
            />
          </mesh>
        ))}

        {/* 暗涡环 */}
        <group ref={vortexRef} position={[0, 3, 0]}>
          {vortexRings.map((ring, i) => (
            <mesh key={`vortex-${i}`} rotation={ring.rotation}>
              <torusGeometry args={[ring.radius, ring.tube, 8, 64]} />
              <meshStandardMaterial
                color={ring.color}
                emissive="#6b0000"
                emissiveIntensity={0.6}
                roughness={0.6}
                metalness={0.3}
                transparent
                opacity={0.75}
              />
            </mesh>
          ))}
        </group>

        {/* ⚡ 闪电 */}
        {bolts.map((bolt, i) => (
          <line
            key={`bolt-${i}`}
            ref={(el) => {
              boltRefs.current[i] = el;
            }}
            geometry={bolt.geometry}
            visible={false}
          >
            <lineBasicMaterial
              color="#cfe0ff"
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </line>
        ))}
      </group>

      {/* 照明 */}
      <ambientLight
        intensity={0.2 + darkness * 0.2}
        color={new THREE.Color().setHSL(0.7, 0.5, 0.3)}
      />
      <directionalLight position={[5, 10, 5]} intensity={0.3} color="#8B0000" />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#4A4A4A" distance={20} />
      <pointLight
        position={[0, 8, 0]}
        intensity={0.3}
        color={new THREE.Color().setHSL(0.0, 0.8, 0.2)}
        distance={15}
      />
      {/* 闪电补光 */}
      <pointLight
        ref={flashLightRef}
        position={[0, 14, 0]}
        intensity={0}
        color="#cfe0ff"
        distance={70}
        decay={2}
      />

      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.8}
          radius={0.65}
        />
      </EffectComposer>
    </>
  );
}
