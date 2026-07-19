import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { MeshDistortMaterial, Sphere } from '@react-three/drei';

/**
 * EmotionBlob represents emotions as animated liquid blobs.
 * Features fluid simulation, morphing, and organic motion.
 */

interface EmotionBlobProps {
  entity: MentalEntity;
  isHovered?: boolean;
  isMerging?: boolean;
  onMerge?: (entity: MentalEntity) => void;
}

const EMOTION_COLORS: Record<string, THREE.ColorRepresentation> = {
  fear: 0xef4444,        // Red
  hope: 0x10b981,        // Green
  stress: 0xf97316,      // Orange
  calm: 0x6366f1,        // Purple
  excitement: 0xfbbf24,  // Yellow
  anxiety: 0xec4899,     // Pink
  joy: 0xfbbf24,         // Yellow
  sadness: 0x3b82f6,     // Blue
  anger: 0xef4444,       // Red
  love: 0xec4899,        // Pink
  surprise: 0xfbbf24,    // Yellow
  disgust: 0x10b981,     // Green
  trust: 0x3b82f6,       // Blue
  anticipation: 0xf97316 // Orange
};

const EMOTION_BEHAVIORS: Record<string, {
  expansion: number;
  vibration: number;
  viscosity: number;
  morphSpeed: number;
  ripple: boolean;
}> = {
  fear: {
    expansion: 0.8,
    vibration: 0.6,
    viscosity: 0.3,
    morphSpeed: 2.0,
    ripple: false
  },
  hope: {
    expansion: 0.3,
    vibration: 0.1,
    viscosity: 0.7,
    morphSpeed: 0.5,
    ripple: true
  },
  stress: {
    expansion: 0.6,
    vibration: 0.8,
    viscosity: 0.4,
    morphSpeed: 1.5,
    ripple: false
  },
  calm: {
    expansion: 0.1,
    vibration: 0.05,
    viscosity: 0.9,
    morphSpeed: 0.3,
    ripple: true
  },
  excitement: {
    expansion: 0.4,
    vibration: 0.3,
    viscosity: 0.5,
    morphSpeed: 1.2,
    ripple: true
  },
  anxiety: {
    expansion: 0.7,
    vibration: 0.9,
    viscosity: 0.2,
    morphSpeed: 2.5,
    ripple: false
  }
};

