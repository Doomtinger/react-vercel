'use client';

import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Branch = { start: THREE.Vector3; end: THREE.Vector3; r0: number; r1: number };

// ---------- 几何体构造 ----------
// 单朵樱花：5 片花瓣（扁球）+ 花蕊
function createFlowerGeometry(): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  const petalBase = new THREE.SphereGeometry(1, 7, 6);
  const petalScale = new THREE.Matrix4().makeScale(0.5, 0.14, 0.95);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const g = petalBase.clone();
    g.applyMatrix4(petalScale);
    const m = new THREE.Matrix4().makeTranslation(dir.x * 0.55, 0.06, dir.z * 0.55);
    m.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2 - a));
    g.applyMatrix4(m);
    geos.push(g);
  }

  const center = new THREE.SphereGeometry(0.2, 5, 5);
  center.scale(1, 0.55, 1);
  center.translate(0, 0.07, 0);
  geos.push(center);

  const merged = mergeGeometries(geos, false) as THREE.BufferGeometry;
  petalBase.dispose();
  geos.forEach((g) => g.dispose());
  return merged;
}

// 单片花瓣（落瓣/地面落瓣用）
function createPetalGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 8, 8);
  g.scale(0.5, 0.1, 1.05);
  return g;
}

// 单位圆柱（沿 Y 轴，高度 1，半径 1），按段缩放成树枝
function createBranchGeometry(): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(1, 1, 1, 6, 1);
}

// 樱花四色：粉红为主，白 / 淡黄 / 深红 也需要
function pickBlossomColor(color: THREE.Color) {
  const r = Math.random();
  if (r < 0.55) {
    // 粉红色（主色）
    color.setHSL(0.9 + Math.random() * 0.04, 0.55 + Math.random() * 0.22, 0.66 + Math.random() * 0.12);
  } else if (r < 0.7) {
    // 白色（微粉）
    color.setHSL(0.9 + Math.random() * 0.03, 0.05 + Math.random() * 0.12, 0.9 + Math.random() * 0.07);
  } else if (r < 0.85) {
    // 淡黄色
    color.setHSL(0.13 + Math.random() * 0.04, 0.5 + Math.random() * 0.2, 0.78 + Math.random() * 0.1);
  } else {
    // 深红色
    color.setHSL(0.96 + Math.random() * 0.03, 0.7 + Math.random() * 0.2, 0.42 + Math.random() * 0.12);
  }
}

// 每棵树统一一种颜色（粉红为主，白 / 淡黄 / 深红 各占）
function makeTreeColor(): THREE.Color {
  const c = new THREE.Color();
  const r = Math.random();
  if (r < 0.55) {
    c.setHSL(0.91 + (Math.random() - 0.5) * 0.02, 0.6 + Math.random() * 0.1, 0.7 + (Math.random() - 0.5) * 0.06);
  } else if (r < 0.7) {
    c.setHSL(0.9, 0.06 + Math.random() * 0.06, 0.9 + Math.random() * 0.05);
  } else if (r < 0.85) {
    c.setHSL(0.14 + (Math.random() - 0.5) * 0.02, 0.55 + Math.random() * 0.1, 0.8 + (Math.random() - 0.5) * 0.05);
  } else {
    c.setHSL(0.97 + (Math.random() - 0.5) * 0.02, 0.78 + Math.random() * 0.1, 0.46 + (Math.random() - 0.5) * 0.06);
  }
  return c;
}

// ---------- 递归生成树 ----------
type Flower = { position: THREE.Vector3; color: THREE.Color };

function grow(
  start: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  origin: THREE.Vector3,
  treeColor: THREE.Color,
  branches: Branch[],
  flowers: Flower[]
) {
  const end = start.clone().add(dir.clone().multiplyScalar(length));
  branches.push({
    start: start.clone().add(origin),
    end: end.clone().add(origin),
    r0: radius,
    r1: radius * 0.72,
  });

  // 沿枝条（枝桠）分布花朵：越靠枝梢越密，不再是只在头部
  if (depth <= 3) {
    const lateral = depth === 0 ? 4 : depth === 1 ? 2 : depth === 2 ? 1 : 0;
    for (let k = 0; k < lateral; k++) {
      const t = 0.15 + Math.random() * 0.8;
      const base = start.clone().lerp(end, t).add(origin);
      flowers.push({
        position: base.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.35,
            (Math.random() - 0.5) * 0.35,
            (Math.random() - 0.5) * 0.35
          )
        ),
        color: treeColor,
      });
    }
  }

  if (depth <= 0) {
    // 枝头额外一簇，让树冠更饱满
    const tip = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < tip; k++) {
      flowers.push({
        position: end.clone().add(origin).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.2) * 0.6,
            (Math.random() - 0.5) * 0.6
          )
        ),
        color: treeColor,
      });
    }
    return;
  }

  const n = 2 + (Math.random() < 0.5 ? 1 : 0);
  const childLen = length * (0.74 + Math.random() * 0.08);
  const childRad = radius * 0.72;
  for (let i = 0; i < n; i++) {
    const newDir = dir.clone();
    const spread = 0.6 + Math.random() * 0.6;
    newDir.x += (Math.random() - 0.5) * spread;
    newDir.z += (Math.random() - 0.5) * spread;
    newDir.y += 0.16; // 向上偏置
    newDir.normalize();
    grow(end, newDir, childLen, childRad, depth - 1, origin, treeColor, branches, flowers);
  }
}

