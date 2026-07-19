# Mental Universe - Interactive Psychology Visualization System

A real-time, living visualization system that represents human psychology as a dynamic, organic universe. Built with Three.js and React Three Fiber, featuring fluid animations, neural networks, and AI-powered reasoning.

## 🌟 Features

### Mental Galaxy (Global State)
- **Celestial Objects**: Every psychological concept floats as a glowing celestial body
- **Orbital System**: Emotions orbit around the Self entity
- **Neural Connections**: Glowing lines connect related psychological elements
- **Organic Motion**: Breathing, floating, and morphing animations
- **Interactive Controls**: Hover, click, drag, zoom, and focus

### Emotion Fluid
- **Liquid Blobs**: Emotions as animated, morphing liquid spheres
- **Dynamic Physics**: Viscosity, expansion, and ripple effects
- **Emotion Merging**: Strong emotions absorb nearby weaker ones
- **Color-coded**: Different emotions have distinct colors and behaviors
- **Mesh Gradients**: Beautiful, soft gradients with glassmorphism

### Mind Graph
- **Neural Network**: Thoughts, memories, and beliefs as interconnected nodes
- **Real-time Layout**: Force-directed graph that continuously reorganizes
- **Activation States**: Nodes pulse and glow based on cognitive activity
- **Synapse Connections**: Active neural pathways with signal transmission
- **Activity Detection**: AI-driven pattern recognition and reasoning

### Thought Bubble Field
- **Floating Bubbles**: Thoughts as lightweight, breathing bubbles
- **Properties**: Size represents importance, opacity shows certainty
- **Stream of Consciousness**: Continuous generation of new thoughts
- **Interactive Pop**: Click to "pop" and remove thoughts
- **Merge Dynamics**: Similar thoughts automatically merge

## 🚀 Quick Start

### Installation

```bash
# Install dependencies (if not already installed)
npm install @react-three/fiber @react-three/drei three
```

### Basic Usage

```tsx
import MentalUniverse from '@/components/mental-universe/MentalUniverse';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MentalUniverse />
    </div>
  );
}
```

### With Custom Configuration

```tsx
<MentalUniverse
  enableGalaxy={true}
  enableEmotions={true}
  enableMindGraph={true}
  enableThoughts={true}
  aiReasoning={true}
  maxEntities={200}
  className="my-mental-universe"
/>
```

## 🎯 Props

### MentalUniverse

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableGalaxy` | boolean | `true` | Enable Mental Galaxy visualization |
| `enableEmotions` | boolean | `true` | Enable Emotion Fluid system |
| `enableMindGraph` | boolean | `true` | Enable Mind Graph neural network |
| `enableThoughts` | boolean | `true` | Enable Thought Bubble field |
| `aiReasoning` | boolean | `true` | Enable AI-powered reasoning and pattern detection |
| `maxEntities` | number | `200` | Maximum number of entities to render |
| `className` | string | `''` | Additional CSS classes |

## 🏗️ Architecture

### Core Systems

- **MentalEntity**: Base class for all psychological entities with state, physics, and relationships
- **EntityManager**: Handles entity lifecycle, pooling, and spatial queries
- **PhysicsEngine**: Organic motion, collision detection, and fluid dynamics
- **InteractionManager**: User interactions (hover, click, drag, zoom, focus)
- **RenderSystem**: WebGL rendering with LOD and culling

### Visualization Modules

- **galaxy/**: Mental Galaxy with celestial objects
- **emotion/**: Emotion Fluid with liquid blobs
- **mindgraph/**: Neural network with activity detection
- **thoughts/**: Thought bubble field with merging

## 🎨 Visual Style

- **Dark Mode**: Deep space background with subtle gradients
- **Glassmorphism**: Translucent materials with transmission and roughness
- **Soft Bloom**: Post-processing for glow effects
- **Volumetric Lighting**: Atmospheric depth perception
- **60fps Performance**: Optimized for hundreds of entities

## 🔧 Advanced Usage

### Creating Custom Entities

```tsx
import { EntityManager, EntityType } from '@/components/mental-universe/core/EntityManager';
import * as THREE from 'three';

const entityManager = new EntityManager();

// Create a custom thought entity
const thought = entityManager.createEntity(
  EntityType.THOUGHT,
  new THREE.Vector3(5, 2, -3),
  {
    label: 'Creative Insight',
    color: new THREE.Color(0x06b6d4),
    category: 'cognitive',
    tags: ['thought', 'creative', 'insight'],
    description: 'A breakthrough creative idea'
  }
);

// Customize entity properties
thought.state.intensity = 0.8;
thought.state.activity = 0.7;
thought.state.mood = {
  arousal: 0.8,
  valence: 0.9,
  dominance: 0.6
};
```

### Triggering AI Reasoning

```tsx
import { ActivityDetector } from '@/components/mental-universe/mindgraph/ActivityDetector';

const activityDetector = new ActivityDetector(entityManager);

// Trigger reasoning on specific topic
activityDetector.triggerReasoning('creativity', 0.9);

// Get current reasoning level
const level = activityDetector.getReasoningLevel();
console.log(`Reasoning activity: ${level * 100}%`);
```

### Custom Physics Configuration

```tsx
import { PhysicsEngine } from '@/components/mental-universe/core/PhysicsEngine';

const physicsEngine = new PhysicsEngine(entityManager, {
  gravity: new THREE.Vector3(0, 0, 0),
  dragCoefficient: 0.02,
  repulsionStrength: 50,
  attractionStrength: 30,
  collisionElasticity: 0.3,
  breathingSpeed: 0.5,
  fluidViscosity: 0.5
});
```

## 🎮 Interactions

- **Hover**: Soft glow, slight scale increase, show label
- **Click**: Focus mode, AI explanation, highlight connections
- **Drag**: Smooth follow with physics damping
- **Zoom**: Camera interpolation with depth of field
- **Focus**: Isolate entity, dim others, show details
- **Double-click**: Center camera on entity

## 🌐 Demo Page

Visit `/mental-universe` to see the interactive demo with:
- Real-time entity statistics
- FPS and reasoning level monitoring
- Interactive control panel
- Module toggles
- Performance settings

## 📊 Performance

- **60fps target**: Optimized rendering pipeline
- **Object Pooling**: Efficient memory usage
- **LOD System**: Detail levels based on distance
- **Spatial Culling**: Off-screen entity optimization
- **Batch Rendering**: Grouped material rendering

## 🔮 Future Enhancements

- **VR/AR Support**: Spatial computing integration
- **Voice Commands**: Natural language interaction
- **Biofeedback**: Integration with physiological sensors
- **Multiplayer**: Shared mental spaces
- **AI Therapy**: Interactive mental health support

## 📝 License

This project is part of the Mental Universe visualization system.

## 🤝 Contributing

Contributions are welcome! Please follow the established code style and architecture patterns.

---

**Built with**: React, Three.js, React Three Fiber, Drei

**Inspired by**: Apple Human Interface Guidelines, OpenAI Design System, Linear, Arc Browser