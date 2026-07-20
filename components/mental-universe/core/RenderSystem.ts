import * as THREE from 'three';
import { MentalEntity, EntityType } from './MentalEntity';
import { EntityManager } from './EntityManager';

/**
 * High-performance rendering system for mental universe visualization.
 * Handles LOD, culling, and visual effects.
 */

export interface RenderConfig {
  enableLOD: boolean;
  enableCulling: boolean;
  enableBloom: boolean;
  enableDOF: boolean;
  lodDistances: { [key: number]: number };
  maxVisibleEntities: number;
  renderDistance: number;
}

export class RenderSystem {
  private entityManager: EntityManager;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private config: RenderConfig;

  // Visual effects
  private bloomPass?: any;
  private dofPass?: any;
  private ambientParticles?: THREE.Points;

  // LOD levels
  private geometries: Map<EntityType, THREE.Geometry>;
  private materials: Map<string, THREE.Material>;

  // Performance tracking
  private frameTime: number = 0;
  private renderedEntityCount: number = 0;

  constructor(
    entityManager: EntityManager,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    config?: Partial<RenderConfig>
  ) {
    this.entityManager = entityManager;
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;

    this.config = {
      enableLOD: true,
      enableCulling: true,
      enableBloom: true,
      enableDOF: true,
      lodDistances: {
        0: 50,  // High detail
        1: 100, // Medium detail
        2: 200  // Low detail
      },
      maxVisibleEntities: 500,
      renderDistance: 150,
      ...config
    };

    this.geometries = new Map();
    this.materials = new Map();

    this.initialize();
  }

  private initialize(): void {
    // Create shared geometries for each entity type
    this.createGeometries();

    // Create shared materials
    this.createMaterials();

    // Create ambient particles
    this.createAmbientParticles();

    // Setup post-processing
    if (this.config.enableBloom) {
      this.setupBloom();
    }

    if (this.config.enableDOF) {
      this.setupDOF();
    }
  }

  private createGeometries(): void {
    // High detail geometries
    const sphereHighDetail = new THREE.SphereGeometry(1, 32, 32);
    const sphereMediumDetail = new THREE.SphereGeometry(1, 16, 16);
    const sphereLowDetail = new THREE.SphereGeometry(1, 8, 8);

    this.geometries.set(EntityType.SELF, sphereHighDetail);
    this.geometries.set(EntityType.EMOTION, sphereHighDetail);
    this.geometries.set(EntityType.THOUGHT, sphereMediumDetail);
    this.geometries.set(EntityType.MEMORY, sphereMediumDetail);
    this.geometries.set(EntityType.GOAL, sphereHighDetail);
  }

