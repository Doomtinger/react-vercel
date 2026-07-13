'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 情感类型定义 - 扩展包含更细微的情感状态
export type EmotionType =
  'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised' |
  'calm' | 'peaceful' | 'content' | 'melancholy' | 'lonely' | 'blue' |
  'annoyed' | 'irritated' | 'frustrated' | 'worried' | 'nervous' | 'anxious' |
  'excited' | 'thrilled' | 'joyful';

// 情感强度级别
export type EmotionIntensity = 'light' | 'medium' | 'heavy' | 'intense';

// 情感数据 - 扩展包含强度
export interface EmotionData {
  emotion: EmotionType;
  confidence: number;
  intensity?: EmotionIntensity; // 情感强度
  timestamp: number;
}

// 情感数据
export interface EmotionData {
  emotion: EmotionType;
  confidence: number;
  timestamp: number;
}

// 情感历史数据
export interface EmotionHistory {
  emotions: EmotionData[];
  currentEmotion: EmotionData | null;
  averageEmotion: Record<EmotionType, number>;
  volatility: number; // 波动程度 0-1
}

export interface FaceDetectionConfig {
  videoWidth?: number;
  videoHeight?: number;
  updateInterval?: number;
  historyLength?: number;
  onEmotionChange?: (emotion: EmotionData) => void;
}

