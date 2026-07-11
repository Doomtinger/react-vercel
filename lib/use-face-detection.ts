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
      console.log('正在启动摄像头...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: videoWidth },
          height: { ideal: videoHeight },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // 等待视频元数据加载
        await new Promise((resolve, reject) => {
          videoRef.current!.onloadedmetadata = () => {
            console.log('视频元数据已加载，尺寸:', videoRef.current!.videoWidth, 'x', videoRef.current!.videoHeight);
            resolve(true);
          };
          videoRef.current!.onerror = (e) => {
            console.error('视频加载错误:', e);
            reject(e);
          };
          // 超时处理
          setTimeout(() => reject(new Error('视频加载超时')), 5000);
        });

        await videoRef.current.play();
        console.log('视频开始播放');
      }

      setIsStreaming(true);
      setError(null);

      // 开始情感检测循环
      startEmotionDetection();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '无法访问摄像头';
      setError(errorMessage);
      console.error('摄像头启动失败:', err);
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

// 情感颜色映射
export const emotionColors: Record<EmotionType, string> = {
  neutral: '#9CA3AF',      // 灰色
  happy: '#FCD34D',        // 金黄色
  sad: '#60A5FA',          // 蓝色
  angry: '#EF4444',        // 红色
  fearful: '#A78BFA',      // 紫色
  disgusted: '#10B981',    // 绿色
  surprised: '#F97316',    // 橙色
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
