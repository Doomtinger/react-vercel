'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * GalaxyDisc renders a spiral galaxy disc built from three particle layers:
 *  - spiral arms: stars scattered along winding arms, coloured with a
 *    warm-core -> cool-rim gradient and an S-shaped edge warp
 *  - central bulge: a dense, flattened sphere of warm stars that rotates
 *    faster than the arms (differential rotation)
 *  - stellar halo: a sparse, dim spherical shell wrapping the whole galaxy
 *
 * All geometry is generated in *local* units with radius = `radius` and is
 * meant to be scaled by the parent group.
 */

/** Soft warm highlight. Never pure white - pure white blows out with
 *  additive blending and is harsh to look at. */
const WARM_TINT = 0xffe6c4;

let radialTexture: THREE.Texture | null = null;

/**
 * Lazily created, shared soft radial sprite (used for stars and haze).
 * Returns null during SSR so the component can degrade gracefully.
 */
export function getRadialTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (radialTexture) return radialTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  radialTexture = texture;
  return texture;
}

export interface GalaxyDiscProps {
  /** total number of stars (arms + bulge + halo) */
  count?: number;
  /** number of spiral arms */
  branches?: number;
  /** how strongly the arms wind around the core */
  spin?: number;
  /** scatter of stars around the ideal arm curve */
  randomness?: number;
  /** higher => fewer outliers, tighter arms */
  randomnessPower?: number;
  /** >1 concentrates stars towards the core */
  bulge?: number;
  /** disc half-thickness relative to its radius */
  thickness?: number;
  /** S-shaped warp of the outer disc (real galaxies are not flat) */
  warp?: number;
  /** fraction of stars placed in the spherical halo */
  halo?: number;
  /** halo extent relative to the disc radius */
  haloRadius?: number;
  /** disc radius in local units */
  radius?: number;
  innerColor: THREE.ColorRepresentation;
  outerColor: THREE.ColorRepresentation;
  /** world size of a single star (object scale does NOT affect point size) */
  pointSize?: number;
  opacity?: number;
  /** rotation speed in radians / second */
  speed?: number;
}

