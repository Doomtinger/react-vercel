import { MentalEntity, EntityType } from './MentalEntity';
import { EntityManager } from './EntityManager';
import * as THREE from 'three';

/**
 * Organic physics engine for mental universe.
 * Handles soft body dynamics, fluid motion, and psychological forces.
 */

export interface PhysicsConfig {
  gravity: THREE.Vector3;
  dragCoefficient: number;
  repulsionStrength: number;
  attractionStrength: number;
  collisionElasticity: number;
  breathingSpeed: number;
  fluidViscosity: number;
}

export class PhysicsEngine {
  private entityManager: EntityManager;
  private config: PhysicsConfig;
  private time: number = 0;

  // Force fields
  private attractors: Map<string, THREE.Vector3>;
  private repulsors: Map<string, THREE.Vector3>;

  constructor(entityManager: EntityManager, config?: Partial<PhysicsConfig>) {
    this.entityManager = entityManager;
    this.config = {
      gravity: new THREE.Vector3(0, 0, 0), // No gravity in mental space
      dragCoefficient: 0.02,
      repulsionStrength: 50,
      attractionStrength: 30,
      collisionElasticity: 0.3,
      breathingSpeed: 0.5,
      fluidViscosity: 0.5,
      ...config
    };

    this.attractors = new Map();
    this.repulsors = new Map();
  }

  /**
   * Update physics simulation (called each frame)
   */
  update(dt: number): void {
    this.time += dt / 1000;
    const entities = this.entityManager.getActiveEntities();

    // Apply all forces
    for (const entity of entities) {
      if (!entity.isAlive()) continue;

      // Clear forces
      entity.physics.acceleration.set(0, 0, 0);

      // Apply organic forces
      this.applyBreathingForce(entity);
      this.applyFloatingForce(entity);
      this.applyRelationshipForces(entity);
      this.applyCollisionForces(entity, entities);
      this.applyDragForce(entity);
      this.applyTypeSpecificForces(entity);
    }

    // Update entities
    this.entityManager.update(dt);
  }

  /**
   * Breathing force - organic expansion and contraction
   */
  private applyBreathingForce(entity: MentalEntity): void {
    const breathingPhase = this.time * this.config.breathingSpeed + entity.id.length;
    const breathingAmount = Math.sin(breathingPhase) * 0.02;

    // Breathing affects size (handled in entity update) and slight position movement
    entity.physics.position.y += breathingAmount * entity.state.intensity;
  }

  /**
   * Floating force - gentle random movement
   */
  private applyFloatingForce(entity: MentalEntity): void {
    // Perlin-like noise using simple superposition of sine waves
    const noiseX = Math.sin(this.time * 0.5 + entity.physics.position.y * 0.1) *
                    Math.cos(this.time * 0.3 + entity.physics.position.z * 0.1);
    const noiseY = Math.cos(this.time * 0.4 + entity.physics.position.x * 0.1) *
                    Math.sin(this.time * 0.6 + entity.physics.position.z * 0.1);
    const noiseZ = Math.sin(this.time * 0.6 + entity.physics.position.x * 0.1) *
                    Math.cos(this.time * 0.5 + entity.physics.position.y * 0.1);

    const floatStrength = 0.5 * entity.state.activity;
    const floatForce = new THREE.Vector3(noiseX, noiseY, noiseZ).multiplyScalar(floatStrength);

    entity.applyForce(floatForce);
  }

  /**
   * Relationship forces - attraction/repulsion between related entities
   */
  private applyRelationshipForces(entity: MentalEntity): void {
    for (const relationship of entity.relationships) {
      const target = this.entityManager.getEntity(relationship.targetId);
      if (!target || !target.isAlive()) continue;

      const direction = new THREE.Vector3().subVectors(
        target.physics.position,
        entity.physics.position
      );

      const distance = direction.length();
      if (distance < 0.1) continue; // Avoid division by zero

      direction.normalize();

      // Calculate desired distance based on relationship
      const desiredDistance = relationship.distance;
      const distanceDiff = distance - desiredDistance;

      // Spring force towards desired distance
      const springStrength = relationship.strength * this.config.attractionStrength;
      const springForce = direction.multiplyScalar(distanceDiff * springStrength * 0.1);

      entity.applyForce(springForce);

      // Neural activation effect - slight pulse when active
      if (relationship.activation > 0.5) {
        const pulseStrength = relationship.activation * 0.2;
        const pulseForce = direction.multiplyScalar(pulseStrength * Math.sin(this.time * 10));
        entity.applyForce(pulseForce);
      }
    }
  }