  private createMaterials(): void {
    // Glass material for entities
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: 0.8,
      transmission: 0.9,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.5,
      thickness: 0.5,
    });

    // Glow material for active entities
    const glowMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    // Neural connection material
    const connectionMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      linewidth: 1
    });

    this.materials.set('glass', glassMaterial);
    this.materials.set('glow', glowMaterial);
    this.materials.set('connection', connectionMaterial);
  }

  private createAmbientParticles(): void {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      colors[i * 3] = 0.5 + Math.random() * 0.5;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
      colors[i * 3 + 2] = 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  private setupBloom(): void {
    // Bloom pass setup would go here
    // Using Three.js EffectComposer and UnrealBloomPass
  }

  private setupDOF(): void {
    // Depth of field pass setup would go here
    // Using Three.js BokehPass
  }

  /**
   * Main render call
   */
  render(): void {
    const startTime = performance.now();

    // Clear frame
    this.renderer.clear();

    // Update ambient particles
    this.updateAmbientParticles();

    // Render entities
    this.renderEntities();

    // Render connections
    this.renderConnections();

    // Post-processing
    if (this.config.enableBloom && this.bloomPass) {
      // Apply bloom
    }

    if (this.config.enableDOF && this.dofPass) {
      // Apply DOF
    }

    this.frameTime = performance.now() - startTime;
  }

  private renderEntities(): void {
    this.renderedEntityCount = 0;
    const entities = this.entityManager.getActiveEntities();

    for (const entity of entities) {
      if (!entity.isAlive()) continue;

      // Culling check
      if (this.config.enableCulling && !this.isVisible(entity)) {
        continue;
      }

      // LOD check
      const lodLevel = this.getLODLevel(entity);
      if (lodLevel === -1) continue; // Beyond render distance

      // Render entity
      this.renderEntity(entity, lodLevel);
      this.renderedEntityCount++;
    }
  }

  private isVisible(entity: MentalEntity): boolean {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    const sphere = new THREE.Sphere(
      entity.physics.position,
      entity.getBaseScale()
    );

    return frustum.intersectsSphere(sphere);
  }

  private getLODLevel(entity: MentalEntity): number {
    if (!this.config.enableLOD) return 0;

    const distance = entity.physics.position.distanceTo(this.camera.position);

    for (const [level, maxDist] of Object.entries(this.config.lodDistances)) {
      if (distance <= maxDist) {
        return parseInt(level);
      }
    }

    return -1; // Beyond render distance
  }

  private renderEntity(entity: MentalEntity, lodLevel: number): void {
    let mesh = entity.getMesh();

    if (!mesh) {
      // Create mesh for entity
      mesh = this.createEntityMesh(entity, lodLevel);
      entity.setMesh(mesh);
      this.scene.add(mesh);
    }

    // Update mesh properties
    mesh.visible = true;
    mesh.position.copy(entity.physics.position);
    mesh.rotation.copy(entity.physics.rotation);

    // Update scale based on LOD
    const scale = entity.getBaseScale() * (1 + entity.state.intensity * 0.5);
    const lodScale = lodLevel === 0 ? 1 : lodLevel === 1 ? 0.8 : 0.6;
    mesh.scale.setScalar(scale * lodScale);

    // Update material properties
    if (mesh instanceof THREE.Mesh && mesh.material) {
      const material = mesh.material as THREE.MeshPhysicalMaterial;

      // Opacity based on certainty and lifecycle
      material.opacity = entity.state.certainty * entity.visibility;

      // Color based on emotion and state
      const baseColor = entity.metadata.color;
      const stateColor = new THREE.Color(baseColor);

      // Modify color based on mood
      stateColor.offsetHSL(0, 0, (entity.state.mood.valence - 0.5) * 0.2);
      material.color.copy(stateColor);

      // Emissive for active entities
      if (entity.state.activity > 0.5) {
        material.emissive.copy(stateColor);
        material.emissiveIntensity = entity.state.activity * 0.5;
      } else {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
      }
    }
  }

  private createEntityMesh(entity: MentalEntity, lodLevel: number): THREE.Object3D {
    const geometry = this.geometries.get(entity.type) ||
                    this.geometries.get(EntityType.EMOTION)!;

    const material = this.materials.get('glass')!.clone();

    const mesh = new THREE.Mesh(geometry, material);

    // Create glow effect for active entities
    if (entity.state.intensity > 0.6) {
      const glowMaterial = this.materials.get('glow')!.clone();
      const glowMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        glowMaterial
      );
      mesh.add(glowMesh);
    }

    return mesh;
  }

  private renderConnections(): void {
    const entities = this.entityManager.getActiveEntities();

    for (const entity of entities) {
      if (!entity.isAlive()) continue;

      for (const relationship of entity.relationships) {
        // Only render strong connections
        if (relationship.strength < 0.3) continue;

        const target = this.entityManager.getEntity(relationship.targetId);
        if (!target || !target.isAlive()) continue;

        // Only render once per pair
        if (entity.id < target.id) continue;

        this.renderConnection(entity, target, relationship);
      }
    }
  }

  private renderConnection(
    from: MentalEntity,
    to: MentalEntity,
    relationship: any
  ): void {
    const material = this.materials.get('connection')!.clone();

    // Opacity based on strength and activation
    const baseOpacity = relationship.strength * 0.6;
    const activationBoost = relationship.activation * 0.4;
    material.opacity = Math.min(1, baseOpacity + activationBoost);

    // Color based on activation
    if (relationship.activation > 0.7) {
      material.color.setHex(0x00ffff); // Cyan for active
    } else {
      material.color.setHex(0x6366f1); // Default purple
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      from.physics.position.x,
      from.physics.position.y,
      from.physics.position.z,
      to.physics.position.x,
      to.physics.position.y,
      to.physics.position.z
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    // Remove line next frame (temporary visualization)
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
    }, 0);
  }

  private updateAmbientParticles(): void {
    if (!this.ambientParticles) return;

    // Slowly rotate particles
    this.ambientParticles.rotation.y += 0.0001;
    this.ambientParticles.rotation.x += 0.00005;

    // Gentle wave motion
    const positions = this.ambientParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const time = performance.now() * 0.001;
      positions[i + 1] = y + Math.sin(time + x * 0.1) * 0.01;
    }

    this.ambientParticles.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Dispose geometries
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }

    // Dispose materials
    for (const material of this.materials.values()) {
      material.dispose();
    }

    // Remove particles
    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
      this.ambientParticles.geometry.dispose();
      (this.ambientParticles.material as THREE.Material).dispose();
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): { frameTime: number; entityCount: number } {
    return {
      frameTime: this.frameTime,
      entityCount: this.renderedEntityCount
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.enableBloom !== undefined) {
      if (config.enableBloom && !this.bloomPass) {
        this.setupBloom();
      }
    }

    if (config.enableDOF !== undefined) {
      if (config.enableDOF && !this.dofPass) {
        this.setupDOF();
      }
    }
  }
}

export default RenderSystem;