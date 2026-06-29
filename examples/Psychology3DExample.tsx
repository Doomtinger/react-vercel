'use client';

/**
 * 心理学3D可视化 - 简单示例
 *
 * 这个文件展示了如何在一个简单的组件中使用心理学3D可视化功能
 * 可以作为独立示例或集成到任何项目中
 */

import { useState } from 'react';

// 动态导入组件，避免SSR问题
// 在实际项目中，你可以直接导入：import { PsychologyScene } from '@/components/psychology-3d';

export default function Psychology3DExample() {
  const [currentEmotion, setCurrentEmotion] = useState<string>('happy');
  const [showUI, setShowUI] = useState(true);

  const emotions = [
    { id: 'happy', label: '快乐', emoji: '😊', color: '#FFD93D' },
    { id: 'calm', label: '平静', emoji: '😌', color: '#6BCB77' },
    { id: 'excited', label: '兴奋', emoji: '🤩', color: '#FF6B6B' },
  ];

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-indigo-950 to-purple-950">
      {/* 3D 场景容器 */}
      <div className="absolute inset-0">
        {/* 这里需要安装 @react-three/fiber 和 @react-three/drei
        <PsychologyScene /> */}

        {/* 临时占位符 - 安装依赖后删除 */}
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <p className="text-xl mb-4">🌍 情绪星球</p>
            <p className="text-sm text-gray-400">
              请先安装3D依赖: <code>npm install @react-three/fiber @react-three/drei three</code>
            </p>
          </div>
        </div>
      </div>

      {/* UI 控制面板 */}
      {showUI && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-xl p-4 max-w-xs">
          <h3 className="text-white font-semibold mb-3">情绪选择</h3>
          <div className="space-y-2">
            {emotions.map((emotion) => (
              <button
                key={emotion.id}
                onClick={() => setCurrentEmotion(emotion.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  currentEmotion === emotion.id
                    ? 'bg-white/20'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <span className="text-xl">{emotion.emoji}</span>
                <span className="text-white text-sm">{emotion.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowUI(false)}
            className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
          >
            隐藏面板
          </button>
        </div>
      )}

      {/* 底部信息栏 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
        <p className="text-white text-sm">
          🖱️ 拖动旋转 | 滚轮缩放 | 右键平移 | 按 H 显示/隐藏UI
        </p>
      </div>

      {/* 键盘快捷键提示 */}
      <div
        className="absolute bottom-4 right-4 cursor-pointer text-white/50 hover:text-white transition-colors"
        onClick={() => setShowUI(!showUI)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * 使用说明：
 *
 * 1. 安装依赖：
 *    npm install @react-three/fiber @react-three/drei three
 *
 * 2. 导入组件：
 *    import { PsychologyScene } from '@/components/psychology-3d';
 *
 * 3. 在渲染中使用：
 *    <PsychologyScene />
 *
 * 4. 可选的属性：
 *    - 可以通过修改源码来自定义颜色、速度等参数
 *
 * 5. 完整示例见：/app/psychology-3d/page.tsx
 */
