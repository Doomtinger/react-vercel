import * as THREE from 'three';
import { MentalEntity } from '../core/MentalEntity';
import { EntityManager } from '../core/EntityManager';

/**
 * NetworkLayout implements force-directed graph layout for the mind graph.
 * Continuously reorganizes the network based on relationships and activity.
 */

export interface LayoutConfig {
  repulsionForce: number;
  attractionForce: number;
  springLength: number;
  damping: number;
  maxIterations: number;
  centerGravity: number;
}

export class NetworkLayout {
  private entityManager: EntityManager;
  private config: LayoutConfig;
  private isRunning: boolean = false;
  private iteration: number = 0;

  constructor(entityManager: EntityManager, config?: Partial<LayoutConfig>) {
    this.entityManager = entityManager;
    this.config = {
      repulsionForce: 500,
      attractionForce: 0.1,
      springLength: 5,
      damping: 0.8,
      maxIterations: 100,
      centerGravity: 0.01,
      ...config
    };
  }

  /**
   * Start continuous layout updates
   */
  start(): void {
    this.isRunning = true;
    this.iteration = 0;
  }

  /**
   * Stop layout updates
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Update layout (called each frame when running)
   */
  update(dt: number): void {
    if (!this.isRunning) return;

    const entities = this.entityManager.getActiveEntities();
    const cognitiveEntities = entities.filter(e =>
      e.type === 'thought' ||
      e.type === 'memory' ||
      e.type === 'belief' ||
      e.type === 'goal' ||
      e.type === 'need' ||
      e.type === 'habit' ||
      e.type === 'attention'
    );

    // Apply forces
    this.applyRepulsion(cognitiveEntities);
    this.applyAttraction(cognitiveEntities);
    this.applyCenterGravity(cognitiveEntities);

    // Update positions
    this.updatePositions(cognitiveEntities, dt);

    this.iteration++;
  }

  /**
   * Apply repulsion forces between all nodes
   */
  private applyRepulsion(entities: MentalEntity[]): void {
    for (let i = 0; i < entities.length; i++) {
      const a = entities[i];

      for (let j = i + 1; j < entities.length; j++) {
        const b = entities[j];

        const direction = new THREE.Vector3().subVectors(
          a.physics.position,
          b.physics.position
        );

        const distance = direction.length();
        if (distance < 0.1) continue; // Avoid division by zero

        direction.normalize();

        // Coulomb's law: F = k * q1 * q2 / r^2
        const forceMagnitude = this.config.repulsionForce / (distance * distance);
        const force = direction.multiplyScalar(forceMagnitude);

        a.applyForce(force);
        b.applyForce(force.clone().negate());
      }
    }
  }

  /**
   * Apply attraction forces between connected nodes
   */
  private applyAttraction(entities: MentalEntity[]): void {
    for (const entity of entities) {
      for (const relationship of entity.relationships) {
        const target = this.entityManager.getEntity(relationship.targetId);
        if (!target || !target.isAlive()) continue;
        if (!entities.includes(target)) continue;

        const direction = new THREE.Vector3().subVectors(
          target.physics.position,
          entity.physics.position
        );

        const distance = direction.length();
        direction.normalize();

        // Hooke's law: F = -k * (x - x0)
        const displacement = distance - relationship.distance;
        const forceMagnitude = this.config.attractionForce * displacement;
        const force = direction.multiplyScalar(forceMagnitude);

        entity.applyForce(force);
      }
    }
  }

  /**
   * Apply center gravity to keep nodes centered
   */
  private applyCenterGravity(entities: MentalEntity[]): void {
    const center = new THREE.Vector3(0, 0, 0);

    for (const entity of entities) {
      const direction = new THREE.Vector3().subVectors(
        center,
        entity.physics.position
      );

      const distance = direction.length();
      if (distance > 0.1) {
        direction.normalize();
        const force = direction.multiplyScalar(
          this.config.centerGravity * distance
        );
        entity.applyForce(force);
      }
    }
  }

  /**
   * Update positions based on velocities
   */
  private updatePositions(entities: MentalEntity[], dt: number): void {
    for (const entity of entities) {
      // Apply damping
      entity.physics.velocity.multiplyScalar(this.config.damping);

      // Update position
      entity.physics.position.add(
        entity.physics.velocity.clone().multiplyScalar(dt / 1000)
      );
    }
  }

  /**
   * Organize by emotional clusters
   */
  organizeByEmotion(): void {
    const entities = this.entityManager.getActiveEntities();
    const emotionMap = new Map<string, MentalEntity[]>();

    // Group by emotion tags
    for (const entity of entities) {
      for (const tag of entity.metadata.tags) {
        if (!emotionMap.has(tag)) {
          emotionMap.set(tag, []);
        }
        emotionMap.get(tag)!.push(entity);
      }
    }

    // Position emotion clusters
    const clusterRadius = 15;
    let angle = 0;
    const angleStep = (Math.PI * 2) / emotionMap.size;

    for (const [emotion, emotionEntities] of emotionMap) {
      const clusterX = Math.cos(angle) * clusterRadius;
      const clusterZ = Math.sin(angle) * clusterRadius;

      // Position entities in cluster
      for (let i = 0; i < emotionEntities.length; i++) {
        const entity = emotionEntities[i];
        const offsetX = (Math.random() - 0.5) * 5;
        const offsetY = (Math.random() - 0.5) * 5;
        const offsetZ = (Math.random() - 0.5) * 5;

        const targetPos = new THREE.Vector3(
          clusterX + offsetX,
          offsetY,
          clusterZ + offsetZ
        );

        // Apply force towards cluster center
        const direction = new THREE.Vector3().subVectors(
          targetPos,
          entity.physics.position
        );
        const force = direction.multiplyScalar(0.5);
        entity.applyForce(force);
      }

      angle += angleStep;
    }
  }

  /**
   * Organize by cognitive hierarchy
   */
  organizeByHierarchy(): void {
    const entities = this.entityManager.getActiveEntities();

    // Self at center
    const selfEntities = entities.filter(e => e.type === 'self');
    for (const self of selfEntities) {
      const force = new THREE.Vector3(0, 0, 0)
        .sub(self.physics.position)
        .multiplyScalar(0.5);
      self.applyForce(force);
    }

    // Goals at top
    const goals = entities.filter(e => e.type === 'goal');
    for (const goal of goals) {
      const force = new THREE.Vector3(0, 10, 0)
        .sub(goal.physics.position)
        .multiplyScalar(0.3);
      goal.applyForce(force);
    }

    // Memories at bottom
    const memories = entities.filter(e => e.type === 'memory');
    for (const memory of memories) {
      const force = new THREE.Vector3(0, -10, 0)
        .sub(memory.physics.position)
        .multiplyScalar(0.3);
      memory.applyForce(force);
    }

    // Thoughts in middle
    const thoughts = entities.filter(e => e.type === 'thought');
    for (const thought of thoughts) {
      const force = new THREE.Vector3(0, 0, 0)
        .sub(thought.physics.position)
        .multiplyScalar(0.2);
      thought.applyForce(force);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current iteration
   */
  getIteration(): number {
    return this.iteration;
  }

  /**
   * Check if layout is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export default NetworkLayout;