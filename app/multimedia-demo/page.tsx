'use client';

import { useState } from 'react';
import { useImageAI } from '@/lib/image-generation';
import { useVoiceAI } from '@/lib/voice-ai';

type TabType = 'image-gen' | 'image-analysis' | 'speech-recognition' | 'speech-synthesis';

export default function MultimediaDemoPage() {
  const [activeTab, setActiveTab] = useState<TabType>('image-gen');

  // Image AI
  const imageAI = useImageAI();
  const [promptInput, setPromptInput] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState<'dall-e-3' | 'flux'>('dall-e-3');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Voice AI
  const voiceAI = useVoiceAI();
  const [ttsTextInput, setTtsTextInput] = useState('');
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<'tts-1' | 'eleven-multilingual-v2'>('tts-1');

  const handleImageGeneration = async () => {
    if (!promptInput.trim()) return;
    await imageAI.generateImage(promptInput, {
      model: selectedImageModel,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
    });
  };

  const handleImageAnalysis = async () => {
    if (!imageUrlInput.trim()) return;
    await imageAI.analyzeImage(imageUrlInput, {
      detectObjects: true,
      extractText: true,
      detectColors: true,
      analyzeMood: true,
    });
  };

  const handleSpeechSynthesis = async () => {
    if (!ttsTextInput.trim()) return;
    const result = await voiceAI.synthesize(ttsTextInput, {
      model: selectedVoiceModel,
      speed: 1.0,
      outputFormat: 'mp3',
    });

    // 使用浏览器内置播放
    voiceAI.speak(ttsTextInput);
  };

  const handleRecordAndTranscribe = async () => {
    await voiceAI.recordAndTranscribe({
      language: 'zh',
      model: 'whisper-1',
    });
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧面板 - 功能导航 */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            多媒体 AI 能力
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            图像生成 • 语音处理
          </p>
        </div>

        {/* 功能列表 */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('image-gen')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'image-gen'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="font-medium">图像生成</div>
                <div className="text-xs opacity-70">DALL-E 3 / Flux</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('image-analysis')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'image-analysis'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <div className="font-medium">图像理解</div>
                <div className="text-xs opacity-70">GPT-4V / Vision</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('speech-recognition')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'speech-recognition'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <div>
                <div className="font-medium">语音识别</div>
                <div className="text-xs opacity-70">Whisper / STT</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('speech-synthesis')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'speech-synthesis'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <div>
                <div className="font-medium">语音合成</div>
                <div className="text-xs opacity-70">TTS / ElevenLabs</div>
              </div>
            </div>
          </button>
        </div>

        {/* 使用说明 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            功能说明
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>• 图像生成：使用 DALL-E 3 或 Flux 模型生成高质量图像</p>
            <p>• 图像理解：分析图像内容、检测对象、提取文字</p>
            <p>• 语音识别：将音频转换为文字（支持多语言）</p>
            <p>• 语音合成：将文字转换为自然语音</p>
          </div>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 图像生成 */}
        {activeTab === 'image-gen' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                AI 图像生成
              </h2>

              {/* 生成控制 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSelectedImageModel('dall-e-3')}
                    className={`px-3 py-1.5 rounded text-sm ${
                      selectedImageModel === 'dall-e-3'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    DALL-E 3
                  </button>
                  <button
                    onClick={() => setSelectedImageModel('flux')}
                    className={`px-3 py-1.5 rounded text-sm ${
                      selectedImageModel === 'flux'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Flux
                  </button>
                </div>

                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="描述你想要生成的图像..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-3"
                  rows={3}
                />

                <button
                  onClick={handleImageGeneration}
                  disabled={!promptInput.trim() || imageAI.isGenerating}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  {imageAI.isGenerating ? '生成中...' : '生成图像'}
                </button>

                {/* 示例提示 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    '一只可爱的柯基犬在海滩上',
                    '赛博朋克风格的未来城市',
                    '抽象的水彩画风景',
                    '一杯咖啡的特写照片',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setPromptInput(example);
                        handleImageGeneration();
                      }}
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* 生成结果 */}
              {imageAI.generatedImages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    生成结果 ({imageAI.generatedImages.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {imageAI.generatedImages.map((result, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={result.url}
                          alt="Generated"
                          className="w-full aspect-square object-cover"
                        />
                        <div className="p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {result.revisedPrompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 图像理解 */}
        {activeTab === 'image-analysis' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                AI 图像理解
              </h2>

              {/* 图像输入 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="输入图像 URL..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-3"
                />

                <button
                  onClick={handleImageAnalysis}
                  disabled={!imageUrlInput.trim() || imageAI.isAnalyzing}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  {imageAI.isAnalyzing ? '分析中...' : '分析图像'}
                </button>
              </div>

              {/* 分析结果 */}
              {imageAI.analysisHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    分析结果
                  </h3>
                  {imageAI.analysisHistory.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
                      <img
                        src={item.imageUrl}
                        alt="Analyzed"
                        className="w-full max-w-md rounded-lg mb-4"
                      />

                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">描述</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.result.description}</p>
                        </div>

                        {item.result.objects && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">检测对象</h4>
                            <div className="flex flex-wrap gap-2">
                              {item.result.objects.map((obj, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700"
                                >
                                  {obj.name} ({(obj.confidence * 100).toFixed(0)}%)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.result.colors && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">主要颜色</h4>
                            <div className="flex gap-2">
                              {item.result.colors.map((color, i) => (
                                <div
                                  key={i}
                                  className="w-8 h-8 rounded"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {item.result.tags && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">标签</h4>
                            <div className="flex flex-wrap gap-2">
                              {item.result.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 语音识别 */}
        {activeTab === 'speech-recognition' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                语音识别
              </h2>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
                <div className="text-center mb-6">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    voiceAI.isRecording
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {voiceAI.isRecording ? '正在录音...' : '点击开始录音'}
                  </p>
                </div>

                <button
                  onClick={handleRecordAndTranscribe}
                  disabled={voiceAI.isRecording || voiceAI.isTranscribing}
                  className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  {voiceAI.isRecording ? '录音中...' : voiceAI.isTranscribing ? '转录中...' : '开始录音并转录'}
                </button>
              </div>

              {/* 转录结果 */}
              {voiceAI.transcriptions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    转录历史
                  </h3>
                  <div className="space-y-3">
                    {voiceAI.transcriptions.map((result, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-gray-900 dark:text-white">{result.text}</p>
                          {result.confidence && (
                            <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                              {(result.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          语言: {result.language} • 时长: {result.duration.toFixed(1)}s
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 语音合成 */}
        {activeTab === 'speech-synthesis' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                语音合成
              </h2>

              {/* 合成控制 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSelectedVoiceModel('tts-1')}
                    className={`px-3 py-1.5 rounded text-sm ${
                      selectedVoiceModel === 'tts-1'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    OpenAI TTS
                  </button>
                  <button
                    onClick={() => setSelectedVoiceModel('eleven-multilingual-v2')}
                    className={`px-3 py-1.5 rounded text-sm ${
                      selectedVoiceModel === 'eleven-multilingual-v2'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    ElevenLabs
                  </button>
                </div>

                <textarea
                  value={ttsTextInput}
                  onChange={(e) => setTtsTextInput(e.target.value)}
                  placeholder="输入要转换为语音的文字..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-3"
                  rows={4}
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSpeechSynthesis}
                    disabled={!ttsTextInput.trim() || voiceAI.isSynthesizing}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {voiceAI.isSynthesizing ? '合成中...' : '合成并播放'}
                  </button>
                  <button
                    onClick={voiceAI.stopSpeaking}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    停止
                  </button>
                </div>

                {/* 示例文字 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    '你好，欢迎使用语音合成功能',
                    'Hello, this is a text to speech demo',
                    '人工智能正在改变我们的生活方式',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setTtsTextInput(example);
                        voiceAI.speak(example);
                      }}
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* 合成历史 */}
              {voiceAI.synthesizedAudio.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    合成历史 ({voiceAI.synthesizedAudio.length})
                  </h3>
                  <div className="space-y-3">
                    {voiceAI.synthesizedAudio.map((result, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between">
                          <p className="text-gray-900 dark:text-white flex-1">{result.text}</p>
                          <button
                            onClick={() => voiceAI.speak(result.text)}
                            className="ml-4 p-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          模型: {result.model} • 时长: {result.duration.toFixed(1)}s
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
