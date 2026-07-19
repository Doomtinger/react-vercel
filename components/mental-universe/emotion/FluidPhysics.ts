import * as THREE from 'three';
import { MentalEntity } from '../core/MentalEntity';

/**
 * FluidPhysics handles viscosity, morphing, and fluid dynamics for emotion blobs.
 * Simulates simplified lattice fluid behavior for organic motion.
 */

export interface FluidParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  mass: number;
  radius: number;
}

export class FluidPhysics {
  private particles: Map<string, FluidParticle[]>;
  private viscosity: number;
  private surfaceTension: number;
  private damping: number;

  constructor(config?: { viscosity?: number; surfaceTension?: number; damping?: number }) {
    this.particles = new Map();
    this.viscosity = config?.viscosity || 0.5;
    this.surfaceTension = config?.surfaceTension || 0.3;
    this.damping = config?.damping || 0.95;
  }

  /**
   * Create fluid particles for an entity
   */
  createFluidParticles(entity: MentalEntity, count: number = 20): void {
    const particles: FluidParticle[] = [];
    const radius = entity.getBaseScale();

    for (let i = 0; i < count; i++) {
      // Create particles on sphere surface
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const position = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );

      particles.push({
        position: position.clone(),
        velocity: new THREE.Vector3(),
        targetPosition: position.clone(),
        mass: 1.0,
        radius: radius * 0.1
      });
    }

    this.particles.set(entity.id, particles);
  }

  /**
   * Update fluid physics for entity
   */
  updateFluid(entity: MentalEntity, dt: number): void {
    const particles = this.particles.get(entity.id);
    if (!particles) return;

    const time = Date.now() * 0.001;
    const intensity = entity.state.intensity;
    const activity = entity.state.activity;

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];

      // Morphing target position
      const morphSpeed = 2.0 * activity;
      const morphPhase = time * morphSpeed + i * 0.5;

      // Organic morphing using Perlin-like noise
      const noiseX = Math.sin(morphPhase) * 0.2;
      const noiseY = Math.cos(morphPhase * 1.3) * 0.2;
      const noiseZ = Math.sin(morphPhase * 0.7) * 0.2;

      particle.targetPosition.set(
        particle.position.x + noiseX * intensity,
        particle.position.y + noiseY * intensity,
        particle.position.z + noiseZ * intensity
      );

      // Spring force towards target
      const springForce = new THREE.Vector3()
        .subVectors(particle.targetPosition, particle.position)
        .multiplyScalar(2.0); // Spring constant

      // Viscosity damping
      const viscosityForce = particle.velocity.clone()
        .multiplyScalar(-this.viscosity * 10);

      // Apply forces
      particle.velocity.add(springForce.multiplyScalar(dt / 1000));
      particle.velocity.add(viscosityForce.multiplyScalar(dt / 1000));

      // Surface tension (pull towards surface)
      const distanceFromCenter = particle.position.length();
      const targetRadius = entity.getBaseScale();
      if (distanceFromCenter > 0) {
        const normal = particle.position.clone().normalize();
        const surfaceForce = normal.multiplyScalar(
          (targetRadius - distanceFromCenter) * this.surfaceTension
        );
        particle.velocity.add(surfaceForce.multiplyScalar(dt / 1000));
      }

      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(dt / 1000));

      // Apply damping
      particle.velocity.multiplyScalar(this.damping);
    }
  }

  /**
   * Get particle positions for rendering
   */
  getParticlePositions(entityId: string): Float32Array | null {
    const particles = this.particles.get(entityId);
    if (!particles) return null;

    const positions = new Float32Array(particles.length * 3);
    for (let i = 0; i < particles.length; i++) {
      positions[i * 3] = particles[i].position.x;
      positions[i * 3 + 1] = particles[i].position.y;
      positions[i * 3 + 2] = particles[i].position.z;
    }
    return positions;
  }

  /**
   * Calculate blob volume
   */
  calculateBlobVolume(entityId: string): number {
    const particles = this.particles.get(entityId);
    if (!particles) return 0;

    // Approximate volume using convex hull
    let volume = 0;
    const center = new THREE.Vector3();

    for (const particle of particles) {
      center.add(particle.position);
    }
    center.divideScalar(particles.length);

    for (const particle of particles) {
      const distance = particle.position.distanceTo(center);
      volume += (4/3) * Math.PI * Math.pow(distance, 3);
    }

    return volume / particles.length;
  }

  /**
   * Apply external force to particles
   */
  applyForce(entityId: string, force: THREE.Vector3): void {
    const particles = this.particles.get(entityId);
    if (!particles) return;

    for (const particle of particles) {
      particle.velocity.add(force.clone().multiplyScalar(1 / particle.mass));
    }
  }

  /**
   * Merge two fluid blobs
   */
  mergeBlobs(fromId: string, toId: string): void {
    const fromParticles = this.particles.get(fromId);
    const toParticles = this.particles.get(toId);

    if (!fromParticles || !toParticles) return;

    // Add from particles to to particles
    for (const particle of fromParticles) {
      // Find closest target particle
      let closestDist = Infinity;
      let closestIndex = 0;

      for (let i = 0; i < toParticles.length; i++) {
        const dist = particle.position.distanceTo(toParticles[i].position);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      }

      // Merge velocity
      toParticles[closestIndex].velocity.add(particle.velocity.multiplyScalar(0.5));
    }

    // Remove from particles
    this.particles.delete(fromId);
  }

  /**
   * Clean up particles for entity
   */
  cleanupParticles(entityId: string): void {
    this.particles.delete(entityId);
  }

  /**
   * Update viscosity parameter
   */
  setViscosity(viscosity: number): void {
    this.viscosity = Math.max(0, Math.min(1, viscosity));
  }

  /**
   * Update surface tension parameter
   */
  setSurfaceTension(surfaceTension: number): void {
    this.surfaceTension = Math.max(0, Math.min(1, surfaceTension));
  }

  /**
   * Get physics statistics
   */
  getStats(): { [key: string]: any } {
    const stats: any = {
      entityCount: this.particles.size,
      totalParticles: 0,
      averageVolume: 0
    };

    let totalVolume = 0;

    for (const [entityId, particles] of this.particles) {
      stats.totalParticles += particles.length;
      totalVolume += this.calculateBlobVolume(entityId);
    }

    stats.averageVolume = this.particles.size > 0 ?
      totalVolume / this.particles.size : 0;

    return stats;
  }
}

export default FluidPhysics;