'use client';

import * as React from 'react';
import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';

// 动态导入3D组件 - 优化加载
const EmotionVisualization3D = dynamic(
  () => import('@/components/psychology-3d/EmotionVisualizationFixed').then(mod => ({
    default: function EmotionVisualizationWrapper(props: any) {
      return (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
          }}
          dpr={[1, 2]}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />

          <Suspense fallback={null}>
            <mod.EmotionVisualizationScene {...props} />
            <Environment preset="night" blur={0.8} />
          </Suspense>

          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            zoomSpeed={0.6}
            panSpeed={0.5}
            rotateSpeed={0.4}
            minDistance={5}
            maxDistance={20}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>
      );
    },
  })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <div className="text-white text-center">
          <div className="text-4xl mb-4 animate-spin">🌊</div>
          <p className="text-sm text-gray-400">加载 3D 场景...</p>
        </div>
      </div>
    ),
  }
);

// 导入情感检测hook
import { useFaceDetection, emotionEmojis, emotionDescriptions, EmotionType } from '@/lib/use-face-detection';

// 3D场景加载组件
function SceneLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="text-center text-white">
        <div className="text-6xl mb-4 animate-pulse">🌊</div>
        <h2 className="text-2xl font-bold mb-2">正在构建3D场景...</h2>
        <p className="text-gray-400">初始化情感可视化引擎</p>
      </div>
    </div>
  );
}

// 初始空状态组件
function EmptyState() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="text-center text-white px-8">
        <div className="text-8xl mb-6 animate-pulse">🌊</div>
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          心流状态可视化
        </h2>
        <p className="text-gray-300 text-lg mb-6 max-w-md mx-auto">
          通过摄像头实时捕捉你的情感，体验流动的3D可视化效果
        </p>
        <div className="flex flex-col gap-3 text-sm text-gray-400 max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">📷</span>
            <span>实时情感检测与3D映射</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">🧘</span>
            <span>探索你的心流状态</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">✨</span>
            <span>沉浸式3D情感体验</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // 计算当前强度
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

  // 获取强度级别和颜色
  const getIntensityLevel = (intensity: number) => {
    if (intensity > 0.7) return { level: '高强度', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (intensity > 0.4) return { level: '中强度', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { level: '低强度', color: 'text-green-400', bg: 'bg-green-500/20' };
  };

  const intensityInfo = currentEmotion ? getIntensityLevel(getCurrentIntensity()) : null;

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-pink-950">
      {/* 左侧控制面板 */}
      <div className="w-[420px] bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
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
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span>📷</span> 摄像头控制
          </h3>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full object-cover"
            style={{
              transform: 'scaleX(-1)',
              visibility: isStreaming ? 'visible' : 'hidden',
              height: isStreaming ? '280px' : '0',
              borderRadius: '8px'
            }}
            onLoadedMetadata={() => console.log('✅ Flow-state: 视频元数据已加载')}
            onPlay={() => console.log('✅ Flow-state: 视频开始播放')}
            onError={(e) => console.error('❌ Flow-state: 视频错误', (e.target as HTMLVideoElement).error)}
          />

          {!isStreaming && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-sm text-gray-400 mb-4">
                启动摄像头开始情感检测
              </p>
              <button
                onClick={toggleCamera}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all transform hover:scale-[1.02]"
              >
                <span className="flex items-center gap-2">
                  <span>▶</span> 启动摄像头
                </span>
              </button>
              <div className="mt-4 text-xs text-gray-500 text-left">
                <p className="mb-2">💡 提示：如果摄像头无法启动，请检查：</p>
                <ul className="list-disc list-inside space-y-1">
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
              <div className="flex justify-end mb-2">
                <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-white font-medium">LIVE</span>
                </div>
              </div>

              <button
                onClick={toggleCamera}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>⏹</span> 停止检测
              </button>

              <div className="text-xs text-gray-400 text-center">
                检测到{stats.emotions.length > 0 ? `${stats.emotions.length}个` : '0个'}情感样本
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
              <p className="text-sm text-red-300 flex items-center gap-2">
                <span>⚠️</span> {error}
              </p>
            </div>
          )}
        </div>

        {/* 当前情感 */}
        {currentEmotion && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span>😊</span> 当前情感
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-6xl">
                {emotionEmojis[currentEmotion.emotion]}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-xl mb-2">
                  {emotionDescriptions[currentEmotion.emotion]}
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${currentEmotion.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-12 text-right">
                    {(currentEmotion.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {intensityInfo && (
                  <div className={`text-xs ${intensityInfo.color} font-medium`}>
                    强度: {intensityInfo.level}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 情感统计 */}
        {stats.emotions.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span>📊</span> 情感分布
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.averageEmotion).map(([emotion, percentage]) => {
                if (percentage === 0) return null;
                return (
                  <div key={emotion} className="flex items-center gap-2">
                    <span className="text-xl">{emotionEmojis[emotion as EmotionType]}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                        style={{ width: `${percentage * 100}%` }}
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
          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <span>📈</span> 情感波动
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-3xl">
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
                  <span className="text-xs text-gray-300 w-12 text-right">
                    {(stats.volatility * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {stats.volatility < 0.3 ? '情感稳定 - 有利于心流状态' :
                   stats.volatility < 0.6 ? '适度波动 - 可接受范围' :
                   '波动较大 - 建议调节情绪'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 心流提示 */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <span>🧘</span> 心流提示
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            保持稳定的情感状态有助于进入心流。尝试让面部表情保持放松和专注，3D可视化会实时反映你的内在状态。
            {stats.volatility < 0.3 && currentEmotion && (
              <span className="text-green-400 mt-2 block">
                ✨ 当前状态良好，适合进入心流状态！
              </span>
            )}
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
            <EmptyState />
          )}
        </div>

        {/* 浮动信息 */}
        {currentEmotion && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
            <p className="text-white text-sm flex items-center gap-3">
              <span className="text-2xl">{emotionEmojis[currentEmotion.emotion]}</span>
              <span className="font-medium">{emotionDescriptions[currentEmotion.emotion]}</span>
              <span className="text-gray-400">|</span>
              <span className={`font-semibold px-2 py-0.5 rounded ${
                intensityInfo?.bg || 'bg-gray-500/20'
              } ${intensityInfo?.color || 'text-gray-400'}`}>
                {intensityInfo?.level || 'N/A'}
              </span>
            </p>
          </div>
        )}

        {/* 3D场景信息 */}
        {currentEmotion && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <div className="text-white text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">🎯</span>
                <span>强度: {(getCurrentIntensity() * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📊</span>
                <span>样本: {stats.emotions.length}个</span>
              </div>
              {stats.volatility < 0.3 && (
                <div className="flex items-center gap-2 text-green-400">
                  <span>✨</span>
                  <span>心流状态良好</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部交互提示 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <p className="text-white text-sm flex items-center gap-3">
            <span>🖱️</span>
            <span>拖动旋转</span>
            <span className="text-gray-500">|</span>
            <span>滚轮缩放</span>
            <span className="text-gray-500">|</span>
            <span>右键平移</span>
          </p>
        </div>

        {/* UI切换按钮 */}
        <button
          onClick={() => setShowUI(!showUI)}
          className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/70 transition-colors border border-white/10"
          title={showUI ? "隐藏界面" : "显示界面"}
        >
          {showUI ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s3-7 10-7 10 7 10 7-7 10-7" />
            </svg>
          )}
        </button>

        {/* 开发环境性能监控 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-gray-400">
            3D渲染引擎已优化 | FPS: {Math.round(1000 / 16.7)}
          </div>
        )}
      </div>
    </div>
  );
}