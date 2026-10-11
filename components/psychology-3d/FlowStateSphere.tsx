'use client';

import * as React from 'react';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FlowState2Props {
  /** 任务挑战难度 0~1，默认 0.5 */
  challenge?: number;
  /** 个人技能 0~1，默认 0.5 */
  skill?: number;
}

const SKILL_COLOR = '#86B8D9';
const CHALLENGE_COLOR = '#D4B878';
const MIX_COLOR = '#bcd9c8';
const NOISE_COLOR = '#9aa0a6';
const SELF_COLOR = '#eaf2ff';

const FIELD_RADIUS = 4;
const BAND_RADIUS = 1.9;
const BAND_HEIGHT = 5.0;
const TURNS = 3.2;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private turns: number,
    private radius: number,
    private height: number,
    private phase: number
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2 + this.phase;
    const x = Math.cos(a) * this.radius;
    const z = Math.sin(a) * this.radius;
    const y = (t - 0.5) * this.height;
    return target.set(x, y, z);
  }
}

const PARTICLES_PER_CURVE = 200;

function makeParticleGeometry(curve: HelixCurve) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(PARTICLES_PER_CURVE * 3);
  const data: { t: number; speed: number }[] = [];
  for (let i = 0; i < PARTICLES_PER_CURVE; i++) {
    const t = i / PARTICLES_PER_CURVE;
    const p = curve.getPoint(t);
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
    data.push({ t, speed: 0.5 + Math.random() * 0.4 });
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return { geo: g, data };
}

