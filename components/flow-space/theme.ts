// Flow Space 设计 Token：深色背景 + 蓝/紫主色，符合产品规范
export const COLORS = {
  deepSpace: '#070B14',
  nebula: '#111A2D',
  flowBlue: '#7894FF',
  flowViolet: '#B39AFF',
} as const;

export type Phase = 'idle' | 'entering' | 'active' | 'paused' | 'completed';

// 能量核心在不同状态下的发光强度（驱动 3D 场景与过渡）
export const CORE_INTENSITY: Record<Phase, number> = {
  idle: 0.4,
  entering: 1.1,
  active: 0.95,
  paused: 0.5,
  completed: 0.0,
};
