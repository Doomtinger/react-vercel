'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { Html, MeshDistortMaterial } from '@react-three/drei';
import { GalaxyDisc, GalaxyHaze } from './GalaxyDisc';

/**
 * CelestialEntity represents a psychological concept as a miniature spiral
 * galaxy: a warm nucleus, a haze disc, spiral arms of stars, a sparse stellar
 * halo and (for some types) an outer ring. Every galaxy keeps its own random
 * orientation so the universe reads as a coherent field of galaxies instead of
 * a pile of unrelated shapes.
 */

interface CelestialEntityProps {
  entity: MentalEntity;
  isHovered?: boolean;
  isFocused?: boolean;
  onHover?: (entity: MentalEntity) => void;
  onClick?: (entity: MentalEntity) => void;
}

/**
 * Soft warm highlight used for galactic cores. Pure white blows out under
 * additive blending and is harsh to look at, so cores are tinted instead.
 */
const WARM_TINT = 0xffd28a;
const COOL_RIM = 0x1e3a8a;

const CELESTIAL_COLORS: Record<EntityType, THREE.ColorRepresentation> = {
  [EntityType.SELF]: 0xf2a65a,        // Amber core for Self (never white)
  [EntityType.EMOTION]: 0x6366f1,     // Purple for emotions
  [EntityType.THOUGHT]: 0x06b6d4,     // Cyan for thoughts
  [EntityType.BELIEF]: 0x8b5cf6,      // Violet for beliefs
  [EntityType.MEMORY]: 0xf59e0b,       // Amber for memories
  [EntityType.GOAL]: 0x10b981,         // Emerald for goals
  [EntityType.NEED]: 0xef4444,         // Red for needs
  [EntityType.HABIT]: 0x64748b,         // Slate for habits
  [EntityType.ATTENTION]: 0xfbbf24,     // Yellow for attention
};

/**
 * Per-type galaxy morphology. Values are expressed in *local* units and are
 * multiplied by the entity's base size.
 */
interface GalaxyProfile {
  branches: number;   // number of spiral arms
  spin: number;       // how tightly the arms wind
  count: number;      // star count
  coreScale: number;  // nucleus radius
  discScale: number;  // disc radius
  hazeScale: number;  // glow disc diameter
  thickness: number;  // disc thickness relative to radius
  bulge: number;      // >1 concentrates stars towards the core
  warp: number;       // S-shaped warp of the outer disc
  halo: number;       // fraction of stars in the spherical halo
  speed: number;      // rotation speed (rad/s)
  ring: boolean;      // extra outer ring
}

const DEFAULT_GALAXY_PROFILE: GalaxyProfile = {
  branches: 3,
  spin: 2.6,
  count: 1100,
  coreScale: 0.24,
  discScale: 2.0,
  hazeScale: 2.4,
  thickness: 0.12,
  bulge: 1.7,
  warp: 0.16,
  halo: 0.1,
  speed: 0.10,
  ring: false
};

const GALAXY_PROFILES: Partial<Record<EntityType, Partial<GalaxyProfile>>> = {
  [EntityType.SELF]: {
    branches: 5,
    spin: 2.0,
    count: 3400,
    coreScale: 0.6,
    discScale: 2.0,
    hazeScale: 2.4,
    thickness: 0.09,
    bulge: 2.0,
    warp: 0.1,
    halo: 0.14,
    speed: 0.05,
    ring: true
  },
  [EntityType.EMOTION]: {
    branches: 3,
    spin: 2.8,
    count: 1500,
    coreScale: 0.26,
    discScale: 2.0,
    hazeScale: 2.4,
    speed: 0.09
  },
  [EntityType.THOUGHT]: {
    branches: 2,
    spin: 3.4,
    count: 360,
    coreScale: 0.2,
    discScale: 2.2,
    hazeScale: 2.5,
    speed: 0.16
  },
  [EntityType.MEMORY]: {
    branches: 4,
    spin: 2.0,
    count: 1200,
    coreScale: 0.24,
    discScale: 2.1,
    thickness: 0.17,
    speed: 0.07,
    ring: true
  },
  [EntityType.GOAL]: {
    branches: 2,
    spin: 3.0,
    count: 900,
    coreScale: 0.24,
    discScale: 1.9,
    speed: 0.12,
    ring: true
  },
  [EntityType.BELIEF]: {
    branches: 3,
    spin: 2.4,
    count: 1100
  },
  [EntityType.NEED]: {
    branches: 2,
    spin: 3.2,
    count: 800,
    speed: 0.13
  },
  [EntityType.HABIT]: {
    branches: 4,
    spin: 1.8,
    count: 900,
    thickness: 0.19,
    speed: 0.06
  },
  [EntityType.ATTENTION]: {
    branches: 2,
    spin: 3.6,
    count: 640,
    speed: 0.19
  }
};

