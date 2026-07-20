'use client';

import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import dynamic from 'next/dynamic';

// 动态导入3D场景组件
const HappyDreamScene = dynamic(
  () => import('@/components/dream-emotion/HappyDreamScene').then(mod => ({ default: mod.HappyDreamScene })),
  { ssr: false }
);

const PainDreamScene = dynamic(
  () => import('@/components/dream-emotion/PainDreamScene').then(mod => ({ default: mod.PainDreamScene })),
  { ssr: false }
);

const NeutralDreamScene = dynamic(
  () => import('@/components/dream-emotion/NeutralDreamScene'),
  { ssr: false }
);

// 情感强度接口
interface EmotionState {
  happiness: number;    // 0-100, 快乐程度
  pain: number;        // 0-100, 痛苦程度
  energy: number;      // 0-100, 能量水平
  peace: number;       // 0-100, 平静程度
}

// 默认情感状态
const defaultEmotion: EmotionState = {
  happiness: 50,
  pain: 20,
  energy: 60,
  peace: 40
};

export default function DreamEmotionPage() {
  const [emotionState, setEmotionState] = useState<EmotionState>(defaultEmotion);
  const [activeScene, setActiveScene] = useState<'happy' | 'pain' | 'neutral'>('happy');
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  // 自动情感变化
  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setEmotionState(prev => {
        const time = Date.now() / 1000;
        const baseCycle = 20; // 20秒一个完整周期

        // 模拟情感波动
        return {
          happiness: 50 + Math.sin(time / baseCycle * Math.PI * 2) * 40,
          pain: 20 + Math.cos(time / baseCycle * Math.PI * 2) * 15,
          energy: 60 + Math.sin(time / baseCycle * Math.PI * 2 + Math.PI / 4) * 30,
          peace: 40 + Math.cos(time / baseCycle * Math.PI * 2 + Math.PI / 2) * 35
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAutoPlay]);

  // 计算场景强度
  const getSceneIntensity = () => {
    if (activeScene === 'happy') {
      return (emotionState.happiness * 0.6 + emotionState.energy * 0.3 + emotionState.peace * 0.1) / 100;
    } else if (activeScene === 'pain') {
      return (emotionState.pain * 0.5 + (100 - emotionState.peace) * 0.3 + (100 - emotionState.energy) * 0.2) / 100;
    } else {
      return (emotionState.peace * 0.7 + emotionState.energy * 0.2 + emotionState.happiness * 0.1) / 100;
    }
  };

  const intensity = getSceneIntensity();

  // 快乐场景配置
  const happyConfig = {
    elementCount: Math.floor(20 + intensity * 30), // 20-50个元素
    colorSaturation: 0.7 + intensity * 0.3, // 0.7-1.0
    brightness: 0.8 + intensity * 0.2,    // 0.8-1.0
    movementSpeed: 0.2 + intensity * 0.3, // 运动速度
    sparkleIntensity: intensity * 0.8     // 闪烁强度
  };

  // 痛苦场景配置
  const painConfig = {
    rainDensity: Math.floor(intensity * 100),      // 雨滴密度
    darkness: 0.3 + intensity * 0.5,            // 黑暗程度 0.3-0.8
    lightningFreq: intensity * 0.1,             // 闪电频率
    waveHeight: intensity * 2,                  // 海浪高度
    floatSpeed: 0.3 + intensity * 0.4            // 漂浮速度
  };

  // 中立场景配置
  const neutralConfig = {
    grassCount: Math.floor(800 + intensity * 400),   // 草的数量
    windStrength: 0.5 + intensity * 0.5,          // 风力强度
    treeSize: 1 + intensity * 0.3                 // 树的大小
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950">
      {/* 左侧控制面板 */}
      <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 p-5 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">✨</span>
            梦幻情感场景
          </h1>
          <p className="text-sm text-gray-300">
            根据情感状态生成沉浸式3D梦幻场景
          </p>
        </div>

        {/* 场景选择 */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-white mb-3">🎭 场景选择</h3>
          <div className="space-y-2">
            <button
              onClick={() => setActiveScene('happy')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                activeScene === 'happy'
                  ? 'border-yellow-400 bg-gradient-to-r from-yellow-500/30 to-orange-500/30'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌸</span>
                <div>
                  <div className="text-white font-medium">快乐梦境</div>
                  <div className="text-xs text-gray-400">治愈、温暖、色彩斑斓</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveScene('pain')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                activeScene === 'pain'
                  ? 'border-blue-400 bg-gradient-to-r from-blue-500/30 to-indigo-500/30'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌊</span>
                <div>
                  <div className="text-white font-medium">痛苦梦境</div>
                  <div className="text-xs text-gray-400">深沉、灰暗、情感释放</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveScene('neutral')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                activeScene === 'neutral'
                  ? 'border-green-400 bg-gradient-to-r from-green-500/30 to-emerald-500/30'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌳</span>
                <div>
                  <div className="text-white font-medium">中立梦境</div>
                  <div className="text-xs text-gray-400">宁静、自然、平衡状态</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 情感控制 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">💭 情感强度</h3>

          {activeScene === 'happy' ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>快乐程度</span>
                  <span className="text-yellow-400">{Math.round(emotionState.happiness)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.happiness}
                  onChange={(e) => setEmotionState({ ...emotionState, happiness: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>😔</span>
                  <span>😄</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>能量水平</span>
                  <span className="text-orange-400">{Math.round(emotionState.energy)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.energy}
                  onChange={(e) => setEmotionState({ ...emotionState, energy: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>💤</span>
                  <span>⚡</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>平静程度</span>
                  <span className="text-green-400">{Math.round(emotionState.peace)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.peace}
                  onChange={(e) => setEmotionState({ ...emotionState, peace: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>🧘</span>
                  <span>🌸</span>
                </div>
              </div>
            </div>
          ) : activeScene === 'neutral' ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>平静程度</span>
                  <span className="text-green-400">{Math.round(emotionState.peace)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.peace}
                  onChange={(e) => setEmotionState({ ...emotionState, peace: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>😰</span>
                  <span>🌳</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>能量水平</span>
                  <span className="text-yellow-400">{Math.round(emotionState.energy)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.energy}
                  onChange={(e) => setEmotionState({ ...emotionState, energy: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>💤</span>
                  <span>⚡</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>快乐程度</span>
                  <span className="text-pink-400">{Math.round(emotionState.happiness)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.happiness}
                  onChange={(e) => setEmotionState({ ...emotionState, happiness: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>😔</span>
                  <span>😄</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>痛苦程度</span>
                  <span className="text-blue-400">{Math.round(emotionState.pain)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.pain}
                  onChange={(e) => setEmotionState({ ...emotionState, pain: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>😔</span>
                  <span>😢</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>平静程度</span>
                  <span className="text-green-400">{Math.round(emotionState.peace)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.peace}
                  onChange={(e) => setEmotionState({ ...emotionState, peace: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>🌊</span>
                  <span>⛈️</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>能量水平</span>
                  <span className="text-purple-400">{Math.round(emotionState.energy)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionState.energy}
                  onChange={(e) => setEmotionState({ ...emotionState, energy: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>💔</span>
                  <span>🔋</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 自动播放控制 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">⏯️ 自动情感模式</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                isAutoPlay
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isAutoPlay ? '⏸ 暂停' : '▶️ 播放'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {isAutoPlay ? '情感状态自动周期性变化，模拟情感波动' : '开启自动情感循环'}
          </p>
        </div>

        {/* 场景强度指示 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-2">📊 场景强度</h3>
          <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                activeScene === 'happy'
                  ? 'bg-gradient-to-r from-yellow-400 via-pink-400 to-orange-400'
                  : activeScene === 'neutral'
                  ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-800'
              }`}
              style={{ width: `${intensity * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>
              {activeScene === 'happy' ? '治愈程度' : activeScene === 'neutral' ? '宁静程度' : '压抑程度'}
            </span>
            <span className="font-medium">
              {activeScene === 'happy' ? '😊' : activeScene === 'neutral' ? '🌳' : '😢'} {Math.round(intensity * 100)}%
            </span>
          </div>
        </div>

        {/* 场景说明 */}
        <div className={`p-4 rounded-xl border ${
          activeScene === 'happy'
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30'
            : activeScene === 'neutral'
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/30'
            : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-400/30'
        }`}>
          <h3 className="text-sm font-semibold text-white mb-2">
            {activeScene === 'happy' ? '🌸 快乐梦境说明' : activeScene === 'neutral' ? '🌳 中立梦境说明' : '🌊 痛苦梦境说明'}
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            {activeScene === 'happy' ? (
              <>
                随机生成色彩鲜艳、高饱和度的治愈系元素。包括彩虹、樱花、星星、光晕等梦幻元素。
                场景亮度和活力与情感强度正相关，创造温暖舒适的视觉体验。
              </>
            ) : activeScene === 'neutral' ? (
              <>
                静谧的草原场景，中心有一棵大树随风摇曳。绿色调营造平静安宁的氛围，
                帮助用户找到内心的平衡点。适合冥想和情绪调节。
              </>
            ) : (
              <>
                随机生成灰暗色调的emo系元素。包括海底、雨滴、闪电、阴影等忧郁元素。
                场景压抑感与情感强度正相关，提供情感释放和情绪宣泄的安全空间。
              </>
            )}
          </p>
        </div>

        {/* 心理学原理说明 */}
        <div className="p-4 rounded-xl bg-purple-500/20 border border-purple-400/30">
          <h3 className="text-sm font-semibold text-white mb-2">🧠 心理学原理</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <p><strong className="text-white">色彩心理学基础：</strong></p>
            <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 ml-3">
              <li>• 快乐状态偏好暖色调、高饱和度，增强积极情绪</li>
              <li>• 痛苦状态倾向冷色调、低饱和度，避免情绪刺激</li>
              <li>• 中立状态使用绿色调，象征自然、平衡与治愈</li>
              <li>• 治愈系场景通过色彩联想促进情绪修复</li>
            </ul>
            <p><strong className="text-white">认知神经科学视角：</strong></p>
            <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 ml-3">
              <li>• 正向情绪激活奖赏系统，增加多巴胺分泌</li>
              <li>• 负面情绪的安全表达有助于情绪调节</li>
              <li>• 自然场景（如草原大树）激活副交感神经系统，促进放松</li>
              <li>• 梦幻场景提供情感安全的想象空间</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 右侧3D场景区域 */}
      <div className="flex-1 relative">
        <div className="w-full h-full">
          {activeScene === 'happy' ? (
            <Canvas
              camera={{ position: [0, 5, 12], fov: 60 }}
              gl={{ antialias: true }}
            >
              <HappyDreamScene config={happyConfig} />
              <OrbitControls
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                zoomSpeed={0.6}
                panSpeed={0.5}
                rotateSpeed={0.4}
                minDistance={5}
                maxDistance={20}
              />
            </Canvas>
          ) : activeScene === 'neutral' ? (
            <Canvas
              camera={{ position: [0, 4, 16], fov: 60 }}
              gl={{ antialias: true }}
            >
              <NeutralDreamScene config={neutralConfig} />
              <OrbitControls
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                zoomSpeed={0.6}
                panSpeed={0.5}
                rotateSpeed={0.4}
                minDistance={6}
                maxDistance={30}
              />
            </Canvas>
          ) : (
            <Canvas
              camera={{ position: [0, 3, 15], fov: 60 }}
              gl={{ antialias: true }}
            >
              <PainDreamScene config={painConfig} />
              <OrbitControls
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                zoomSpeed={0.6}
                panSpeed={0.5}
                rotateSpeed={0.4}
                minDistance={8}
                maxDistance={25}
              />
            </Canvas>
          )}

          {/* 场景切换提示 */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
            <p className="text-white text-sm flex items-center gap-2">
              <span>
                {activeScene === 'happy' ? '🌸' : activeScene === 'neutral' ? '🌳' : '🌊'}
              </span>
              <span>
                {activeScene === 'happy' ? '快乐梦境' : activeScene === 'neutral' ? '中立梦境' : '痛苦梦境'}
              </span>
              <span className="text-gray-400">|</span>
              <span>强度: {Math.round(intensity * 100)}%</span>
            </p>
          </div>

          {/* 交互提示 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm">
              🖱️ 拖动旋转 | 滚轮缩放 | 右键平移 | 🎛️ 左侧面板控制情感强度
            </p>
          </div>

          {/* 场景元素统计 */}
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-xl">
            <div className="text-white text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className={activeScene === 'happy' ? 'text-yellow-400' : activeScene === 'neutral' ? 'text-green-400' : 'text-blue-400'}>
                  {activeScene === 'happy' ? '🌸' : activeScene === 'neutral' ? '🌳' : '🌊'}
                </span>
                <span>
                  {activeScene === 'happy'
                    ? `${happyConfig.elementCount} 个治愈元素`
                    : activeScene === 'neutral'
                    ? `${neutralConfig.grassCount} 个草粒`
                    : `${painConfig.rainDensity} 个雨滴`}
                </span>
              </div>
              {activeScene === 'pain' && (
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">⚡</span>
                  <span>闪电频率: {Math.round(painConfig.lightningFreq * 100)}%</span>
                </div>
              )}
              {activeScene === 'neutral' && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">🌿</span>
                  <span>风力强度: {neutralConfig.windStrength.toFixed(1)}x</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}