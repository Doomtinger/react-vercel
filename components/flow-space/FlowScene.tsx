'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { COLORS, CORE_INTENSITY, type Phase } from './theme';

interface SceneProps {
  phase: Phase;
  pulse: number; // 用户记录中断时 +1，触发核心微扰
  bloom?: number;
}

function EnergyCore({ phase, pulse, reduce }: { phase: Phase; pulse: number; reduce: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const intensity = useRef(CORE_INTENSITY[phase]);
  const flash = useRef(0);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    flash.current = 1;
  }, [pulse]);

  useFrame((state, delta) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const breathe = reduce ? 0 : phase === 'active' ? 0.15 * Math.sin(t * 1.5) : 0;
    const target = CORE_INTENSITY[phase] + breathe;
    intensity.current += (target - intensity.current) * Math.min(1, dt * 2);
    flash.current *= 0.94;
    const e = intensity.current + flash.current * 0.6;
    if (matRef.current) {
      matRef.current.emissiveIntensity = e;
      color.set(COLORS.flowBlue).lerp(new THREE.Color(COLORS.flowViolet), 0.5 + 0.5 * Math.sin(t * 0.2));
      matRef.current.emissive.copy(color);
      matRef.current.color.copy(color).multiplyScalar(0.2);
    }
    if (lightRef.current) lightRef.current.intensity = e * 2.2;
    if (meshRef.current) {
      const s = 1 + (reduce ? 0 : phase === 'active' ? 0.03 * Math.sin(t * 1.5) : 0) + flash.current * 0.05;
      meshRef.current.scale.setScalar(s);
      meshRef.current.rotation.y += dt * (reduce ? 0.02 : phase === 'paused' ? 0.05 : 0.15);
      meshRef.current.rotation.x += dt * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 4]} />
        <meshStandardMaterial
          ref={matRef}
          emissive={COLORS.flowBlue}
          emissiveIntensity={0.4}
          color="#101830"
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <pointLight ref={lightRef} color={COLORS.flowBlue} intensity={1} distance={22} />
    </group>
  );
}

