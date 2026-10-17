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
  const petalBase = new THREE.SphereGeometry(1, 10, 10);
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

  const center = new THREE.SphereGeometry(0.2, 8, 8);
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

// ---------- 递归生成树 ----------
function grow(
  start: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  origin: THREE.Vector3,
  branches: Branch[],
  flowers: THREE.Vector3[]
) {
  const end = start.clone().add(dir.clone().multiplyScalar(length));
  branches.push({
    start: start.clone().add(origin),
    end: end.clone().add(origin),
    r0: radius,
    r1: radius * 0.72,
  });

  if (depth <= 0) {
    const count = 12 + Math.floor(Math.random() * 8);
    for (let k = 0; k < count; k++) {
      flowers.push(
        end.clone().add(origin).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.7,
            (Math.random() - 0.2) * 0.7,
            (Math.random() - 0.5) * 0.7
          )
        )
      );
    }
    return;
  }

  const n = 2 + (Math.random() < 0.35 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const newDir = dir.clone();
    const spread = 0.45 + Math.random() * 0.5;
    newDir.x += (Math.random() - 0.5) * spread;
    newDir.z += (Math.random() - 0.5) * spread;
    newDir.y += 0.18; // 向上偏置
    newDir.normalize();
    grow(
      end,
      newDir,
      length * (0.72 + Math.random() * 0.1),
      radius * 0.7,
      depth - 1,
      origin,
      branches,
      flowers
    );
  }

  // 上层枝条偶尔也点缀花朵，让树冠更饱满
  if (depth <= 2 && Math.random() < 0.6) {
    for (let k = 0; k < 4; k++) {
      const t = Math.random();
      const p = start.clone().lerp(end, t).add(origin);
      flowers.push(
        p.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.2) * 0.4,
            (Math.random() - 0.5) * 0.4
          )
        )
      );
    }
  }
}

function buildScene() {
  const branches: Branch[] = [];
  const flowers: THREE.Vector3[] = [];

  const trees: { origin: THREE.Vector3; scale: number }[] = [
    { origin: new THREE.Vector3(0, 0, 0), scale: 1.15 },
    { origin: new THREE.Vector3(8, 0, 2), scale: 1.0 },
    { origin: new THREE.Vector3(-7, 0, -3), scale: 1.05 },
    { origin: new THREE.Vector3(4, 0, -7), scale: 0.9 },
    { origin: new THREE.Vector3(-5, 0, 6), scale: 0.95 },
    { origin: new THREE.Vector3(11, 0, -4), scale: 0.85 },
    { origin: new THREE.Vector3(-11, 0, 3), scale: 0.9 },
    { origin: new THREE.Vector3(2, 0, 9), scale: 0.8 },
  ];

  for (const t of trees) {
    grow(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3((Math.random() - 0.5) * 0.1, 1, (Math.random() - 0.5) * 0.1).normalize(),
      2.6 * t.scale,
      0.3 * t.scale,
      5,
      t.origin,
      branches,
      flowers
    );
  }

  // 地面散落的落瓣
  const fallen: THREE.Vector3[] = [];
  for (let i = 0; i < 220; i++) {
    const r = Math.sqrt(Math.random()) * 22;
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

function BlossomMesh({ flowers }: { flowers: THREE.Vector3[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => createFlowerGeometry(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.DoubleSide }),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    flowers.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.16 + Math.random() * 0.1;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);

      const hue = 0.9 + Math.random() * 0.035;
      const sat = 0.62 + Math.random() * 0.22;
      const light = 0.62 + Math.random() * 0.12;
      color.setHSL(hue, sat, light);
      ref.current!.setColorAt(i, color);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [flowers]);

  return <instancedMesh ref={ref} args={[geo, mat, flowers.length]} castShadow />;
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
      color.setHSL(0.9 + Math.random() * 0.035, 0.6 + Math.random() * 0.22, 0.66 + Math.random() * 0.12);
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
      color.setHSL(0.9 + Math.random() * 0.035, 0.6 + Math.random() * 0.22, 0.66 + Math.random() * 0.12);
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
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
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
      <FallingPetals count={240} area={34} />
    </>
  );
}