export const EmotionBlob: React.FC<EmotionBlobProps> = ({
  entity,
  isHovered = false,
  isMerging = false,
  onMerge
}) => {
  const blobRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Get emotion type from metadata
  const emotionType = useMemo(() => {
    const tag = entity.metadata.tags.find(tag =>
      Object.keys(EMOTION_COLORS).includes(tag)
    );
    return tag || 'calm';
  }, [entity.metadata.tags]);

  // Get emotion behavior
  const behavior = useMemo(() => {
    return EMOTION_BEHAVIORS[emotionType] || EMOTION_BEHAVIORS.calm;
  }, [emotionType]);

  // Blob color
  const blobColor = useMemo(() => {
    return EMOTION_COLORS[emotionType] || EMOTION_COLORS.calm;
  }, [emotionType]);

  // Blob size based on intensity and behavior
  const blobSize = useMemo(() => {
    const baseSize = 1.0;
    const intensityScale = 1 + entity.state.intensity * 0.5;
    const expansionScale = 1 + behavior.expansion * 0.3;
    return baseSize * intensityScale * expansionScale;
  }, [entity.state.intensity, behavior.expansion]);

  // Mesh gradient setup
  const gradientColors = useMemo(() => {
    const base = new THREE.Color(blobColor);
    const highlight = base.clone().offsetHSL(0, 0, 0.2);
    const shadow = base.clone().offsetHSL(0, 0, -0.2);
    return { base, highlight, shadow };
  }, [blobColor]);

  // Morphing animation
  useFrame((state) => {
    if (!blobRef.current || !groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const morphSpeed = behavior.morphSpeed * (1 + entity.state.activity);

    // Breathing with morphing
    const breathPhase = time * morphSpeed;
    const expansion = Math.sin(breathPhase) * behavior.expansion * 0.1;
    const scale = blobSize * (1 + expansion);

    blobRef.current.scale.setScalar(scale);

    // Vibration for stressed/anxious emotions
    if (behavior.vibration > 0.3) {
      const vibrationAmount = behavior.vibration * entity.state.intensity * 0.1;
      const vibX = Math.sin(time * 20) * vibrationAmount;
      const vibY = Math.cos(time * 15) * vibrationAmount;
      const vibZ = Math.sin(time * 25) * vibrationAmount;
      blobRef.current.position.set(
        entity.physics.position.x + vibX,
        entity.physics.position.y + vibY,
        entity.physics.position.z + vibZ
      );
    } else {
      blobRef.current.position.copy(entity.physics.position);
    }

    // Gentle rotation
    blobRef.current.rotation.x = time * 0.1 * morphSpeed;
    blobRef.current.rotation.y = time * 0.15 * morphSpeed;

    // Update glow
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scale * 1.2);
      if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
        const glowIntensity = entity.state.intensity * 0.5;
        glowRef.current.material.opacity = glowIntensity * (isHovered ? 0.8 : 0.4);
      }
    }

    // Hover effect
    if (isHovered && blobRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      blobRef.current.material.emissiveIntensity = 0.8;
      blobRef.current.material.roughness = 0.1;
    } else if (blobRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      blobRef.current.material.emissiveIntensity = entity.state.activity * 0.5;
      blobRef.current.material.roughness = 0.3;
    }

    // Merging animation
    if (isMerging) {
      const mergeProgress = (entity as any).mergeProgress || 0;
      const mergeScale = 1 - mergeProgress * 0.5;
      groupRef.current.scale.setScalar(mergeScale);
    }
  });

  // Handle interactions
  const handleClick = () => {
    if (onMerge && isHovered) {
      onMerge(entity);
    }
  };

  return (
    <group ref={groupRef} position={entity.physics.position}>
      {/* Main blob */}
      <mesh
        ref={blobRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          entity.setHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          entity.setHover(false);
        }}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={gradientColors.base}
          transparent
          opacity={entity.state.certainty * 0.9}
          roughness={behavior.viscosity > 0.5 ? 0.4 : 0.2}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={behavior.viscosity}
          thickness={1.0}
          distort={0.4 + behavior.expansion * 0.3}
          speed={morphSpeed}
          emissive={blobColor}
          emissiveIntensity={entity.state.activity * 0.5}
        />
      </mesh>

      {/* Outer glow for strong emotions */}
      {entity.state.intensity > 0.5 && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.3, 32, 32]} />
          <meshBasicMaterial
            color={blobColor}
            transparent
            opacity={entity.state.intensity * 0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Ripple effect for calm/hope emotions */}
      {behavior.ripple && entity.state.intensity > 0.3 && (
        <RippleRings
          count={3}
          radius={blobSize}
          color={blobColor}
          speed={1.0}
        />
      )}

      {/* Inner highlight */}
      <mesh position={[0, 0, blobSize * 0.3]}>
        <sphereGeometry args={[blobSize * 0.3, 16, 16]} />
        <meshBasicMaterial
          color={gradientColors.highlight}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

/**
 * RippleRings creates expanding rings for calm/hope emotions
 */
interface RippleRingsProps {
  count: number;
  radius: number;
  color: THREE.ColorRepresentation;
  speed: number;
}

const RippleRings: React.FC<RippleRingsProps> = ({ count, radius, color, speed }) => {
  const ringsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ringsRef.current) return;

    const time = state.clock.getElapsedTime();

    ringsRef.current.children.forEach((ring, i) => {
      const phase = (time * speed + i * (1 / count)) % 1;
      const scale = 1 + phase * 0.5;
      const opacity = 1 - phase;

      if (ring instanceof THREE.Mesh) {
        ring.scale.setScalar(scale);
        if (ring.material instanceof THREE.MeshBasicMaterial) {
          ring.material.opacity = opacity * 0.3;
        }
      }
    });
  });

  return (
    <group ref={ringsRef}>
      {[...Array(count)].map((_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.05, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

export default EmotionBlob;