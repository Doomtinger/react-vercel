# Mental Universe Architecture

## System Overview
Real-time interactive visualization system representing human psychology as a living, dynamic universe using Three.js and React Three Fiber.

## Core Design Principles
- **Living System**: Every entity has state, animation, physics, and relationships
- **Organic Motion**: Fluid, breathing, morphing animations at 60fps
- **Spatial Depth**: WebGL rendering with volumetric lighting and depth of field
- **Interactive**: Full hover, click, drag, zoom, focus support
- **Scalable**: Performance-optimized for hundreds of entities
- **AI-Powered**: Dynamic evolution based on AI reasoning

## Component Architecture

### 1. Core Systems
```
MentalUniverse/
├── core/
│   ├── MentalEntity.ts          # Base entity class with state & physics
│   ├── EntityManager.ts         # Entity lifecycle & pool management
│   ├── PhysicsEngine.ts         # Organic motion & collision physics
│   ├── RenderSystem.ts          # WebGL rendering optimization
│   └── InteractionManager.ts    # User interactions & events
```

### 2. Visualization Modules
```
MentalUniverse/
├── galaxy/
│   ├── CelestialEntity.tsx      # Floating psychological objects
│   ├── SelfOrbit.tsx            # Self-centered orbital system
│   ├── NeuralConnection.tsx     # Glowing neural lines
│   └── GalaxyController.tsx     # Galaxy-level orchestration
│
├── emotion/
│   ├── EmotionBlob.tsx          # Liquid blob emotions
│   ├── FluidPhysics.ts          # Viscosity & morphing
│   ├── EmotionMerger.ts         # Blob merging & absorption
│   └── EmotionField.ts          # Fluid field management
│
├── mindgraph/
│   ├── ThoughtNode.tsx          # Neural network nodes
│   ├── SynapseConnection.tsx    # Active neural pathways
│   ├── NetworkLayout.ts         # Force-directed layout
│   └── ActivityDetector.ts      # Reasoning activation
│
└── thoughts/
    ├── ThoughtBubble.tsx        # Floating thought bubbles
    ├── BubblePhysics.ts         # Floating, collision, merge
    ├── ThoughtField.ts          # Bubble field management
    └── ThoughtStream.ts         # Stream of consciousness
```

### 3. UI & Interaction
```
MentalUniverse/
├── interaction/
│   ├── HoverEffect.tsx          # Hover interactions
│   ├── SelectionFocus.tsx       # Focus mode & zoom
│   ├── DragController.ts        # Drag & move entities
│   └── GestureHandler.ts         # Multi-touch gestures
│
├── ai/
│   ├── ReasoningEngine.ts       # AI-driven evolution
│   ├── ExplanationSystem.tsx    # Contextual AI explanations
│   └── EmotionalAI.ts           # Emotional intelligence
│
└── ui/
    ├── FocusOverlay.tsx         # Focus mode UI
    ├── InsightPanel.tsx         # AI explanation panel
    └── AmbientHUD.tsx           # Minimal heads-up display
```

## Technical Specifications

### Performance Optimization
- **Object Pooling**: Reuse entity objects for memory efficiency
- **LOD System**: Detail levels based on camera distance
- **Culling**: Off-screen entity rendering optimization
- **Batch Rendering**: Group similar materials for GPU efficiency
- **RequestAnimationFrame**: Smooth 60fps updates

### Animation System
- **Breathing Cycle**: 2-6 second organic breathing loops
- **Morphing**: Smooth shape transitions with spring physics
- **Fluid Simulation**: Lattice Boltzmann for blob behavior
- **Particle Systems**: Ambient particles with depth

### Material & Shading
- **Mesh Gradients**: Custom shader for blob interiors
- **Glassmorphism**: Transmission & roughness for depth
- **Soft Bloom**: Post-processing for glow effects
- **Volumetric Lighting**: Atmospheric depth perception

