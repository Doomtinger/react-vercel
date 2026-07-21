'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Core systems
import { EntityManager } from './core/EntityManager';
import { PhysicsEngine } from './core/PhysicsEngine';

// Visualization modules
import { MentalGalaxy } from './galaxy/GalaxyController';
import { EmotionField } from './emotion/EmotionMerger';
import { ActivityDetector } from './mindgraph/ActivityDetector';
import { NetworkLayout } from './mindgraph/NetworkLayout';
import { ThoughtBubbleField } from './thoughts/ThoughtBubble';

// Types
import { MentalEntity, EntityType } from './core/MentalEntity';

/**
 * Internal component for frame updates inside Canvas context
 */
interface MentalUniverseUpdaterProps {
  isInitialized: boolean;
  physicsEngine: PhysicsEngine;
  networkLayout: NetworkLayout;
  activityDetector: ActivityDetector;
  aiReasoning: boolean;
  onStatsUpdate: (stats: { entityCount: number; fps: number; reasoningLevel: number }) => void;
}

const MentalUniverseUpdater: React.FC<MentalUniverseUpdaterProps> = ({
  isInitialized,
  physicsEngine,
  networkLayout,
  activityDetector,
  aiReasoning,
  onStatsUpdate
}) => {
  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(0);

  useFrame((state, delta) => {
    if (!isInitialized) return;

    // Update physics
    physicsEngine.update(delta * 1000);

    // Update network layout
    networkLayout.update(delta * 1000);

    // Update activity detection
    if (aiReasoning) {
      activityDetector.update(state.clock.getElapsedTime() * 1000);
    }

    // Update stats periodically
    frameCount.current++;
    const now = performance.now();
    if (now - lastFpsUpdate.current > 500) { // Update every 500ms
      const fps = Math.round(1 / delta);
      const reasoningLevel = activityDetector.getReasoningLevel();
      const entityStats = physicsEngine.getEntityManager().getStats();
      const totalEntities = Object.values(entityStats).reduce(
        (sum, stat: any) => sum + (stat.total || 0), 0
      );

      onStatsUpdate({
        entityCount: totalEntities,
        fps,
        reasoningLevel
      });

      lastFpsUpdate.current = now;
    }
  });

  return null;
};

/**
 * MentalUniverse - Main component integrating all visualization systems
 * A living, breathing representation of human psychology as a dynamic universe.
 */

interface MentalUniverseProps {
  className?: string;
  enableGalaxy?: boolean;
  enableEmotions?: boolean;
  enableMindGraph?: boolean;
  enableThoughts?: boolean;
  maxEntities?: number;
  aiReasoning?: boolean;
}