function buildScene() {
  const branches: Branch[] = [];
  const flowers: Flower[] = [];

  // 中心 1 棵 + 3 圈共 20 棵
  const trees: { origin: THREE.Vector3; scale: number; color: THREE.Color }[] = [];
  trees.push({ origin: new THREE.Vector3(0, 0, 0), scale: 0.9, color: makeTreeColor() });
  let seed = 1;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const rings = [
    { r: 5, n: 5 },
    { r: 10, n: 7 },
    { r: 14, n: 7 },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
      const rr = ring.r + (rnd() - 0.5) * 2;
      trees.push({
        origin: new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr),
        scale: 0.65 + rnd() * 0.35,
        color: makeTreeColor(),
      });
    }
  }

  for (const t of trees) {
    grow(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3((Math.random() - 0.5) * 0.1, 1, (Math.random() - 0.5) * 0.1).normalize(),
      2.6 * t.scale,
      0.3 * t.scale,
      6,
      t.origin,
      t.color,
      branches,
      flowers
    );
  }

  // 地面散落的落瓣
  const fallen: THREE.Vector3[] = [];
  for (let i = 0; i < 500; i++) {
    const r = Math.sqrt(Math.random()) * 30;
    const a = Math.random() * Math.PI * 2;
    fallen.push(new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r));
  }

  return { branches, flowers, fallen };
}

// ---------- 实例化渲染 ----------
function BranchMesh({ branches }: { branches: Branch[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => createBranchGeometry(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.9, metalness: 0 }),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useLayoutEffect(() => {
    const q = new THREE.Quaternion();
    branches.forEach((b, i) => {
      const mid = b.start.clone().add(b.end).multiplyScalar(0.5);
      const len = b.start.distanceTo(b.end);
      const dir = b.end.clone().sub(b.start).normalize();
      q.setFromUnitVectors(up, dir);
      const r = (b.r0 + b.r1) / 2;
      dummy.position.copy(mid);
      dummy.quaternion.copy(q);
      dummy.scale.set(r, len, r);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [branches]);

  return <instancedMesh ref={ref} args={[geo, mat, branches.length]} castShadow receiveShadow />;
}

function BlossomMesh({ flowers }: { flowers: Flower[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => createFlowerGeometry(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.DoubleSide }),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    flowers.forEach((f, i) => {
      dummy.position.copy(f.position);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.16 + Math.random() * 0.1;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      ref.current!.setColorAt(i, f.color);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [flowers]);

  return <instancedMesh ref={ref} args={[geo, mat, flowers.length]} />;
}

function FallenPetals({ positions }: { positions: THREE.Vector3[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => createPetalGeometry(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    positions.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.rotation.set(
        -Math.PI / 2 + (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.3
      );
      const s = 0.12 + Math.random() * 0.08;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      pickBlossomColor(color);
      ref.current!.setColorAt(i, color);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [positions]);

  return <instancedMesh ref={ref} args={[geo, mat, positions.length]} />;
}

type PetalState = {
  x: number;
  y: number;
  z: number;
  speed: number;
  sway: number;
  phase: number;
  spin: number;
  angle: number;
  scale: number;
};

function FallingPetals({ count = 170, area = 26 }: { count?: number; area?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => createPetalGeometry(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const data = useMemo<PetalState[]>(() => {
    const arr: PetalState[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * area,
        y: Math.random() * 12 + 1,
        z: (Math.random() - 0.5) * area,
        speed: 0.4 + Math.random() * 0.7,
        sway: 0.6 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2.4,
        angle: Math.random() * Math.PI * 2,
        scale: 0.1 + Math.random() * 0.08,
      });
    }
    return arr;
  }, [count, area]);

  useLayoutEffect(() => {
    data.forEach((_, i) => {
      pickBlossomColor(color);
      ref.current!.setColorAt(i, color);
    });
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(delta, 0.05);
    for (let i = 0; i < data.length; i++) {
      const p = data[i];
      p.y -= p.speed * d;
      p.angle += p.spin * d;
      if (p.y < 0.05) {
        p.y = 10 + Math.random() * 4;
        p.x = (Math.random() - 0.5) * area;
        p.z = (Math.random() - 0.5) * area;
      }
      const sx = Math.sin(t * p.sway + p.phase) * 0.8;
      const sz = Math.cos(t * p.sway * 0.8 + p.phase) * 0.5;
      dummy.position.set(p.x + sx, p.y, p.z + sz);
      dummy.rotation.set(p.angle * 0.6, p.angle, p.angle * 0.4);
      dummy.scale.set(p.scale, p.scale * 0.3, p.scale * 1.6);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, count]} />;
}

// 渐变春天空
function GradientSky() {
  const geo = useMemo(() => new THREE.SphereGeometry(80, 32, 16), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color('#a9d8ff') },
          bottom: { value: new THREE.Color('#ffe3ee') },
          offset: { value: 12 },
          exponent: { value: 0.7 },
        },
        vertexShader:
          'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; uniform float offset; uniform float exponent; varying vec3 vP; void main(){ float h = normalize(vP + vec3(0.0, offset, 0.0)).y; float t = pow(max(h, 0.0), exponent); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
      }),
    []
  );
  return <mesh geometry={geo} material={mat} />;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[40, 48]} />
      <meshStandardMaterial color="#bcd9a6" roughness={1} metalness={0} />
    </mesh>
  );
}

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#fff0f5', '#c8e6c0', 0.45]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.0}
        color="#fff4ea"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-10, 6, -8]} intensity={0.35} color="#ffd0e0" />
    </>
  );
}

// 主樱花场景组件
export default function SakuraScene() {
  const { branches, flowers, fallen } = useMemo(() => buildScene(), []);

  return (
    <>
      <GradientSky />
      <fog attach="fog" args={['#ffe3ee', 22, 60]} />
      <Lighting />
      <Ground />
      <BranchMesh branches={branches} />
      <BlossomMesh flowers={flowers} />
      <FallenPetals positions={fallen} />
      <FallingPetals count={500} area={40} />
    </>
  );
}