function OrbitalRings({ phase, reduce }: { phase: Phase; reduce: boolean }) {
  const r0 = useRef<THREE.Mesh>(null);
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const refs = [r0, r1, r2];
  const opRef = useRef(0);
  const configs = [
    { r: 2.3, tube: 0.015, rot: [0.4, 0, 0.2] as [number, number, number], color: COLORS.flowBlue, speed: 0.25 },
    { r: 3.1, tube: 0.012, rot: [1.1, 0.3, 0.6] as [number, number, number], color: COLORS.flowViolet, speed: -0.18 },
    { r: 3.9, tube: 0.01, rot: [0.2, 0.8, 1.2] as [number, number, number], color: COLORS.flowBlue, speed: 0.12 },
  ];
  const targetOp = phase === 'idle' ? 0.25 : phase === 'entering' ? 0.7 : phase === 'active' ? 0.9 : phase === 'paused' ? 0.45 : 0;

  useFrame((_, delta) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const dt = Math.min(delta, 0.05);
    opRef.current += (targetOp - opRef.current) * Math.min(1, dt * 2);
    const spd = (phase === 'paused' ? 0.1 : phase === 'completed' ? 0 : 1) * (reduce ? 0.3 : 1);
    refs.forEach((r, i) => {
      if (r.current) {
        r.current.rotation.z += dt * configs[i].speed * spd;
        r.current.rotation.y += dt * configs[i].speed * 0.5 * spd;
        const m = r.current.material as THREE.MeshStandardMaterial;
        m.opacity = opRef.current;
      }
    });
  });

  return (
    <group>
      {configs.map((c, i) => (
        <mesh key={i} ref={refs[i]} rotation={c.rot}>
          <torusGeometry args={[c.r, c.tube, 12, 120]} />
          <meshStandardMaterial
            color={c.color}
            emissive={c.color}
            emissiveIntensity={1.2}
            transparent
            opacity={0.25}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function ParticleField({ phase, pulse, reduce }: { phase: Phase; pulse: number; reduce: boolean }) {
  const COUNT = 2200;
  const matRef = useRef<THREE.PointsMaterial>(null);
  const { positions, bases, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const bases: THREE.Vector3[] = [];
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 2.6 + Math.random() * 3.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.7;
      const z = r * Math.sin(phi) * Math.sin(theta);
      bases.push(new THREE.Vector3(x, y, z));
      seeds[i] = Math.random() * 100;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return { positions, bases, seeds };
  }, []);

  const colors = useMemo(() => {
    const c = new Float32Array(COUNT * 3);
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      col.set(COLORS.flowBlue).lerp(new THREE.Color(COLORS.flowViolet), Math.random());
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return c;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  const enterT = useRef(0);
  const scatterT = useRef(0);
  const flash = useRef(0);
  useEffect(() => {
    flash.current = 1;
  }, [pulse]);
  useEffect(() => {
    if (phase === 'entering') enterT.current = 0;
    if (phase === 'idle') {
      enterT.current = 0;
      scatterT.current = 0;
    }
  }, [phase]);

  useFrame((state, delta) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    enterT.current = Math.min(1, enterT.current + (phase === 'entering' ? dt / 4 : 0));
    if (phase === 'completed') scatterT.current += dt / 3;
    flash.current *= 0.92;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const conv = phase === 'entering' ? enterT.current : phase === 'completed' ? 0 : 1;
    const scatter = phase === 'completed' ? 1 + scatterT.current * 2.2 : 1;
    const driftAmp = phase === 'paused' ? 0 : reduce ? 0.05 : 0.25;
    const spin = (reduce ? 0.3 : 1) * (phase === 'active' ? t * 0.05 : t * 0.02);
    const cosA = Math.cos(spin);
    const sinA = Math.sin(spin);
    for (let i = 0; i < COUNT; i++) {
      const b = bases[i];
      const sx = Math.sin(seeds[i] + t * 0.3) * driftAmp;
      const sy = Math.cos(seeds[i] * 1.3 + t * 0.25) * driftAmp;
      const sz = Math.sin(seeds[i] * 0.7 + t * 0.2) * driftAmp;
      let x = b.x + sx;
      let y = b.y + sy;
      let z = b.z + sz;
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;
      x = rx;
      z = rz;
      const k = conv * scatter * (1 + flash.current * 0.04 * Math.sin(seeds[i] + t * 5));
      arr[i * 3] = x * k;
      arr[i * 3 + 1] = y * k;
      arr[i * 3 + 2] = z * k;
    }
    pos.needsUpdate = true;
    if (matRef.current) {
      const targetOp = phase === 'completed' ? Math.max(0, 1 - scatterT.current) : 0.9;
      matRef.current.opacity += (targetOp - matRef.current.opacity) * 0.1;
    }
  });

  return (
    <points geometry={geo}>
      <pointsMaterial
        ref={matRef}
        size={0.04}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function FlowScene({ phase, pulse, bloom = 0.9 }: SceneProps) {
  const reduce = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return (
    <>
      <color attach="background" args={[COLORS.deepSpace]} />
      <fog attach="fog" args={[COLORS.deepSpace, 9, 26]} />
      <ambientLight intensity={0.18} />
      <pointLight position={[5, 3, 5]} intensity={0.6} color={COLORS.flowBlue} distance={30} />
      <pointLight position={[-5, -2, -4]} intensity={0.5} color={COLORS.flowViolet} distance={30} />

      <EnergyCore phase={phase} pulse={pulse} reduce={reduce} />
      <OrbitalRings phase={phase} reduce={reduce} />
      <ParticleField phase={phase} pulse={pulse} reduce={reduce} />

      {/* 环境雾球，营造空间层次 */}
      <mesh>
        <sphereGeometry args={[13, 32, 32]} />
        <meshBasicMaterial color={COLORS.nebula} transparent opacity={0.07} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.2} luminanceSmoothing={0.4} intensity={bloom} />
      </EffectComposer>
    </>
  );
}