export const MentalUniverse: React.FC<MentalUniverseProps> = ({
  className = '',
  enableGalaxy = true,
  enableEmotions = true,
  enableMindGraph = true,
  enableThoughts = true,
  maxEntities = 200,
  aiReasoning = true
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hoveredEntity, setHoveredEntity] = useState<MentalEntity | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<MentalEntity | null>(null);
  const [stats, setStats] = useState({
    entityCount: 0,
    fps: 60,
    reasoningLevel: 0.5
  });

  // Initialize core systems
  const entityManager = useMemo(() => new EntityManager(), []);
  const physicsEngine = useMemo(() => new PhysicsEngine(entityManager), [entityManager]);
  const activityDetector = useMemo(() => new ActivityDetector(entityManager), [entityManager]);
  const networkLayout = useMemo(() => new NetworkLayout(entityManager), [entityManager]);

  // Create initial psychological entities
  useEffect(() => {
    if (!enableGalaxy && !enableEmotions && !enableMindGraph && !enableThoughts) return;

    // Create Self entity (always present)
    const selfEntity = entityManager.createEntity(
      EntityType.SELF,
      new THREE.Vector3(0, 0, 0),
      {
        label: 'Self',
        color: new THREE.Color(0xffffff),
        category: 'core',
        tags: ['self', 'core', 'identity'],
        description: 'The center of psychological experience'
      }
    );
    selfEntity.state.intensity = 0.8;
    selfEntity.state.certainty = 0.9;
    selfEntity.state.activity = 0.5;

    // Create emotion entities
    if (enableEmotions) {
      const emotions = [
        { name: 'Hope', color: 0x10b981, valence: 0.8, arousal: 0.6 },
        { name: 'Fear', color: 0xef4444, valence: 0.2, arousal: 0.7 },
        { name: 'Joy', color: 0xfbbf24, valence: 0.9, arousal: 0.7 },
        { name: 'Calm', color: 0x6366f1, valence: 0.6, arousal: 0.2 },
        { name: 'Anxiety', color: 0xec4899, valence: 0.3, arousal: 0.8 },
        { name: 'Excitement', color: 0xfbbf24, valence: 0.8, arousal: 0.9 }
      ];

      emotions.forEach((emotion, i) => {
        const angle = (i / emotions.length) * Math.PI * 2;
        const radius = 6 + Math.random() * 2;
        const position = new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 2,
          Math.sin(angle) * radius
        );

        const emotionEntity = entityManager.createEntity(
          EntityType.EMOTION,
          position,
          {
            label: emotion.name,
            color: new THREE.Color(emotion.color),
            category: 'emotion',
            tags: [emotion.name.toLowerCase(), 'emotion'],
            description: `${emotion.name} - A core emotional state`
          }
        );

        emotionEntity.state.intensity = 0.5 + Math.random() * 0.3;
        emotionEntity.state.certainty = 0.6 + Math.random() * 0.3;
        emotionEntity.state.activity = 0.4 + Math.random() * 0.4;
        emotionEntity.state.mood = {
          arousal: emotion.arousal,
          valence: emotion.valence,
          dominance: 0.5
        };

        // Create relationship with Self
        emotionEntity.addRelationship({
          targetId: selfEntity.id,
          type: 'emotional',
          strength: 0.6 + Math.random() * 0.3,
          distance: radius,
          activation: 0.4
        });
      });
    }

    // Create thought entities
    if (enableMindGraph) {
      const thoughts = [
        { name: 'Decision Making', type: EntityType.THOUGHT },
        { name: 'Memory Recall', type: EntityType.MEMORY },
        { name: 'Goal Setting', type: EntityType.GOAL },
        { name: 'Problem Solving', type: EntityType.THOUGHT },
        { name: 'Creativity', type: EntityType.THOUGHT },
        { name: 'Planning', type: EntityType.THOUGHT }
      ];

      thoughts.forEach((thought) => {
        const position = new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 12
        );

        const thoughtEntity = entityManager.createEntity(
          thought.type,
          position,
          {
            label: thought.name,
            color: new THREE.Color(0x06b6d4),
            category: 'cognitive',
            tags: ['thought', 'cognitive', thought.name.toLowerCase().replace(' ', '-')],
            description: `Cognitive process: ${thought.name}`
          }
        );

        thoughtEntity.state.intensity = 0.4 + Math.random() * 0.4;
        thoughtEntity.state.certainty = 0.5 + Math.random() * 0.4;
        thoughtEntity.state.activity = 0.3 + Math.random() * 0.5;
      });
    }

    // Start network layout
    networkLayout.start();

    setIsInitialized(true);

    return () => {
      networkLayout.stop();
      entityManager.clear();
    };
  }, [enableGalaxy, enableEmotions, enableMindGraph, enableThoughts]);

  // Handle entity interactions
  const handleEntitySelect = (entity: MentalEntity) => {
    setSelectedEntity(entity);

    // Trigger reasoning on selected entity
    if (aiReasoning) {
      const tags = entity.metadata.tags;
      if (tags.length > 0) {
        activityDetector.triggerReasoning(tags[0], 0.8);
      }
    }
  };

  const handleEntityHover = (entity: MentalEntity | null) => {
    setHoveredEntity(entity);
  };

  return (
    <div className={`mental-universe ${className}`}>
      <Canvas
        camera={{
          position: [20, 15, 20],
          fov: 50,
          near: 0.1,
          far: 200
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="purple" />
        <pointLight position={[0, 15, 0]} intensity={0.2} color="cyan" />

        {/* Background */}
        <color attach="background" args={['#0a0a0f']} />
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Frame updater */}
        <MentalUniverseUpdater
          isInitialized={isInitialized}
          physicsEngine={physicsEngine}
          networkLayout={networkLayout}
          activityDetector={activityDetector}
          aiReasoning={aiReasoning}
          onStatsUpdate={setStats}
        />

        {/* Visualization modules */}
        {enableGalaxy && (
          <MentalGalaxy
            entityManager={entityManager}
            onEntitySelect={handleEntitySelect}
            onEntityHover={handleEntityHover}
          />
        )}

        {enableEmotions && (
          <EmotionField
            entityManager={entityManager}
            mergeDistance={3}
            absorptionRatio={1.5}
          />
        )}

        {enableThoughts && (
          <ThoughtBubbleField
            entityManager={entityManager}
            maxBubbles={50}
            spawnRate={0.5}
          />
        )}

        {/* Camera controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={50}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>

      {/* HUD overlay */}
      <MentalUniverseHUD
        stats={stats}
        hoveredEntity={hoveredEntity}
        selectedEntity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </div>
  );
};

