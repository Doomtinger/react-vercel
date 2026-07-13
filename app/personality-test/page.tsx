'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import dynamic from 'next/dynamic';

// 动态导入3D性格可视化组件
const PersonalityVisualization = dynamic(
  () => import('@/components/psychology-3d/PersonalityVisualization').then(mod => ({
    default: mod.PersonalityVisualizationScene
  })),
  { ssr: false }
);

// 性格测试题目 - 基于MBTI和大五人格理论
interface Question {
  id: number;
  text: string;
  category: 'E_I' | 'S_N' | 'T_F' | 'J_P' | 'O' | 'C' | 'E' | 'A' | 'N'; // MBTI + 大五人格
  options: {
    text: string;
    value: number;
    dimension: string;
  }[];
}

// 测试题目库
const personalityQuestions: Question[] = [
  // E-I (外向-内向)
  {
    id: 1,
    text: "在社交聚会中，你通常会：",
    category: 'E_I',
    options: [
      { text: "主动与很多人交谈，享受热闹的氛围", value: 1, dimension: 'E' },
      { text: "只与少数熟悉的人交流，更喜欢安静", value: -1, dimension: 'I' }
    ]
  },
  {
    id: 2,
    text: "当你需要充电时，你更倾向于：",
    category: 'E_I',
    options: [
      { text: "和朋友一起外出活动", value: 1, dimension: 'E' },
      { text: "独自在家阅读或思考", value: -1, dimension: 'I' }
    ]
  },
  {
    id: 3,
    text: "在团队合作中，你通常：",
    category: 'E_I',
    options: [
      { text: "喜欢主导讨论，表达自己的观点", value: 1, dimension: 'E' },
      { text: "更愿意倾听他人，私下思考后再发言", value: -1, dimension: 'I' }
    ]
  },

  // S-N (感觉-直觉)
  {
    id: 4,
    text: "在学习新知识时，你更偏好：",
    category: 'S_N',
    options: [
      { text: "具体的、实际的信息和步骤", value: 1, dimension: 'S' },
      { text: "抽象的概念、理论和可能性", value: -1, dimension: 'N' }
    ]
  },
  {
    id: 5,
    text: "面对问题时，你更相信：",
    category: 'S_N',
    options: [
      { text: "过去的经验和事实", value: 1, dimension: 'S' },
      { text: "直觉和灵感", value: -1, dimension: 'N' }
    ]
  },
  {
    id: 6,
    text: "你更注重：",
    category: 'S_N',
    options: [
      { text: "现实和当下的细节", value: 1, dimension: 'S' },
      { text: "未来的可能性和大局观", value: -1, dimension: 'N' }
    ]
  },

  // T-F (思考-情感)
  {
    id: 7,
    text: "在做重要决定时，你主要依据：",
    category: 'T_F',
    options: [
      { text: "逻辑分析和客观标准", value: 1, dimension: 'T' },
      { text: "个人价值观和他人感受", value: -1, dimension: 'F' }
    ]
  },
  {
    id: 8,
    text: "在冲突中，你更倾向于：",
    category: 'T_F',
    options: [
      { text: "直接指出问题，讨论解决方案", value: 1, dimension: 'T' },
      { text: "考虑各方感受，寻求和谐", value: -1, dimension: 'F' }
    ]
  },
  {
    id: 9,
    text: "你认为更重要的是：",
    category: 'T_F',
    options: [
      { text: "公平公正，即使可能伤害感情", value: 1, dimension: 'T' },
      { text: "维护关系，即使需要妥协原则", value: -1, dimension: 'F' }
    ]
  },

  // J-P (判断-感知)
  {
    id: 10,
    text: "在日常生活和工作中，你更喜欢：",
    category: 'J_P',
    options: [
      { text: "有计划、有组织、提前安排", value: 1, dimension: 'J' },
      { text: "灵活、随机、保持开放选项", value: -1, dimension: 'P' }
    ]
  },
  {
    id: 11,
    text: "面对截止日期，你通常会：",
    category: 'J_P',
    options: [
      { text: "提前规划并按时完成", value: 1, dimension: 'J' },
      { text: "在压力下最后时刻完成", value: -1, dimension: 'P' }
    ]
  },
  {
    id: 12,
    text: "在处理信息时，你倾向于：",
    category: 'J_P',
    options: [
      { text: "快速得出结论，做出决定", value: 1, dimension: 'J' },
      { text: "持续收集信息，保持选择开放", value: -1, dimension: 'P' }
    ]
  },

  // 大五人格扩展题目
  // 开放性 (O)
  {
    id: 13,
    text: "你对新鲜事物的态度是：",
    category: 'O',
    options: [
      { text: "非常好奇，喜欢尝试新体验", value: 1, dimension: 'HighO' },
      { text: "比较保守，更喜欢熟悉的事物", value: -1, dimension: 'LowO' }
    ]
  },
  {
    id: 14,
    text: "在艺术和审美方面，你：",
    category: 'O',
    options: [
      { text: "对艺术、美感有很强的兴趣和鉴赏力", value: 1, dimension: 'HighO' },
      { text: "对艺术不太感兴趣，更注重实用性", value: -1, dimension: 'LowO' }
    ]
  },

  // 尽责性 (C)
  {
    id: 15,
    text: "在日常工作和生活中，你：",
    category: 'C',
    options: [
      { text: "很有条理，做事细致认真", value: 1, dimension: 'HighC' },
      { text: "比较随意，不拘小节", value: -1, dimension: 'LowC' }
    ]
  },
  {
    id: 16,
    text: "对于承诺和任务，你通常：",
    category: 'C',
    options: [
      { text: "严格遵守承诺，按时完成任务", value: 1, dimension: 'HighC' },
      { text: "有时会拖延或改变计划", value: -1, dimension: 'LowC' }
    ]
  },

  // 外向性 (E - 大五人格)
  {
    id: 17,
    text: "在人群中，你通常感觉：",
    category: 'E',
    options: [
      { text: "充满活力，从社交中获得能量", value: 1, dimension: 'HighE' },
      { text: "有些疲惫，需要独处来恢复", value: -1, dimension: 'LowE' }
    ]
  },
  {
    id: 18,
    text: "你更喜欢哪种工作环境：",
    category: 'E',
    options: [
      { text: "开放协作的团队环境", value: 1, dimension: 'HighE' },
      { text: "独立安静的个人空间", value: -1, dimension: 'LowE' }
    ]
  },

  // 宜人性 (A)
  {
    id: 19,
    text: "在与他人合作时，你通常：",
    category: 'A',
    options: [
      { text: "非常合作，乐于助人", value: 1, dimension: 'HighA' },
      { text: "更关注自己的目标，竞争意识强", value: -1, dimension: 'LowA' }
    ]
  },
  {
    id: 20,
    text: "对于他人的需求和感受：",
    category: 'A',
    options: [
      { text: "非常关心，富有同情心", value: 1, dimension: 'HighA' },
      { text: "相对理性，不太容易受情感影响", value: -1, dimension: 'LowA' }
    ]
  },

  // 神经质 (N)
  {
    id: 21,
    text: "面对压力和挫折时，你通常：",
    category: 'N',
    options: [
      { text: "情绪稳定，能够冷静应对", value: -1, dimension: 'LowN' },
      { text: "容易焦虑和紧张", value: 1, dimension: 'HighN' }
    ]
  },
  {
    id: 22,
    text: "你的情绪状态通常是：",
    category: 'N',
    options: [
      { text: "平稳积极，很少感到沮丧", value: -1, dimension: 'LowN' },
      { text: "起伏较大，容易受到情绪影响", value: 1, dimension: 'HighN' }
    ]
  }
];