export function useFaceDetection(config: FaceDetectionConfig = {}) {
  const {
    videoWidth = 640,
    videoHeight = 480,
    updateInterval = 1000,
    historyLength = 50,
    onEmotionChange,
  } = config;

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null);

  // 启动摄像头
  const startCamera = useCallback(async () => {
    try {
      console.log('🎬 Flow-state: 正在启动摄像头...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: videoWidth },
          height: { ideal: videoHeight },
          facingMode: 'user',
        },
        audio: false,
      });

      console.log('✅ Flow-state: 摄像头流获取成功，tracks:', stream.getVideoTracks().length);
      streamRef.current = stream;

      if (videoRef.current) {
        console.log('📹 Flow-state: videoRef.current 存在');

        // 先停止任何现有的流
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach(track => track.stop());
        }

        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;

        console.log('📝 Flow-state: 设置视频属性完成');

        // 等待视频元数据加载
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            console.error('❌ Flow-state: 视频加载超时');
            reject(new Error('视频加载超时'));
          }, 10000);

          videoRef.current!.onloadedmetadata = () => {
            clearTimeout(timeoutId);
            console.log('✅ Flow-state: 视频元数据已加载');
            console.log('📐 Flow-state: 视频尺寸:', videoRef.current!.videoWidth, 'x', videoRef.current!.videoHeight);
            console.log('📊 Flow-state: ReadyState:', videoRef.current!.readyState);
            resolve();
          };

          videoRef.current!.onerror = (e: string | Event) => {
            clearTimeout(timeoutId);
            console.error('❌ Flow-state: 视频元素错误:', e);
            if (typeof e === 'object' && e.target) {
              const target = e.target as HTMLVideoElement;
              const error = target.error;
              if (error) {
                console.error('❌ Flow-state: Error code:', error.code, 'message:', error.message);
              }
            }
            reject(new Error('视频元素错误'));
          };
        });

        // 尝试播放
        try {
          await videoRef.current.play();
          console.log('✅ Flow-state: 视频播放成功');
          console.log('⏱️ Flow-state: 当前时间:', videoRef.current.currentTime);
          console.log('🎥 Flow-state: paused:', videoRef.current.paused, 'ended:', videoRef.current.ended);
        } catch (playError) {
          console.error('❌ Flow-state: 视频播放失败:', playError);
          throw playError;
        }
      } else {
        console.error('❌ Flow-state: videoRef.current 不存在');
      }

      setIsStreaming(true);
      setError(null);
      console.log('🎉 Flow-state: 摄像头启动完成，设置 isStreaming = true');

      // 开始情感检测循环
      startEmotionDetection();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '无法访问摄像头';
      setError(errorMessage);
      console.error('❌❌ Flow-state: 摄像头启动失败:', err);
    }
  }, [videoWidth, videoHeight]);

  // 停止摄像头
  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsStreaming(false);
  }, []);

  // 模拟情感检测（实际项目中应使用真实的人脸识别库）
  const detectEmotion = useCallback((): EmotionData => {
    // 模拟随机情感变化（实际应用中应使用 face-api.js 或类似库）
    const emotions: EmotionType[] = [
      'neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised',
      'calm', 'peaceful', 'content', 'melancholy', 'lonely', 'blue',
      'annoyed', 'irritated', 'frustrated', 'worried', 'nervous', 'anxious',
      'excited', 'thrilled', 'joyful'
    ];
    const weights = [
      0.15, // neutral
      0.12, // happy
      0.10, // sad
      0.05, // angry
      0.08, // fearful
      0.03, // disgusted
      0.05, // surprised
      0.06, // calm
      0.04, // peaceful
      0.05, // content
      0.04, // melancholy
      0.03, // lonely
      0.02, // blue
      0.04, // annoyed
      0.03, // irritated
      0.03, // frustrated
      0.04, // worried
      0.03, // nervous
      0.03, // anxious
      0.03, // excited
      0.02, // thrilled
      0.02, // joyful
    ]; // 更细致的情感分布

    // 加权随机选择
    const random = Math.random();
    let cumulative = 0;
    let selectedEmotion: EmotionType = 'neutral';

    for (let i = 0; i < emotions.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        selectedEmotion = emotions[i];
        break;
      }
    }

    // 确定情感强度
    const intensityValue = Math.random();
    let intensity: EmotionIntensity;
    if (intensityValue < 0.4) {
      intensity = 'light';
    } else if (intensityValue < 0.7) {
      intensity = 'medium';
    } else if (intensityValue < 0.9) {
      intensity = 'heavy';
    } else {
      intensity = 'intense';
    }

    return {
      emotion: selectedEmotion,
      confidence: 0.6 + Math.random() * 0.4, // 0.6-1.0
      intensity,
      timestamp: Date.now(),
    };
  }, []);

  // 开始情感检测循环
  const startEmotionDetection = useCallback(() => {
    intervalRef.current = setInterval(() => {
      const newEmotion = detectEmotion();

      setCurrentEmotion(newEmotion);

      setEmotionHistory(prev => {
        const updated = [...prev, newEmotion];
        return updated.slice(-historyLength);
      });

      onEmotionChange?.(newEmotion);

    }, updateInterval);
  }, [detectEmotion, historyLength, updateInterval, onEmotionChange]);

  // 计算情感统计
  const getEmotionStats = useCallback((): EmotionHistory => {
    if (emotionHistory.length === 0) {
      return {
        emotions: [],
        currentEmotion: null,
        averageEmotion: {
          neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0,
          calm: 0, peaceful: 0, content: 0, melancholy: 0, lonely: 0, blue: 0,
          annoyed: 0, irritated: 0, frustrated: 0, worried: 0, nervous: 0, anxious: 0,
          excited: 0, thrilled: 0, joyful: 0,
        },
        volatility: 0,
      };
    }

    // 计算平均情感
    const averageEmotion = emotionHistory.reduce((acc, data) => {
      acc[data.emotion] = (acc[data.emotion] || 0) + 1;
      return acc;
    }, {} as Record<EmotionType, number>);

    // 归一化
    const total = emotionHistory.length;
    Object.keys(averageEmotion).forEach(key => {
      averageEmotion[key as EmotionType] = (averageEmotion[key as EmotionType] || 0) / total;
    });

    // 计算波动程度（最近10个数据点的变化）
    const recentHistory = emotionHistory.slice(-10);
    let volatility = 0;
    if (recentHistory.length > 1) {
      const emotionOrder: EmotionType[] = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised', 'calm', 'peaceful', 'content', 'melancholy', 'lonely', 'blue', 'annoyed', 'irritated', 'frustrated', 'worried', 'nervous', 'anxious', 'excited', 'thrilled', 'joyful'];
      const changes = recentHistory.slice(1).map((data, i) => {
        const currentIndex = emotionOrder.indexOf(data.emotion);
        const prevIndex = emotionOrder.indexOf(recentHistory[i].emotion);
        return Math.abs(currentIndex - prevIndex);
      });
      volatility = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length / emotionOrder.length : 0;
    }

    return {
      emotions: emotionHistory,
      currentEmotion,
      averageEmotion,
      volatility,
    };
  }, [emotionHistory, currentEmotion]);

  // 清理函数
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isStreaming,
    error,
    videoRef,
    canvasRef,
    emotionHistory,
    currentEmotion,
    startCamera,
    stopCamera,
    getEmotionStats,
  };
}

