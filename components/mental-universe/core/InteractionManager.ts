import * as THREE from 'three';
import { MentalEntity } from './MentalEntity';
import { EntityManager } from './EntityManager';

/**
 * Manages user interactions with mental entities.
 * Handles hover, click, drag, zoom, and focus interactions.
 */

export interface InteractionState {
  hoveredEntity: MentalEntity | null;
  focusedEntity: MentalEntity | null;
  draggedEntity: MentalEntity | null;
  selectedEntities: Set<MentalEntity>;
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  isDragging: boolean;
  isPanning: boolean;
}

export interface InteractionEvent {
  type: 'hover' | 'click' | 'drag' | 'focus' | 'select' | 'deselect';
  entity: MentalEntity;
  timestamp: number;
  position?: THREE.Vector3;
}

export class InteractionManager {
  private entityManager: EntityManager;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private state: InteractionState;
  private eventListeners: Map<string, Set<Function>>;

  // Camera controls
  private cameraDistance: number = 20;
  private cameraAngle: THREE.Vector2 = new THREE.Vector2(0, 0);
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private isOrbiting: boolean = false;
  private lastMousePosition: THREE.Vector2 = new THREE.Vector2();

  // Interaction settings
  private hoverDistance: number = 3;
  private clickDelay: number = 200; // ms
  private dragDamping: number = 0.8;
  private zoomSpeed: number = 2;
  private focusDistance: number = 8;

  constructor(
    entityManager: EntityManager,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) {
    this.entityManager = entityManager;
    this.camera = camera;
    this.renderer = renderer;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.5 };
    this.raycaster.params.Line = { threshold: 0.5 };

    this.mouse = new THREE.Vector2();

    this.state = {
      hoveredEntity: null,
      focusedEntity: null,
      draggedEntity: null,
      selectedEntities: new Set(),
      cameraPosition: camera.position.clone(),
      cameraTarget: new THREE.Vector3(),
      isDragging: false,
      isPanning: false
    };

