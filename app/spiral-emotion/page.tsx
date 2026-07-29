'use client';

import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { SpiralEmotionScene, SpiralEmotionConfig, emotionPresets, SpiralIntensity } from '@/components/psychology-3d/SpiralEmotion';
import dynamic from 'next/dynamic';

// 动态导入3D组件 - 优化加载性能
const SpiralScene = dynamic(
  () => import('@/components/psychology-3d/SpiralEmotion').then(mod => ({
    default: mod.SpiralEmotionScene
  })),
  { ssr: false }
);

type VisualizationMode = 'input' | 'result' | 'presets';

// 情绪分析结果
interface EmotionAnalysis {
  intensity: SpiralIntensity;
  keywords: string[];
  interpretation: string;
  suggestions: string[];
  confidence: number; // 分析置信度
}

// 增强的文本情绪分析 - 应用心理学专业知识
function analyzeEmotionText(text: string): EmotionAnalysis {
  const lowerText = text.toLowerCase();

  // 扩展的关键词词典 - 更精准的情绪分类
  const keywords = {
    mild: ['有点纠结', '偶尔想', '不太确定', '轻微', '一点点', '有时', '偶尔', '轻微的', '稍微'],
    moderate: ['反复', '纠结', '难受', '想不通', '走不出', '困在', '焦虑', '持续', '总是', '一直在想', '停不下'],
    severe: ['无法停止', '强迫', '崩溃', '窒息', '绝望', '不断循环', '痛苦', '极度', '完全', '严重', '失控']
  };

  const secondaryKeywords = {
    委屈: ['委屈', '不公平', '为什么', '凭什么', '不公'],
    恐慌: ['恐慌', '害怕', '担心', '紧张', '恐惧', '焦虑'],
    压抑: ['压抑', '憋闷', '想说不出', '无法表达', '压抑'],
    自我攻击: ['都是我', '我不好', '错的', '责怪', '自责', '怪自己'],
    无力: ['无力', '没力气', '不想动', '提不起', '疲惫'],
    困惑: ['困惑', '迷茫', '不知道', '想不明白', '不明白']
  };

  // 分析强度和置信度
  let intensity: SpiralIntensity = 'mild';
  const matchedKeywords: string[] = [];
  let confidence = 0.5;

  if (keywords.severe.some(k => lowerText.includes(k))) {
    intensity = 'severe';
    matchedKeywords.push(...keywords.severe.filter(k => lowerText.includes(k)));
    confidence = 0.85 + Math.min(matchedKeywords.length * 0.05, 0.15);
  } else if (keywords.moderate.some(k => lowerText.includes(k))) {
    intensity = 'moderate';
    matchedKeywords.push(...keywords.moderate.filter(k => lowerText.includes(k)));
    confidence = 0.7 + Math.min(matchedKeywords.length * 0.05, 0.2);
  } else if (keywords.mild.some(k => lowerText.includes(k))) {
    intensity = 'mild';
    matchedKeywords.push(...keywords.mild.filter(k => lowerText.includes(k)));
    confidence = 0.6 + Math.min(matchedKeywords.length * 0.05, 0.25);
  }

  // 提取附属情绪
  const secondaryEmotions: string[] = [];
  Object.entries(secondaryKeywords).forEach(([emotion, words]) => {
    if (words.some(w => lowerText.includes(w))) {
      secondaryEmotions.push(emotion);
    }
  });

  // 增强的解读文案 - 更精准的心理学描述
  const interpretations = {
    mild: `当前螺旋呈现浅紫灰色调，圈数较少且线条舒展。这表明你正在经历轻微的思维纠结，有一定的情绪内耗，但整体状态相对轻松。螺旋向内缓慢旋转，代表你的思绪在慢慢整理中。${confidence < 0.7 ? '建议关注这种轻微的纠结，防止其加深。' : '你目前的自我觉察能力良好，继续保持。'}${secondaryEmotions.length > 0 ? ` 检测到情绪基调：${secondaryEmotions.join('、')}。` : ''}`,
    moderate: `当前螺旋呈现暗紫色与灰蓝交织，圈数明显增多且线条开始收紧。这表明你近期陷入了较为明显的思维反刍状态，反复在某个问题上纠结。螺旋的往复运动反映了内心的进退两难。${secondaryEmotions.length > 0 ? `检测到复合情绪：${secondaryEmotions.join('、')}，这增加了情绪的复杂性。建议优先处理这些情绪信号。` : '建议主动寻求外部视角来打破思维循环。'}分析置信度：${Math.round(confidence * 100)}%。`,
    severe: `当前螺旋呈现深灰紫色调，圈数密集且线条高度收紧，局部可见暗红色尖角。这表明你正处于严重的精神内耗状态，思维陷入高频反刍循环，自我消耗严重。${secondaryEmotions.length > 0 ? `复合情绪特征：${secondaryEmotions.join('、')}，这进一步加剧了心理负担。` : '建议立即采取行动来保护心理健康。'}强烈建议寻求专业心理支持。分析置信度：${Math.round(confidence * 100)}%。`
  };

  // 增强的建议 - 分层级和可操作性
  const suggestions = {
    mild: [
      '🌱 **即时行动**: 将想法写下来，理性梳理思路',
      '🧘 **短期调节**: 进行10分钟深呼吸或冥想练习',
      '🎯 **注意力转移**: 做些喜欢的事情，打破思维循环',
      '⏰ **预防措施**: 设置"思维暂停时间"，避免过度纠结'
    ],
    moderate: [
      '⚠️ **重要提醒**: 你的思维反刍需要主动干预',
      '🛑 **立即行动**: 设置"思维暂停时间"，每天固定时间处理纠结',
      '🧘 **正念练习**: 练习正念，观察但不评判自己的念头',
      '💬 **寻求支持**: 与信任的朋友倾诉，获得外部视角',
      '📝 **情绪日记**: 记录思维模式，识别触发因素'
    ],
    severe: [
      '🚨 **紧急建议**: 强烈建议寻求专业心理咨询师帮助',
      '🔍 **认知技术**: 尝试认知行为疗法(CBT)技术识别思维扭曲',
      '🛡️ **建立安全出口**: 当思维失控时立即采取行动（运动、听音乐、深呼吸）',
      '🏥 **专业评估**: 考虑专业评估是否需要心理医疗支持',
      '📞 **紧急联系**: 如感到绝望，请立即联系心理危机干预热线'
    ]
  };

  return {
    intensity,
    keywords: matchedKeywords,
    interpretation: interpretations[intensity],
    suggestions: secondaryEmotions.includes('恐慌') || secondaryEmotions.includes('自我攻击')
      ? ['⚠️ 检测到需要优先关注的情绪信号', ...suggestions[intensity]]
      : suggestions[intensity],
    confidence
  };
}