// 情感颜色映射 - 基于色彩心理学体系
export const emotionColors: Record<EmotionType, string> = {
  // 基础情感
  neutral: '#F5F5F5',      // 奶白色 - 平静、无情绪、纯粹
  happy: '#FFD700',        // 亮金黄色 - 开心、温暖、释然
  sad: '#1E3A8A',          // 深蓝色 - 悲伤、低落、心事沉重
  angry: '#DC143C',        // 暴怒红 - 愤怒、攻击性、激动
  fearful: '#6B5B7F',      // 灰紫色 - 恐惧、焦虑、敏感
  disgusted: '#4A5D4A',    // 灰浊绿 - 厌恶、麻木、封闭
  surprised: '#FF8C00',    // 亮橙色 - 激动、亢奋、急躁

  // 细微情感变体
  calm: '#87CEEB',         // 浅天蓝 - 平静、宁静
  peaceful: '#E6F3FF',     // 极浅蓝 - 和平、安详
  content: '#FFFACD',      // 柠檬绸色 - 满足、安然
  melancholy: '#6B8E9F',   // 灰蓝 - 忧郁、感伤
  lonely: '#4A7A9A',       // 孤独蓝 - 孤独、寂寞
  blue: '#5F9EA0',         // 蓝灰 - 沉闷、忧郁

  annoyed: '#FFAA6B',      // 浅橙红 - 烦恼、恼火
  irritated: '#FF8C42',    // 橙红 - 恼怒、烦躁
  frustrated: '#FF6B35',  // 深橙 - 挫败、焦躁

  worried: '#9B8CBF',      // 浅紫 - 担心、忧虑
  nervous: '#8B7BAF',      // 浅灰紫 - 紧张、不安
  anxious: '#7B6B9F',      // 灰紫 - 焦虑、焦灼

  excited: '#FFAA33',      // 亮橙 - 兴奋、激动
  thrilled: '#FF8800',     // 深橙 - 狂喜、兴奋
  joyful: '#FFD700',       // 金色 - 喜悦、快乐
};

// 情感emoji映射
export const emotionEmojis: Record<EmotionType, string> = {
  // 基础情感
  neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😲',

  // 细微情感变体
  calm: '😌',
  peaceful: '🕊️',
  content: '😌',
  melancholy: '😔',
  lonely: '😞',
  blue: '😔',

  annoyed: '😒',
  irritated: '😤',
  frustrated: '😤',

  worried: '😟',
  nervous: '😰',
  anxious: '😰',

  excited: '🤩',
  thrilled: '🤩',
  joyful: '😄',
};

// 情感描述
export const emotionDescriptions: Record<EmotionType, string> = {
  // 基础情感
  neutral: '平静中立',
  happy: '开心快乐',
  sad: '悲伤难过',
  angry: '愤怒生气',
  fearful: '恐惧害怕',
  disgusted: '厌恶反感',
  surprised: '惊讶意外',

  // 细微情感变体
  calm: '平静宁静',
  peaceful: '平和安详',
  content: '满足安心',
  melancholy: '忧郁感伤',
  lonely: '孤独寂寞',
  blue: '沉闷忧郁',

  annoyed: '烦恼恼火',
  irritated: '恼怒烦躁',
  frustrated: '挫败焦躁',

  worried: '担心忧虑',
  nervous: '紧张不安',
  anxious: '焦虑焦灼',

  excited: '兴奋激动',
  thrilled: '狂喜兴奋',
  joyful: '喜悦快乐',
};

// 复合情感色彩系统
export interface EmotionColorProfile {
  primary: string;      // 主色调
  secondary: string;    // 次要色
  accent: string;       // 强调色
  gradient: string[];   // 渐变色组
  glow: string;         // 发光色
  saturation: number;   // 饱和度 0-1
  lightness: number;    // 明度 0-1

  // 新增：不同强度的颜色变体
  light: string;        // 浅色版本 - 轻微、平静
  medium: string;       // 中等版本 - 中等强度
  dark: string;         // 深色版本 - 强烈、深沉
}

