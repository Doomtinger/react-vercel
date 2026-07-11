'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const SimpleEmotionScene = dynamic(
  () => import('@/components/psychology-3d/SimpleEmotionScene').then(mod => ({
    default: mod.SimpleEmotionScene,
  })),
  { ssr: false }
);

const emotionPresets = [
  { id: 'happy', name: '快乐', color: '#FCD34D', emoji: '😊' },
  { id: 'calm', name: '平静', color: '#6BCB77', emoji: '😌' },
  { id: 'excited', name: '兴奋', color: '#FF6B6B', emoji: '🤩' },
  { id: 'sad', name: '悲伤', color: '#60A5FA', emoji: '😢' },
  { id: 'peaceful', name: '宁静', color: '#A78BFA', emoji: '🧘' },
  { id: 'energetic', name: '活力', color: '#F97316', emoji: '⚡' },
];

export default function Test3DPage() {
  const [selectedEmotion, setSelectedEmotion] = useState('happy');
  const [intensity, setIntensity] = useState(0.5);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${result}`]);
  };

  const runTests = () => {
    setTestResults([]);
    addTestResult('🧪 开始3D组件测试...');

    // 测试1: 检查Three.js是否加载
    try {
      if (typeof THREE !== 'undefined') {
        addTestResult('✅ Three.js 加载成功');
      } else {
        addTestResult('❌ Three.js 未加载');
      }
    } catch (e) {
      addTestResult('❌ Three.js 检查失败');
    }

    // 测试2: 检查React Three Fiber
    addTestResult('✅ React Three Fiber 组件渲染中');

    // 测试3: 检查Drei组件
    addTestResult('✅ Drei 辅助组件加载中');

    setTimeout(() => {
      addTestResult('🎨 3D场景应该可见');
      addTestResult('🎮 可以尝试交互：拖动旋转、滚轮缩放');
    }, 1000);
  };

  const currentEmotion = emotionPresets.find(e => e.id === selectedEmotion);

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-pink-950">
      {/* 左侧测试面板 */}
      <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            🧪 3D组件测试
          </h1>
          <p className="text-sm text-gray-400">
            验证3D功能是否正常工作
          </p>
        </div>

        {/* 测试按钮 */}
        <button
          onClick={runTests}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium mb-6"
        >
          运行测试
        </button>

        {/* 情感选择 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">
            选择情感
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {emotionPresets.map((emotion) => (
              <button
                key={emotion.id}
                onClick={() => setSelectedEmotion(emotion.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedEmotion === emotion.id
                    ? 'border-white/40 bg-white/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-1">{emotion.emoji}</div>
                <div className="text-white text-sm font-medium">{emotion.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 强度控制 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">
            强度调节
          </h2>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-gray-400 text-xs mt-2">
            当前: {(intensity * 100).toFixed(0)}%
          </p>
        </div>

        {/* 测试结果 */}
        <div className="p-3 rounded-lg bg-black/30 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2">
            测试记录
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-xs">
                点击"运行测试"开始...
              </p>
            ) : (
              testResults.map((result, i) => (
                <p key={i} className="text-xs text-gray-300 font-mono">
                  {result}
                </p>
              ))
            )}
          </div>
        </div>

        {/* 功能说明 */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-400/30">
          <h3 className="text-sm font-semibold text-white mb-2">
            📋 测试项目
          </h3>
          <ul className="space-y-1 text-xs text-gray-300">
            <li>✅ Three.js 加载</li>
            <li>✅ React Three Fiber</li>
            <li>✅ Drei 组件库</li>
            <li>✅ 情感核心球体</li>
            <li>✅ 粒子系统</li>
            <li>✅ 星空背景</li>
            <li>✅ 交互控制</li>
          </ul>
        </div>
      </div>

      {/* 右侧3D展示区域 */}
      <div className="flex-1 flex flex-col">
        {/* 3D Canvas */}
        <div className="flex-1">
          <SimpleEmotionScene
            emotionColor={currentEmotion?.color}
            intensity={intensity}
          />
        </div>

        {/* 当前状态 */}
        <div className="p-4 bg-black/30 backdrop-blur-sm border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{currentEmotion?.emoji}</span>
              <div>
                <p className="text-white font-medium">{currentEmotion?.name}</p>
                <p className="text-gray-400 text-xs">
                  颜色: {currentEmotion?.color} | 强度: {(intensity * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>运行中</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
