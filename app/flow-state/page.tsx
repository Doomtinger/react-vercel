'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Canvas } from '@react-three/fiber';

// 动态导入3D组件
const EmotionVisualization3D = dynamic(
  () => import('@/components/psychology-3d/EmotionVisualizationFixed').then(mod => ({
    default: function EmotionVisualizationWrapper(props: any) {
      return (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <mod.EmotionVisualizationScene {...props} />
        </Canvas>
      );
    },
  })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4 animate-pulse">🌊</div>
          <p>加载 3D 场景...</p>
        </div>
      </div>
    ),
  }
);

// 导入情感检测hook
import { useFaceDetection, emotionEmojis, emotionDescriptions, EmotionType } from '@/lib/use-face-detection';

export default function FlowStatePage() {
  const [showUI, setShowUI] = useState(true);

  // 使用情感检测
  const {
    isStreaming,
    error,
    videoRef,
    emotionHistory,
    currentEmotion,
    startCamera,
    stopCamera,
    getEmotionStats,
  } = useFaceDetection({
    videoWidth: 640,
    videoHeight: 480,
    updateInterval: 800,
    historyLength: 30,
    onEmotionChange: (emotion) => {
      console.log('情感变化:', emotion);
    },
  });

  const stats = getEmotionStats();

  // 启动/停止摄像头
  const toggleCamera = async () => {
    if (isStreaming) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  // 计算当前强度（基于情感类型和置信度）
  const getCurrentIntensity = () => {
    if (!currentEmotion) return 0.5;
    const emotionIntensity = {
      neutral: 0.3,
      happy: 0.7,
      sad: 0.6,
      angry: 0.9,
      fearful: 0.8,
      disgusted: 0.7,
      surprised: 0.8,
    };
    return emotionIntensity[currentEmotion.emotion] * currentEmotion.confidence;
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-pink-950">
      {/* 左侧控制面板 */}
      <div className="w-96 bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">🌊</span>
            心流状态可视化
          </h1>
          <p className="text-sm text-gray-300">
            通过摄像头实时捕捉情感，体验流动的3D可视化效果
          </p>
        </div>

        {/* 摄像头控制 */}
        <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">摄像头控制</h3>

          {/* video元素 - 始终在DOM中，通过visibility控制显示 */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full object-cover"
            style={{
              transform: 'scaleX(-1)',
              visibility: isStreaming ? 'visible' : 'hidden',
              height: isStreaming ? '240px' : '0',
              borderRadius: '8px'
            }}
            onLoadedMetadata={() => console.log('✅ Flow-state: 视频元数据已加载', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)}
            onPlay={() => console.log('✅ Flow-state: 视频开始播放')}
            onError={(e) => console.error('❌ Flow-state: 视频错误', (e.target as HTMLVideoElement).error)}
          />

          {!isStreaming && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm text-gray-400 mb-4">
                启动摄像头开始情感检测
              </p>
              <button
                onClick={toggleCamera}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all"
              >
                启动摄像头
              </button>
              <div className="mt-4 text-xs text-gray-500 text-left">
                <p>💡 提示：如果摄像头无法启动，请检查：</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>浏览器是否允许了摄像头权限</li>
                  <li>其他应用是否正在使用摄像头</li>
                  <li>系统摄像头设置是否正常</li>
                </ul>
              </div>
            </div>
          )}

          {isStreaming && (
            <div className="space-y-3">
              {/* LIVE 标签 */}
              <div className="relative flex justify-end -mt-10 mb-2 pr-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                    LIVE
                  </span>
                </div>
              </div>

              <button
                onClick={toggleCamera}
                className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                停止检测
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* 当前情感 */}
        {currentEmotion && (
          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
            <h3 className="text-sm font-semibold text-white mb-3">当前情感</h3>
            <div className="flex items-center gap-4">
              <div className="text-5xl">
                {emotionEmojis[currentEmotion.emotion]}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-lg">
                  {emotionDescriptions[currentEmotion.emotion]}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${currentEmotion.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300">
                    {(currentEmotion.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 情感统计 */}
        {stats.emotions.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
            <h3 className="text-sm font-semibold text-white mb-3">情感分布</h3>
            <div className="space-y-2">
              {Object.entries(stats.averageEmotion).map(([emotion, percentage]) => {
                if (percentage === 0) return null;
                return (
                  <div key={emotion} className="flex items-center gap-2">
                    <span className="text-lg">{emotionEmojis[emotion as EmotionType]}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${percentage * 100}%`,
                          backgroundColor: emotionEmojis[emotion as EmotionType] ? '#6366f1' : '#8b5cf6'
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-300 w-12 text-right">
                      {(percentage * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 波动程度 */}
        {stats.emotions.length > 0 && (
          <div className="p-4 rounded-xl bg-white/10 border border-white/20">
            <h3 className="text-sm font-semibold text-white mb-2">情感波动</h3>
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {stats.volatility < 0.3 ? '😌' : stats.volatility < 0.6 ? '😐' : '🎢'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stats.volatility < 0.3 ? 'bg-green-500' :
                        stats.volatility < 0.6 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${stats.volatility * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300">
                    {(stats.volatility * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {stats.volatility < 0.3 ? '情感稳定' :
                   stats.volatility < 0.6 ? '适度波动' :
                   '波动较大'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
          <h3 className="text-sm font-semibold text-white mb-2">💡 心流提示</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            保持稳定的情感状态有助于进入心流。尝试让面部表情保持放松和专注，3D可视化会实时反映你的内在状态。
          </p>
        </div>
      </div>

      {/* 右侧3D可视化区域 */}
      <div className="flex-1 relative">
        {/* 3D Canvas */}
        <div className="w-full h-full">
          {currentEmotion ? (
            <EmotionVisualization3D
              currentEmotion={currentEmotion.emotion}
              intensity={getCurrentIntensity()}
              volatility={stats.volatility}
              emotionHistory={emotionHistory}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🌊</div>
                <h2 className="text-2xl font-bold mb-2">心流可视化</h2>
                <p className="text-gray-400">
                  启动摄像头开始体验
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 浮动信息 */}
        {currentEmotion && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm flex items-center gap-2">
            <span className="text-xl">{emotionEmojis[currentEmotion.emotion]}</span>
            <span>{emotionDescriptions[currentEmotion.emotion]}</span>
            <span className="text-gray-400">•</span>
            <span>强度: {(getCurrentIntensity() * 100).toFixed(0)}%</span>
          </p>
        </div>
      )}

        {/* 交互提示 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm">
            🖱️ 拖动旋转 | 滚轮缩放 | 右键平移
          </p>
        </div>

        {/* UI切换按钮 */}
        <button
          onClick={() => setShowUI(!showUI)}
          className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showUI ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7"} />
            {!showUI && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s3-7 10-7 10 7 10 7-7 10-7" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
