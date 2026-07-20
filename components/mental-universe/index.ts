/**
 * Mental Universe - Interactive Psychology Visualization System
 *
 * A living, breathing representation of human psychology as a dynamic universe.
 *
 * @example
 * ```tsx
 * import MentalUniverse from '@/components/mental-universe';
 *
 * function App() {
 *   return <MentalUniverse />;
 * }
 * ```
 */

// Main component
export { MentalUniverse as default } from './MentalUniverse';

// Core systems
export { MentalEntity, EntityType } from './core/MentalEntity';
export { EntityManager } from './core/EntityManager';
export { PhysicsEngine } from './core/PhysicsEngine';
export { InteractionManager } from './core/InteractionManager';
export { RenderSystem } from './core/RenderSystem';

// Galaxy components
export { CelestialEntity } from './galaxy/CelestialEntity';
export { SelfOrbit } from './galaxy/SelfOrbit';
export { NeuralConnection } from './galaxy/NeuralConnection';
export { MentalGalaxy } from './galaxy/GalaxyController';

// Emotion components
export { EmotionBlob } from './emotion/EmotionBlob';
export { FluidPhysics } from './emotion/FluidPhysics';
export { EmotionMerger, EmotionField } from './emotion/EmotionMerger';

// Mind Graph components
export { ThoughtNode } from './mindgraph/ThoughtNode';
export { SynapseConnection, SynapseNetwork } from './mindgraph/SynapseConnection';
export { NetworkLayout } from './mindgraph/NetworkLayout';
export { ActivityDetector } from './mindgraph/ActivityDetector';

// Thought components
export { ThoughtBubble, ThoughtBubbleField } from './thoughts/ThoughtBubble';

// Types
export type {
  MoodVector,
  EntityState,
  PhysicsState,
  Relationship,
  PsychologicalMetadata
} from './core/MentalEntity';

export type {
  PhysicsConfig,
  FluidParticle
} from './core/PhysicsEngine';

export type {
  InteractionState,
  InteractionEvent
} from './core/InteractionManager';

export type {
  RenderConfig
} from './core/RenderSystem';

export type {
  LayoutConfig
} from './mindgraph/NetworkLayout';

export type {
  ActivityPattern
} from './mindgraph/ActivityDetector';