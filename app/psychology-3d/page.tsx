'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// 动态导入3D组件，避免SSR问题
const PsychologyScene = dynamic(
  () => import('@/components/psychology-3d/EmotionGlobe').then(mod => ({ default: mod.PsychologyScene })),
  { ssr: false }
);

const FlowStateVisualization = dynamic(
  () => import('@/components/psychology-3d/Visualizations').then(mod => ({ default: mod.FlowStateVisualization })),
  { ssr: false }
);

const StressVisualization = dynamic(
  () => import('@/components/psychology-3d/Visualizations').then(mod => ({ default: mod.StressVisualization })),
  { ssr: false }
);

const TimePerception = dynamic(
  () => import('@/components/psychology-3d/Visualizations').then(mod => ({ default: mod.TimePerception })),
  { ssr: false }
);

type VisualizationType = 'emotion' | 'flow' | 'stress' | 'time';

export default function Psychology3DPage() {
  const [selectedViz, setSelectedViz] = useState<VisualizationType>('emotion');
  const [stressLevel, setStressLevel] = useState(0.5);

  const visualizations = [
    {
      id: 'emotion' as VisualizationType,
      name: '情绪星球',
      description: '探索不同情绪状态，观察它们如何影响内心世界',
      icon: '🌍',
      color: '#FFD93D',
    },
    {
      id: 'flow' as VisualizationType,
      name: '心流状态',
      description: '体验完全沉浸的状态，感受专注与创造的流动',
      icon: '🌊',
      color: '#6BCB77',
    },
    {
      id: 'stress' as VisualizationType,
      name: '压力山脉',
      description: '可视化压力水平，学习调节与放松',
      icon: '⛰️',
      color: '#FF6B6B',
    },
    {
      id: 'time' as VisualizationType,
      name: '时间感知',
      description: '观察时间如何在快乐与压力中变化',
      icon: '⏰',
      color: '#A78BFA',
    },
  ];

  const emotions = [
    { id: 'happy', label: '快乐', emoji: '😊', color: '#FFD93D' },
    { id: 'calm', label: '平静', emoji: '😌', color: '#6BCB77' },
    { id: 'excited', label: '兴奋', emoji: '🤩', color: '#FF6B6B' },
    { id: 'sad', label: '悲伤', emoji: '😢', color: '#4D96FF' },
    { id: 'peaceful', label: '宁静', emoji: '🧘', color: '#A78BFA' },
  ];

  return (
    <div className="h-screen flex bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950">
      {/* 左侧导航面板 */}
      <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            心理学3D可视化
          </h1>
          <p className="text-sm text-gray-300">
            通过可爱动态的3D图形探索心理状态
          </p>
        </div>

        {/* 可视化选择 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white mb-3">
            选择可视化
          </h2>
          {visualizations.map((viz) => (
            <button
              key={viz.id}
              onClick={() => setSelectedViz(viz.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedViz === viz.id
                  ? 'border-white/40 bg-white/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{viz.icon}</span>
                <div>
                  <h3 className="font-semibold text-white">{viz.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{viz.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 心理学小知识 */}
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
          <h3 className="text-sm font-semibold text-white mb-2">
            💡 心理学小知识
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            {selectedViz === 'emotion' &&
              '情绪星球展示了6种基本情绪。每种情绪都有其独特的颜色和动态特征，帮助我们理解情绪的复杂性。'}
            {selectedViz === 'flow' &&
              '心流状态是一种完全沉浸的活动状态，在这种状态下，你会忘记时间的流逝，体验到高度的专注和满足感。'}
            {selectedViz === 'stress' &&
              '适度的压力可以提高表现，但过度压力会影响健康。通过可视化压力水平，我们可以更好地管理和调节情绪。'}
            {selectedViz === 'time' &&
              '我们的时间感知会因情绪状态而变化。快乐时时间飞逝，压力时时间缓慢。这是主观时间体验的有趣现象。'}
          </p>
        </div>
      </div>

      {/* 右侧3D展示区域 */}
      <div className="flex-1 flex flex-col">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          {selectedViz === 'emotion' && (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
              <PsychologyScene />
            </div>
          )}
          {selectedViz === 'flow' && (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 via-teal-900 to-green-900">
              <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
                <FlowStateVisualization />
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  zoomSpeed={0.6}
                  panSpeed={0.5}
                  rotateSpeed={0.4}
                />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 5]} intensity={0.8} color="#6BCB77" />
                <pointLight position={[-10, -10, -5]} intensity={0.3} />
              </Canvas>
            </div>
          )}
          {selectedViz === 'stress' && (
            <div className="w-full h-full relative">
              <Canvas camera={{ position: [0, 8, 15], fov: 60 }}>
                <StressVisualization level={stressLevel} />
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  zoomSpeed={0.6}
                  panSpeed={0.5}
                  rotateSpeed={0.4}
                />
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={0.6} />
                <pointLight position={[-10, 5, -5]} intensity={0.4} />
              </Canvas>

              {/* 压力控制面板 */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                <h3 className="text-white font-semibold mb-3">⛰️ 压力山脉</h3>
                <div className="w-48">
                  <label className="text-white text-sm mb-2 block">压力水平</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-300 text-xs mt-2">
                    当前: <span className={
                      stressLevel > 0.7 ? 'text-red-400' :
                      stressLevel > 0.4 ? 'text-yellow-400' :
                      'text-green-400'
                    }>{(stressLevel * 100).toFixed(0)}%</span>
                  </p>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-400">
                    {stressLevel > 0.7 ? '⚠️ 高压力 - 山脉变红，粒子躁动' :
                     stressLevel > 0.4 ? '⚡ 中等压力 - 山脉橙黄，呼吸急促' :
                     '😌 低压力 - 山脉翠绿，粒子平静'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {selectedViz === 'time' && (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900">
              <Canvas camera={{ position: [0, 3, 12], fov: 60 }}>
                <TimePerception />
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  zoomSpeed={0.6}
                  panSpeed={0.5}
                  rotateSpeed={0.4}
                />
                <ambientLight intensity={0.5} />
                <pointLight position={[8, 5, 5]} intensity={0.7} color="#FFD700" />
                <pointLight position={[-8, -5, -5]} intensity={0.4} color="#DC143C" />
              </Canvas>

              {/* 时间感知说明 */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm p-3 rounded-xl">
                <div className="flex gap-8 text-center">
                  <div>
                    <div className="text-2xl mb-1">🌟 快乐时光</div>
                    <p className="text-xs text-yellow-300">左侧 - 快速旋转 ⏩</p>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">⏰ 时间感知</div>
                    <p className="text-xs text-purple-300">中心 - 相对体验</p>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">😰 压力时光</div>
                    <p className="text-xs text-red-300">右侧 - 缓慢移动 ⏳</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm">
              🖱️ 拖动旋转 | 滚轮缩放 | 右键平移
            </p>
          </div>
        </div>

        {/* 底部信息面板 */}
        {selectedViz === 'emotion' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-3">情绪卡片</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {emotions.map((emotion) => (
                <div
                  key={emotion.id}
                  className="flex-shrink-0 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{emotion.emoji}</span>
                    <span className="text-white text-sm font-medium">{emotion.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedViz === 'stress' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-2">压力管理建议</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 rounded bg-green-500/20 text-center">
                <p className="text-green-400 text-xs font-medium">低压力</p>
                <p className="text-white text-xs mt-1">保持现状</p>
              </div>
              <div className="p-2 rounded bg-yellow-500/20 text-center">
                <p className="text-yellow-400 text-xs font-medium">中等压力</p>
                <p className="text-white text-xs mt-1">适度休息</p>
              </div>
              <div className="p-2 rounded bg-red-500/20 text-center">
                <p className="text-red-400 text-xs font-medium">高压力</p>
                <p className="text-white text-xs mt-1">需要放松</p>
              </div>
            </div>
          </div>
        )}

        {selectedViz === 'flow' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-2">进入心流的条件</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>✅</span>
                <span>清晰的目标</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>✅</span>
                <span>即时反馈</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>✅</span>
                <span>挑战与技能匹配</span>
              </div>
            </div>
          </div>
        )}

        {selectedViz === 'time' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-2">时间感知现象</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-2 rounded bg-blue-500/20">
                <p className="text-blue-400 font-medium">快乐时光</p>
                <p className="text-gray-300 text-xs mt-1">⏩ 时间飞逝</p>
              </div>
              <div className="p-2 rounded bg-purple-500/20">
                <p className="text-purple-400 font-medium">压力时刻</p>
                <p className="text-gray-300 text-xs mt-1">⏳ 时间缓慢</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