// 详细的情感色彩配置 - 包含不同强度的颜色变体
export const emotionColorProfiles: Record<EmotionType, EmotionColorProfile> = {
  neutral: {
    primary: '#F5F5F5',
    secondary: '#E8E8E8',
    accent: '#D0D0D0',
    gradient: ['#FFFFFF', '#F5F5F5', '#EBEBEB'],
    glow: '#FFFFFF',
    saturation: 0.1,
    lightness: 0.95,
    light: '#FFFFFF', medium: '#F5F5F5', dark: '#D0D0D0',
  },
  happy: {
    primary: '#FFD700',
    secondary: '#FFA500',
    accent: '#FFFF00',
    gradient: ['#FFD700', '#FFA500', '#FFFF00', '#FFE135'],
    glow: '#FFEC8B',
    saturation: 0.9,
    lightness: 0.7,
    light: '#FFFACD', medium: '#FFD700', dark: '#FFA500',
  },
  sad: {
    primary: '#4A7ABA',
    secondary: '#3A6A9A',
    accent: '#5A8ACA',
    gradient: ['#4A7ABA', '#3A6A9A', '#5A8ACA', '#2A5A8A'],
    glow: '#6A9ADA',
    saturation: 0.5,
    lightness: 0.4,
    light: '#87CEEB', medium: '#4A7ABA', dark: '#1E3A8A',
  },
  angry: {
    primary: '#DC143C',
    secondary: '#8B0000',
    accent: '#FF0000',
    gradient: ['#DC143C', '#8B0000', '#FF0000', '#B22222'],
    glow: '#FF4444',
    saturation: 1.0,
    lightness: 0.4,
    light: '#FF6B6B', medium: '#DC143C', dark: '#8B0000',
  },
  fearful: {
    primary: '#7B6B8F',
    secondary: '#6B5B7F',
    accent: '#8B7B9F',
    gradient: ['#7B6B8F', '#6B5B7F', '#8B7B9F', '#5B4B6F'],
    glow: '#9B8BAF',
    saturation: 0.35,
    lightness: 0.45,
    light: '#B8A8C8', medium: '#7B6B8F', dark: '#4B3B5F',
  },
  disgusted: {
    primary: '#5A6D5A',
    secondary: '#4A5D4A',
    accent: '#6A7D6A',
    gradient: ['#5A6D5A', '#4A5D4A', '#6A7D6A', '#3A4D3A'],
    glow: '#7A8D7A',
    saturation: 0.25,
    lightness: 0.35,
    light: '#90EE90', medium: '#5A6D5A', dark: '#2A3D2A',
  },
  surprised: {
    primary: '#FF8C00',
    secondary: '#FF6600',
    accent: '#FFAA00',
    gradient: ['#FF8C00', '#FF6600', '#FFAA00', '#FF7700'],
    glow: '#FFAA33',
    saturation: 0.95,
    lightness: 0.5,
    light: '#FFB347', medium: '#FF8C00', dark: '#FF4500',
  },

  // 细微情感变体
  calm: {
    primary: '#87CEEB',
    secondary: '#6BB8DB',
    accent: '#9AD4F5',
    gradient: ['#87CEEB', '#6BB8DB', '#9AD4F5', '#5AA8CB'],
    glow: '#A8E4F8',
    saturation: 0.5,
    lightness: 0.7,
    light: '#B0E0F0', medium: '#87CEEB', dark: '#6BB8DB',
  },
  peaceful: {
    primary: '#E6F3FF',
    secondary: '#D0E8FF',
    accent: '#F0F8FF',
    gradient: ['#E6F3FF', '#D0E8FF', '#F0F8FF', '#C0DFFF'],
    glow: '#F0F8FF',
    saturation: 0.2,
    lightness: 0.95,
    light: '#FFFFFF', medium: '#E6F3FF', dark: '#D0E8FF',
  },
  content: {
    primary: '#FFFACD',
    secondary: '#FFE5A0',
    accent: '#FFD700',
    gradient: ['#FFFACD', '#FFE5A0', '#FFD700', '#FFD700'],
    glow: '#FFF8DC',
    saturation: 0.6,
    lightness: 0.85,
    light: '#FFF8DC', medium: '#FFFACD', dark: '#FFE5A0',
  },
  melancholy: {
    primary: '#6B8E9F',
    secondary: '#5B7E8F',
    accent: '#7B9EAF',
    gradient: ['#6B8E9F', '#5B7E8F', '#7B9EAF', '#4B6E7F'],
    glow: '#8BAEBF',
    saturation: 0.3,
    lightness: 0.5,
    light: '#8BAEBF', medium: '#6B8E9F', dark: '#4B6E7F',
  },
  lonely: {
    primary: '#4A7A9A',
    secondary: '#3A6A8A',
    accent: '#5A8AAA',
    gradient: ['#4A7A9A', '#3A6A8A', '#5A8AAA', '#2A5A7A'],
    glow: '#6A9ABA',
    saturation: 0.4,
    lightness: 0.4,
    light: '#6A9ABA', medium: '#4A7A9A', dark: '#2A5A7A',
  },
  blue: {
    primary: '#5F9EA0',
    secondary: '#4F8E90',
    accent: '#6FAEB0',
    gradient: ['#5F9EA0', '#4F8E90', '#6FAEB0', '#3F7E80'],
    glow: '#7FBE C0',
    saturation: 0.35,
    lightness: 0.5,
    light: '#7FBE C0', medium: '#5F9EA0', dark: '#3F7E80',
  },

  // 轻微愤怒类
  annoyed: {
    primary: '#FFAA6B',
    secondary: '#FF9A5B',
    accent: '#FFBA7B',
    gradient: ['#FFAA6B', '#FF9A5B', '#FFBA7B', '#FF8A4B'],
    glow: '#FFCA8B',
    saturation: 0.8,
    lightness: 0.6,
    light: '#FFCA8B', medium: '#FFAA6B', dark: '#FF8A4B',
  },
  irritated: {
    primary: '#FF8C42',
    secondary: '#FF7C32',
    accent: '#FF9C52',
    gradient: ['#FF8C42', '#FF7C32', '#FF9C52', '#FF6C22'],
    glow: '#FFAC62',
    saturation: 0.9,
    lightness: 0.55,
    light: '#FFAC62', medium: '#FF8C42', dark: '#FF6C22',
  },
  frustrated: {
    primary: '#FF6B35',
    secondary: '#FF5B25',
    accent: '#FF7B45',
    gradient: ['#FF6B35', '#FF5B25', '#FF7B45', '#FF4B15'],
    glow: '#FF8B55',
    saturation: 0.95,
    lightness: 0.5,
    light: '#FF8B55', medium: '#FF6B35', dark: '#FF4B15',
  },

  // 轻微恐惧类
  worried: {
    primary: '#9B8CBF',
    secondary: '#8B7CAF',
    accent: '#AB9CCF',
    gradient: ['#9B8CBF', '#8B7CAF', '#AB9CCF', '#7B6C9F'],
    glow: '#BBACDF',
    saturation: 0.3,
    lightness: 0.6,
    light: '#BBACDF', medium: '#9B8CBF', dark: '#7B6C9F',
  },
  nervous: {
    primary: '#8B7BAF',
    secondary: '#7B6B9F',
    accent: '#9B8BBF',
    gradient: ['#8B7BAF', '#7B6B9F', '#9B8BBF', '#6B5B8F'],
    glow: '#AB9BCF',
    saturation: 0.35,
    lightness: 0.55,
    light: '#AB9BCF', medium: '#8B7BAF', dark: '#6B5B8F',
  },
  anxious: {
    primary: '#7B6B9F',
    secondary: '#6B5B8F',
    accent: '#8B7BAF',
    gradient: ['#7B6B9F', '#6B5B8F', '#8B7BAF', '#5B4B7F'],
    glow: '#9B8BBF',
    saturation: 0.4,
    lightness: 0.45,
    light: '#9B8BBF', medium: '#7B6B9F', dark: '#5B4B7F',
  },

  // 轻微快乐类
  excited: {
    primary: '#FFAA33',
    secondary: '#FF9A23',
    accent: '#FFBA43',
    gradient: ['#FFAA33', '#FF9A23', '#FFBA43', '#FF8A13'],
    glow: '#FFCA53',
    saturation: 0.95,
    lightness: 0.6,
    light: '#FFCA53', medium: '#FFAA33', dark: '#FF8A13',
  },
  thrilled: {
    primary: '#FF8800',
    secondary: '#FF7800',
    accent: '#FF9800',
    gradient: ['#FF8800', '#FF7800', '#FF9800', '#FF6800'],
    glow: '#FFA800',
    saturation: 1.0,
    lightness: 0.5,
    light: '#FFA800', medium: '#FF8800', dark: '#FF6800',
  },
  joyful: {
    primary: '#FFD700',
    secondary: '#FFC700',
    accent: '#FFE700',
    gradient: ['#FFD700', '#FFC700', '#FFE700', '#FFB700'],
    glow: '#FFE700',
    saturation: 0.9,
    lightness: 0.7,
    light: '#FFE700', medium: '#FFD700', dark: '#FFC700',
  },
};

// 复合情感色彩组合
export const compositeEmotionColors = {
  sad_angry: ['#1E3A8A', '#8B0000'],        // 悲伤+愤怒：委屈憋屈
  anxious_frustrated: ['#6B5B7F', '#FF8C00'], // 焦虑+浮躁：坐立不安
  depressed_numb: ['#4A5D4A', '#2C2C2C'],    // 压抑+麻木：毫无情绪波动
  healing_relaxed: ['#90EE90', '#FFD700'],    // 治愈+轻松：负面情绪缓解
  inner_conflict: ['#6B5B7F', '#DC143C'],     // 内耗+愤怒：内心拉扯
};
