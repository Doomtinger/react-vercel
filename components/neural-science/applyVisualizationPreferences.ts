import { VisualizationPreferences } from './VisualizationQuestionnaire';

// 根据用户偏好生成优化的可视化参数
export function generateVizParameters(preferences: VisualizationPreferences) {
  const params = {
    // 粒子系统参数
    particleCount: getParticleCount(preferences.dataDensity),
    particleSize: getParticleSize(preferences.dataDensity),
    particleOpacity: getParticleOpacity(preferences.visualStyle),

    // 动画参数
    animationSpeed: getAnimationSpeed(preferences.animationIntensity),
    pulseIntensity: getPulseIntensity(preferences.animationIntensity),
    rotationSpeed: getRotationSpeed(preferences.animationIntensity),

    // 颜色参数
    colorScheme: getColorScheme(preferences.colorTheme),
    glowIntensity: getGlowIntensity(preferences.visualStyle),
    blendMode: getBlendMode(preferences.visualStyle),

    // 交互参数
    hoverScale: getHoverScale(preferences.interactionLevel),
    showLabels: getShowLabels(preferences.complexity),
    showConnections: getShowConnections(preferences.complexity),

    // 高级效果参数
    bloomStrength: getBloomStrength(preferences.visualStyle),
    distortionAmount: getDistortionAmount(preferences.visualStyle),
    particleDensity: getParticleDensity(preferences.dataDensity),
    trailLength: getTrailLength(preferences.animationIntensity)
  };

  return params;
}

// 辅助函数
function getParticleCount(density: string): number {
  switch (density) {
    case 'minimal': return 50;
    case 'moderate': return 120;
    case 'dense': return 200;
    default: return 120;
  }
}

function getParticleSize(density: string): number {
  switch (density) {
    case 'minimal': return 0.12;
    case 'moderate': return 0.08;
    case 'dense': return 0.05;
    default: return 0.08;
  }
}

function getParticleOpacity(style: string): number {
  switch (style) {
    case 'scientific': return 0.8;
    case 'artistic': return 0.6;
    case 'futuristic': return 0.9;
    default: return 0.8;
  }
}

function getAnimationSpeed(intensity: string): number {
  switch (intensity) {
    case 'calm': return 0.5;
    case 'dynamic': return 1.0;
    case 'energetic': return 2.0;
    default: return 1.0;
  }
}

function getPulseIntensity(intensity: string): number {
  switch (intensity) {
    case 'calm': return 0.02;
    case 'dynamic': return 0.04;
    case 'energetic': return 0.08;
    default: return 0.04;
  }
}

function getRotationSpeed(intensity: string): number {
  switch (intensity) {
    case 'calm': return 0.001;
    case 'dynamic': return 0.003;
    case 'energetic': return 0.008;
    default: return 0.003;
  }
}

function getColorScheme(theme: string): string[] {
  switch (theme) {
    case 'cool': return ['#4A90E2', '#9B59D6', '#2ECC71', '#3498DB', '#1ABC9C'];
    case 'warm': return ['#E74C3C', '#F39C12', '#E67E22', '#D35400', '#C0392B'];
    case 'vibrant': return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    case 'monochrome': return ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7'];
    default: return ['#4A90E2', '#9B59D6', '#2ECC71', '#3498DB', '#1ABC9C'];
  }
}

function getGlowIntensity(style: string): number {
  switch (style) {
    case 'scientific': return 0.3;
    case 'artistic': return 0.6;
    case 'futuristic': return 0.8;
    default: return 0.5;
  }
}

function getBlendMode(style: string): string {
  switch (style) {
    case 'scientific': return 'NormalBlending';
    case 'artistic': return 'AdditiveBlending';
    case 'futuristic': return 'AdditiveBlending';
    default: return 'AdditiveBlending';
  }
}

function getHoverScale(interaction: string): number {
  switch (interaction) {
    case 'passive': return 1.0;
    case 'exploratory': return 1.3;
    case 'interactive': return 1.8;
    default: return 1.3;
  }
}

function getShowLabels(complexity: string): boolean {
  switch (complexity) {
    case 'simple': return false;
    case 'balanced': return true;
    case 'complex': return true;
    default: return true;
  }
}

function getShowConnections(complexity: string): boolean {
  switch (complexity) {
    case 'simple': return false;
    case 'balanced': return true;
    case 'complex': return true;
    default: return true;
  }
}

function getBloomStrength(style: string): number {
  switch (style) {
    case 'scientific': return 0.5;
    case 'artistic': return 1.2;
    case 'futuristic': return 2.0;
    default: return 1.0;
  }
}

function getDistortionAmount(style: string): number {
  switch (style) {
    case 'scientific': return 0.1;
    case 'artistic': return 0.4;
    case 'futuristic': return 0.8;
    default: return 0.3;
  }
}

function getParticleDensity(density: string): number {
  switch (density) {
    case 'minimal': return 0.5;
    case 'moderate': return 1.0;
    case 'dense': return 2.0;
    default: return 1.0;
  }
}

function getTrailLength(intensity: string): number {
  switch (intensity) {
    case 'calm': return 0.5;
    case 'dynamic': return 1.0;
    case 'energetic': return 2.0;
    default: return 1.0;
  }
}