// 性格测试结果类型
interface PersonalityResult {
  mbti: string;
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  description: string;
  strengths: string[];
  weaknesses: string[];
  careerSuggestions: string[];
}

// 计算性格类型
function calculatePersonality(answers: Record<number, number>): PersonalityResult {
  // MBTI计算
  const e_i = answers[1] + answers[2] + answers[3];
  const s_n = answers[4] + answers[5] + answers[6];
  const t_f = answers[7] + answers[8] + answers[9];
  const j_p = answers[10] + answers[11] + answers[12];

  const mbti = `${e_i > 0 ? 'E' : 'I'}${s_n > 0 ? 'S' : 'N'}${t_f > 0 ? 'T' : 'F'}${j_p > 0 ? 'J' : 'P'}`;

  // 大五人格计算
  const openness = 50 + (answers[13] + answers[14]) * 25;
  const conscientiousness = 50 + (answers[15] + answers[16]) * 25;
  const extraversion = 50 + (answers[17] + answers[18]) * 25;
  const agreeableness = 50 + (answers[19] + answers[20]) * 25;
  const neuroticism = 50 + (answers[21] + answers[22]) * 25;

  // 生成性格描述
  const descriptions: Record<string, string> = {
    'ISTJ': '负责任、可靠、务实，喜欢秩序和结构。你是传统和稳定的守护者，在工作中表现出极高的专注力和准确性。',
    'ISFJ': '温暖、体贴、负责，关心他人的需求。你是优秀的支持者，在帮助他人的过程中找到满足感。',
    'INFJ': '理想主义、深刻、富有洞察力，追求意义和目标。你有强烈的直觉，能够理解他人的深层动机。',
    'INTJ': '战略思维者、独立、追求知识，喜欢制定长期计划。你是天生的系统思维者，能够看到复杂的模式。',
    'ISTP': '灵活、实际、善于分析，喜欢动手解决问题。你是天生的故障排除者，在压力下保持冷静。',
    'ISFP': '温和、敏感、艺术气息，活在当下。你有很强的审美感知力，通过行动表达自己的价值观。',
    'INFP': '理想主义、忠诚、富有同情心，追求和谐与真实。你是深度思考者，致力于理解自己和他人。',
    'INTP': '逻辑性强、好奇、独立，喜欢探索理论可能性。你是思想的探索者，不断寻求理解和智慧。',
    'ESTP': '活跃、务实、适应力强，喜欢行动和冒险。你活在当下，善于应对紧急情况。',
    'ESFP': '热情、友好、热爱生活，喜欢与人互动。你是天生的表演者，能够给周围的人带来欢乐。',
    'ENFP': '热情、富有想象力、善于沟通，追求可能性。你是灵感的源泉，能够激励他人。',
    'ENTP': '聪明、好奇、富有挑战精神，喜欢智力辩论。你是创新的推动者，总是寻找新的方法。',
    'ESTJ': '组织力强、实际、果断，喜欢管理和组织。你是优秀的执行者，能够高效地实现目标。',
    'ESFJ': '关心他人、社交能力强、传统，重视和谐。你是团队的粘合剂，致力于维护关系。',
    'ENFJ': '富有魅力、同理心强、天然领导者，致力于帮助他人成长。你是团队的鼓舞者，能够激发他人的潜力。',
    'ENTJ': '自信、战略思维强、果断，喜欢挑战和领导。你是天生的领导者，致力于实现宏伟目标。'
  };

  const strengths: Record<string, string[]> = {
    'ISTJ': ['高度负责', '注重细节', '可靠稳定', '组织能力强'],
    'ISFJ': ['富有同情心', '支持他人', '注重细节', '忠诚可靠'],
    'INFJ': ['深刻洞察', '富有远见', '同理心强', '理想主义'],
    'INTJ': ['战略思维', '独立自主', '追求知识', '系统化'],
    'ISTP': ['问题解决', '适应力强', '实践导向', '冷静应对'],
    'ISFP': ['艺术感知', '温和友善', '活在当下', '价值观驱动'],
    'INFP': ['深度思考', '忠于自我', '富有同情心', '追求意义'],
    'INTP': ['逻辑分析', '好奇心强', '独立思考', '创新思维'],
    'ESTP': ['行动导向', '适应力强', '务实解决问题', '压力下冷静'],
    'ESFP': ['热情开朗', '社交能力强', '活在当下', '富有感染力'],
    'ENFP': ['热情洋溢', '富有想象力', '善于启发', '追求可能性'],
    'ENTP': ['创新思维', '善于辩论', '适应力强', '智力挑战'],
    'ESTJ': ['组织能力', '高效执行', '目标导向', '领导力'],
    'ESFJ': ['关心他人', '社交能力', '团队合作', '和谐维护'],
    'ENFJ': ['富有魅力', '同理心强', '领导激励', '人才培养'],
    'ENTJ': ['战略规划', '果断决策', '目标导向', '团队领导']
  };

  const weaknesses: Record<string, string[]> = {
    'ISTJ': ['过于固执', '缺乏灵活性', '忽视情感因素', '过度批评'],
    'ISFJ': ['过度自我牺牲', '难以拒绝他人', '忽视自身需求', '面对冲突困难'],
    'INFJ': ['过度理想化', '容易职业倦怠', '过于敏感', '完美主义'],
    'INTJ': ['过度自信', '社交困难', '忽视情感', '过度分析'],
    'ISTP': ['情感表达困难', '缺乏长期规划', '容易拖延', '承诺困难'],
    'ISFP': ['过于敏感', '避免冲突', '缺乏组织', '未来规划困难'],
    'INFP': ['过度理想化', '实际应用困难', '容易受伤', '自我批评'],
    'INTP': ['社交焦虑', '注意力分散', '执行困难', '情感忽视'],
    'ESTP': ['冲动行为', '缺乏长期规划', '容易厌倦', '规则忽视'],
    'ESFP': ['缺乏深度', '注意力分散', '避免冲突', '规划困难'],
    'ENFP': ['注意力分散', '过度承诺', '压力敏感', '细节忽视'],
    'ENTP': ['争论倾向', '注意力分散', '执行困难', '关系维护困难'],
    'ESTJ': ['过于控制', '缺乏灵活性', '情感忽视', '过度工作'],
    'ESFJ': ['过度在乎他人意见', ['自我牺牲', '难以接受改变', '焦虑倾向', '边界模糊']],
    'ENFJ': ['过度理想化他人', '自我忽视', '过度慷慨', '冲突回避'],
    'ENTJ': ['过于强势', '情感忽视', '不耐烦', '控制欲强']
  };

  const careerSuggestions: Record<string, string[]> = {
    'ISTJ': ['会计', '律师', '审计', '系统分析', '行政管理'],
    'ISFJ': ['社会工作', '医疗护理', '教育教学', '人力资源', '咨询服务'],
    'INFJ': ['心理咨询', '写作', '非营利组织', '教育辅导', '艺术创作'],
    'INTJ': ['科学研究', '战略规划', '系统设计', '项目管理', '软件开发'],
    'ISTP': ['工程', '技术支持', '紧急服务', '质量控制', '数据分析'],
    'ISFP': ['艺术设计', '摄影', '手工艺', '园林设计', '音乐治疗'],
    'INFP': ['写作', '心理咨询', '艺术创作', '教育教学', '社会工作'],
    'INTP': ['科学研究', '哲学', '数学', '软件开发', '理论物理'],
    'ESTP': ['销售', '市场营销', '应急服务', '体育教练', '企业家'],
    'ESFP': ['表演艺术', '活动策划', '旅游服务', '销售', '媒体传播'],
    'ENFP': ['公关', '市场营销', '心理咨询', '教育培训', '创意写作'],
    'ENTP': ['创业', '咨询', '投资分析', '市场营销', '产品开发'],
    'ESTJ': ['管理', '军队', '法律执行', '行政管理', '工程项目'],
    'ESFJ': ['教育', '医疗保健', '人力资源', '社会服务', '客户关系'],
    'ENFJ': ['领导培训', '人力资源管理', '心理咨询', '教育管理', '政治'],
    'ENTJ': ['高级管理', '企业战略', '法律', '创业', '咨询']
  };

  return {
    mbti,
    bigFive: {
      openness: Math.max(0, Math.min(100, openness)),
      conscientiousness: Math.max(0, Math.min(100, conscientiousness)),
      extraversion: Math.max(0, Math.min(100, extraversion)),
      agreeableness: Math.max(0, Math.min(100, agreeableness)),
      neuroticism: Math.max(0, Math.min(100, neuroticism))
    },
    description: descriptions[mbti] || '独特的性格组合',
    strengths: strengths[mbti] || [],
    weaknesses: weaknesses[mbti] || [],
    careerSuggestions: careerSuggestions[mbti] || []
  };
}

