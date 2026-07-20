import { MentalEntity, EntityType } from './MentalEntity';
import * as THREE from 'three';

/**
 * Manages entity lifecycle, pooling, and spatial queries.
 * Optimized for hundreds of entities with 60fps performance.
 */

interface EntityPool {
  entities: Map<string, MentalEntity>;
  active: Set<string>;
  dormant: Set<string>;
}

export class EntityManager {
  private pools: Map<EntityType, EntityPool>;
  private spatialIndex: Map<string, Set<string>>; // Spatial hashing
  private cellSize: number = 5; // Spatial hash cell size
  private maxEntitiesPerType: number = 500;
  private cleanupThreshold: number = 0.3; // Cleanup when 30% are dormant

  constructor() {
    this.pools = new Map();
    this.spatialIndex = new Map();

    // Initialize pools for each entity type
    Object.values(EntityType).forEach(type => {
      this.pools.set(type as EntityType, {
        entities: new Map(),
        active: new Set(),
        dormant: new Set()
      });
    });
  }

  /**
   * Create a new entity with automatic pooling
   */
  createEntity(
    type: EntityType,
    position: THREE.Vector3,
    metadata: Partial<MentalEntity['metadata']>
  ): MentalEntity {
    const pool = this.pools.get(type)!;

    // Try to reuse a dormant entity
    let entity: MentalEntity;
    const dormantId = pool.dormant.values().next().value;

    if (dormantId) {
      entity = pool.entities.get(dormantId)!;
      this.recycleEntity(entity, position, metadata);
      pool.dormant.delete(dormantId);
    } else {
      // Create new entity if under limit
      if (pool.entities.size >= this.maxEntitiesPerType) {
        console.warn(`Max entities reached for type ${type}, reusing oldest`);
        const oldestActive = this.getOldestActive(type);
        if (oldestActive) {
          this.deactivateEntity(oldestActive.id);
          entity = pool.entities.get(oldestActive.id)!;
          this.recycleEntity(entity, position, metadata);
        } else {
          throw new Error(`Cannot create entity of type ${type}`);
        }
      } else {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        entity = new MentalEntity(id, type, position, metadata);
        pool.entities.set(id, entity);
      }
    }

    pool.active.add(entity.id);
    entity.birth();
    this.updateSpatialIndex(entity);

    return entity;
  }

  /**
   * Recycle a dormant entity for reuse
   */
  private recycleEntity(
    entity: MentalEntity,
    position: THREE.Vector3,
    metadata: Partial<MentalEntity['metadata']>
  ): void {
    // Reset physics
    entity.physics.position.copy(position);
    entity.physics.velocity.set(0, 0, 0);
    entity.physics.acceleration.set(0, 0, 0);
    entity.physics.rotation.set(0, 0, 0, 1);
    entity.physics.angularVelocity.set(0, 0, 0);

    // Reset state
    entity.state.intensity = 0.5;
    entity.state.certainty = 0.7;
    entity.state.activity = 0.3;
    entity.state.mood = {
      arousal: 0.5,
      valence: 0.5,
      dominance: 0.5
    };
    entity.state.stability = 0.7;

    // Update metadata if provided
    if (metadata.label) entity.metadata.label = metadata.label;
    if (metadata.color) entity.metadata.color = metadata.color;
    if (metadata.description) entity.metadata.description = metadata.description;
    if (metadata.category) entity.metadata.category = metadata.category;
    if (metadata.tags) entity.metadata.tags = metadata.tags;
    entity.metadata.created = Date.now();
    entity.metadata.lastAccessed = Date.now();
    entity.metadata.accessCount = 0;

    // Clear relationships
    entity.relationships = [];

    // Reset lifecycle
    entity.lifecycle = 'birthing';
  }

  /**
   * Deactivate an entity (mark as dormant)
   */
  deactivateEntity(id: string): void {
    for (const [type, pool] of this.pools.entries()) {
      if (pool.active.has(id)) {
        const entity = pool.entities.get(id);
        if (entity) {
          entity.die();
          pool.active.delete(id);
          pool.dormant.add(id);
          this.removeFromSpatialIndex(entity);
        }
        return;
      }
    }
  }

  /**
   * Permanently remove an entity
   */
  destroyEntity(id: string): void {
    for (const [type, pool] of this.pools.entries()) {
      if (pool.entities.has(id)) {
        const entity = pool.entities.get(id);
        if (entity) {
          this.removeFromSpatialIndex(entity);
          // Remove relationships
          entity.relationships = [];
          pool.entities.delete(id);
          pool.active.delete(id);
          pool.dormant.delete(id);
        }
        return;
      }
    }
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): MentalEntity | undefined {
    for (const pool of this.pools.values()) {
      const entity = pool.entities.get(id);
      if (entity) return entity;
    }
    return undefined;
  }

  /**
   * Get all active entities
   */
  getActiveEntities(): MentalEntity[] {
    const active: MentalEntity[] = [];
    for (const pool of this.pools.values()) {
      for (const id of pool.active) {
        const entity = pool.entities.get(id);
        if (entity && entity.isAlive()) {
          active.push(entity);
        }
      }
    }
    return active;
  }

  /**
   * Get entities by type
   */
  getEntitiesByType(type: EntityType): MentalEntity[] {
    const pool = this.pools.get(type);
    if (!pool) return [];

    const entities: MentalEntity[] = [];
    for (const id of pool.active) {
      const entity = pool.entities.get(id);
      if (entity && entity.isAlive()) {
        entities.push(entity);
      }
    }
    return entities;
  }