export const CelestialEntity: React.FC<CelestialEntityProps> = ({
  entity,
  isHovered = false,
  isFocused = false,
  onHover,
  onClick
}) => {
  const orbitRef = useRef<THREE.Group>(null);
  const galaxyRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const coreGlowRef = useRef<THREE.Mesh>(null);

  // Breathing animation phase
  const breathingPhase = useMemo(() => Math.random() * Math.PI * 2, []);
  const breathingSpeed = entity.type === EntityType.SELF ? 0.3 : 0.5;

  // Each galaxy keeps a stable, random orientation
  const tilt = useMemo<[number, number, number]>(
    () => [(Math.random() - 0.5) * 0.85, 0, (Math.random() - 0.5) * 0.85],
    []
  );
  const tiltYaw = useMemo(() => Math.random() * Math.PI * 2, []);

  // Morphology for this entity type
  const profile = useMemo<GalaxyProfile>(
    () => ({ ...DEFAULT_GALAXY_PROFILE, ...(GALAXY_PROFILES[entity.type] || {}) }),
    [entity.type]
  );

  // Base size (local units are multiplied by this)
  const baseSize = useMemo(() => {
    switch (entity.type) {
      case EntityType.SELF:
        return 1.4;
      case EntityType.EMOTION:
        return 0.6 + entity.state.intensity * 0.45;
      case EntityType.THOUGHT:
        return 0.35 + entity.state.intensity * 0.25;
      case EntityType.MEMORY:
        return 0.48;
      case EntityType.GOAL:
        return 0.7;
      default:
        return 0.6;
    }
  }, [entity.type, entity.state.intensity]);

  // Base colour: per-entity colour when available, type colour otherwise.
  // Near-white colours are pulled back to a warm tint so nothing glares.
  const entityColor = useMemo(() => {
    const fallback = new THREE.Color(CELESTIAL_COLORS[entity.type]);
    const base = entity.metadata.color
      ? new THREE.Color(entity.metadata.color)
      : fallback.clone();

    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);

    if (hsl.l > 0.82 && hsl.s < 0.25) {
      base.copy(fallback).lerp(new THREE.Color(WARM_TINT), 0.35);
    } else if (hsl.l > 0.7) {
      base.offsetHSL(0, 0.06, -0.14);
    }

    // Mood shifts the lightness a little
    base.offsetHSL(0, 0, (entity.state.mood.valence - 0.5) * 0.18);
    return base;
  }, [entity.type, entity.metadata.color, entity.state.mood.valence]);

  // Hot core -> cool rim gradient. The lerp towards the warm tint is kept low
  // so the core stays saturated instead of washing out to white.
  const nucleusColor = useMemo(
    () => entityColor.clone().lerp(new THREE.Color(WARM_TINT), 0.3),
    [entityColor]
  );
  const armInnerColor = useMemo(
    () => entityColor.clone().lerp(new THREE.Color(WARM_TINT), 0.2),
    [entityColor]
  );
  const armOuterColor = useMemo(
    () => entityColor.clone().lerp(new THREE.Color(COOL_RIM), 0.45),
    [entityColor]
  );

  // Central body geometry. The Self keeps its original icosahedron form (the
  // "sphere in the middle"); everything else uses a smooth sphere.
  const coreGeometry = useMemo(() => {
    if (entity.type === EntityType.SELF) {
      return new THREE.IcosahedronGeometry(1, 4);
    }
    return new THREE.SphereGeometry(1, 24, 24);
  }, [entity.type]);

  // Point size must be set explicitly: object scale does not scale gl_PointSize
  const pointSize = 0.07 + baseSize * profile.discScale * 0.055;

  const certainty = entity.state.certainty;
  const hoverBoost = isHovered ? 1.5 : 1;

  useFrame((state, delta) => {
    const galaxy = galaxyRef.current;
    if (!galaxy) return;

    const entityTime = state.clock.getElapsedTime() + breathingPhase;

    // Breathing effect - scale in and out
    const breathAmount = Math.sin(entityTime * breathingSpeed) * 0.05;
    const scaleMultiplier = 1 + breathAmount + entity.state.intensity * 0.2;

    // Activity-based vibration
    const vibrationAmount = entity.state.activity * 0.02;
    const vibrationX = Math.sin(entityTime * 10) * vibrationAmount;
    const vibrationY = Math.cos(entityTime * 8) * vibrationAmount;
    const vibrationZ = Math.sin(entityTime * 12) * vibrationAmount;

    galaxy.position.set(
      entity.physics.position.x + vibrationX,
      entity.physics.position.y + vibrationY,
      entity.physics.position.z + vibrationZ
    );
    galaxy.scale.setScalar(baseSize * scaleMultiplier);

    // Nucleus pulse (coreScale is applied here because useFrame owns the scale)
    if (coreRef.current) {
      const pulse = 0.92 +
        Math.sin(entityTime * (1.4 + entity.state.activity * 2.2)) * 0.08;
      coreRef.current.scale.setScalar(profile.coreScale * pulse);
    }

    // Nucleus glow reacts to intensity / hover
    if (coreGlowRef.current) {
      const breathe = 1 + Math.sin(entityTime * 1.2) * 0.07;
      coreGlowRef.current.scale.setScalar(breathe * (isHovered ? 1.18 : 1));
    }

    // Focus effect: slowly turn the whole galaxy
    if (isFocused && orbitRef.current) {
      orbitRef.current.rotation.y += delta * 0.25;
    }
  });

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onHover?.(entity);
  };

  const handlePointerOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick?.(entity);
  };

  return (
    <group ref={orbitRef}>
      <group ref={galaxyRef}>
        {/* Tilted disc plane: haze, spiral arms, outer ring, satellites */}
        <group rotation={[tilt[0], tiltYaw, tilt[2]]}>
          <GalaxyHaze
            size={profile.hazeScale * 2}
            color={entityColor}
            opacity={0.06 + certainty * 0.1 + (isHovered ? 0.06 : 0)}
          />

          <GalaxyDisc
            count={profile.count}
            branches={profile.branches}
            spin={profile.spin}
            bulge={profile.bulge}
            thickness={profile.thickness}
            warp={profile.warp}
            halo={profile.halo}
            radius={profile.discScale}
            innerColor={armInnerColor}
            outerColor={armOuterColor}
            pointSize={pointSize}
            opacity={0.28 + certainty * 0.24}
            speed={profile.speed * (0.7 + entity.state.activity * 0.8)}
          />

          {profile.ring && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[profile.discScale * 1.04, profile.discScale * 1.07, 96]}
              />
              <meshBasicMaterial
                color={armInnerColor}
                transparent
                opacity={0.07 + entity.state.intensity * 0.07}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}

          {/* Satellite stars orbiting the Self galaxy */}
          {entity.type === EntityType.SELF && (
            <>
              {[...Array(8)].map((_, i) => (
                <mesh
                  key={i}
                  position={[
                    Math.cos((i / 8) * Math.PI * 2) * profile.discScale * 1.18,
                    Math.sin((i / 8) * Math.PI * 4) * 0.12,
                    Math.sin((i / 8) * Math.PI * 2) * profile.discScale * 1.18
                  ]}
                >
                  <sphereGeometry args={[0.035, 8, 8]} />
                  <meshBasicMaterial
                    color={nucleusColor}
                    transparent
                    opacity={0.4}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              ))}
            </>
          )}

          {/* Focus ring, drawn in the disc plane */}
          {isFocused && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[profile.discScale * 1.16, profile.discScale * 1.24, 64]}
              />
              <meshBasicMaterial
                color={0x67e8f9}
                transparent
                opacity={0.45}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}
        </group>

        {/* Central body - keeps the original sphere/icosahedron form and the
            distort material, now in a saturated amber instead of white */}
        <mesh ref={coreRef} geometry={coreGeometry}>
          {entity.type === EntityType.SELF ? (
            <MeshDistortMaterial
              color={nucleusColor}
              transparent
              opacity={Math.min(0.9, certainty * 0.85)}
              roughness={0.3}
              metalness={0.1}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
              transmission={0.3}
              thickness={0.5}
              distort={0.25}
              speed={0.5 + entity.state.activity}
              emissive={nucleusColor}
              emissiveIntensity={0.1 + entity.state.activity * 0.12}
            />
          ) : (
            <meshBasicMaterial
              color={nucleusColor}
              transparent
              opacity={Math.min(0.55, certainty * 0.5)}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          )}
        </mesh>

        {/* Nucleus halo */}
        <mesh ref={coreGlowRef}>
          <sphereGeometry args={[profile.coreScale * 2.6, 16, 16]} />
          <meshBasicMaterial
            color={nucleusColor}
            transparent
            opacity={Math.min(0.26, (0.06 + entity.state.intensity * 0.12) * hoverBoost)}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Invisible pick volume - galaxies are flat, so give them a
            generous, slightly squashed hit sphere */}
        <mesh
          scale={[profile.discScale, profile.discScale * 0.45, profile.discScale]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Label on hover */}
        {isHovered && (
          <Html position={[0, profile.discScale * 0.6, 0]} center>
            <div className="celestial-label">
              <div className="label-text">{entity.metadata.label}</div>
              <div className="label-intensity">
                {(entity.state.intensity * 100).toFixed(0)}%
              </div>
            </div>
            <style jsx>{`
              .celestial-label {
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 8px 12px;
                backdrop-filter: blur(10px);
                color: white;
                text-align: center;
                pointer-events: none;
              }
              .label-text {
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 4px;
              }
              .label-intensity {
                font-size: 12px;
                opacity: 0.7;
              }
            `}</style>
          </Html>
        )}
      </group>
    </group>
  );
};

export default CelestialEntity;