export default function PersonalityTestPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<PersonalityResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [currentQuestion + 1]: value };
    setAnswers(newAnswers);

    if (currentQuestion < personalityQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 完成测试，计算结果
      const testResult = calculatePersonality(newAnswers);
      setResult(testResult);
      setShowResult(true);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setShowResult(false);
  };

  const progress = ((currentQuestion + 1) / personalityQuestions.length) * 100;

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
      {/* 左侧测试区域 */}
      <div className="w-[480px] bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">🧠</span>
            专业性格测试
          </h1>
          <p className="text-sm text-gray-300">
            基于MBTI和大五人格理论的国际标准性格评估
          </p>
        </div>

        {!showResult ? (
          <>
            {/* 进度条 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>进度</span>
                <span>{currentQuestion + 1}/{personalityQuestions.length}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* 问题卡片 */}
            <div className="p-6 rounded-xl bg-white/10 border border-white/20 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                问题 {currentQuestion + 1}
              </h3>
              <p className="text-white text-base mb-6 leading-relaxed">
                {personalityQuestions[currentQuestion].text}
              </p>

              <div className="space-y-3">
                {personalityQuestions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option.value)}
                    className="w-full text-left p-4 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-purple-400/50 transition-all"
                  >
                    <div className="text-white text-sm">{option.text}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 测试说明 */}
            <div className="p-4 rounded-xl bg-purple-500/20 border border-purple-400/30">
              <h4 className="text-sm font-semibold text-white mb-2">💡 测试说明</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                本测试结合了MBTI性格分类理论和现代大五人格模型，共22道题目，
                能够全面分析你的性格特质、行为模式和职业倾向。选择最符合你真实想法的答案。
              </p>
            </div>
          </>
        ) : (
          <>
            {/* 返回按钮 */}
            <button
              onClick={handleReset}
              className="mb-6 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
            >
              ← 重新测试
            </button>

            {/* 测试结果 */}
            {result && (
              <div className="space-y-4">
                {/* MBTI类型 */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50">
                  <h3 className="text-sm font-semibold text-white mb-2">🎯 MBTI 性格类型</h3>
                  <div className="text-3xl font-bold text-white mb-2">{result.mbti}</div>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.description}</p>
                </div>

                {/* 大五人格 */}
                <div className="p-4 rounded-xl bg-white/10 border border-white/20">
                  <h3 className="text-sm font-semibold text-white mb-3">📊 大五人格分析</h3>
                  <div className="space-y-2">
                    {Object.entries(result.bigFive).map(([trait, value]) => (
                      <div key={trait} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16">
                          {
                            trait === 'openness' ? '开放性' :
                            trait === 'conscientiousness' ? '尽责性' :
                            trait === 'extraversion' ? '外向性' :
                            trait === 'agreeableness' ? '宜人性' : '神经质'
                          }
                        </span>
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              value > 70 ? 'bg-green-500' :
                              value > 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-8 text-right">{value.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 优势与劣势 */}
                <div className="p-4 rounded-xl bg-white/10 border border-white/20">
                  <h3 className="text-sm font-semibold text-white mb-2">💪 优势特质</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.strengths.map((strength, i) => (
                      <span key={i} className="px-2 py-1 bg-green-500/20 border border-green-400/30 rounded text-xs text-green-300">
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/10 border border-white/20">
                  <h3 className="text-sm font-semibold text-white mb-2">🎯 成长方向</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.weaknesses.map((weakness, i) => (
                      <span key={i} className="px-2 py-1 bg-orange-500/20 border border-orange-400/30 rounded text-xs text-orange-300">
                        {weakness}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 职业建议 */}
                <div className="p-4 rounded-xl bg-blue-500/20 border border-blue-400/30">
                  <h3 className="text-sm font-semibold text-white mb-2">💼 职业建议</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.careerSuggestions.map((career, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-xs text-blue-300">
                        {career}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 右侧3D可视化区域 */}
      <div className="flex-1 relative">
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
          {showResult && result ? (
            <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
              <PersonalityVisualization result={result} />
              <OrbitControls
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                zoomSpeed={0.6}
                panSpeed={0.5}
                rotateSpeed={0.4}
                minDistance={8}
                maxDistance={20}
              />
            </Canvas>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-2xl font-bold mb-2">性格3D可视化</h2>
                <p className="text-gray-400">
                  完成测试后将生成专属的性格3D模型
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 交互提示 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm">
            🖱️ 拖动旋转 | 滚轮缩放 | 右键平移
          </p>
        </div>
      </div>
    </div>
  );
}