export const GalaxyDisc: React.FC<GalaxyDiscProps> = ({
  count = 1200,
  branches = 3,
  spin = 2.6,
  randomness = 0.3,
  randomnessPower = 3,
  bulge = 1.7,
  thickness = 0.12,
  warp = 0.16,
  halo = 0.1,
  haloRadius = 1.55,
  radius = 2,
  innerColor = 0xffd9a8,
  outerColor = 0x3b82f6,
  pointSize = 0.2,
  opacity = 0.8,
  speed = 0.1
}) => {
  const discRef = useRef<THREE.Group>(null);
  const bulgeRef = useRef<THREE.Points>(null);
  const spinRef = useRef(0);
  const texture = useMemo(() => getRadialTexture(), []);

  const geometry = useMemo(() => {
    const haloCount = Math.max(0, Math.round(count * halo));
    const bulgeCount = Math.max(1, Math.round(count * 0.14));
    const armCount = Math.max(1, count - bulgeCount - haloCount);

    const armPositions = new Float32Array(armCount * 3);
    const armColors = new Float32Array(armCount * 3);
    const bulgePositions = new Float32Array(bulgeCount * 3);
    const bulgeColors = new Float32Array(bulgeCount * 3);
    const haloPositions = new Float32Array(haloCount * 3);
    const haloColors = new Float32Array(haloCount * 3);

    const inner = new THREE.Color(innerColor);
    const outer = new THREE.Color(outerColor);
    const warm = new THREE.Color(WARM_TINT);
    const mixed = new THREE.Color();

    const signedScatter = (power: number, amount: number) =>
      Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * amount;

    // --- spiral arms -------------------------------------------------------
    for (let i = 0; i < armCount; i++) {
      const i3 = i * 3;

      // radius: biased towards the core so the disc fades outwards
      const t = Math.pow(Math.random(), bulge);
      const r = t * radius;

      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const angle = branchAngle + t * spin;
      const spread = randomness * (0.12 + r);

      armPositions[i3] = Math.cos(angle) * r + signedScatter(randomnessPower, spread);
      // S-shaped warp: the outer disc bends away from the plane
      armPositions[i3 + 1] =
        signedScatter(randomnessPower, spread * thickness) +
        Math.sin(angle * 2 + 0.6) * warp * t * t * radius;
      armPositions[i3 + 2] = Math.sin(angle) * r + signedScatter(randomnessPower, spread);

      mixed.copy(inner).lerp(outer, t);
      // a few stars burn brighter, like OB associations in a real galaxy
      const brightness = 0.45 + Math.random() * 0.35 + (Math.random() < 0.04 ? 0.5 : 0);

      armColors[i3] = mixed.r * brightness;
      armColors[i3 + 1] = mixed.g * brightness;
      armColors[i3 + 2] = mixed.b * brightness;
    }

    // --- central bulge -----------------------------------------------------
    for (let i = 0; i < bulgeCount; i++) {
      const i3 = i * 3;

      const r = Math.pow(Math.random(), 2.4) * radius * 0.26;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      bulgePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      bulgePositions[i3 + 1] = r * Math.cos(phi) * (0.55 + thickness * 6);
      bulgePositions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // warm, never pure white
      mixed.copy(inner).lerp(warm, 0.25 + Math.random() * 0.35);
      const brightness = 0.6 + Math.random() * 0.35;

      bulgeColors[i3] = mixed.r * brightness;
      bulgeColors[i3 + 1] = mixed.g * brightness;
      bulgeColors[i3 + 2] = mixed.b * brightness;
    }

    // --- stellar halo ------------------------------------------------------
    for (let i = 0; i < haloCount; i++) {
      const i3 = i * 3;

      // biased outwards, wrapping the disc in a sparse shell
      const r = (0.55 + Math.pow(Math.random(), 0.8) * 0.45) * radius * haloRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      haloPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      haloPositions[i3 + 1] = r * Math.cos(phi) * 0.75;
      haloPositions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      mixed.copy(outer).lerp(warm, 0.15 + Math.random() * 0.2);
      const brightness = 0.2 + Math.random() * 0.25;

      haloColors[i3] = mixed.r * brightness;
      haloColors[i3 + 1] = mixed.g * brightness;
      haloColors[i3 + 2] = mixed.b * brightness;
    }

    return { armPositions, armColors, bulgePositions, bulgeColors, haloPositions, haloColors };
  }, [
    count, branches, spin, randomness, randomnessPower, bulge, thickness,
    warp, halo, haloRadius, radius, innerColor, outerColor
  ]);

  useFrame((_, delta) => {
    spinRef.current += delta * speed;

    if (discRef.current) {
      discRef.current.rotation.y = spinRef.current;
    }
    // the bulge spins ahead of the arms -> differential rotation
    if (bulgeRef.current) {
      bulgeRef.current.rotation.y = spinRef.current * 0.85;
    }
  });

  const starMaterial = (
    map: THREE.Texture | null,
    size: number,
    alpha: number
  ) => (
    <pointsMaterial
      size={size}
      map={map ?? undefined}
      vertexColors
      transparent
      opacity={alpha}
      depthWrite={false}
      sizeAttenuation
      blending={THREE.AdditiveBlending}
    />
  );

  return (
    <group ref={discRef}>
      {/* spiral arms */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.armPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[geometry.armColors, 3]} />
        </bufferGeometry>
        {starMaterial(texture, pointSize, opacity)}
      </points>

      {/* central bulge */}
      <points ref={bulgeRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.bulgePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[geometry.bulgeColors, 3]} />
        </bufferGeometry>
        {starMaterial(texture, pointSize * 0.85, Math.min(1, opacity * 0.9))}
      </points>

      {/* stellar halo */}
      {geometry.haloPositions.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[geometry.haloPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[geometry.haloColors, 3]} />
          </bufferGeometry>
          {starMaterial(texture, pointSize * 0.7, opacity * 0.55)}
        </points>
      )}
    </group>
  );
};

/**
 * GalaxyHaze - a soft, additive glow plane that gives the disc its nebulous
 * body. Meant to be placed inside the disc plane (parent applies the tilt).
 */
export interface GalaxyHazeProps {
  /** diameter of the haze in local units */
  size: number;
  color: THREE.ColorRepresentation;
  opacity?: number;
}

export const GalaxyHaze: React.FC<GalaxyHazeProps> = ({ size, color, opacity = 0.35 }) => {
  const texture = useMemo(() => getRadialTexture(), []);

  if (!texture) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[size, size, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default GalaxyDisc;
