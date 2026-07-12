'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import dynamic from 'next/dynamic';
import { SpiralEmotionScene, SpiralEmotionConfig, emotionPresets, SpiralIntensity } from '@/components/psychology-3d/SpiralEmotion';

// 动态导入3D组件
const SpiralScene = dynamic(
  () => import('@/components/psychology-3d/SpiralEmotion').then(mod => ({
    default: mod.SpiralEmotionScene
  })),
  { ssr: false }
);

type VisualizationMode = 'input' | 'result';

// 情绪分析结果
interface EmotionAnalysis {
  intensity: SpiralIntensity;
  keywords: string[];
  interpretation: string;
  suggestions: string[];
}

// 文本情绪分析（简化版关键词匹配）
function analyzeEmotionText(text: string): EmotionAnalysis {
  const lowerText = text.toLowerCase();

  // 关键词词典
  const keywords = {
    mild: ['有点纠结', '偶尔想', '不太确定', '轻微', '一点点', '有时'],
    moderate: ['反复', '纠结', '难受', '想不通', '走不出', '困在', '焦虑'],
    severe: ['无法停止', '强迫', '崩溃', '窒息', '绝望', '持续', '不断循环', '痛苦']
  };

  const secondaryKeywords = {
   委屈: ['委屈', '不公平', '为什么', '凭什么'],
    恐慌: ['恐慌', '害怕', '担心', '紧张'],
    压抑: ['压抑', '憋闷', '想说不出', '无法表达'],
    自我攻击: ['都是我', '我不好', '错的', '责怪'],
    无力: ['无力', '没力气', '不想动', '提不起']
  };

  // 分析强度
  let intensity: SpiralIntensity = 'mild';
  const matchedKeywords: string[] = [];

  if (keywords.severe.some(k => lowerText.includes(k))) {
    intensity = 'severe';
    matchedKeywords.push(...keywords.severe.filter(k => lowerText.includes(k)));
  } else if (keywords.moderate.some(k => lowerText.includes(k))) {
    intensity = 'moderate';
    matchedKeywords.push(...keywords.moderate.filter(k => lowerText.includes(k)));
  } else if (keywords.mild.some(k => lowerText.includes(k))) {
    intensity = 'mild';
    matchedKeywords.push(...keywords.mild.filter(k => lowerText.includes(k)));
  }

  // 提取附属情绪
  const secondaryEmotions: string[] = [];
  Object.entries(secondaryKeywords).forEach(([emotion, words]) => {
    if (words.some(w => lowerText.includes(w))) {
      secondaryEmotions.push(emotion);
    }
  });

  // 生成解读文案
  const interpretations = {
    mild: `当前螺旋呈现浅紫灰色调，圈数较少且线条舒展。这表明你正在经历轻微的思维纠结，有一定的情绪内耗，但整体状态相对轻松。螺旋向内缓慢旋转，代表你的思绪在慢慢整理中。`,
    moderate: `当前螺旋呈现暗紫色与灰蓝交织，圈数明显增多且线条开始收紧。这表明你近期陷入了较为明显的思维反刍状态，反复在某个问题上纠结。螺旋的往复运动反映了内心的进退两难。${secondaryEmotions.length > 0 ? `检测到复合情绪：${secondaryEmotions.join('、')}。` : ''}`,
    severe: `当前螺旋呈现深灰紫色调，圈数密集且线条高度收紧，局部可见暗红色尖角。这表明你正处于严重的精神内耗状态，思维陷入高频反刍循环，自我消耗严重。${secondaryEmotions.length > 0 ? `复合情绪特征：${secondaryEmotions.join('、')}，增加了情绪的复杂性。` : ''}建议及时寻求专业心理支持。`
  };

  // 生成建议
  const suggestions = {
    mild: [
      '尝试将想法写下来，理性梳理思路',
      '进行10分钟深呼吸或冥想',
      '转移注意力，做些喜欢的事情'
    ],
    moderate: [
      '设置"思维暂停时间"，每天固定时间处理纠结',
      '练习正念，观察但不评判自己的念头',
      '与信任的朋友倾诉，获得外部视角'
    ],
    severe: [
      '强烈建议寻求专业心理咨询师帮助',
      '尝试认知行为疗法(CBT)技术',
      '建立安全出口：当思维失控时立即采取行动（如运动、听音乐）',
      '考虑专业评估是否需要心理医疗支持'
    ]
  };

  return {
    intensity,
    keywords: matchedKeywords,
    interpretation: interpretations[intensity],
    suggestions: secondaryEmotions.includes('恐慌') || secondaryEmotions.includes('自我攻击')
      ? ['⚠️ 检测到需要关注的情绪信号，建议优先处理', ...suggestions[intensity]]
      : suggestions[intensity]
  };
}