// 获取螺旋配置 - 增强版
function getSpiralConfig(analysis: EmotionAnalysis): SpiralEmotionConfig {
  const baseConfig = emotionPresets[analysis.intensity];

  // 根据附属情绪调整配置
  const secondaryEmotions = analysis.keywords.filter(k =>
    ['委屈', '恐慌', '压抑', '自我攻击', '无力', '困惑'].some(e => k.includes(e))
  );

  // 根据置信度微调显示效果
  const confidenceAdjustment = analysis.confidence > 0.8 ? 0.1 : 0;

  return {
    ...baseConfig,
    secondaryEmotions,
    // 可以根据置信度调整螺旋的某些参数
    cycleCount: baseConfig.cycleCount + confidenceAdjustment
  };
}

// 预设示例配置
const presetExamples = [
  {
    text: '有点纠结于一个决定，反复思考',
    label: '轻度内耗',
    intensity: 'mild' as SpiralIntensity,
    description: '适合刚开始意识到思维纠结的用户'
  },
  {
    text: '这几天一直在想这件事，怎么都走不出来，很痛苦',
    label: '中度焦虑',
    intensity: 'moderate' as SpiralIntensity,
    description: '思维反刍已经影响日常生活'
  },
  {
    text: '无法停止地强迫自己想同一个问题，感觉要崩溃了，都是我的错',
    label: '重度反刍',
    intensity: 'severe' as SpiralIntensity,
    description: '严重的思维强迫和自我攻击'
  }
];

