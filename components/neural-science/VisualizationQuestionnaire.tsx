'use client';

import { useState } from 'react';

interface QuestionnaireProps {
  onComplete: (preferences: VisualizationPreferences) => void;
}

export interface VisualizationPreferences {
  dataDensity: 'minimal' | 'moderate' | 'dense';
  visualStyle: 'scientific' | 'artistic' | 'futuristic';
  animationIntensity: 'calm' | 'dynamic' | 'energetic';
  colorTheme: 'cool' | 'warm' | 'vibrant' | 'monochrome';
  interactionLevel: 'passive' | 'exploratory' | 'interactive';
  complexity: 'simple' | 'balanced' | 'complex';
}

const questions = [
  {
    id: 'dataDensity',
    title: '📊 数据密度偏好',
    description: '您希望看到多少数据点？',
    options: [
      { value: 'minimal', label: '极简风格', desc: '少量关键数据点，清晰易懂' },
      { value: 'moderate', label: '适中密度', desc: '平衡的数据展示，适度的信息密度' },
      { value: 'dense', label: '丰富数据', desc: '大量数据点，展示完整的数据景观' }
    ]
  },
  {
    id: 'visualStyle',
    title: '🎨 视觉风格偏好',
    description: '您喜欢什么样的视觉呈现？',
    options: [
      { value: 'scientific', label: '科学严谨', desc: '精确、清晰、学术化的视觉风格' },
      { value: 'artistic', label: '艺术美感', desc: '注重美感、流畅、富有艺术感' },
      { value: 'futuristic', label: '未来科技', desc: '现代、科技感、赛博朋克风格' }
    ]
  },
  {
    id: 'animationIntensity',
    title: '🎬 动画强度偏好',
    description: '您希望动画效果如何？',
    options: [
      { value: 'calm', label: '平静柔和', desc: '缓慢、平滑、冥想般的动画' },
      { value: 'dynamic', label: '动态平衡', desc: '适度的运动，保持视觉舒适' },
      { value: 'energetic', label: '活力动感', desc: '快速、强烈、充满能量的动画' }
    ]
  },
  {
    id: 'colorTheme',
    title: '🌈 颜色主题偏好',
    description: '您偏好什么色调？',
    options: [
      { value: 'cool', label: '冷色调', desc: '蓝色、紫色、绿色，冷静专业' },
      { value: 'warm', label: '暖色调', desc: '红色、橙色、黄色，温暖活力' },
      { value: 'vibrant', label: '鲜艳多彩', desc: '丰富色彩，活力四射' },
      { value: 'monochrome', label: '单色极简', desc: '黑白灰为主，极简高级' }
    ]
  },
  {
    id: 'interactionLevel',
    title: '🖱️ 交互程度偏好',
    description: '您希望如何与数据互动？',
    options: [
      { value: 'passive', label: '被动观赏', desc: '自动播放，无需手动操作' },
      { value: 'exploratory', label: '自由探索', desc: '可以旋转、缩放观察不同角度' },
      { value: 'interactive', label: '深度交互', desc: '点击、悬停获取详细信息' }
    ]
  },
  {
    id: 'complexity',
    title: '🧠 复杂度偏好',
    description: '您希望展示的信息深度？',
    options: [
      { value: 'simple', label: '简单直观', desc: '只显示核心信息，一目了然' },
      { value: 'balanced', label: '平衡丰富', desc: '适度的信息层次和细节' },
      { value: 'complex', label: '复杂详尽', desc: '展示所有可用的数据和指标' }
    ]
  }
];

export function VisualizationQuestionnaire({ onComplete }: QuestionnaireProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<VisualizationPreferences>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setIsCompleted(true);
      setTimeout(() => onComplete(newAnswers as VisualizationPreferences), 1000);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (isCompleted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-purple-900 to-pink-900 p-8 rounded-2xl max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="text-2xl font-bold text-white mb-2">正在生成您的专属可视化...</h2>
          <p className="text-purple-200">根据您的偏好定制神经状态空间</p>
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 p-6 rounded-2xl max-w-2xl w-full border border-purple-500/30">
        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-purple-300 mb-2">
            <span>问题 {currentQuestion + 1} / {questions.length}</span>
            <span>{Math.round(progress)}% 完成</span>
          </div>
          <div className="w-full bg-purple-900/50 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* 问题 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{currentQ.title}</h2>
          <p className="text-purple-200">{currentQ.description}</p>
        </div>

        {/* 选项 */}
        <div className="space-y-3 mb-6">
          {currentQ.options.map((option, index) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className="w-full text-left p-4 rounded-xl border-2 border-purple-500/30 bg-purple-900/20 hover:bg-purple-800/40 hover:border-purple-400 transition-all duration-300 group"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-purple-400 group-hover:border-purple-300 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-3 h-3 rounded-full bg-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div>
                  <div className="text-white font-medium group-hover:text-purple-200">{option.label}</div>
                  <div className="text-sm text-purple-300 mt-1">{option.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 导航 */}
        {currentQuestion > 0 && (
          <button
            onClick={handleBack}
            className="text-purple-300 hover:text-purple-200 text-sm flex items-center gap-2"
          >
            <span>←</span> 返回上一题
          </button>
        )}
      </div>
    </div>
  );
}