    this.eventListeners = new Map();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));

    // Touch events
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  /**
   * Update interaction state (called each frame)
   */
  update(): void {
    // Update camera
    this.updateCamera();

    // Update hover state
    this.updateHover();

    // Update drag
    if (this.state.isDragging && this.state.draggedEntity) {
      this.updateDrag();
    }
  }

  private updateCamera(): void {
    // Smooth camera movement
    const targetPosition = new THREE.Vector3(
      this.cameraTarget.x +
      Math.sin(this.cameraAngle.x) * Math.cos(this.cameraAngle.y) * this.cameraDistance,
      this.cameraTarget.y +
      Math.sin(this.cameraAngle.y) * this.cameraDistance,
      this.cameraTarget.z +
      Math.cos(this.cameraAngle.x) * Math.cos(this.cameraAngle.y) * this.cameraDistance
    );

    // Smooth interpolation
    this.camera.position.lerp(targetPosition, 0.1);
    this.camera.lookAt(this.cameraTarget);

    // Update state
    this.state.cameraPosition.copy(this.camera.position);
    this.state.cameraTarget.copy(this.cameraTarget);
  }

  private updateHover(): void {
    if (this.state.isDragging || this.state.isPanning) {
      // Don't update hover during drag/pan
      return;
    }

    const hovered = this.castRay();

    if (hovered !== this.state.hoveredEntity) {
      // Exit previous hover
      if (this.state.hoveredEntity) {
        this.state.hoveredEntity.setHover(false);
        this.emit('hoverExit', this.state.hoveredEntity);
      }

      // Enter new hover
      if (hovered) {
        hovered.setHover(true);
        this.emit('hoverEnter', hovered);
      }

      this.state.hoveredEntity = hovered;
    }
  }

  private updateDrag(): void {
    if (!this.state.draggedEntity) return;

    // Get drag plane at entity position
    const plane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -this.state.draggedEntity.physics.position.z
    );

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      // Smoothly move entity towards intersection
      const targetPosition = intersection;
      const currentPosition = this.state.draggedEntity.physics.position;

      // Apply spring force towards target
      const springForce = new THREE.Vector3()
        .subVectors(targetPosition, currentPosition)
        .multiplyScalar(5); // Spring constant

      this.state.draggedEntity.applyForce(springForce);

      // Apply damping to prevent overshoot
      const damping = this.state.draggedEntity.physics.velocity.clone()
        .multiplyScalar(-this.dragDamping);

      this.state.draggedEntity.applyForce(damping);
    }
  }

  /**
   * Cast ray and find intersected entity
   */
  private castRay(): MentalEntity | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const entities = this.entityManager.getActiveEntities();
    const meshes: THREE.Object3D[] = [];

    for (const entity of entities) {
      const mesh = entity.getMesh();
      if (mesh && mesh.visible && entity.isAlive()) {
        meshes.push(mesh);
      }
    }

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;

      // Find entity by mesh
      for (const entity of entities) {
        if (entity.getMesh() === mesh) {
          return entity;
        }
      }
    }

    return null;
  }

  /**
   * Event handlers
   */
  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event.clientX, event.clientY);

    if (this.state.isDragging) {
      const deltaX = event.clientX - this.lastMousePosition.x;
      const deltaY = event.clientY - this.lastMousePosition.y;

      if (this.state.draggedEntity) {
        // Entity drag is handled in updateDrag
      } else if (this.isOrbiting) {
        // Camera orbit
        this.cameraAngle.x -= deltaX * 0.005;
        this.cameraAngle.y = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, this.cameraAngle.y + deltaY * 0.005)
        );
      } else if (this.state.isPanning) {
        // Camera pan
        const panSpeed = this.cameraDistance * 0.001;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();

        this.camera.matrix.extractBasis(right, up, new THREE.Vector3());

        this.cameraTarget.add(right.multiplyScalar(-deltaX * panSpeed));
        this.cameraTarget.add(up.multiplyScalar(deltaY * panSpeed));
      }
    }

    this.lastMousePosition.set(event.clientX, event.clientY);
  }

  private onMouseDown(event: MouseEvent): void {
    this.updateMousePosition(event.clientX, event.clientY);

    const entity = this.castRay();

    if (entity) {
      // Start dragging entity
      this.state.isDragging = true;
      this.state.draggedEntity = entity;

      // Select on click
      if (!event.shiftKey) {
        this.deselectAll();
      }
      this.selectEntity(entity);

      this.emit('dragStart', entity);
    } else {
      // Start camera orbit/pan
      if (event.button === 0) { // Left click
        this.isOrbiting = true;
      } else if (event.button === 2) { // Right click
        this.state.isPanning = true;
      }
    }

    this.lastMousePosition.set(event.clientX, event.clientY);
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.state.isDragging && this.state.draggedEntity) {
      this.emit('dragEnd', this.state.draggedEntity);
    }

    this.state.isDragging = false;
    this.state.draggedEntity = null;
    this.isOrbiting = false;
    this.state.isPanning = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomAmount = event.deltaY * 0.01;
    this.cameraDistance = Math.max(5, Math.min(50, this.cameraDistance + zoomAmount * this.zoomSpeed));

    this.emit('zoom', this.cameraDistance);
  }

  private onClick(event: MouseEvent): void {
    const entity = this.castRay();

    if (entity) {
      this.emit('click', entity);

      // Double-click to focus
      const now = Date.now();
      const lastClick = (entity as any).lastClickTime || 0;
      (entity as any).lastClickTime = now;

      if (now - lastClick < this.clickDelay) {
        this.focusEntity(entity);
      }
    }
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);

      const entity = this.castRay();
      if (entity) {
        this.state.isDragging = true;
        this.state.draggedEntity = entity;
        this.selectEntity(entity);
        this.emit('dragStart', entity);
      } else {
        this.isOrbiting = true;
      }

      this.lastMousePosition.set(touch.clientX, touch.clientY);
    } else if (event.touches.length === 2) {
      // Pinch to zoom
      this.state.isPanning = true;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);

      if (this.state.draggedEntity) {
        // Drag entity
        // Similar to mouse drag
      } else if (this.isOrbiting) {
        const deltaX = touch.clientX - this.lastMousePosition.x;
        const deltaY = touch.clientY - this.lastMousePosition.y;

        this.cameraAngle.x -= deltaX * 0.005;
        this.cameraAngle.y = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, this.cameraAngle.y + deltaY * 0.005)
        );
      }

      this.lastMousePosition.set(touch.clientX, touch.clientY);
    } else if (event.touches.length === 2) {
      // Pinch zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const lastDistance = (this as any).lastPinchDistance || distance;
      (this as any).lastPinchDistance = distance;

      const delta = lastDistance - distance;
      this.cameraDistance = Math.max(
        5,
        Math.min(50, this.cameraDistance + delta * 0.05)
      );
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (this.state.isDragging && this.state.draggedEntity) {
      this.emit('dragEnd', this.state.draggedEntity);
    }

    this.state.isDragging = false;
    this.state.draggedEntity = null;
    this.isOrbiting = false;
    this.state.isPanning = false;
    delete (this as any).lastPinchDistance;
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.deselectAll();
        this.exitFocus();
        break;

      case 'Delete':
      case 'Backspace':
        this.deleteSelected();
        break;

      case 'f':
      case 'F':
        if (this.state.hoveredEntity) {
          this.focusEntity(this.state.hoveredEntity);
        }
        break;

      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectAll();
        }
        break;
    }
  }

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Public interaction methods
   */

  /**
   * Focus camera on entity
   */
  focusEntity(entity: MentalEntity): void {
    this.state.focusedEntity = entity;
    entity.setFocused(true);

    // Move camera to focus position
    this.cameraTarget.copy(entity.physics.position);
    this.cameraDistance = this.focusDistance;

    // Dim other entities
    const entities = this.entityManager.getActiveEntities();
    for (const e of entities) {
      if (e.id !== entity.id) {
        e.state.certainty *= 0.3; // Dim
      }
    }

    this.emit('focus', entity);
  }

  /**
   * Exit focus mode
   */
  exitFocus(): void {
    if (this.state.focusedEntity) {
      this.state.focusedEntity.setFocused(false);
      this.state.focusedEntity = null;
    }

    // Restore brightness
    const entities = this.entityManager.getActiveEntities();
    for (const entity of entities) {
      entity.state.certainty = Math.min(1, entity.state.certainty / 0.3);
    }

    this.emit('focusExit', null);
  }

  /**
   * Select entity
   */
  selectEntity(entity: MentalEntity): void {
    this.state.selectedEntities.add(entity);
    this.emit('select', entity);
  }

  /**
   * Deselect entity
   */
  deselectEntity(entity: MentalEntity): void {
    this.state.selectedEntities.delete(entity);
    this.emit('deselect', entity);
  }

  /**
   * Deselect all entities
   */
  deselectAll(): void {
    for (const entity of this.state.selectedEntities) {
      this.emit('deselect', entity);
    }
    this.state.selectedEntities.clear();
  }

  /**
   * Select all entities
   */
  selectAll(): void {
    const entities = this.entityManager.getActiveEntities();
    for (const entity of entities) {
      this.selectEntity(entity);
    }
  }

  /**
   * Delete selected entities
   */
  deleteSelected(): void {
    for (const entity of this.state.selectedEntities) {
      this.entityManager.deactivateEntity(entity.id);
      this.emit('delete', entity);
    }
    this.state.selectedEntities.clear();
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, entity: MentalEntity | null): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const interactionEvent: InteractionEvent = {
        type: event as any,
        entity: entity!,
        timestamp: Date.now()
      };

      for (const callback of listeners) {
        callback(interactionEvent);
      }
    }
  }

  /**
   * Get current state
   */
  getState(): InteractionState {
    return { ...this.state };
  }

  /**
   * Clean up
   */
  dispose(): void {
    const canvas = this.renderer.domElement;

    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.removeEventListener('wheel', this.onWheel.bind(this));
    canvas.removeEventListener('click', this.onClick.bind(this));

    canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));

    window.removeEventListener('keydown', this.onKeyDown.bind(this));
  }
}

export default InteractionManager;