### State Management
```typescript
interface MentalEntity {
  id: string;
  type: 'emotion' | 'thought' | 'belief' | 'memory' | 'goal';
  state: EntityState;
  physics: PhysicsState;
  relationships: Relationship[];
  metadata: PsychologicalMetadata;
}

interface EntityState {
  intensity: number;      // 0-1, affects size & glow
  certainty: number;      // 0-1, affects opacity
  activity: number;       // 0-1, affects animation speed
  mood: MoodVector;       // 3D emotional position
}

interface PhysicsState {
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  mass: number;
  viscosity: number;
}
```

### Interaction Patterns
- **Hover**: Soft glow, slight scale increase, show label
- **Click**: Focus mode, AI explanation, highlight connections
- **Drag**: Smooth follow with physics damping
- **Zoom**: Camera interpolation with depth of field
- **Focus**: Isolate entity, dim others, show details

## AI Integration

### Reasoning Engine
```typescript
interface AIEvolution {
  analyzeEmotionalState(): EmotionalPattern;
  detectCognitiveActivity(): MentalActivity[];
  generateInsights(entity: MentalEntity): AIExplanation;
  evolveUniverse(dt: number): UniverseChanges;
}
```

### Dynamic Evolution Rules
- Anxiety increase → Galaxy contracts, red blobs expand
- Confidence increase → Galaxy expands, nodes stabilize
- Cognitive activity → Neural connections brighten
- Emotional merge → Blob fusion animation
- Thought activation → Bubble expansion & brightening

## Rendering Pipeline

### Frame Loop (60fps)
1. **Update Phase**: Physics, AI reasoning, state changes
2. **Cull Phase**: Visibility & LOD determination
3. **Render Phase**: Batched WebGL rendering
4. **Post-Process**: Bloom, depth of field, color grading
5. **UI Phase**: Overlay rendering (transparent)

### Memory Management
- Entity pool size: 500 max entities
- Geometry reuse: Shared geometries with transforms
- Texture atlas: All textures in single atlas
- Disposal: Automatic cleanup of unused entities

## Implementation Priority

### Phase 1: Core Foundation
1. MentalEntity base class with physics
2. EntityManager with pooling
3. Basic Three.js scene setup
4. Camera controls & interaction framework

### Phase 2: Mental Galaxy
1. CelestialEntity with breathing animation
2. SelfOrbit system with physics
3. NeuralConnection rendering
4. Interactive hover & click

### Phase 3: Emotion Fluid
1. EmotionBlob with morphing
2. FluidPhysics for viscosity
3. EmotionMerger for blob fusion
4. Color gradients & glow

### Phase 4: Mind Graph
1. ThoughtNode with activation
2. SynapseConnection with activity
3. Force-directed layout algorithm
4. Real-time reorganization

### Phase 5: Thought Bubbles
1. ThoughtBubble with physics
2. Bubble collision & merging
3. Stream of consciousness
4. Fade & lifecycle

### Phase 6: AI Integration
1. ReasoningEngine for evolution
2. ExplanationSystem UI
3. Dynamic universe response
4. Emotional intelligence

### Phase 7: Polish & Optimization
1. Performance profiling
2. LOD system implementation
3. Mobile optimization
4. Accessibility features

## Visual Style Guide

### Colors (Dark Mode)
- Background: Radial gradient #0a0a0f → #151520
- Accents: Soft neon with glow (cyan, magenta, amber)
- Text: White with 90% opacity
- Glass: 20% transmission, 0.8 roughness

### Animation Speed
- Breathing: 0.2-0.5 Hz
- Floating: 0.05-0.1 m/s
- Morphing: 200-500ms transitions
- Ripple: 0.5-1 second propagation

### Spatial Layout
- Camera distance: 15-30 units
- Entity spacing: 3-8 units apart
- Layer depth: 0-20 units Z-range
- Particle field: ±50 units bounds

This architecture ensures a production-ready, scalable, and visually stunning mental universe visualization system.