// 获取螺旋配置
function getSpiralConfig(analysis: EmotionAnalysis): SpiralEmotionConfig {
  const baseConfig = emotionPresets[analysis.intensity];

  // 根据附属情绪调整配置
  const secondaryEmotions = analysis.keywords.filter(k =>
    ['委屈', '恐慌', '压抑', '自我攻击', '无力'].some(e => k.includes(e))
  );

  return {
    ...baseConfig,
    secondaryEmotions
  };
}

export default function SpiralEmotionPage() {
  const [mode, setMode] = useState<VisualizationMode>('input');
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<EmotionAnalysis | null>(null);
  const [spiralConfig, setSpiralConfig] = useState<SpiralEmotionConfig | null>(null);

  const handleAnalyze = () => {
    if (!inputText.trim()) return;

    const emotionAnalysis = analyzeEmotionText(inputText);
    setAnalysis(emotionAnalysis);
    setSpiralConfig(getSpiralConfig(emotionAnalysis));
    setMode('result');
  };

  const handleReset = () => {
    setInputText('');
    setAnalysis(null);
    setSpiralConfig(null);
    setMode('input');
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
      {/* 左侧输入面板 */}
      <div className="w-96 bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">🌀</span>
            螺旋内耗可视化
          </h1>
          <p className="text-sm text-gray-300">
            通过螺旋图形可视化你的思维反刍与情绪内耗
          </p>
        </div>

        {mode === 'input' && (
          <>
            {/* 输入说明 */}
            <div className="mb-6 p-4 rounded-xl bg-purple-500/20 border border-purple-400/30">
              <h3 className="text-sm font-semibold text-white mb-2">💡 如何使用</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                描述你最近的思维状态，比如：
              </p>
              <ul className="text-xs text-gray-300 mt-2 space-y-1 list-disc list-inside">
                <li>"这件事我已经想了好几天了，越想越难受"</li>
                <li>"总是忍不住反复想同一个问题"</li>
                <li>"感觉自己陷入了一个思维怪圈"</li>
              </ul>
            </div>

            {/* 文本输入 */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-white mb-2 block">
                描述你的思维状态
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="说出你的想法，让螺旋帮助你看见内心的循环..."
                className="w-full h-48 p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* 分析按钮 */}
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
            >
              生成螺旋可视化
            </button>

            {/* 预设示例 */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-white mb-3">示例描述</h4>
              <div className="space-y-2">
                {[
                  { text: '有点纠结于一个决定，反复思考', label: '轻度内耗' },
                  { text: '这几天一直在想这件事，怎么都走不出来，很痛苦', label: '中度焦虑' },
                  { text: '无法停止地强迫自己想同一个问题，感觉要崩溃了，都是我的错', label: '重度反刍' }
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(example.text)}
                    className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <div className="text-xs text-gray-400 mb-1">{example.label}</div>
                    <div className="text-sm text-white line-clamp-2">{example.text}</div>
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
              className="mb-6 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
            >
              ← 重新分析
            </button>

            {/* 分析结果 */}
            <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
              <h3 className="text-sm font-semibold text-white mb-3">📊 情绪分析</h3>
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

                {analysis.keywords.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">匹配关键词</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords.map((keyword, i) => (
                        <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 螺旋解读 */}
            <div className="mb-6 p-4 rounded-xl bg-purple-500/20 border border-purple-400/30">
              <h3 className="text-sm font-semibold text-white mb-2">🌀 螺旋解读</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                {analysis.interpretation}
              </p>
            </div>

            {/* 建议措施 */}
            <div className="p-4 rounded-xl bg-blue-500/20 border border-blue-400/30">
              <h3 className="text-sm font-semibold text-white mb-2">💡 改善建议</h3>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* 右侧3D展示区域 */}
      <div className="flex-1 relative">
        {mode === 'input' && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🌀</div>
              <h2 className="text-2xl font-bold mb-2">螺旋内耗可视化</h2>
              <p className="text-gray-400">
                描述你的思维状态，生成专属的螺旋图形
              </p>
            </div>
          </div>
        )}

        {mode === 'result' && spiralConfig && (
          <>
            {/* 3D Canvas */}
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
              <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
                <SpiralScene config={spiralConfig} />
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  enableRotate={true}
                  zoomSpeed={0.6}
                  panSpeed={0.5}
                  rotateSpeed={0.4}
                  minDistance={5}
                  maxDistance={15}
                />
              </Canvas>
            </div>

            {/* 浮动信息 */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
              <p className="text-white text-sm flex items-center gap-2">
                <span className="text-xl">🌀</span>
                <span>你的内耗螺旋</span>
                <span className="text-gray-400">|</span>
                <span className={`font-semibold ${
                  spiralConfig.intensity === 'mild' ? 'text-green-400' :
                  spiralConfig.intensity === 'moderate' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {spiralConfig.intensity === 'mild' ? '轻度' :
                   spiralConfig.intensity === 'moderate' ? '中度' :
                   '重度'}
                </span>
              </p>
            </div>
          </>
        )}

        {/* 底部提示 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm">
            🖱️ 拖动旋转 | 滚轮缩放 | 右键平移
          </p>
        </div>
      </div>
    </div>
  );
}