export function FlowStateVisualization2({ challenge = 0.5, skill = 0.5 }: FlowState2Props) {
  const diff = skill - challenge;
  const targetFlow = clamp01(1 - Math.abs(diff));
  const targetAnxiety = clamp01(-diff);
  const targetBoredom = clamp01(diff);

  const stateRef = useRef({ flow: targetFlow, anxiety: targetAnxiety, boredom: targetBoredom });

  const skillCurve = useMemo(() => new HelixCurve(TURNS, BAND_RADIUS, BAND_HEIGHT, 0), []);
  const challengeCurve = useMemo(() => new HelixCurve(TURNS, BAND_RADIUS, BAND_HEIGHT, Math.PI), []);

  const skillTube = useMemo(() => new THREE.TubeGeometry(skillCurve, 260, 0.16, 10, false), [skillCurve]);
  const challengeTube = useMemo(() => new THREE.TubeGeometry(challengeCurve, 260, 0.16, 10, false), [challengeCurve]);

  const skillParticles = useMemo(() => makeParticleGeometry(skillCurve), [skillCurve]);
  const challengeParticles = useMemo(() => makeParticleGeometry(challengeCurve), [challengeCurve]);

  const NOISE_COUNT = 240;
  const noiseGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(NOISE_COUNT * 3);
    for (let i = 0; i < NOISE_COUNT; i++) {
      const r = 2.4 + Math.random() * 1.3;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.95;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => {
    return () => {
      skillTube.dispose();
      challengeTube.dispose();
      skillParticles.geo.dispose();
      challengeParticles.geo.dispose();
      noiseGeo.dispose();
    };
  }, [skillTube, challengeTube, skillParticles, challengeParticles, noiseGeo]);

  const skillMat = useRef<THREE.MeshStandardMaterial>(null);
  const challengeMat = useRef<THREE.MeshStandardMaterial>(null);
  const skillGroup = useRef<THREE.Group>(null);
  const challengeGroup = useRef<THREE.Group>(null);
  const selfMesh = useRef<THREE.Mesh>(null);
  const selfMat = useRef<THREE.MeshStandardMaterial>(null);
  const gridRef = useRef<THREE.Mesh>(null);
  const gridMat = useRef<THREE.MeshBasicMaterial>(null);
  const noiseMat = useRef<THREE.PointsMaterial>(null);
  const noiseGroup = useRef<THREE.Group>(null);
  const tRef = useRef(0);

  const updateParticles = (
    attr: THREE.BufferAttribute,
    data: { t: number; speed: number }[],
    phase: number,
    time: number
  ) => {
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const t = (d.t + time * 0.06 * d.speed) % 1;
      const a = t * TURNS * Math.PI * 2 + phase;
      const x = Math.cos(a) * BAND_RADIUS;
      const y = (t - 0.5) * BAND_HEIGHT;
      const z = Math.sin(a) * BAND_RADIUS;
      attr.setXYZ(i, x, y, z);
    }
    attr.needsUpdate = true;
  };

  useFrame((_, delta) => {
    const s = stateRef.current;
    const k = Math.min(1, delta * 2.2);
    s.flow += (targetFlow - s.flow) * k;
    s.anxiety += (targetAnxiety - s.anxiety) * k;
    s.boredom += (targetBoredom - s.boredom) * k;
    const { flow, anxiety, boredom } = s;

    tRef.current += delta;
    const time = tRef.current;

    const flowSpeed = Math.max(0.02, 0.12 + flow * 0.55 - boredom * 0.1);

    if (skillGroup.current) {
      skillGroup.current.rotation.y = time * flowSpeed;
      skillGroup.current.scale.setScalar(1 + boredom * 0.1);
    }
    if (challengeGroup.current) {
      challengeGroup.current.rotation.y = -time * flowSpeed * 0.85;
      const wob = anxiety * 0.28;
      challengeGroup.current.position.x = Math.sin(time * 6.1) * wob;
      challengeGroup.current.position.z = Math.cos(time * 5.3) * wob;
      const pulse = 1 + anxiety * 0.16 * Math.sin(time * 8);
      challengeGroup.current.scale.setScalar(pulse);
    }

    if (skillMat.current) {
      skillMat.current.opacity = 0.35 + 0.4 * flow + 0.32 * boredom;
    }
    if (challengeMat.current) {
      challengeMat.current.opacity = 0.35 + 0.4 * flow + 0.36 * anxiety;
    }

    if (selfMesh.current && selfMat.current) {
      selfMat.current.opacity = (1 - flow) * 0.9;
      if (anxiety > 0.02) {
        selfMesh.current.position.set(
          Math.sin(time * 23) * anxiety * 0.16,
          Math.cos(time * 19) * anxiety * 0.16,
          Math.sin(time * 17) * anxiety * 0.16
        );
      } else {
        selfMesh.current.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
      }
      selfMesh.current.visible = selfMat.current.opacity > 0.02;
    }

    if (gridRef.current && gridMat.current) {
      gridRef.current.scale.y = 1 + flow * 0.55;
      gridRef.current.scale.x = gridRef.current.scale.z = 1 + flow * 0.12;
      gridMat.current.opacity = 0.06 + flow * 0.14;
    }

    if (noiseMat.current) {
      noiseMat.current.opacity = 0.06 + (1 - flow) * 0.16 + anxiety * 0.22;
      noiseMat.current.size = 0.05 + anxiety * 0.03;
    }
    if (noiseGroup.current) {
      noiseGroup.current.rotation.y = time * 0.05;
    }

    updateParticles(
      skillParticles.geo.attributes.position as THREE.BufferAttribute,
      skillParticles.data,
      0,
      time
    );
    updateParticles(
      challengeParticles.geo.attributes.position as THREE.BufferAttribute,
      challengeParticles.data,
      Math.PI,
      time
    );
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[FIELD_RADIUS, 48, 48]} />
        <meshStandardMaterial
          color={'#cfe3f2'}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[FIELD_RADIUS * 1.015, 48, 48]} />
        <meshBasicMaterial color={'#9fc4e0'} transparent opacity={0.04} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <mesh ref={gridRef}>
        <sphereGeometry args={[BAND_RADIUS + 0.7, 18, 12]} />
        <meshBasicMaterial ref={gridMat} color={'#7fa8c8'} wireframe transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <group ref={skillGroup}>
        <mesh geometry={skillTube}>
          <meshStandardMaterial
            ref={skillMat}
            color={SKILL_COLOR}
            transparent
            opacity={0.6}
            roughness={0.95}
            metalness={0}
            emissive={SKILL_COLOR}
            emissiveIntensity={0.12}
            depthWrite={false}
          />
        </mesh>
        <points geometry={skillParticles.geo}>
          <pointsMaterial color={MIX_COLOR} size={0.075} transparent opacity={0.9} depthWrite={false} sizeAttenuation />
        </points>
      </group>

      <group ref={challengeGroup}>
        <mesh geometry={challengeTube}>
          <meshStandardMaterial
            ref={challengeMat}
            color={CHALLENGE_COLOR}
            transparent
            opacity={0.6}
            roughness={0.85}
            metalness={0}
            emissive={CHALLENGE_COLOR}
            emissiveIntensity={0.12}
            depthWrite={false}
          />
        </mesh>
        <points geometry={challengeParticles.geo}>
          <pointsMaterial color={MIX_COLOR} size={0.075} transparent opacity={0.9} depthWrite={false} sizeAttenuation />
        </points>
      </group>

      <mesh ref={selfMesh}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial
          ref={selfMat}
          color={SELF_COLOR}
          emissive={SELF_COLOR}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
          roughness={0.4}
        />
      </mesh>

      <group ref={noiseGroup}>
        <points geometry={noiseGeo}>
          <pointsMaterial ref={noiseMat} color={NOISE_COLOR} size={0.06} transparent opacity={0.15} depthWrite={false} sizeAttenuation />
        </points>
      </group>
    </group>
  );
}

export default FlowStateVisualization2;