  /**
   * Spatial query - find entities within radius
   */
  findWithinRadius(position: THREE.Vector3, radius: number): MentalEntity[] {
    const nearby: MentalEntity[] = [];
    const cellX = Math.floor(position.x / this.cellSize);
    const cellY = Math.floor(position.y / this.cellSize);
    const cellZ = Math.floor(position.z / this.cellSize);

    // Check neighboring cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cellKey = `${cellX + dx},${cellY + dy},${cellZ + dz}`;
          const cellEntities = this.spatialIndex.get(cellKey);
          if (cellEntities) {
            for (const id of cellEntities) {
              const entity = this.getEntity(id);
              if (entity && entity.isAlive()) {
                const dist = entity.physics.position.distanceTo(position);
                if (dist <= radius) {
                  nearby.push(entity);
                }
              }
            }
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Find nearest entity of type
   */
  findNearest(position: THREE.Vector3, type?: EntityType): MentalEntity | undefined {
    let nearest: MentalEntity | undefined;
    let minDist = Infinity;

    const entities = type ?
      this.getEntitiesByType(type) :
      this.getActiveEntities();

    for (const entity of entities) {
      const dist = entity.physics.position.distanceTo(position);
      if (dist < minDist) {
        minDist = dist;
        nearest = entity;
      }
    }

    return nearest;
  }

  /**
   * Update all entities (called each frame)
   */
  update(dt: number): void {
    for (const pool of this.pools.values()) {
      for (const id of pool.active) {
        const entity = pool.entities.get(id);
        if (entity) {
          entity.update(dt);

          // Remove dead entities
          if (!entity.isAlive() && !entity.isVisible()) {
            pool.active.delete(id);
            pool.dormant.add(id);
            this.removeFromSpatialIndex(entity);
          } else {
            // Update spatial index for moving entities
            this.updateSpatialIndex(entity);
          }
        }
      }
    }

    // Periodic cleanup
    if (Math.random() < 0.01) { // 1% chance per frame
      this.cleanup();
    }
  }

  /**
   * Update spatial hash index
   */
  private updateSpatialIndex(entity: MentalEntity): void {
    // Remove from old cell
    const oldCell = this.getSpatialCell(entity.physics.position);
    const oldCellKey = `${oldCell.x},${oldCell.y},${oldCell.z}`;
    const oldCellEntities = this.spatialIndex.get(oldCellKey);
    if (oldCellEntities) {
      oldCellEntities.delete(entity.id);
    }

    // Add to new cell
    const newCell = this.getSpatialCell(entity.physics.position);
    const newCellKey = `${newCell.x},${newCell.y},${newCell.z}`;
    if (!this.spatialIndex.has(newCellKey)) {
      this.spatialIndex.set(newCellKey, new Set());
    }
    this.spatialIndex.get(newCellKey)!.add(entity.id);
  }

  /**
   * Remove entity from spatial index
   */
  private removeFromSpatialIndex(entity: MentalEntity): void {
    const cell = this.getSpatialCell(entity.physics.position);
    const cellKey = `${cell.x},${cell.y},${cell.z}`;
    const cellEntities = this.spatialIndex.get(cellKey);
    if (cellEntities) {
      cellEntities.delete(entity.id);
    }
  }

  /**
   * Get spatial cell coordinates
   */
  private getSpatialCell(position: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      Math.floor(position.x / this.cellSize),
      Math.floor(position.y / this.cellSize),
      Math.floor(position.z / this.cellSize)
    );
  }

  /**
   * Get oldest active entity for potential reuse
   */
  private getOldestActive(type: EntityType): MentalEntity | undefined {
    const pool = this.pools.get(type);
    if (!pool) return undefined;

    let oldest: MentalEntity | undefined;
    let minTime = Date.now();

    for (const id of pool.active) {
      const entity = pool.entities.get(id);
      if (entity && entity.metadata.lastAccessed < minTime) {
        minTime = entity.metadata.lastAccessed;
        oldest = entity;
      }
    }

    return oldest;
  }

  /**
   * Cleanup dormant entities
   */
  private cleanup(): void {
    for (const [type, pool] of this.pools.entries()) {
      const total = pool.entities.size;
      const active = pool.active.size;
      const dormant = pool.dormant.size;

      // Calculate dormant ratio
      const dormantRatio = total > 0 ? dormant / total : 0;

      if (dormantRatio > this.cleanupThreshold) {
        // Remove oldest dormant entities
        const toRemove = Math.floor(dormant * 0.1); // Remove 10% of dormant
        let removed = 0;

        for (const id of pool.dormant) {
          if (removed >= toRemove) break;

          const entity = pool.entities.get(id);
          if (entity) {
            pool.entities.delete(id);
            pool.dormant.delete(id);
            removed++;
          }
        }
      }
    }

    // Clean up empty spatial cells
    for (const [key, entities] of this.spatialIndex.entries()) {
      if (entities.size === 0) {
        this.spatialIndex.delete(key);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): { [key: string]: any } {
    const stats: any = {};

    for (const [type, pool] of this.pools.entries()) {
      stats[type] = {
        total: pool.entities.size,
        active: pool.active.size,
        dormant: pool.dormant.size
      };
    }

    stats.spatialCells = this.spatialIndex.size;
    return stats;
  }

  /**
   * Clear all entities
   */
  clear(): void {
    for (const pool of this.pools.values()) {
      pool.entities.clear();
      pool.active.clear();
      pool.dormant.clear();
    }
    this.spatialIndex.clear();
  }
}

export default EntityManager;