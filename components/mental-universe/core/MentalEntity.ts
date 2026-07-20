import * as THREE from 'three';

/**
 * Core entity class representing psychological concepts as living objects.
 * Each entity has state, physics, relationships, and metadata.
 */

export enum EntityType {
  EMOTION = 'emotion',
  THOUGHT = 'thought',
  BELIEF = 'belief',
  MEMORY = 'memory',
  GOAL = 'goal',
  NEED = 'need',
  HABIT = 'habit',
  ATTENTION = 'attention',
  SELF = 'self'
}

export interface MoodVector {
  arousal: number;    // 0-1: low to high energy
  valence: number;    // 0-1: negative to positive
  dominance: number;  // 0-1: submissive to dominant
}

export interface EntityState {
  intensity: number;      // 0-1, affects size & glow intensity
  certainty: number;      // 0-1, affects opacity & transparency
  activity: number;       // 0-1, affects animation speed & vibration
  mood: MoodVector;       // 3D emotional position
  stability: number;      // 0-1, affects wobble & morphing
}

export interface PhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  viscosity: number;     // 0-1: water to honey
  elasticity: number;    // 0-1: bounciness
  rotation: THREE.Quaternion;
  angularVelocity: THREE.Vector3;
}

export interface Relationship {
  targetId: string;
  type: 'neural' | 'emotional' | 'causal' | 'associative';
  strength: number;      // 0-1
  distance: number;      // preferred distance in 3D space
  activation: number;    // 0-1, affects brightness
}

export interface PsychologicalMetadata {
  label: string;
  color: THREE.Color;
  description?: string;
  category: string;
  tags: string[];
  created: number;
  lastAccessed: number;
  accessCount: number;
}

export class MentalEntity {
  public readonly id: string;
  public readonly type: EntityType;
  public state: EntityState;
  public physics: PhysicsState;
  public relationships: Relationship[];
  public metadata: PsychologicalMetadata;

  private mesh?: THREE.Object3D;
  private material?: THREE.Material;
  private isHovered: boolean = false;
  private isFocused: boolean = false;
  private lifecycle: 'birthing' | 'alive' | 'dying' | 'dead' = 'birthing';
  private lifecycleProgress: number = 0; // 0-1
  private visibility: number = 0; // 0-1 for fade in/out

  constructor(
    id: string,
    type: EntityType,
    position: THREE.Vector3,
    metadata: Partial<PsychologicalMetadata>
  ) {
    this.id = id;
    this.type = type;

    // Initialize state with defaults
    this.state = {
      intensity: 0.5,
      certainty: 0.7,
      activity: 0.3,
      mood: {
        arousal: 0.5,
        valence: 0.5,
        dominance: 0.5
      },
      stability: 0.7
    };

    // Initialize physics
    this.physics = {
      position: position.clone(),
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      mass: 1.0,
      viscosity: 0.5,
      elasticity: 0.3,
      rotation: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3()
    };

    this.relationships = [];

    // Initialize metadata with defaults
    this.metadata = {
      label: metadata.label || this.id,
      color: metadata.color || new THREE.Color(0x6366f1),
      description: metadata.description,
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      created: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    };
  }

  // Lifecycle management
  birth(duration: number = 1000): void {
    this.lifecycle = 'birthing';
    this.lifecycleProgress = 0;
    // Animation will be handled by update()
  }

  die(duration: number = 1000): void {
    this.lifecycle = 'dying';
    this.lifecycleProgress = 0;
  }

  update(dt: number): void {
    // Update lifecycle
    if (this.lifecycle === 'birthing') {
      this.lifecycleProgress += dt / 1000;
      this.visibility = Math.min(1, this.lifecycleProgress);
      if (this.lifecycleProgress >= 1) {
        this.lifecycle = 'alive';
        this.visibility = 1;
      }
    } else if (this.lifecycle === 'dying') {
      this.lifecycleProgress += dt / 1000;
      this.visibility = 1 - Math.min(1, this.lifecycleProgress);
      if (this.lifecycleProgress >= 1) {
        this.lifecycle = 'dead';
        this.visibility = 0;
      }
    }

    // Skip physics update if not alive
    if (this.lifecycle !== 'alive' && this.lifecycle !== 'birthing') {
      return;
    }

    // Apply physics
    this.updatePhysics(dt);

    // Update visual properties based on state
    this.updateVisuals();
  }

