'use client';

import { useState, useCallback, useRef } from 'react';

// 语音识别配置
export interface SpeechRecognitionConfig {
  language?: string;
  model?: 'whisper-1' | 'whisper-large';
  temperature?: number;
}

// 语音合成配置
export interface SpeechSynthesisConfig {
  voice?: string;
  model?: 'tts-1' | 'tts-1-hd' | 'eleven-multilingual-v2' | 'eleven-turbo-v2';
  speed?: number;
  outputFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
}

// 语音识别结果
export interface SpeechRecognitionResult {
  text: string;
  language: string;
  duration: number;
  confidence?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

// 语音合成结果
export interface SpeechSynthesisResult {
  audioUrl: string;
  text: string;
  duration: number;
  model: string;
  timestamp: number;
}

export function useVoiceAI() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState<SpeechRecognitionResult[]>([]);
  const [synthesizedAudio, setSynthesizedAudio] = useState<SpeechSynthesisResult[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('无法访问麦克风');
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('没有正在进行的录音'));
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsRecording(false);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    });
  }, []);

  // 语音转文字（模拟实现）
  const transcribe = useCallback(async (
    audioFile: File | Blob,
    config: SpeechRecognitionConfig = {}
  ): Promise<SpeechRecognitionResult> => {
    setIsTranscribing(true);

    try {
      const { language = 'zh', model = 'whisper-1' } = config;

      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

      // 生成模拟转录结果
      const mockTexts = [
        '这是一段测试音频的转录文本。',
        '语音识别技术可以将语音转换为文字。',
        'Hello, this is a test transcription.',
        '语音识别系统正在处理您的音频文件。',
      ];

      const result: SpeechRecognitionResult = {
        text: mockTexts[Math.floor(Math.random() * mockTexts.length)],
        language,
        duration: 5.2,
        confidence: 0.95,
        words: [
          { word: '这', start: 0, end: 0.3, confidence: 0.98 },
          { word: '是', start: 0.3, end: 0.5, confidence: 0.96 },
          { word: '一段', start: 0.5, end: 0.8, confidence: 0.97 },
          { word: '测试', start: 0.8, end: 1.1, confidence: 0.95 },
        ],
      };

      setTranscriptions(prev => [...prev, result]);

      return result;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // 文字转语音（模拟实现）
  const synthesize = useCallback(async (
    text: string,
    config: SpeechSynthesisConfig = {}
  ): Promise<SpeechSynthesisResult> => {
    setIsSynthesizing(true);

    try {
      const { model = 'tts-1', speed = 1.0, outputFormat = 'mp3' } = config;

      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

      // 估算音频时长（平均每字0.3秒）
      const duration = text.length * 0.3 / speed;

      const result: SpeechSynthesisResult = {
        audioUrl: `data:audio/${outputFormat};base64,mockAudioData${Date.now()}`,
        text,
        duration,
        model,
        timestamp: Date.now(),
      };

      setSynthesizedAudio(prev => [...prev, result]);

      return result;
    } finally {
      setIsSynthesizing(false);
    }
  }, []);

  // 使用浏览器内置的语音合成播放
  const speak = useCallback((text: string, voiceIndex?: number) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);

      // 设置语言
      const isChinese = /[一-龥]/.test(text);
      utterance.lang = isChinese ? 'zh-CN' : 'en-US';

      // 选择语音
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const selectedVoice = voices[voiceIndex || 0];
        utterance.voice = selectedVoice;
      }

      // 播放
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported');
    }
  }, []);

  // 停止播放
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // 获取可用的语音列表
  const getAvailableVoices = useCallback((): SpeechSynthesisVoice[] => {
    if ('speechSynthesis' in window) {
      return window.speechSynthesis.getVoices();
    }
    return [];
  }, []);

  // 录音并转录（一站式）
  const recordAndTranscribe = useCallback(async (
    config?: SpeechRecognitionConfig
  ): Promise<SpeechRecognitionResult> => {
    await startRecording();

    // 自动录音5秒
    await new Promise(resolve => setTimeout(resolve, 5000));

    const audioBlob = await stopRecording();
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

    return transcribe(audioFile, config);
  }, [startRecording, stopRecording, transcribe]);

  // 清空历史
  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  const clearSynthesizedAudio = useCallback(() => {
    setSynthesizedAudio([]);
  }, []);

  return {
    isRecording,
    isTranscribing,
    isSynthesizing,
    transcriptions,
    synthesizedAudio,
    startRecording,
    stopRecording,
    transcribe,
    synthesize,
    speak,
    stopSpeaking,
    getAvailableVoices,
    recordAndTranscribe,
    clearTranscriptions,
    clearSynthesizedAudio,
  };
}
