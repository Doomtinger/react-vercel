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

// 测试题目库 - 基于国际标准心理测量量表
// 题目来源：IPIP (International Personality Item Pool), BFI (Big Five Inventory), MBTI量表
const personalityQuestions: Question[] = [
  // 外向性 - 基于BFI和IPIP标准题目
  {
    id: 1,
    text: "我是聚会的中心人物",
    category: 'E_I',
    options: [
      { text: "非常同意", value: 2, dimension: 'E' },
      { text: "比较同意", value: 1, dimension: 'E' },
      { text: "比较不同意", value: -1, dimension: 'I' },
      { text: "非常不同意", value: -2, dimension: 'I' }
    ]
  },
  {
    id: 2,
    text: "我在人群中不说话",
    category: 'E_I',
    options: [
      { text: "非常同意", value: -2, dimension: 'I' },
      { text: "比较同意", value: -1, dimension: 'I' },
      { text: "比较不同意", value: 1, dimension: 'E' },
      { text: "非常不同意", value: 2, dimension: 'E' }
    ]
  },
  {
    id: 3,
    text: "我对人感到舒适",
    category: 'E_I',
    options: [
      { text: "非常同意", value: 2, dimension: 'E' },
      { text: "比较同意", value: 1, dimension: 'E' },
      { text: "比较不同意", value: -1, dimension: 'I' },
      { text: "非常不同意", value: -2, dimension: 'I' }
    ]
  },
  {
    id: 4,
    text: "我让他人继续交谈",
    category: 'E_I',
    options: [
      { text: "非常同意", value: 2, dimension: 'E' },
      { text: "比较同意", value: 1, dimension: 'E' },
      { text: "比较不同意", value: -1, dimension: 'I' },
      { text: "非常不同意", value: -2, dimension: 'I' }
    ]
  },
  {
    id: 5,
    text: "我喜欢成为注意力的中心",
    category: 'E_I',
    options: [
      { text: "非常同意", value: 2, dimension: 'E' },
      { text: "比较同意", value: 1, dimension: 'E' },
      { text: "比较不同意", value: -1, dimension: 'I' },
      { text: "非常不同意", value: -2, dimension: 'I' }
    ]
  },
  {
    id: 6,
    text: "我在社交场合感到舒适",
    category: 'E_I',
    options: [
      { text: "非常同意", value: 2, dimension: 'E' },
      { text: "比较同意", value: 1, dimension: 'E' },
      { text: "比较不同意", value: -1, dimension: 'I' },
      { text: "非常不同意", value: -2, dimension: 'I' }
    ]
  },
  {
    id: 7,
    text: "我保持背景状态",
    category: 'E_I',
    options: [
      { text: "非常同意", value: -2, dimension: 'I' },
      { text: "比较同意", value: -1, dimension: 'I' },
      { text: "比较不同意", value: 1, dimension: 'E' },
      { text: "非常不同意", value: 2, dimension: 'E' }
    ]
  },
  {
    id: 8,
    text: "我开始交谈",
    category: 'E_I',
    options: [
      { text: "非常同意", value: 2, dimension: 'E' },
      { text: "比较同意", value: 1, dimension: 'E' },
      { text: "比较不同意", value: -1, dimension: 'I' },
      { text: "非常不同意", value: -2, dimension: 'I' }
    ]
  },

  // 宜人性 - 基于BFI标准题目
  {
    id: 9,
    text: "我对他人感兴趣",
    category: 'A',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighA' },
      { text: "比较同意", value: 1, dimension: 'HighA' },
      { text: "比较不同意", value: -1, dimension: 'LowA' },
      { text: "非常不同意", value: -2, dimension: 'LowA' }
    ]
  },
  {
    id: 10,
    text: "我去我的路",
    category: 'A',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowA' },
      { text: "比较同意", value: -1, dimension: 'LowA' },
      { text: "比较不同意", value: 1, dimension: 'HighA' },
      { text: "非常不同意", value: 2, dimension: 'HighA' }
    ]
  },
  {
    id: 11,
    text: "我同情他人的感受",
    category: 'A',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighA' },
      { text: "比较同意", value: 1, dimension: 'HighA' },
      { text: "比较不同意", value: -1, dimension: 'LowA' },
      { text: "非常不同意", value: -2, dimension: 'LowA' }
    ]
  },
  {
    id: 12,
    text: "我对他人的问题不感兴趣",
    category: 'A',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowA' },
      { text: "比较同意", value: -1, dimension: 'LowA' },
      { text: "比较不同意", value: 1, dimension: 'HighA' },
      { text: "非常不同意", value: 2, dimension: 'HighA' }
    ]
  },
  {
    id: 13,
    text: "我对他人的感受有软心肠",
    category: 'A',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighA' },
      { text: "比较同意", value: 1, dimension: 'HighA' },
      { text: "比较不同意", value: -1, dimension: 'LowA' },
      { text: "非常不同意", value: -2, dimension: 'LowA' }
    ]
  },
  {
    id: 14,
    text: "我很少关心他人",
    category: 'A',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowA' },
      { text: "比较同意", value: -1, dimension: 'LowA' },
      { text: "比较不同意", value: 1, dimension: 'HighA' },
      { text: "非常不同意", value: 2, dimension: 'HighA' }
    ]
  },
  {
    id: 15,
    text: "我觉得他人的感情是我的责任",
    category: 'A',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighA' },
      { text: "比较同意", value: 1, dimension: 'HighA' },
      { text: "比较不同意", value: -1, dimension: 'LowA' },
      { text: "非常不同意", value: -2, dimension: 'LowA' }
    ]
  },
  {
    id: 16,
    text: "我对他人的没有时间",
    category: 'A',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowA' },
      { text: "比较同意", value: -1, dimension: 'LowA' },
      { text: "比较不同意", value: 1, dimension: 'HighA' },
      { text: "非常不同意", value: 2, dimension: 'HighA' }
    ]
  },

  // 尽责性 - 基于BFI标准题目
  {
    id: 17,
    text: "我总是做好准备",
    category: 'C',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighC' },
      { text: "比较同意", value: 1, dimension: 'HighC' },
      { text: "比较不同意", value: -1, dimension: 'LowC' },
      { text: "非常不同意", value: -2, dimension: 'LowC' }
    ]
  },
  {
    id: 18,
    text: "我注意细节",
    category: 'C',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighC' },
      { text: "比较同意", value: 1, dimension: 'HighC' },
      { text: "比较不同意", value: -1, dimension: 'LowC' },
      { text: "非常不同意", value: -2, dimension: 'LowC' }
    ]
  },
  {
    id: 19,
    text: "我很快完成工作",
    category: 'C',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighC' },
      { text: "比较同意", value: 1, dimension: 'HighC' },
      { text: "比较不同意", value: -1, dimension: 'LowC' },
      { text: "非常不同意", value: -2, dimension: 'LowC' }
    ]
  },
  {
    id: 20,
    text: "我在工作中杂乱无章",
    category: 'C',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowC' },
      { text: "比较同意", value: -1, dimension: 'LowC' },
      { text: "比较不同意", value: 1, dimension: 'HighC' },
      { text: "非常不同意", value: 2, dimension: 'HighC' }
    ]
  },
  {
    id: 21,
    text: "我把事情留到最后一刻",
    category: 'C',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowC' },
      { text: "比较同意", value: -1, dimension: 'LowC' },
      { text: "比较不同意", value: 1, dimension: 'HighC' },
      { text: "非常不同意", value: 2, dimension: 'HighC' }
    ]
  },
  {
    id: 22,
    text: "我遵循计划",
    category: 'C',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighC' },
      { text: "比较同意", value: 1, dimension: 'HighC' },
      { text: "比较不同意", value: -1, dimension: 'LowC' },
      { text: "非常不同意", value: -2, dimension: 'LowC' }
    ]
  },
  {
    id: 23,
    text: "我在工作中很懒散",
    category: 'C',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowC' },
      { text: "比较同意", value: -1, dimension: 'LowC' },
      { text: "比较不同意", value: 1, dimension: 'HighC' },
      { text: "非常不同意", value: 2, dimension: 'HighC' }
    ]
  },
  {
    id: 24,
    text: "我坚持到完成工作",
    category: 'C',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighC' },
      { text: "比较同意", value: 1, dimension: 'HighC' },
      { text: "比较不同意", value: -1, dimension: 'LowC' },
      { text: "非常不同意", value: -2, dimension: 'LowC' }
    ]
  },

  // 神经质 - 基于BFI标准题目
  {
    id: 25,
    text: "我经常感到担心",
    category: 'N',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighN' },
      { text: "比较同意", value: 1, dimension: 'HighN' },
      { text: "比较不同意", value: -1, dimension: 'LowN' },
      { text: "非常不同意", value: -2, dimension: 'LowN' }
    ]
  },
  {
    id: 26,
    text: "我很容易放松",
    category: 'N',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowN' },
      { text: "比较同意", value: -1, dimension: 'LowN' },
      { text: "比较不同意", value: 1, dimension: 'HighN' },
      { text: "非常不同意", value: 2, dimension: 'HighN' }
    ]
  },
  {
    id: 27,
    text: "我很少情绪低落",
    category: 'N',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowN' },
      { text: "比较同意", value: -1, dimension: 'LowN' },
      { text: "比较不同意", value: 1, dimension: 'HighN' },
      { text: "非常不同意", value: 2, dimension: 'HighN' }
    ]
  },
  {
    id: 28,
    text: "我经常感到情绪低落",
    category: 'N',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighN' },
      { text: "比较同意", value: 1, dimension: 'HighN' },
      { text: "比较不同意", value: -1, dimension: 'LowN' },
      { text: "非常不同意", value: -2, dimension: 'LowN' }
    ]
  },
  {
    id: 29,
    text: "我容易受情绪影响",
    category: 'N',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighN' },
      { text: "比较同意", value: 1, dimension: 'HighN' },
      { text: "比较不同意", value: -1, dimension: 'LowN' },
      { text: "非常不同意", value: -2, dimension: 'LowN' }
    ]
  },
  {
    id: 30,
    text: "我情绪稳定",
    category: 'N',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowN' },
      { text: "比较同意", value: -1, dimension: 'LowN' },
      { text: "比较不同意", value: 1, dimension: 'HighN' },
      { text: "非常不同意", value: 2, dimension: 'HighN' }
    ]
  },
  {
    id: 31,
    text: "我经常感到紧张",
    category: 'N',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighN' },
      { text: "比较同意", value: 1, dimension: 'HighN' },
      { text: "比较不同意", value: -1, dimension: 'LowN' },
      { text: "非常不同意", value: -2, dimension: 'LowN' }
    ]
  },
  {
    id: 32,
    text: "我经常感到沮丧",
    category: 'N',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighN' },
      { text: "比较同意", value: 1, dimension: 'HighN' },
      { text: "比较不同意", value: -1, dimension: 'LowN' },
      { text: "非常不同意", value: -2, dimension: 'LowN' }
    ]
  },

  // 开放性 - 基于BFI标准题目
  {
    id: 33,
    text: "我有活跃的想象力",
    category: 'O',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighO' },
      { text: "比较同意", value: 1, dimension: 'HighO' },
      { text: "比较不同意", value: -1, dimension: 'LowO' },
      { text: "非常不同意", value: -2, dimension: 'LowO' }
    ]
  },
  {
    id: 34,
    text: "我对抽象想法不感兴趣",
    category: 'O',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowO' },
      { text: "比较同意", value: -1, dimension: 'LowO' },
      { text: "比较不同意", value: 1, dimension: 'HighO' },
      { text: "非常不同意", value: 2, dimension: 'HighO' }
    ]
  },
  {
    id: 35,
    text: "我有很好的想象力",
    category: 'O',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighO' },
      { text: "比较同意", value: 1, dimension: 'HighO' },
      { text: "比较不同意", value: -1, dimension: 'LowO' },
      { text: "非常不同意", value: -2, dimension: 'LowO' }
    ]
  },
  {
    id: 36,
    text: "我不愿意思考复杂的问题",
    category: 'O',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowO' },
      { text: "比较同意", value: -1, dimension: 'LowO' },
      { text: "比较不同意", value: 1, dimension: 'HighO' },
      { text: "非常不同意", value: 2, dimension: 'HighO' }
    ]
  },
  {
    id: 37,
    text: "我对哲学思想感兴趣",
    category: 'O',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighO' },
      { text: "比较同意", value: 1, dimension: 'HighO' },
      { text: "比较不同意", value: -1, dimension: 'LowO' },
      { text: "非常不同意", value: -2, dimension: 'LowO' }
    ]
  },
  {
    id: 38,
    text: "我有丰富的词汇量",
    category: 'O',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighO' },
      { text: "比较同意", value: 1, dimension: 'HighO' },
      { text: "比较不同意", value: -1, dimension: 'LowO' },
      { text: "非常不同意", value: -2, dimension: 'LowO' }
    ]
  },
  {
    id: 39,
    text: "我喜欢听新的想法",
    category: 'O',
    options: [
      { text: "非常同意", value: 2, dimension: 'HighO' },
      { text: "比较同意", value: 1, dimension: 'HighO' },
      { text: "比较不同意", value: -1, dimension: 'LowO' },
      { text: "非常不同意", value: -2, dimension: 'LowO' }
    ]
  },
  {
    id: 40,
    text: "我在艺术方面没有艺术兴趣",
    category: 'O',
    options: [
      { text: "非常同意", value: -2, dimension: 'LowO' },
      { text: "比较同意", value: -1, dimension: 'LowO' },
      { text: "比较不同意", value: 1, dimension: 'HighO' },
      { text: "非常不同意", value: 2, dimension: 'HighO' }
    ]
  },

  // MBTI风格的题目 - 基于标准MBTI量表
  {
    id: 41,
    text: "你通常更注重：",
    category: 'S_N',
    options: [
      { text: "当前的实际情况", value: 2, dimension: 'S' },
      { text: "未来的可能性", value: -2, dimension: 'N' }
    ]
  },
  {
    id: 42,
    text: "在做决定时，你更倾向于：",
    category: 'T_F',
    options: [
      { text: "逻辑分析", value: 2, dimension: 'T' },
      { text: "个人价值观", value: -2, dimension: 'F' }
    ]
  },
  {
    id: 43,
    text: "在日常生活中，你更喜欢：",
    category: 'J_P',
    options: [
      { text: "有计划地安排", value: 2, dimension: 'J' },
      { text: "灵活应变", value: -2, dimension: 'P' }
    ]
  },
  {
    id: 44,
    text: "面对新情况时，你通常：",
    category: 'S_N',
    options: [
      { text: "依赖过去的经验", value: 2, dimension: 'S' },
      { text: "尝试新的方法", value: -2, dimension: 'N' }
    ]
  },
  {
    id: 45,
    text: "在人际交往中，你更重视：",
    category: 'T_F',
    options: [
      { text: "公平原则", value: 2, dimension: 'T' },
      { text: "人际关系", value: -2, dimension: 'F' }
    ]
  },
  {
    id: 46,
    text: "你更喜欢什么样的工作环境：",
    category: 'J_P',
    options: [
      { text: "结构化、可预测的", value: 2, dimension: 'J' },
      { text: "灵活、允许临时变动", value: -2, dimension: 'P' }
    ]
  },
  {
    id: 47,
    text: "在处理信息时，你更注重：",
    category: 'S_N',
    options: [
      { text: "具体细节", value: 2, dimension: 'S' },
      { text: "整体概念", value: -2, dimension: 'N' }
    ]
  },
  {
    id: 48,
    text: "在团队合作中，你更倾向于：",
    category: 'T_F',
    options: [
      { text: "客观分析问题", value: 2, dimension: 'T' },
      { text: "维护团队和谐", value: -2, dimension: 'F' }
    ]
  },
  {
    id: 49,
    text: "面对截止日期，你通常会：",
    category: 'J_P',
    options: [
      { text: "提前规划完成", value: 2, dimension: 'J' },
      { text: "在压力下冲刺", value: -2, dimension: 'P' }
    ]
  },
  {
    id: 50,
    text: "你更相信：",
    category: 'S_N',
    options: [
      { text: "确凿的事实", value: 2, dimension: 'S' },
      { text: "直觉和灵感", value: -2, dimension: 'N' }
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

// 计算性格类型 - 适应新的50道标准题目
function calculatePersonality(answers: Record<number, number>): PersonalityResult {
  // 性格描述常量
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
    'ESFJ': ['过度在乎他人意见', '自我牺牲', '难以接受改变', '焦虑倾向', '边界模糊'],
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

  // MBTI计算 - 基于题目41-50
  const e_i = answers[1] + answers[2] + answers[3] + answers[4] + answers[5] + answers[6] + answers[7] + answers[8]; // 8道外向性题目
  const s_n = answers[41] + answers[44] + answers[47] + answers[50]; // 4道感觉-直觉题目
  const t_f = answers[42] + answers[45] + answers[48]; // 3道思考-情感题目
  const j_p = answers[43] + answers[46] + answers[49]; // 3道判断-感知题目

  const mbti = `${e_i > 0 ? 'E' : 'I'}${s_n > 0 ? 'S' : 'N'}${t_f > 0 ? 'T' : 'F'}${j_p > 0 ? 'J' : 'P'}`;

  // 大五人格计算 - 基于BFI标准题目
  // 外向性: 题目1-8，需要将得分标准化到0-100范围
  const extraversion_raw = answers[1] + answers[2] + answers[3] + answers[4] + answers[5] + answers[6] + answers[7] + answers[8];
  const extraversion = 50 + (extraversion_raw / 16) * 50; // 标准化

  // 宜人性: 题目9-16
  const agreeableness_raw = answers[9] + answers[10] + answers[11] + answers[12] + answers[13] + answers[14] + answers[15] + answers[16];
  const agreeableness = 50 + (agreeableness_raw / 16) * 50;

  // 尽责性: 题目17-24
  const conscientiousness_raw = answers[17] + answers[18] + answers[19] + answers[20] + answers[21] + answers[22] + answers[23] + answers[24];
  const conscientiousness = 50 + (conscientiousness_raw / 16) * 50;

  // 神经质: 题目25-32
  const neuroticism_raw = -(answers[25] + answers[26] + answers[27] + answers[28] + answers[29] + answers[30] + answers[31] + answers[32]); // 反向计分
  const neuroticism = 50 + (neuroticism_raw / 16) * 50;

  // 开放性: 题目33-40
  const openness_raw = answers[33] + answers[34] + answers[35] + answers[36] + answers[37] + answers[38] + answers[39] + answers[40];
  const openness = 50 + (openness_raw / 16) * 50;

  // 确保分数在0-100范围内
  const clamp = (num: number) => Math.max(0, Math.min(100, num));

  return {
    mbti,
    bigFive: {
      openness: clamp(openness),
      conscientiousness: clamp(conscientiousness),
      extraversion: clamp(extraversion),
      agreeableness: clamp(agreeableness),
      neuroticism: clamp(neuroticism)
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
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-purple-950 to-pink-950">
      {/* 左侧测试面板 */}
      <div className="w-96 bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">🧠</span>
            专业性格测试
          </h1>
          <p className="text-sm text-gray-300">
            基于IPIP、BFI、MBTI国际标准量表
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
            <div className="p-4 rounded-xl bg-white/10 border border-white/20 mb-6">
              <h3 className="text-sm font-semibold text-white mb-3">
                问题 {currentQuestion + 1}
              </h3>
              <p className="text-white text-sm mb-4 leading-relaxed">
                {personalityQuestions[currentQuestion].text}
              </p>

              <div className="space-y-2">
                {personalityQuestions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option.value)}
                    className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
                  >
                    <div className="text-white text-sm">{option.text}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 测试说明 */}
            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-400/30">
              <h4 className="text-sm font-semibold text-white mb-2">💡 标准量表说明</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                本测试采用国际标准心理测量量表：IPIP（国际人格项目库）、BFI（大五人格量表）、MBTI量表。
                共50道题目，采用4点李克特量表，确保测试结果的科学性和准确性。
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
              <div className="space-y-3">
                {/* MBTI类型 */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50">
                  <h3 className="text-sm font-semibold text-white mb-2">🎯 MBTI 性格类型</h3>
                  <div className="text-2xl font-bold text-white mb-2">{result.mbti}</div>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.description}</p>
                </div>

                {/* 大五人格 */}
                <div className="p-3 rounded-xl bg-white/10 border border-white/20">
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
                        <span className="text-xs text-gray-300 w-12 text-right">
                          {value.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 优势与劣势 */}
                <div className="p-3 rounded-xl bg-white/10 border border-white/20">
                  <h3 className="text-sm font-semibold text-white mb-2">💪 优势特质</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.strengths.map((strength, i) => (
                      <span key={i} className="px-2 py-1 bg-green-500/20 border border-green-400/30 rounded text-xs text-green-300">
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/10 border border-white/20">
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
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/30">
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
        <div className="w-full h-full">
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
                <h2 className="text-2xl font-bold mb-2">专业性格测试</h2>
                <p className="text-gray-400">
                  完成50道标准题目，生成专属的3D性格模型
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 浮动信息 */}
        {showResult && result && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span>{result.mbti}</span>
            <span className="text-gray-400">•</span>
            <span>基于国际标准量表</span>
          </p>
        </div>
        )}

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