  private updatePhysics(dt: number): void {
    // Apply viscosity damping
    const damping = 1 - (this.physics.viscosity * dt * 2);
    this.physics.velocity.multiplyScalar(Math.max(0, damping));

    // Update velocity with acceleration
    this.physics.velocity.add(
      this.physics.acceleration.clone().multiplyScalar(dt / 1000)
    );

    // Update position
    this.physics.position.add(
      this.physics.velocity.clone().multiplyScalar(dt / 1000)
    );

    // Reset acceleration for next frame
    this.physics.acceleration.set(0, 0, 0);

    // Update rotation
    this.physics.angularVelocity.multiplyScalar(Math.max(0, damping));
    const rotationDelta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        this.physics.angularVelocity.x * dt / 1000,
        this.physics.angularVelocity.y * dt / 1000,
        this.physics.angularVelocity.z * dt / 1000
      )
    );
    this.physics.rotation.multiply(rotationDelta);
  }

  private updateVisuals(): void {
    if (!this.mesh) return;

    // Apply position
    this.mesh.position.copy(this.physics.position);
    this.mesh.quaternion.copy(this.physics.rotation);

    // Update scale based on intensity and lifecycle
    const baseScale = this.getBaseScale();
    const intensityScale = 1 + (this.state.intensity * 0.5);
    const lifecycleScale = this.lifecycle === 'birthing' ?
      this.easeOutBack(this.visibility) : 1;
    const finalScale = baseScale * intensityScale * lifecycleScale;

    this.mesh.scale.setScalar(finalScale);

    // Update material properties
    if (this.material && 'opacity' in this.material) {
      const material = this.material as THREE.MaterialTransparent;
      // Combine certainty, lifecycle, and hover state
      material.opacity = this.state.certainty * this.visibility;

      if ('transparent' in material) {
        material.transparent = true;
      }
    }
  }

  private getBaseScale(): number {
    switch (this.type) {
      case EntityType.SELF:
        return 2.0;
      case EntityType.EMOTION:
        return 1.0 + (this.state.intensity * 0.5);
      case EntityType.THOUGHT:
        return 0.8 + (this.state.intensity * 0.3);
      case EntityType.MEMORY:
        return 0.9;
      case EntityType.GOAL:
        return 1.1;
      default:
        return 1.0;
    }
  }

  // Easing function for smooth birth animation
  private easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // Force application
  applyForce(force: THREE.Vector3): void {
    const f = force.clone().divideScalar(this.physics.mass);
    this.physics.acceleration.add(f);
  }

  // Relationship management
  addRelationship(relationship: Relationship): void {
    const existing = this.relationships.findIndex(
      r => r.targetId === relationship.targetId && r.type === relationship.type
    );
    if (existing >= 0) {
      this.relationships[existing] = relationship;
    } else {
      this.relationships.push(relationship);
    }
  }

  removeRelationship(targetId: string, type?: string): void {
    this.relationships = this.relationships.filter(
      r => r.targetId !== targetId && (!type || r.type === type)
    );
  }

  getRelationships(type?: string): Relationship[] {
    if (!type) return this.relationships;
    return this.relationships.filter(r => r.type === type);
  }

  // Interaction state
  setHover(hovered: boolean): void {
    this.isHovered = hovered;
    if (hovered) {
      this.metadata.lastAccessed = Date.now();
      this.metadata.accessCount++;
    }
  }

  setFocused(focused: boolean): void {
    this.isFocused = focused;
  }

  // Mesh management
  setMesh(mesh: THREE.Object3D, material?: THREE.Material): void {
    this.mesh = mesh;
    this.material = material;
  }

  getMesh(): THREE.Object3D | undefined {
    return this.mesh;
  }

  // State queries
  isAlive(): boolean {
    return this.lifecycle === 'alive' || this.lifecycle === 'birthing';
  }

  isVisible(): boolean {
    return this.visibility > 0;
  }

  getDistanceTo(other: MentalEntity): number {
    return this.physics.position.distanceTo(other.physics.position);
  }

  // State mutations
  modifyIntensity(delta: number): void {
    this.state.intensity = Math.max(0, Math.min(1, this.state.intensity + delta));
  }

  modifyActivity(delta: number): void {
    this.state.activity = Math.max(0, Math.min(1, this.state.activity + delta));
  }

  modifyCertainty(delta: number): void {
    this.state.certainty = Math.max(0, Math.min(1, this.state.certainty + delta));
  }
}

export default MentalEntity;