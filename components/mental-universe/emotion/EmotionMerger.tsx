import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MentalEntity } from '../core/MentalEntity';
import { EntityManager } from '../core/EntityManager';
import { FluidPhysics } from './FluidPhysics';
import EmotionBlob from './EmotionBlob';

/**
 * EmotionMerger handles blob merging and absorption dynamics.
 * Strong emotions absorb nearby weaker ones, related emotions merge.
 */

interface EmotionMergerProps {
  entityManager: EntityManager;
  fluidPhysics: FluidPhysics;
  mergeDistance?: number;
  absorptionRatio?: number; // intensity ratio for absorption
}

interface MergeAnimation {
  fromEntity: MentalEntity;
  toEntity: MentalEntity;
  progress: number; // 0-1
  startTime: number;
  duration: number;
}

export const EmotionMerger: React.FC<EmotionMergerProps> = ({
  entityManager,
  fluidPhysics,
  mergeDistance = 3,
  absorptionRatio = 1.5
}) => {
  const [mergeAnimations, setMergeAnimations] = useState<MergeAnimation[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  // Check for potential merges
  useFrame(() => {
    const entities = entityManager.getActiveEntities();
    const emotions = entities.filter(e => e.type === 'emotion' && e.isAlive());

    // Check for absorption (strong absorbs weak)
    for (const strong of emotions) {
      if (strong.state.intensity < 0.6) continue; // Only strong emotions absorb

      const nearby = entityManager.findWithinRadius(
        strong.physics.position,
        mergeDistance
      ).filter(e =>
        e.id !== strong.id &&
        e.type === 'emotion' &&
        e.isAlive() &&
        strong.state.intensity / e.state.intensity > absorptionRatio
      );

      for (const weak of nearby) {
        // Start merge animation
        if (!mergeAnimations.find(m => m.fromEntity.id === weak.id)) {
          startMergeAnimation(weak, strong);
        }
      }
    }

    // Check for related emotion merges
    for (let i = 0; i < emotions.length; i++) {
      for (let j = i + 1; j < emotions.length; j++) {
        const a = emotions[i];
        const b = emotions[j];

        if (!a.isAlive() || !b.isAlive()) continue;

        // Check if emotions are related
        const areRelated = checkEmotionRelation(a, b);
        if (!areRelated) continue;

        const distance = a.physics.position.distanceTo(b.physics.position);
        if (distance < mergeDistance * 0.8) {
          // Merge related emotions
          if (!mergeAnimations.find(m =>
            (m.fromEntity.id === a.id && m.toEntity.id === b.id) ||
            (m.fromEntity.id === b.id && m.toEntity.id === a.id)
          )) {
            // Create stronger merged entity
            const stronger = a.state.intensity > b.state.intensity ? a : b;
            const weaker = a.state.intensity > b.state.intensity ? b : a;
            startMergeAnimation(weaker, stronger);
          }
        }
      }
    }
  });

  // Update merge animations
  useFrame((state) => {
    const now = state.clock.getElapsedTime() * 1000;
    const activeAnimations: MergeAnimation[] = [];

    for (const animation of mergeAnimations) {
      const elapsed = now - animation.startTime;
      animation.progress = Math.min(1, elapsed / animation.duration);

      if (animation.progress < 1) {
        activeAnimations.push(animation);

        // Update from entity position towards to entity
        const direction = new THREE.Vector3().subVectors(
          animation.toEntity.physics.position,
          animation.fromEntity.physics.position
        );

        const lerpFactor = animation.progress;
        animation.fromEntity.physics.position.lerp(
          animation.toEntity.physics.position,
          lerpFactor * 0.1
        );

        // Shrink from entity
        const scale = 1 - animation.progress * 0.5;
        const mesh = animation.fromEntity.getMesh();
        if (mesh) {
          mesh.scale.setScalar(scale);
        }
      } else {
        // Complete merge
        completeMerge(animation);
      }
    }

    if (activeAnimations.length !== mergeAnimations.length) {
      setMergeAnimations(activeAnimations);
    }
  });

  const startMergeAnimation = (from: MentalEntity, to: MentalEntity) => {
    const animation: MergeAnimation = {
      fromEntity: from,
      toEntity: to,
      progress: 0,
      startTime: Date.now(),
      duration: 1000 // 1 second merge
    };

    setMergeAnimations(prev => [...prev, animation]);

    // Start merge in fluid physics
    fluidPhysics.mergeBlobs(from.id, to.id);
  };

  const completeMerge = (animation: MergeAnimation) => {
    const { fromEntity, toEntity } = animation;

    // Boost to entity intensity
    toEntity.modifyIntensity(fromEntity.state.intensity * 0.3);
    toEntity.modifyActivity(fromEntity.state.activity * 0.2);

    // Deactivate from entity
    entityManager.deactivateEntity(fromEntity.id);

    // Clean up fluid particles
    fluidPhysics.cleanupParticles(fromEntity.id);
  };

  const checkEmotionRelation = (a: MentalEntity, b: MentalEntity): boolean => {
    // Check if emotions share tags
    const aTags = new Set(a.metadata.tags);
    const bTags = new Set(b.metadata.tags);

    for (const tag of aTags) {
      if (bTags.has(tag)) return true;
    }

    // Check if emotions are opposites (can merge to form new emotion)
    const opposites = [
      ['joy', 'sadness'],
      ['anger', 'fear'],
      ['trust', 'disgust'],
      ['surprise', 'anticipation']
    ];

    for (const [opposite1, opposite2] of opposites) {
      if ((a.metadata.tags.includes(opposite1) && b.metadata.tags.includes(opposite2)) ||
          (a.metadata.tags.includes(opposite2) && b.metadata.tags.includes(opposite1))) {
        return true;
      }
    }

    return false;
  };

  return <group ref={groupRef} />;
};

/**
 * EmotionField manages the entire emotion fluid field
 */
interface EmotionFieldProps {
  entityManager: EntityManager;
  mergeDistance?: number;
  absorptionRatio?: number;
}

export const EmotionField: React.FC<EmotionFieldProps> = ({
  entityManager,
  mergeDistance = 3,
  absorptionRatio = 1.5
}) => {
  const fluidPhysicsRef = useRef<FluidPhysics | null>(null);
  const [emotions, setEmotions] = useState<MentalEntity[]>([]);

  // Initialize fluid physics
  useEffect(() => {
    fluidPhysicsRef.current = new FluidPhysics({
      viscosity: 0.5,
      surfaceTension: 0.3,
      damping: 0.95
    });

    return () => {
      // Cleanup
    };
  }, []);

  // Update emotions list
  useFrame(() => {
    const currentEmotions = entityManager
      .getActiveEntities()
      .filter(e => e.type === 'emotion');

    // Create fluid particles for new emotions
    if (fluidPhysicsRef.current) {
      for (const emotion of currentEmotions) {
        if (!fluidPhysicsRef.current!.getParticlePositions(emotion.id)) {
          fluidPhysicsRef.current!.createFluidParticles(emotion, 20);
        }
      }
    }

    setEmotions(currentEmotions);
  });

  // Update fluid physics
  useFrame((state, delta) => {
    if (!fluidPhysicsRef.current) return;

    for (const emotion of emotions) {
      fluidPhysicsRef.current.updateFluid(emotion, delta * 1000);
    }
  });

  return (
    <group>
      {/* Render emotion blobs */}
      {emotions.map((emotion) => (
        <EmotionBlob
          key={emotion.id}
          entity={emotion}
          isHovered={false}
        />
      ))}

      {/* Emotion merger */}
      {fluidPhysicsRef.current && (
        <EmotionMerger
          entityManager={entityManager}
          fluidPhysics={fluidPhysicsRef.current}
          mergeDistance={mergeDistance}
          absorptionRatio={absorptionRatio}
        />
      )}
    </group>
  );
};

export default EmotionMerger;