/**
 * MentalUniverseHUD - Heads-up display with entity information and stats
 */
interface MentalUniverseHUDProps {
  stats: {
    entityCount: number;
    fps: number;
    reasoningLevel: number;
  };
  hoveredEntity?: MentalEntity | null;
  selectedEntity?: MentalEntity | null;
  onClose?: () => void;
}

const MentalUniverseHUD: React.FC<MentalUniverseHUDProps> = ({
  stats,
  hoveredEntity,
  selectedEntity,
  onClose
}) => {
  return (
    <div className="mental-universe-hud">
      {/* Stats panel */}
      <div className="stats-panel">
        <div className="stat-item">
          <span className="stat-label">Entities</span>
          <span className="stat-value">{stats.entityCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">FPS</span>
          <span className="stat-value">{stats.fps}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Reasoning</span>
          <span className="stat-value">{(stats.reasoningLevel * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Entity info panel */}
      {(hoveredEntity || selectedEntity) && (
        <div className="entity-panel">
          <div className="entity-header">
            <h3 className="entity-title">
              {(selectedEntity || hoveredEntity)!.metadata.label}
            </h3>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="entity-info">
            <div className="info-row">
              <span className="info-label">Type</span>
              <span className="info-value">
                {(selectedEntity || hoveredEntity)!.type}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Intensity</span>
              <div className="info-bar">
                <div
                  className="info-bar-fill"
                  style={{
                    width: `${(selectedEntity || hoveredEntity)!.state.intensity * 100}%`
                  }}
                />
              </div>
            </div>

            <div className="info-row">
              <span className="info-label">Activity</span>
              <div className="info-bar">
                <div
                  className="info-bar-fill"
                  style={{
                    width: `${(selectedEntity || hoveredEntity)!.state.activity * 100}%`
                  }}
                />
              </div>
            </div>

            <div className="info-row">
              <span className="info-label">Certainty</span>
              <div className="info-bar">
                <div
                  className="info-bar-fill"
                  style={{
                    width: `${(selectedEntity || hoveredEntity)!.state.certainty * 100}%`
                  }}
                />
              </div>
            </div>

            {(selectedEntity || hoveredEntity)!.metadata.description && (
              <div className="entity-description">
                {(selectedEntity || hoveredEntity)!.metadata.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions-panel">
        <p>🖱️ Drag to rotate • Scroll to zoom • Click entities to focus</p>
        <p>💡 Double-click to center • Press ESC to deselect</p>
      </div>

      <style jsx>{`
        .mental-universe-hud {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .stats-panel {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          pointer-events: auto;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 8px;
        }

        .stat-item:last-child {
          margin-bottom: 0;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .entity-panel {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 300px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 16px;
          pointer-events: auto;
        }

        .entity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .entity-title {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .entity-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .info-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          min-width: 80px;
        }

        .info-value {
          font-size: 14px;
          color: white;
          font-weight: 500;
        }

        .info-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .info-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .entity-description {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-top: 4px;
        }

        .instructions-panel {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          padding: 10px 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .instructions-panel p {
          margin: 2px 0;
        }
      `}</style>
    </div>
  );
};

export default MentalUniverse;