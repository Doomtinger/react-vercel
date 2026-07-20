import * as THREE from 'three';
import { MentalEntity, EntityType } from '../core/MentalEntity';
import { EntityManager } from '../core/EntityManager';

/**
 * ActivityDetector simulates AI reasoning and cognitive activation.
 * Automatically creates new links and activates thought patterns.
 */

export interface ActivityPattern {
  type: 'focus' | 'association' | 'conflict' | 'integration';
  entities: MentalEntity[];
  intensity: number;
  duration: number;
}

export class ActivityDetector {
  private entityManager: EntityManager;
  private activePatterns: Map<string, ActivityPattern>;
  private reasoningLevel: number; // 0-1, overall cognitive activity
  private updateInterval: number = 100; // ms
  private lastUpdate: number = 0;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
    this.activePatterns = new Map();
    this.reasoningLevel = 0.5;
  }

  /**
   * Update activity detection (called periodically)
   */
  update(timestamp: number): void {
    if (timestamp - this.lastUpdate < this.updateInterval) return;

    this.lastUpdate = timestamp;

    // Update overall reasoning level
    this.updateReasoningLevel();

    // Detect activity patterns
    this.detectFocusPatterns();
    this.detectAssociationPatterns();
    this.detectConflictPatterns();
    this.detectIntegrationPatterns();

    // Activate entities based on patterns
    this.activateEntities();

    // Create new connections based on activity
    this.createDynamicConnections();

    // Clean up old patterns
    this.cleanupPatterns(timestamp);
  }

  /**
   * Update overall reasoning level
   */
  private updateReasoningLevel(): void {
    const entities = this.entityManager.getActiveEntities();
    const thoughts = entities.filter(e => e.type === 'thought');

    if (thoughts.length === 0) {
      this.reasoningLevel = 0.3;
      return;
    }

    // Calculate average activity of thoughts
    let totalActivity = 0;
    for (const thought of thoughts) {
      totalActivity += thought.state.activity;
    }

    this.reasoningLevel = Math.min(1, totalActivity / thoughts.length * 2);
  }

  /**
   * Detect focus patterns (highly active related entities)
   */
  private detectFocusPatterns(): void {
    const entities = this.entityManager.getActiveEntities();
    const activeEntities = entities.filter(e => e.state.activity > 0.6);

    for (const entity of activeEntities) {
      // Find nearby active entities
      const nearby = this.entityManager.findWithinRadius(
        entity.physics.position,
        5
      ).filter(e => e.state.activity > 0.5);

      if (nearby.length >= 3) {
        // Create focus pattern
        const patternId = `focus-${entity.id}`;
        const existing = this.activePatterns.get(patternId);

        if (existing) {
          existing.entities = nearby;
          existing.intensity = Math.min(1, existing.intensity + 0.1);
        } else {
          this.activePatterns.set(patternId, {
            type: 'focus',
            entities: nearby,
            intensity: 0.5,
            duration: 5000
          });
        }
      }
    }
  }

  /**
   * Detect association patterns (similar entities forming networks)
   */
  private detectAssociationPatterns(): void {
    const entities = this.entityManager.getActiveEntities();

    // Group by tags
    const tagGroups = new Map<string, MentalEntity[]>();
    for (const entity of entities) {
      for (const tag of entity.metadata.tags) {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push(entity);
      }
    }

    // Create association patterns for active tag groups
    for (const [tag, tagEntities] of tagGroups) {
      const activeTagEntities = tagEntities.filter(e => e.state.activity > 0.4);

      if (activeTagEntities.length >= 4) {
        const patternId = `association-${tag}`;
        const existing = this.activePatterns.get(patternId);

        if (existing) {
          existing.entities = activeTagEntities;
          existing.intensity = Math.min(1, existing.intensity + 0.05);
        } else {
          this.activePatterns.set(patternId, {
            type: 'association',
            entities: activeTagEntities,
            intensity: 0.4,
            duration: 8000
          });
        }
      }
    }
  }

  /**
   * Detect conflict patterns (opposing entities near each other)
   */
  private detectConflictPatterns(): void {
    const entities = this.entityManager.getActiveEntities();

    // Find opposing emotions/concepts
    const opposites = [
      ['joy', 'sadness'],
      ['hope', 'fear'],
      ['confidence', 'anxiety'],
      ['calm', 'stress']
    ];

    for (const [opposite1, opposite2] of opposites) {
      const entities1 = entities.filter(e => e.metadata.tags.includes(opposite1));
      const entities2 = entities.filter(e => e.metadata.tags.includes(opposite2));

      for (const e1 of entities1) {
        for (const e2 of entities2) {
          const distance = e1.physics.position.distanceTo(e2.physics.position);
          if (distance < 4 && e1.state.activity > 0.4 && e2.state.activity > 0.4) {
            // Create conflict pattern
            const patternId = `conflict-${e1.id}-${e2.id}`;
            const existing = this.activePatterns.get(patternId);

            if (existing) {
              existing.intensity = Math.min(1, existing.intensity + 0.15);
            } else {
              this.activePatterns.set(patternId, {
                type: 'conflict',
                entities: [e1, e2],
                intensity: 0.6,
                duration: 3000
              });
            }
          }
        }
      }
    }
  }

  /**
   * Detect integration patterns (new connections forming)
   */
  private detectIntegrationPatterns(): void {
    const entities = this.entityManager.getActiveEntities();
    const newConnections = entities.filter(e =>
      e.relationships.length < 3 && e.state.activity > 0.5
    );

    for (const entity of newConnections) {
      // Find nearby unconnected entities
      const nearby = this.entityManager.findWithinRadius(
        entity.physics.position,
        6
      ).filter(e =>
        e.id !== entity.id &&
        !entity.relationships.some(r => r.targetId === e.id) &&
        e.state.activity > 0.4
      );

      if (nearby.length >= 2) {
        const patternId = `integration-${entity.id}`;
        const existing = this.activePatterns.get(patternId);

        if (existing) {
          existing.entities = [entity, ...nearby.slice(0, 3)];
          existing.intensity = Math.min(1, existing.intensity + 0.1);
        } else {
          this.activePatterns.set(patternId, {
            type: 'integration',
            entities: [entity, ...nearby.slice(0, 3)],
            intensity: 0.3,
            duration: 10000
          });
        }
      }
    }
  }

  /**
   * Activate entities based on patterns
   */
  private activateEntities(): void {
    for (const pattern of this.activePatterns.values()) {
      for (const entity of pattern.entities) {
        // Boost activity based on pattern intensity
        const activityBoost = pattern.intensity * 0.1;
        entity.modifyActivity(activityBoost);

        // Boost intensity for focus patterns
        if (pattern.type === 'focus') {
          entity.modifyIntensity(pattern.intensity * 0.05);
        }

        // Update relationship activation
        for (const relationship of entity.relationships) {
          const target = this.entityManager.getEntity(relationship.targetId);
          if (target && pattern.entities.includes(target)) {
            relationship.activation = Math.min(1, relationship.activation + 0.1);
          }
        }
      }
    }
  }

  /**
   * Create dynamic connections based on activity patterns
   */
  private createDynamicConnections(): void {
    for (const pattern of this.activePatterns.values()) {
      if (pattern.intensity < 0.6) continue; // Only strong patterns create connections

      // Create connections between entities in pattern
      for (let i = 0; i < pattern.entities.length; i++) {
        for (let j = i + 1; j < pattern.entities.length; j++) {
          const from = pattern.entities[i];
          const to = pattern.entities[j];

          // Skip if already connected
          if (from.relationships.some(r => r.targetId === to.id)) continue;

          // Create new relationship
          const strength = pattern.intensity * 0.5;
          const distance = from.physics.position.distanceTo(to.physics.position);

          from.addRelationship({
            targetId: to.id,
            type: pattern.type === 'integration' ? 'causal' : 'associative',
            strength: strength,
            distance: distance,
            activation: pattern.intensity
          });

          // Reciprocal connection
          to.addRelationship({
            targetId: from.id,
            type: pattern.type === 'integration' ? 'causal' : 'associative',
            strength: strength,
            distance: distance,
            activation: pattern.intensity
          });
        }
      }
    }
  }

  /**
   * Clean up expired patterns
   */
  private cleanupPatterns(timestamp: number): void {
    const expired: string[] = [];

    for (const [id, pattern] of this.activePatterns) {
      pattern.duration -= this.updateInterval;

      if (pattern.duration <= 0) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.activePatterns.delete(id);
    }
  }

  /**
   * Trigger reasoning on specific topic
   */
  triggerReasoning(topic: string, intensity: number): void {
    // Find entities related to topic
    const entities = this.entityManager.getActiveEntities();
    const relatedEntities = entities.filter(e =>
      e.metadata.tags.includes(topic) ||
      e.metadata.label.toLowerCase().includes(topic.toLowerCase())
    );

    // Boost their activity
    for (const entity of relatedEntities) {
      entity.modifyActivity(intensity * 0.5);
      entity.modifyIntensity(intensity * 0.3);
    }

    // Create focus pattern
    if (relatedEntities.length > 0) {
      const patternId = `reasoning-${topic}-${Date.now()}`;
      this.activePatterns.set(patternId, {
        type: 'focus',
        entities: relatedEntities,
        intensity: intensity,
        duration: 15000
      });
    }

    // Update overall reasoning level
    this.reasoningLevel = Math.min(1, this.reasoningLevel + intensity * 0.3);
  }

  /**
   * Get current reasoning level
   */
  getReasoningLevel(): number {
    return this.reasoningLevel;
  }

  /**
   * Get active patterns
   */
  getActivePatterns(): ActivityPattern[] {
    return Array.from(this.activePatterns.values());
  }

  /**
   * Set update interval
   */
  setUpdateInterval(interval: number): void {
    this.updateInterval = Math.max(50, interval);
  }
}

export default ActivityDetector;