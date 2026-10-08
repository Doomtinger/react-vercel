'use client';

import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { OrbitControls } from '@react-three/drei';
import type { MemoryEvent } from '@/components/psychology-3d/Visualizations';

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

const TimePerception2 = dynamic(
  () => import('@/components/psychology-3d/Visualizations').then(mod => ({ default: mod.TimePerception2 })),
  { ssr: false }
);

const TimePerception3 = dynamic(
  () => import('@/components/psychology-3d/Visualizations').then(mod => ({ default: mod.TimePerception3 })),
  { ssr: false }
);

const HypnosisVisualization = dynamic(
  () => import('@/components/psychology-3d/Visualizations').then(mod => ({ default: mod.HypnosisVisualization })),
  { ssr: false }
);

const HypnosisRiverVisualization = dynamic(
  () => import('@/components/psychology-3d/Visualizations').then(mod => ({ default: mod.HypnosisRiverVisualization })),
  { ssr: false }
);

type VisualizationType = 'emotion' | 'flow' | 'stress' | 'time' | 'time2' | 'time3' | 'hypnosis' | 'hypnosis2';

type EmotionId = 'happy' | 'calm' | 'excited' | 'sad' | 'peaceful' | 'energetic';

export default function Psychology3DPage() {
  const [selectedViz, setSelectedViz] = useState<VisualizationType>('emotion');
  const [stressLevel, setStressLevel] = useState(0.5);
  // 心流海面的调节项
  const [flowFrequency, setFlowFrequency] = useState(1.2);
  const [flowHue, setFlowHue] = useState(0);
  // 时间感知的调节项
  const [timeMood, setTimeMood] = useState(0); // -1 焦虑/无聊 .. +1 快乐/专注
  const [timeMemory, setTimeMemory] = useState(0.5); // 0 单调重复 .. 1 充满新鲜
  const [timeAge, setTimeAge] = useState(0.2); // 0 青少年 .. 1 老年
  const [showTimeUI, setShowTimeUI] = useState(true); // 时间感知面板显隐
  // 时间感知2（管道模型）的调节项
  const [time2Mood, setTime2Mood] = useState(0); // -1 焦虑/煎熬 .. +1 专注/愉悦
  const [time2Attention, setTime2Attention] = useState(1); // 0 走神/放空 .. 1 高度专注
  // 时间感知3（记忆云模型）的调节项
  const [time3Density, setTime3Density] = useState(0.5); // 0 成年/重复平淡 .. 1 童年/新鲜密集
  const [time3Event, setTime3Event] = useState<MemoryEvent | null>(null); // 选中的命名事件
  const [time2PanelOpen, setTime2PanelOpen] = useState(true); // 时间感知2 控制面板显隐
  const [time3PanelOpen, setTime3PanelOpen] = useState(true); // 时间感知3 控制面板显隐
  const [hypDepth, setHypDepth] = useState(0); // 催眠深度 0 清醒 .. 1 深度
  const [hypPanelOpen, setHypPanelOpen] = useState(true); // 催眠控制面板显隐
  const [hyp2Depth, setHyp2Depth] = useState(0); // 催眠视图2 深度
  const [hyp2PanelOpen, setHyp2PanelOpen] = useState(true); // 催眠视图2 面板显隐
  const [hypColor, setHypColor] = useState('#9fc4ff'); // 催眠视图 主题色
  const [hyp2Color, setHyp2Color] = useState('#9fd9ff'); // 催眠视图2 主题色
  // 情绪星球：选中的情绪 + 程度
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionId | null>(null);
  const [emotionIntensity, setEmotionIntensity] = useState(0.5);

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
      description: '探索情绪、记忆与年龄如何扭曲你的主观时间',
      icon: '⏰',
      color: '#A78BFA',
    },
    {
      id: 'time2' as VisualizationType,
      name: '时间感知2',
      description: '管道模型：看情绪与注意力如何实时扭曲「当下」的时间流速',
      icon: '🌀',
      color: '#5BD1C9',
    },
    {
      id: 'time3' as VisualizationType,
      name: '时间感知3',
      description: '记忆云模型：事件密度如何决定「回忆里」的时间长短',
      icon: '🌐',
      color: '#9FB4FF',
    },
    {
      id: 'hypnosis' as VisualizationType,
      name: '催眠视图',
      description: '意识透镜模型：注意力聚焦如何打开内在意象空间',
      icon: '🧠',
      color: '#BFE9FF',
    },
    {
      id: 'hypnosis2' as VisualizationType,
      name: '催眠视图2',
      description: '意识河流模型：时间线催眠，沿河漫游唤醒记忆意象',
      icon: '🌊',
      color: '#9FD9FF',
    },
  ];

  const emotions = [
    { id: 'happy', label: '快乐', emoji: '😊', color: '#FFD93D' },
    { id: 'calm', label: '平静', emoji: '😌', color: '#6BCB77' },
    { id: 'excited', label: '兴奋', emoji: '🤩', color: '#FF6B6B' },
    { id: 'sad', label: '悲伤', emoji: '😢', color: '#4D96FF' },
    { id: 'peaceful', label: '宁静', emoji: '🧘', color: '#A78BFA' },
    { id: 'energetic', label: '活力', emoji: '⚡', color: '#F97316' },
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
              '时间感知不是看钟表读数字，而是大脑整合感官、记忆与注意力后"编织"出的主观体验。它没有单一中枢，由基底神经节、小脑、前额叶等多个脑区协作完成，并强烈受情绪、记忆量与年龄影响。'}
            {selectedViz === 'time2' &&
              '「当下」的主观时间流速由内部时钟模型决定：情绪与注意力会扭曲它。形状畸变比单纯快慢更重要——焦虑时管道膨胀褶皱（时间被拉长），专注愉悦时收窄顺滑（时光飞逝），走神时管道断点虚化。下方灰色细管代表客观匀速时间，可作对照。'}
            {selectedViz === 'time3' &&
              '回忆里的时间不是按时长，而是按事件数量（记忆痕迹理论）。新鲜事件多的时间段会生成大量节点、占很大体积，回想起来感觉很长；平淡重复的日常被压缩成一小块光滑球体，一晃而过。这解释了童年一年很长、成年一年飞快。'}
            {selectedViz === 'hypnosis' &&
              '催眠不是被控制，而是注意力的重新分配：外部噪音被过滤、焦点收拢、内在想象空间被打开。意识透镜模型分三层——外部干扰、意识空间、内在意象（DMN），并对应注意力收缩、前额叶抑制与默认模式网络激活。'}
            {selectedViz === 'hypnosis2' &&
              '时间线催眠的具象化：一条河流代表意识。清醒时河面波涛多、河岸干扰侵入；催眠深化时水面渐平、干扰淡出、河底记忆节点浮现增亮（DMN 激活），可沿河向过去漫游观察记忆意象。'}
          </p>
        </div>
      </div>

      {/* 右侧3D展示区域 */}
      <div className="flex-1 flex flex-col">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          {selectedViz === 'emotion' && (
            <div className="w-full h-full relative bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
              <PsychologyScene selectedEmotion={selectedEmotion} intensity={emotionIntensity} />
              {selectedEmotion && (
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl w-60">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">
                      🌟 {emotions.find((e) => e.id === selectedEmotion)?.label}
                    </h3>
                    <button
                      onClick={() => setSelectedEmotion(null)}
                      className="text-xs text-gray-300 hover:text-white underline"
                    >
                      返回星系
                    </button>
                  </div>
                  <label className="text-white text-sm mb-2 block">整体强度</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={emotionIntensity}
                    onChange={(e) => setEmotionIntensity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-300 text-xs mt-2">
                    数颗「{emotions.find((e) => e.id === selectedEmotion)?.label}」星球以不同色调散落分布；滑块缩放整组大小。
                  </p>
                </div>
              )}
            </div>
          )}
          {selectedViz === 'flow' && (
            <div className="w-full h-full relative bg-gradient-to-br from-blue-900 via-teal-900 to-green-900">
              <Canvas camera={{ position: [0, 3.2, 9.5], fov: 58 }}>
                <FlowStateVisualization frequency={flowFrequency} hue={flowHue} />
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

              {/* 心流海面调节面板 */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                <h3 className="text-white font-semibold mb-3">🌊 心流海面</h3>
                <div className="w-48 space-y-4">
                  <div>
                    <label className="text-white text-sm mb-2 block">波动频率</label>
                    <input
                      type="range"
                      min="0.2"
                      max="3"
                      step="0.1"
                      value={flowFrequency}
                      onChange={(e) => setFlowFrequency(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      当前: {flowFrequency.toFixed(1)}x
                      {flowFrequency < 0.6 ? '（缓慢涌动）' :
                       flowFrequency > 1.8 ? '（急促翻涌）' : '（自然起伏）'}
                    </p>
                  </div>

                  <div>
                    <label className="text-white text-sm mb-2 block">海水颜色</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={flowHue}
                      onChange={(e) => setFlowHue(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-white/30"
                        style={{
                          backgroundColor: `hsl(${(0.52 + flowHue) * 360}, 62%, 50%)`
                        }}
                      />
                      <p className="text-gray-300 text-xs">
                        {flowHue < 0.12 ? '青蓝海水' :
                         flowHue < 0.3 ? '碧绿海水' :
                         flowHue < 0.5 ? '深蓝海水' :
                         flowHue < 0.72 ? '紫罗兰海水' :
                         flowHue < 0.88 ? '暖暮海水' : '青蓝海水'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
                    {stressLevel >= 0.9 ? '🔥 极限压力 - 地表裂开岩浆，余烬冲天' :
                     stressLevel > 0.7 ? '⚠️ 高压力 - 山脉赤红，余烬升腾' :
                     stressLevel > 0.4 ? '⚡ 中等压力 - 山脉橙黄，浮尘飘动' :
                     '😌 低压力 - 山脉翠绿，微尘平静'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {selectedViz === 'time' && (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900">
              <Canvas camera={{ position: [0, 3, 12], fov: 60 }}>
                <TimePerception mood={timeMood} memoryDensity={timeMemory} age={timeAge} />
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

              {/* 显隐切换按钮（常驻，避免面板遮住图形） */}
              <button
                onClick={() => setShowTimeUI(v => !v)}
                className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full hover:bg-black/70 transition-colors"
              >
                {showTimeUI ? '🙈 隐藏面板' : '👁️ 显示面板'}
              </button>

              {showTimeUI && (<>
              {/* 时间感知控制面板 */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                <h3 className="text-white font-semibold mb-3">⏰ 时间感知</h3>
                <div className="w-56 space-y-4">
                  <div>
                    <label className="text-white text-sm mb-2 block">情绪状态</label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={timeMood}
                      onChange={(e) => setTimeMood(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      当前: {timeMood < -0.3 ? '😰 焦虑/无聊（时间凝滞）' :
                             timeMood > 0.3 ? '😊 快乐/专注（时光飞逝）' : '😐 平静'}
                    </p>
                  </div>
                  <div>
                    <label className="text-white text-sm mb-2 block">记忆密度</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={timeMemory}
                      onChange={(e) => setTimeMemory(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      当前: {timeMemory < 0.3 ? '单调重复（回忆短暂）' :
                             timeMemory > 0.7 ? '充满新鲜（回忆漫长）' : '适中'}
                    </p>
                  </div>
                  <div>
                    <label className="text-white text-sm mb-2 block">年龄</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={timeAge}
                      onChange={(e) => setTimeAge(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      当前: {timeAge < 0.3 ? '青少年' : timeAge > 0.7 ? '老年（一年比一年快）' : '中年'}
                    </p>
                  </div>
                  {(() => {
                    const speed = (0.35 + (timeMood + 1) * 0.775) * (1 + timeAge * 1.2);
                    return (
                      <div className="pt-1 text-center border-t border-white/10">
                        <p className="text-white text-sm mt-2">
                          主观时间 <span className="font-bold text-yellow-300">×{speed.toFixed(2)}</span>
                        </p>
                        <p className="text-gray-300 text-xs mt-1">
                          {speed > 1.3 ? '⏩ 主观比客观走得快' :
                           speed < 0.8 ? '⏳ 主观比客观走得慢' : '🕰️ 大致同步'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 脑区网络图例 */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-xl">
                <h4 className="text-white text-xs font-semibold mb-2">🧠 分布式计时网络</h4>
                <div className="space-y-1">
                  {[
                    ['基底神经节', '#A78BFA'],
                    ['小脑', '#6BCB77'],
                    ['前额叶', '#FFD93D'],
                    ['下丘脑SCN', '#4D96FF'],
                    ['颞上回', '#FF6B6B'],
                  ].map(([n, c]) => (
                    <div key={n} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                      <span className="text-gray-200 text-xs">{n}</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-400 text-[10px] mt-2 leading-tight">
                  大脑没有单一「时钟」，靠多个脑区协作计时
                </p>
              </div>
              </>)}
            </div>
          )}

          {selectedViz === 'hypnosis' && (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
              <Canvas camera={{ position: [0, 1, 13], fov: 55 }}>
                <HypnosisVisualization depth={hypDepth} color={hypColor} />
                <OrbitControls enableZoom enablePan enableRotate zoomSpeed={0.6} panSpeed={0.5} rotateSpeed={0.4} />
                <ambientLight intensity={0.5} />
                <pointLight position={[8, 8, 8]} intensity={0.5} />
              </Canvas>

              {/* 控制面板（可隐藏） */}
              {hypPanelOpen ? (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">🧠 意识透镜</h3>
                  <button
                    onClick={() => setHypPanelOpen(false)}
                    className="text-gray-300 hover:text-white text-xs"
                  >
                    隐藏 ▸
                  </button>
                </div>
                <p className="text-gray-300 text-xs mb-3 max-w-[15rem]">
                  催眠是注意力的重新分配，不是控制；你始终保有内在空间的自主权，隐蔽观察者一直在场。
                </p>
                <div className="w-60 space-y-3">
                  <div>
                    <label className="text-white text-sm mb-2 block">催眠深度</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={hypDepth}
                      onChange={(e) => setHypDepth(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      {hypDepth < 0.15 ? '🙂 清醒（焦点分散·评判活跃）' :
                       hypDepth < 0.45 ? '🌊 导入（收拢焦点·噪音淡出）' :
                       hypDepth < 0.8 ? '🔆 深化（记忆云亮起·前额叶调暗）' : '🌌 深度催眠（漫游内在意象）'}
                    </p>
                  </div>
                  <div>
                    <label className="text-white text-sm mb-2 block">主题颜色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hypColor}
                        onChange={(e) => setHypColor(e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={hypColor}
                        onChange={(e) => setHypColor(e.target.value)}
                        className="text-white text-xs w-20 bg-white/10 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setHypDepth(0)}
                    className="w-full bg-white/15 hover:bg-white/25 text-white text-sm py-2 rounded-lg"
                  >
                    ⏹ 唤醒（回到清醒）
                  </button>
                  <p className="text-gray-400 text-[10px] leading-tight">随时可一键唤醒，呼应催眠的自主选择权</p>
                </div>
              </div>
              ) : (
                <button
                  onClick={() => setHypPanelOpen(true)}
                  className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-xl text-white text-sm hover:bg-black/70"
                >
                  ⚙ 配置
                </button>
              )}
            </div>
          )}

          {selectedViz === 'hypnosis2' && (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
              <Canvas camera={{ position: [0, 7, 22], fov: 55 }}>
                <HypnosisRiverVisualization depth={hyp2Depth} color={hyp2Color} />
                <OrbitControls enableZoom enablePan enableRotate zoomSpeed={0.6} panSpeed={0.5} rotateSpeed={0.4} />
                <ambientLight intensity={0.5} />
                <pointLight position={[8, 10, 10]} intensity={0.5} />
              </Canvas>

              {/* 控制面板（可隐藏） */}
              {hyp2PanelOpen ? (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">🌊 意识河流</h3>
                  <button
                    onClick={() => setHyp2PanelOpen(false)}
                    className="text-gray-300 hover:text-white text-xs"
                  >
                    隐藏 ▸
                  </button>
                </div>
                <p className="text-gray-300 text-xs mb-3 max-w-[15rem]">
                  催眠不是被控制，而是注意力的重新分配：水面平静、河岸干扰淡出、河底记忆浮现。
                </p>
                <div className="w-60 space-y-3">
                  <div>
                    <label className="text-white text-sm mb-2 block">催眠深度</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={hyp2Depth}
                      onChange={(e) => setHyp2Depth(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      {hyp2Depth < 0.15 ? '🙂 清醒（波涛多·干扰侵入）' :
                       hyp2Depth < 0.45 ? '🌊 导入（水面平缓·干扰淡出）' :
                       hyp2Depth < 0.8 ? '🔆 深化（河底记忆浮现）' : '🌌 深度催眠（沿河漫游记忆）'}
                    </p>
                  </div>
                  <div>
                    <label className="text-white text-sm mb-2 block">主题颜色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hyp2Color}
                        onChange={(e) => setHyp2Color(e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={hyp2Color}
                        onChange={(e) => setHyp2Color(e.target.value)}
                        className="text-white text-xs w-20 bg-white/10 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setHyp2Depth(0)}
                    className="w-full bg-white/15 hover:bg-white/25 text-white text-sm py-2 rounded-lg"
                  >
                    ⏹ 唤醒（回到清醒）
                  </button>
                  <p className="text-gray-400 text-[10px] leading-tight">随时可一键唤醒，呼应催眠的自主选择权</p>
                </div>
              </div>
              ) : (
                <button
                  onClick={() => setHyp2PanelOpen(true)}
                  className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-xl text-white text-sm hover:bg-black/70"
                >
                  ⚙ 配置
                </button>
              )}
            </div>
          )}

          {selectedViz === 'time2' && (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
              <Canvas camera={{ position: [0, 1.5, 13], fov: 60 }}>
                <TimePerception2 mood={time2Mood} attention={time2Attention} />
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  zoomSpeed={0.6}
                  panSpeed={0.5}
                  rotateSpeed={0.4}
                />
              </Canvas>

              {/* 控制面板（可隐藏） */}
              {time2PanelOpen ? (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">🌀 时间管道</h3>
                  <button
                    onClick={() => setTime2PanelOpen(false)}
                    className="text-gray-300 hover:text-white text-xs"
                  >
                    隐藏 ▸
                  </button>
                </div>
                <div className="w-56 space-y-4">
                  <div>
                    <label className="text-white text-sm mb-2 block">情绪状态</label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={time2Mood}
                      onChange={(e) => setTime2Mood(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      {time2Mood < -0.3 ? '😰 焦虑/煎熬（管道膨胀·时间拉长）' :
                       time2Mood > 0.3 ? '😊 专注/愉悦（管道收窄·时光飞逝）' : '😐 平静'}
                    </p>
                  </div>
                  <div>
                    <label className="text-white text-sm mb-2 block">注意力</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={time2Attention}
                      onChange={(e) => setTime2Attention(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      {time2Attention < 0.3 ? '😵 走神/放空（断点·虚化·粒子稀疏）' :
                       time2Attention > 0.7 ? '🎯 高度专注（连续·密集脉冲）' : '🙂 一般'}
                    </p>
                  </div>
                </div>
              </div>
              ) : (
                <button
                  onClick={() => setTime2PanelOpen(true)}
                  className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-xl text-white text-sm hover:bg-black/70"
                >
                  ⚙ 配置
                </button>
              )}

              {/* 图例 */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-xl">
                <h4 className="text-white text-xs font-semibold mb-2">🧭 颜色 / 形态含义</h4>
                <div className="space-y-1">
                  {[
                    ['青/蓝 平滑管', '#5BD1C9'],
                    ['红 膨胀褶皱', '#FF6B6B'],
                    ['灰细管（客观）', '#8b93a7'],
                  ].map(([n, c]) => (
                    <div key={n} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                      <span className="text-gray-200 text-xs">{n}</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-400 text-[10px] mt-2 leading-tight">
                  形状畸变第一位，流速第二位
                </p>
              </div>
            </div>
          )}

          {selectedViz === 'time3' && (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
              <Canvas camera={{ position: [0, 2, 12], fov: 60 }}>
                <TimePerception3
                  density={time3Density}
                  selectedEventId={time3Event?.id ?? null}
                  onSelectEvent={setTime3Event}
                />
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  zoomSpeed={0.6}
                  panSpeed={0.5}
                  rotateSpeed={0.4}
                />
                <ambientLight intensity={0.5} />
                <pointLight position={[8, 8, 8]} intensity={0.6} />
                <pointLight position={[-8, -6, -4]} intensity={0.3} />
              </Canvas>

              {/* 控制面板（可隐藏） */}
              {time3PanelOpen ? (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">🌐 记忆时间云</h3>
                  <button
                    onClick={() => setTime3PanelOpen(false)}
                    className="text-gray-300 hover:text-white text-xs"
                  >
                    隐藏 ▸
                  </button>
                </div>
                <p className="text-gray-300 text-xs mb-3">👆 点击发光的「命名事件球」可查看该事件的回忆描述</p>
                <div className="w-56 space-y-4">
                  <div>
                    <label className="text-white text-sm mb-2 block">事件密度 · 人生阶段</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={time3Density}
                      onChange={(e) => setTime3Density(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-300 text-xs mt-1">
                      {time3Density < 0.2 ? '成年·重复平淡（小球·一晃而过）' :
                       time3Density > 0.8 ? '童年·新鲜密集（大云·回忆漫长）' : '适中'}
                    </p>
                  </div>
                  {(() => {
                    const months = (6 + time3Density * 130);
                    return (
                      <div className="pt-1 text-center border-t border-white/10">
                        <p className="text-white text-sm mt-2">
                          这段日子留下 <span className="font-bold text-blue-300">{months.toFixed(0)}</span> 个记忆节点
                        </p>
                        <p className="text-gray-300 text-xs mt-1">
                          {time3Density > 0.6 ? '📈 回想起来那段时间很长' :
                           time3Density < 0.3 ? '⚡ 回想起来一晃而过' : '🕰️ 中等长度'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
              ) : (
                <button
                  onClick={() => setTime3PanelOpen(true)}
                  className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-xl text-white text-sm hover:bg-black/70"
                >
                  ⚙ 配置
                </button>
              )}

              {/* 图例 */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-xl">
                <h4 className="text-white text-xs font-semibold mb-2">🧭 节点含义</h4>
                <div className="space-y-1">
                  {[
                    ['大发光球 = 重大事件', '#bcd0ff'],
                    ['微小球 = 普通小事', '#8fa6e0'],
                    ['连线 = 记忆关联', '#7fd4ff'],
                    ['半透明外壳 = 平淡日常', '#9fb4ff'],
                  ].map(([n, c]) => (
                    <div key={n} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                      <span className="text-gray-200 text-xs">{n}</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-400 text-[10px] mt-2 leading-tight">
                  回忆时长 = 事件数量，而非钟表时长
                </p>
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
                  onClick={() =>
                    setSelectedEmotion(
                      selectedEmotion === emotion.id ? null : (emotion.id as EmotionId)
                    )
                  }
                  className={`flex-shrink-0 p-3 rounded-lg transition-colors cursor-pointer border-2 ${
                    selectedEmotion === emotion.id
                      ? 'bg-white/25 border-white/60'
                      : 'bg-white/10 border-transparent hover:bg-white/20'
                  }`}
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
            <h3 className="text-white font-semibold mb-2">时间感知的真相</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded bg-purple-500/20">
                <p className="text-purple-400 font-medium">情绪扭曲</p>
                <p className="text-gray-300 text-xs mt-1">快乐/专注→时光飞逝；焦虑/无聊→度秒如年</p>
              </div>
              <div className="p-2 rounded bg-blue-500/20">
                <p className="text-blue-400 font-medium">记忆密度</p>
                <p className="text-gray-300 text-xs mt-1">新鲜经历多→回忆漫长；生活 Routine→飞快</p>
              </div>
              <div className="p-2 rounded bg-pink-500/20">
                <p className="text-pink-400 font-medium">年龄加速</p>
                <p className="text-gray-300 text-xs mt-1">年纪越大，一年比一年过得快</p>
              </div>
            </div>
          </div>
        )}

        {selectedViz === 'time2' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-2">管道模型 · 内部时钟模型</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded bg-teal-500/20">
                <p className="text-teal-400 font-medium">专注/愉悦</p>
                <p className="text-gray-300 text-xs mt-1">管道收窄、顺滑、流动快 → 主观时间压缩</p>
              </div>
              <div className="p-2 rounded bg-red-500/20">
                <p className="text-red-400 font-medium">焦虑/煎熬</p>
                <p className="text-gray-300 text-xs mt-1">管道膨胀、褶皱、流动慢 → 主观时间拉长</p>
              </div>
              <div className="p-2 rounded bg-gray-500/20">
                <p className="text-gray-300 font-medium">走神/放空</p>
                <p className="text-gray-300 text-xs mt-1">断点、半透明、粒子稀疏 → 采样中断</p>
              </div>
            </div>
          </div>
        )}

        {selectedViz === 'time3' && time3Event && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-20 bg-black/70 backdrop-blur-md border border-white/25 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-start gap-3">
              <h4 className="text-white font-semibold text-base">{time3Event.title}</h4>
              <button
                onClick={() => setTime3Event(null)}
                className="text-gray-300 hover:text-white text-sm leading-none shrink-0"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">📅 {time3Event.date}</p>
            <p className="text-gray-200 text-sm mt-2 leading-relaxed">{time3Event.desc}</p>
          </div>
        )}

        {selectedViz === 'time3' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-2">记忆云模型 · 记忆痕迹理论</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded bg-blue-500/20">
                <p className="text-blue-400 font-medium">充满新鲜</p>
                <p className="text-gray-300 text-xs mt-1">大量节点、大体积 → 回忆漫长</p>
              </div>
              <div className="p-2 rounded bg-purple-500/20">
                <p className="text-purple-400 font-medium">平淡重复</p>
                <p className="text-gray-300 text-xs mt-1">节点极少、压缩小球 → 一晃而过</p>
              </div>
              <div className="p-2 rounded bg-pink-500/20">
                <p className="text-pink-400 font-medium">童年 vs 成年</p>
                <p className="text-gray-300 text-xs mt-1">新事件密度高→年长；重复→年飞快</p>
              </div>
            </div>
          </div>
        )}

        {selectedViz === 'hypnosis' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-2">意识透镜 · 三层结构</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded bg-slate-500/20">
                <p className="text-slate-300 font-medium">外部干扰层</p>
                <p className="text-gray-300 text-xs mt-1">灰色粒子 = 环境噪音；深化时淡出、被挡在意识空间外</p>
              </div>
              <div className="p-2 rounded bg-cyan-500/20">
                <p className="text-cyan-300 font-medium">意识空间 + 透镜</p>
                <p className="text-gray-300 text-xs mt-1">半透明球体 = 全部意识；柔光透镜 = 注意力聚焦</p>
              </div>
              <div className="p-2 rounded bg-indigo-500/20">
                <p className="text-indigo-300 font-medium">内在意象（DMN）</p>
                <p className="text-gray-300 text-xs mt-1">内部光点 = 思绪/记忆；深化时收拢增亮</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2">前额叶评判光幕随深化调暗但保留微光（隐蔽观察者始终在场）——催眠是注意力的重新分配，不是被控制。</p>
          </div>
        )}

        {selectedViz === 'hypnosis2' && (
          <div className="h-32 bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <h3 className="text-white font-semibold mb-2">意识河流 · 时间线催眠</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded bg-slate-500/20">
                <p className="text-slate-300 font-medium">外部河岸干扰</p>
                <p className="text-gray-300 text-xs mt-1">清醒时河面波涛多、岸上波纹侵入；深化时水面平静、干扰淡出</p>
              </div>
              <div className="p-2 rounded bg-cyan-500/20">
                <p className="text-cyan-300 font-medium">河流 = 意识</p>
                <p className="text-gray-300 text-xs mt-1">沿河向过去延伸，可漫游观察记忆意象</p>
              </div>
              <div className="p-2 rounded bg-indigo-500/20">
                <p className="text-indigo-300 font-medium">河底记忆节点</p>
                <p className="text-gray-300 text-xs mt-1">深化时河底记忆节点浮现增亮（DMN 激活）</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2">前额叶评判光幕随深化调暗但保留微光（隐蔽观察者始终在场）——催眠是注意力的重新分配，不是被控制。</p>
          </div>
        )}
      </div>
    </div>
  );
}