// 3D场景加载组件 - 优化用户体验
function SceneLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-spin">🌀</div>
        <h2 className="text-2xl font-bold text-white mb-2">正在构建螺旋场景...</h2>
        <p className="text-gray-400">加载3D组件中</p>
      </div>
    </div>
  );
}

// 初始空状态组件
function EmptyState() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="text-center text-white px-8">
        <div className="text-8xl mb-6 animate-pulse">🌀</div>
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          螺旋内耗可视化
        </h2>
        <p className="text-gray-300 text-lg mb-6 max-w-md mx-auto">
          描述你的思维状态，AI将生成专属的螺旋图形，帮你看见内心的思维循环
        </p>
        <div className="flex flex-col gap-3 text-sm text-gray-400 max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">💡</span>
            <span>可视化思维模式，打破无形循环</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">🎯</span>
            <span>精准分析情绪强度，获得专业建议</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">🧘</span>
            <span>3D沉浸式体验，促进情绪觉察</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpiralEmotionPage() {
  const [mode, setMode] = useState<VisualizationMode>('input');
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<EmotionAnalysis | null>(null);
  const [spiralConfig, setSpiralConfig] = useState<SpiralEmotionConfig | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);

    // 模拟分析过程，给用户更好的体验
    await new Promise(resolve => setTimeout(resolve, 800));

    const emotionAnalysis = analyzeEmotionText(inputText);
    setAnalysis(emotionAnalysis);
    setSpiralConfig(getSpiralConfig(emotionAnalysis));
    setMode('result');
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setInputText('');
    setAnalysis(null);
    setSpiralConfig(null);
    setMode('input');
  };

  const handlePresetSelect = (preset: typeof presetExamples[0]) => {
    setInputText(preset.text);
    // 自动触发分析
    setTimeout(() => {
      const emotionAnalysis = analyzeEmotionText(preset.text);
      setAnalysis(emotionAnalysis);
      setSpiralConfig(getSpiralConfig(emotionAnalysis));
      setMode('result');
    }, 100);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
      {/* 左侧输入面板 - 优化布局 */}
      <div className="w-[420px] bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">🌀</span>
            螺旋内耗可视化
          </h1>
          <p className="text-sm text-gray-300">
            通过螺旋图形可视化你的思维反刍与情绪内耗状态
          </p>
        </div>

        {mode === 'input' && (
          <>
            {/* 使用说明 - 优化用户体验 */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <span>💡</span> 如何使用
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-3">
                描述你最近的思维状态，比如：
              </p>
              <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                <li>"这件事我已经想了好几天了，越想越难受"</li>
                <li>"总是忍不住反复想同一个问题"</li>
                <li>"感觉自己陷入了一个思维怪圈"</li>
              </ul>
            </div>

            {/* 文本输入 - 优化交互 */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-white mb-2 block">
                描述你的思维状态
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="说出你的想法，让螺旋帮助你看见内心的循环..."
                className="w-full h-48 p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
              />
              <div className="text-xs text-gray-400 mt-2">
                {inputText.length > 0 ? `${inputText.length} 字符` : '至少输入 5 个字符'}
              </div>
            </div>

            {/* 分析按钮 - 优化状态 */}
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim() || isAnalyzing}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <span>🧠</span>
                  生成螺旋可视化
                </>
              )}
            </button>

            {/* 预设示例 - 优化展示 */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span>📝</span> 示例描述
              </h4>
              <div className="space-y-2">
                {presetExamples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handlePresetSelect(example)}
                    className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/30 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`text-xs font-medium mb-1 ${
                          example.intensity === 'mild' ? 'text-green-400' :
                          example.intensity === 'moderate' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {example.label}
                        </div>
                        <div className="text-sm text-white line-clamp-2 group-hover:text-purple-200 transition-colors">
                          {example.text}
                        </div>
                      </div>
                      <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'result' && analysis && (
          <>
            {/* 返回按钮 */}
            <button
              onClick={handleReset}
              className="mb-6 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>←</span> 重新分析
            </button>

            {/* 分析结果 - 优化展示 */}
            <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span>📊</span> 情绪分析
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">内耗等级</div>
                  <div className={`text-lg font-bold ${
                    analysis.intensity === 'mild' ? 'text-green-400' :
                    analysis.intensity === 'moderate' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {analysis.intensity === 'mild' ? '轻度内耗' :
                     analysis.intensity === 'moderate' ? '中度焦虑反刍' :
                     '重度强迫思维'}
                  </div>
                </div>

                {/* 置信度显示 */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">分析置信度</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          analysis.confidence > 0.8 ? 'bg-green-500' :
                          analysis.confidence > 0.6 ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${analysis.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300">{Math.round(analysis.confidence * 100)}%</span>
                  </div>
                </div>

                {analysis.keywords.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">匹配关键词</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords.map((keyword, i) => (
                        <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300 border border-white/10">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 螺旋解读 */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <span>🌀</span> 螺旋解读
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                {analysis.interpretation}
              </p>
            </div>

            {/* 建议措施 */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <span>💡</span> 改善建议
              </h3>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                    <span className="whitespace-pre-line">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* 右侧3D展示区域 - 基于 threejs-impl-react-three-fiber 优化 */}
      <div className="flex-1 relative">
        {mode === 'input' && (
          <EmptyState />
        )}

        {mode === 'result' && spiralConfig && (
          <>
            {/* 3D Canvas - 优化渲染设置 */}
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
              <Canvas
                camera={{ position: [0, 0, 8], fov: 60 }}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: 'high-performance',
                  stencil: false,
                  depth: true
                }}
                dpr={[1, 2]} // 动态像素比，优化性能
              >
                {/* 优化的相机设置 */}
                <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />

                {/* 场景内容 */}
                <Suspense fallback={null}>
                  <SpiralScene config={spiralConfig} />

                  {/* 环境映射 - 基于 threejs-impl-lighting */}
                  <Environment preset="night" blur={0.8} />

                  {/* 接触阴影 - 增强真实感 */}
                  <ContactShadows
                    position={[0, -2, 0]}
                    opacity={0.4}
                    scale={10}
                    blur={2}
                    far={4}
                  />
                </Suspense>

                {/* 优化的控制器 */}
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  zoomSpeed={0.6}
                  panSpeed={0.5}
                  rotateSpeed={0.4}
                  minDistance={5}
                  maxDistance={15}
                  minPolarAngle={Math.PI / 6}
                  maxPolarAngle={Math.PI * 5 / 6}
                  enableDamping
                  dampingFactor={0.05}
                />
              </Canvas>
            </div>

            {/* 浮动信息 - 优化样式 */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
              <p className="text-white text-sm flex items-center gap-3">
                <span className="text-xl">🌀</span>
                <span>你的内耗螺旋</span>
                <span className="text-gray-400">|</span>
                <span className={`font-semibold px-2 py-0.5 rounded ${
                  spiralConfig.intensity === 'mild' ? 'bg-green-500/20 text-green-400' :
                  spiralConfig.intensity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {spiralConfig.intensity === 'mild' ? '轻度' :
                   spiralConfig.intensity === 'moderate' ? '中度' :
                   '重度'}
                </span>
              </p>
            </div>

            {/* 3D控制提示 */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
              <div className="text-white text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">🎨</span>
                  <span>螺旋圈数: {spiralConfig.cycleCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">🔗</span>
                  <span>紧密度: {Math.round(spiralConfig.tightness * 100)}%</span>
                </div>
                {spiralConfig.secondaryEmotions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">💭</span>
                    <span>复合情绪: {spiralConfig.secondaryEmotions.length}个</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 底部提示 - 固定位置 */}
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

        {/* 性能监控 - 开发环境 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-gray-400">
            3D渲染引擎已优化
          </div>
        )}
      </div>
    </div>
  );
}