  /**
   * Collision forces - soft body collision response
   */
  private applyCollisionForces(entity: MentalEntity, allEntities: MentalEntity[]): void {
    // Find nearby entities using spatial query
    const nearby = this.entityManager.findWithinRadius(
      entity.physics.position,
      this.getCollisionRadius(entity) * 2
    );

    for (const other of nearby) {
      if (other.id === entity.id) continue;

      const direction = new THREE.Vector3().subVectors(
        entity.physics.position,
        other.physics.position
      );

      const distance = direction.length();
      const minDistance = this.getCollisionRadius(entity) + this.getCollisionRadius(other);

      if (distance < minDistance && distance > 0) {
        // Collision detected - apply repulsion
        direction.normalize();
        const penetration = minDistance - distance;
        const repulsionStrength = this.config.repulsionStrength * penetration;
        const repulsionForce = direction.multiplyScalar(repulsionStrength);

        entity.applyForce(repulsionForce);

        // Soft collision - transfer some momentum
        const relativeVelocity = new THREE.Vector3().subVectors(
          entity.physics.velocity,
          other.physics.velocity
        );

        const momentumTransfer = relativeVelocity.multiplyScalar(
          -this.config.collisionElasticity * 0.5
        );

        entity.applyForce(momentumTransfer);
      }
    }
  }

  /**
   * Drag force - resistance through mental "fluid"
   */
  private applyDragForce(entity: MentalEntity): void {
    const dragMagnitude = entity.physics.velocity.length();
    if (dragMagnitude > 0) {
      const dragDirection = entity.physics.velocity.clone().normalize();
      const dragForce = dragDirection.multiplyScalar(
        -dragMagnitude * dragMagnitude * this.config.dragCoefficient
      );
      entity.applyForce(dragForce);
    }
  }

  /**
   * Type-specific forces - psychological movement patterns
   */
  private applyTypeSpecificForces(entity: MentalEntity): void {
    switch (entity.type) {
      case EntityType.SELF:
        // Self stays near center, gentle drift
        const centerDist = entity.physics.position.length();
        if (centerDist > 5) {
          const toCenter = entity.physics.position.clone().normalize().multiplyScalar(-2);
          entity.applyForce(toCenter);
        }
        break;

      case EntityType.EMOTION:
        // Emotions orbit around self
        const orbitForce = this.calculateOrbitForce(entity);
        entity.applyForce(orbitForce);

        // Mood-based movement
        const moodForce = this.calculateMoodForce(entity);
        entity.applyForce(moodForce);
        break;

      case EntityType.THOUGHT:
        // Thoughts float upward
        entity.applyForce(new THREE.Vector3(0, 0.5, 0));

        // Thoughts drift based on activity
        const driftX = Math.sin(this.time + entity.id.length) * 0.3;
        const driftZ = Math.cos(this.time * 0.8 + entity.id.length) * 0.3;
        entity.applyForce(new THREE.Vector3(driftX, 0, driftZ));
        break;

      case EntityType.MEMORY:
        // Memories slowly sink and drift
        entity.applyForce(new THREE.Vector3(0, -0.1, 0));
        break;

      case EntityType.GOAL:
        // Goals pull towards them
        const pullStrength = entity.state.intensity * 0.5;
        entity.applyForce(new THREE.Vector3(0, pullStrength, 0));
        break;
    }
  }

