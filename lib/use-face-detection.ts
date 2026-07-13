'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 情感类型定义
export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';

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
    const emotions: EmotionType[] = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised'];
    const weights = [0.3, 0.25, 0.15, 0.1, 0.1, 0.1]; // 中性和快乐更常见

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

    return {
      emotion: selectedEmotion,
      confidence: 0.6 + Math.random() * 0.4, // 0.6-1.0
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
          neutral: 0,
          happy: 0,
          sad: 0,
          angry: 0,
          fearful: 0,
          disgusted: 0,
          surprised: 0,
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
      const emotionOrder: EmotionType[] = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised'];
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
  neutral: '#F5F5F5',      // 奶白色 - 平静、无情绪、纯粹
  happy: '#FFD700',        // 亮金黄色 - 开心、温暖、释然
  sad: '#1E3A8A',          // 深蓝色 - 悲伤、低落、心事沉重
  angry: '#DC143C',        // 暴怒红 - 愤怒、攻击性、激动
  fearful: '#6B5B7F',      // 灰紫色 - 恐惧、焦虑、敏感
  disgusted: '#4A5D4A',    // 灰浊绿 - 厌恶、麻木、封闭
  surprised: '#FF8C00',     // 亮橙色 - 激动、亢奋、急躁
};

// 情感emoji映射
export const emotionEmojis: Record<EmotionType, string> = {
  neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😲',
};

// 情感描述
export const emotionDescriptions: Record<EmotionType, string> = {
  neutral: '平静中立',
  happy: '开心快乐',
  sad: '悲伤难过',
  angry: '愤怒生气',
  fearful: '恐惧害怕',
  disgusted: '厌恶反感',
  surprised: '惊讶意外',
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
}

// 详细的情感色彩配置
export const emotionColorProfiles: Record<EmotionType, EmotionColorProfile> = {
  neutral: {
    primary: '#F5F5F5',
    secondary: '#E8E8E8',
    accent: '#D0D0D0',
    gradient: ['#FFFFFF', '#F5F5F5', '#EBEBEB'],
    glow: '#FFFFFF',
    saturation: 0.1,
    lightness: 0.95,
  },
  happy: {
    primary: '#FFD700',
    secondary: '#FFA500',
    accent: '#FFFF00',
    gradient: ['#FFD700', '#FFA500', '#FFFF00', '#FFE135'],
    glow: '#FFEC8B',
    saturation: 0.9,
    lightness: 0.7,
  },
  sad: {
    primary: '#1E3A8A',
    secondary: '#4A5D7A',
    accent: '#2E4A7A',
    gradient: ['#1E3A8A', '#4A5D7A', '#2E4A7A', '#38587A'],
    glow: '#4A6A9A',
    saturation: 0.4,
    lightness: 0.3,
  },
  angry: {
    primary: '#DC143C',
    secondary: '#8B0000',
    accent: '#FF0000',
    gradient: ['#DC143C', '#8B0000', '#FF0000', '#B22222'],
    glow: '#FF4444',
    saturation: 1.0,
    lightness: 0.4,
  },
  fearful: {
    primary: '#6B5B7F',
    secondary: '#5B4B6F',
    accent: '#7B6B8F',
    gradient: ['#6B5B7F', '#5B4B6F', '#7B6B8F', '#4B3B5F'],
    glow: '#8B7B9F',
    saturation: 0.3,
    lightness: 0.4,
  },
  disgusted: {
    primary: '#4A5D4A',
    secondary: '#3A4D3A',
    accent: '#5A6D5A',
    gradient: ['#4A5D4A', '#3A4D3A', '#5A6D5A', '#2A3D2A'],
    glow: '#6A7D6A',
    saturation: 0.2,
    lightness: 0.3,
  },
  surprised: {
    primary: '#FF8C00',
    secondary: '#FF6600',
    accent: '#FFAA00',
    gradient: ['#FF8C00', '#FF6600', '#FFAA00', '#FF7700'],
    glow: '#FFAA33',
    saturation: 0.95,
    lightness: 0.5,
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
