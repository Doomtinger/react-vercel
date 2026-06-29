# 心理学3D可视化 - 使用指南

## 🎨 功能介绍

心理学3D可视化模块通过可爱的动态3D图形，直观展示各种心理学概念和情绪状态。

## 📦 依赖安装

在使用这些组件之前，需要先安装必要的依赖：

```bash
# 使用 npm
npm install @react-three/fiber @react-three/drei three

# 使用 yarn
yarn add @react-three/fiber @react-three/drei three

# 使用 pnpm
pnpm add @react-three/fiber @react-three/drei three
```

## 🌟 核心组件

### 1. PsychologyScene - 情绪星球

**功能**: 展示6种基本情绪的3D球体，每个情绪都有独特的颜色和动态效果

**情绪映射**:
- 😊 快乐 (Happy) - 黄色 #FFD93D
- 😌 平静 (Calm) - 绿色 #6BCB77
- 😢 悲伤 (Sad) - 蓝色 #4D96FF
- 🤩 兴奋 (Excited) - 红色 #FF6B6B
- 🧘 宁静 (Peaceful) - 紫色 #A78BFA
- ⚡ 活力 (Energetic) - 橙色 #F97316

**使用示例**:
```tsx
import { PsychologyScene } from '@/components/psychology-3d';

function MyComponent() {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <PsychologyScene />
    </div>
  );
}
```

### 2. FlowStateVisualization - 心流状态

**功能**: 展示心流状态的连续流动效果，8个球体沿螺旋路径运动并留下轨迹

**特点**:
- 流动的球体轨迹
- 平滑的动画效果
- 象征心流状态的连贯性

**使用示例**:
```tsx
import { FlowStateVisualization } from '@/components/psychology-3d';

function FlowDemo() {
  return (
    <Canvas camera={{ position: [0, 0, 15] }}>
      <FlowStateVisualization />
      <OrbitControls />
    </Canvas>
  );
}
```

### 3. StressVisualization - 压力山脉

**功能**: 通过山脉形状可视化压力水平，支持动态调节

**参数**:
- `level`: 压力水平 (0-1)，默认 0.5

**使用示例**:
```tsx
import { StressVisualization } from '@/components/psychology-3d';

function StressDemo() {
  const [stressLevel, setStressLevel] = useState(0.5);

  return (
    <Canvas>
      <StressVisualization level={stressLevel} />
    </Canvas>
  );
}
```

### 4. TimePerception - 时间感知

**功能**: 展示时间感知的动态效果，12个粒子围绕中心旋转

**特点**:
- 每个粒子有不同的速度
- 象征时间的相对性
- 动态的时钟效果

### 5. MBTIVisualization - MBTI性格类型

**功能**: 3D展示MBTI性格类型的4个维度

**参数**:
- `personality`: MBTI类型（如 'INTJ', 'ENFP' 等）

**使用示例**:
```tsx
import { MBTIVisualization } from '@/components/psychology-3d';

function PersonalityDemo() {
  return (
    <Canvas>
      <MBTIVisualization personality="INTJ" />
    </Canvas>
  );
}
```

## 🎯 访问Demo页面

访问路径: `/psychology-3d`

Demo页面包含:
1. **情绪星球** - 完整的情绪可视化体验
2. **心流状态** - 展示专注与创造的流动
3. **压力山脉** - 可交互的压力水平调节
4. **时间感知** - 时间相对性的可视化

## 🎨 自定义样式

### 修改颜色方案

```tsx
// 在 EmotionGlobe.tsx 中修改 emotionColors
const emotionColors = {
  happy: '#your-color',
  calm: '#your-color',
  // ... 其他情绪
};
```

### 调整动画速度

```tsx
// 在组件中修改 useFrame 中的速度参数
useFrame((state) => {
  meshRef.current.rotation.y += 0.01; // 调整这个值
});
```

## 💡 心理学应用场景

1. **情绪识别训练** - 帮助用户识别和命名不同情绪
2. **压力管理** - 可视化压力水平，提供反馈
3. **心流体验** - 展示专注状态的美感
4. **性格测试** - 3D展示MBTI等性格类型
5. **心理咨询辅助** - 可视化治疗过程中的情绪变化

## 🔧 技术特点

- **Three.js + React Three Fiber** - 强大的3D渲染能力
- **Drei组件库** - 丰富的3D辅助组件
- **动态材质** - MeshDistortMaterial实现流动效果
- **粒子系统** - Trail轨迹和粒子云
- **交互控制** - OrbitControls支持鼠标交互
- **性能优化** - 使用 useMemo 和 useRef 优化性能

## 🚀 快速开始

1. 安装依赖（见上方）
2. 访问 `/psychology-3d` 查看Demo
3. 根据需求导入和使用组件

## 📝 注意事项

- 这些组件需要在客户端渲染（使用 `{ ssr: false }` 进行动态导入）
- 3D场景需要合适的容器尺寸
- 建议在现代浏览器中使用以获得最佳性能
- 移动设备可能需要降低复杂度以保持流畅

## 🎓 扩展建议

- 添加更多心理学可视化（如情绪曲线、认知负荷等）
- 集成真实的生理传感器数据
- 添加声音和音乐增强体验
- 实现数据导出和分析功能
- 支持VR/AR模式

---

**更新日期**: 2026-06-28
**版本**: 1.0.0