  /**
   * Calculate orbital force for emotions
   */
  private calculateOrbitForce(entity: MentalEntity): THREE.Vector3 {
    // Find self entity
    const selfEntities = this.entityManager.getEntitiesByType(EntityType.SELF);
    if (selfEntities.length === 0) return new THREE.Vector3(0, 0, 0);

    const self = selfEntities[0];
    const toSelf = new THREE.Vector3().subVectors(
      self.physics.position,
      entity.physics.position
    );

    const distance = toSelf.length();
    const desiredDistance = 6 + entity.state.intensity * 3; // Orbit radius

    // Attraction to orbit distance
    const distanceDiff = distance - desiredDistance;
    const attractionForce = toSelf.normalize().multiplyScalar(distanceDiff * 0.5);

    // Tangential force for orbiting
    const tangent = new THREE.Vector3(-toSelf.z, 0, toSelf.x).normalize();
    const orbitSpeed = 0.3 * (entity.state.mood.arousal + 0.5);
    const orbitForce = tangent.multiplyScalar(orbitSpeed);

    return attractionForce.add(orbitForce);
  }

  /**
   * Calculate mood-based movement force
   */
  private calculateMoodForce(entity: MentalEntity): THREE.Vector3 {
    const mood = entity.state.mood;

    // High arousal → more vertical movement
    const arousalForce = new THREE.Vector3(0, mood.arousal - 0.5, 0).multiplyScalar(0.2);

    // Valence affects horizontal spread
    const valenceAngle = mood.valence * Math.PI * 2;
    const valenceForce = new THREE.Vector3(
      Math.cos(valenceAngle),
      0,
      Math.sin(valenceAngle)
    ).multiplyScalar(0.1);

    // Dominance affects speed/intensity
    const dominanceMultiplier = 0.5 + mood.dominance;

    return arousalForce.add(valenceForce).multiplyScalar(dominanceMultiplier);
  }

  /**
   * Get collision radius based on entity type and state
   */
  private getCollisionRadius(entity: MentalEntity): number {
    const baseRadius = entity.getBaseScale() * 0.5;
    return baseRadius * (1 + entity.state.intensity * 0.3);
  }

  /**
   * Add attractor point
   */
  addAttractor(id: string, position: THREE.Vector3): void {
    this.attractors.set(id, position.clone());
  }

  /**
   * Add repulsor point
   */
  addRepulsor(id: string, position: THREE.Vector3): void {
    this.repulsors.set(id, position.clone());
  }

  /**
   * Remove attractor/repulsor
   */
  removeForceField(id: string): void {
    this.attractors.delete(id);
    this.repulsors.delete(id);
  }

  /**
   * Apply external force fields
   */
  private applyForceFields(entity: MentalEntity): void {
    // Apply attractors
    for (const [id, position] of this.attractors) {
      const direction = new THREE.Vector3().subVectors(
        position,
        entity.physics.position
      );

      const distance = direction.length();
      if (distance > 0.1) {
        direction.normalize();
        const strength = this.config.attractionStrength / (distance * distance);
        const force = direction.multiplyScalar(strength);
        entity.applyForce(force);
      }
    }

    // Apply repulsors
    for (const [id, position] of this.repulsors) {
      const direction = new THREE.Vector3().subVectors(
        entity.physics.position,
        position
      );

      const distance = direction.length();
      if (distance > 0.1) {
        direction.normalize();
        const strength = this.config.repulsionStrength / (distance * distance);
        const force = direction.multiplyScalar(strength);
        entity.applyForce(force);
      }
    }
  }

  /**
   * Apply fluid viscosity - slow down in dense areas
   */
  private applyFluidViscosity(entity: MentalEntity): void {
    const nearby = this.entityManager.findWithinRadius(
      entity.physics.position,
      5
    );

    // More nearby entities = higher viscosity
    const density = nearby.length / 10; // Normalize to 0-1 range
    const viscosity = this.config.fluidViscosity * density;

    // Apply viscosity as additional drag
    const dragMultiplier = 1 + viscosity;
    entity.physics.velocity.multiplyScalar(1 - dragMultiplier * 0.01);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  /**
   * Apply impulse to entity
   */
  applyImpulse(entityId: string, impulse: THREE.Vector3): void {
    const entity = this.entityManager.getEntity(entityId);
    if (entity) {
      entity.physics.velocity.add(impulse);
    }
  }

  /**
   * Set entity velocity directly
   */
  setVelocity(entityId: string, velocity: THREE.Vector3): void {
    const entity = this.entityManager.getEntity(entityId);
    if (entity) {
      entity.physics.velocity.copy(velocity);
    }
  }
}

export default PhysicsEngine;