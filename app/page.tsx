'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';

// Model options organized by provider
const MODEL_OPTIONS: Record<string, Array<{ id: string; name: string; recommended?: boolean }>> = {
  '智谱 AI': [
    { id: 'glm-4-flash', name: 'GLM-4 Flash', recommended: true },
    { id: 'glm-4-plus', name: 'GLM-4 Plus' },
    { id: 'glm-4-air', name: 'GLM-4 Air' },
    { id: 'glm-3-turbo', name: 'GLM-3 Turbo' },
  ],
  'DeepSeek': [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ],
  '豆包': [
    { id: 'doubao-pro-32k', name: '豆包 Pro 32K' },
    { id: 'doubao-pro-128k', name: '豆包 Pro 128K' },
    { id: 'doubao-lite-32k', name: '豆包 Lite 32K' },
  ],
  'Claude': [
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus' },
  ],
  'GPT': [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('glm-4-flash');
  const [glmMessages, setGlmMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { messages: chatMessages, sendMessage, status, error } = useChat();

  const allMessages = selectedModel.startsWith('glm') ? glmMessages : chatMessages;
  const isChatLoading = status === 'submitted' || status === 'streaming';

  const selectedModelData = Object.values(MODEL_OPTIONS)
    .flat()
    .find(m => m.id === selectedModel);

  useEffect(() => {
    if (error) {
      console.error('Chat error:', error);
    }
  }, [error]);

  const handleSubmitGLM = useCallback(async (userInput: string, images?: string[]) => {
    if (isLoading) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      images: images,
    };

    setGlmMessages(prev => [...prev, userMessage]);

    try {
      abortControllerRef.current = new AbortController();

      // Build message content with images
      let messageContent: any = userInput;
      if (images && images.length > 0) {
        messageContent = [
          { type: 'text', text: userInput },
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ];
      }

      const response = await fetch('/api/glm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: messageContent }],
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setGlmMessages(prev => [...prev, assistantMessage]);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setGlmMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: msg.content + parsed.text }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('GLM API error:', err);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading]);

  const handleSubmit = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if ((!input.trim() && selectedImages.length === 0) || isLoading || isChatLoading) return;

      if (selectedModel.startsWith('glm')) {
        handleSubmitGLM(input, selectedImages);
      } else {
        // Convert images to FileUIPart format for AI SDK
        const fileParts: Array<{ url: string; type: 'file'; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }> = selectedImages.map((dataUrl) => {
          const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          return {
            url: dataUrl,
            type: 'file' as const,
            mediaType: mimeString as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          };
        });

        sendMessage(
          {
            text: input,
            files: fileParts.length > 0 ? fileParts : undefined
          },
          { body: { model: selectedModel } }
        );
      }
      setInput('');
      setSelectedImages([]);
    },
    [input, selectedImages, isLoading, isChatLoading, selectedModel, sendMessage, handleSubmitGLM]
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const getMessageText = (message: any): string => {
    if (message.content) return message.content;
    if (message.parts) {
      return message.parts
        .filter((part: any) => part.type === 'text' && part.text !== undefined)
        .map((part: any) => part.text)
        .join('');
    }
    return '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setSelectedImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  const examples = [
    '介绍一下你自己',
    '帮我写一个快速排序算法',
    '解释什么是机器学习',
    '用Python写一个计算器',
  ];

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">AI Chat</h1>
        </div>

        <button
          onClick={() => setShowModelSelector(!showModelSelector)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{selectedModelData?.name || '选择模型'}</span>
          <svg className={`w-4 h-4 text-zinc-500 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </header>

      {/* Model Selector Dropdown */}
      {showModelSelector && (
        <div className="absolute top-16 right-4 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 space-y-1">
            {Object.entries(MODEL_OPTIONS).map(([provider, models]) => (
              <div key={provider}>
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1">{provider}</div>
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setShowModelSelector(false);
                      setGlmMessages([]);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedModel === model.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      {'recommended' in model && model.recommended && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          推荐
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        {allMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">你好！</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-center">我是 AI 助手，有什么可以帮你的吗？</p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="p-3 text-left rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{example}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {allMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-2xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-blue-500'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                    <span className="text-white text-xs font-medium">
                      {message.role === 'user' ? '你' : 'AI'}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {/* Images - for custom Message type */}
                    {'images' in message && message.images && message.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.images.map((image: string, imgIndex: number) => (
                          <img
                            key={imgIndex}
                            src={image}
                            alt={`Message image ${imgIndex + 1}`}
                            className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    {/* Images - for AI SDK UIMessage type with file parts */}
                    {'parts' in message && message.parts && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.parts
                          .filter((part: any) => part.type === 'file' && part.url)
                          .map((part: any, imgIndex: number) => (
                            <img
                              key={imgIndex}
                              src={part.url}
                              alt={`Message image ${imgIndex + 1}`}
                              className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
                            />
                          ))}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {getMessageText(message)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading State */}
            {(isLoading || isChatLoading) && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-2xl">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AI</span>
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto p-4">
          {/* Image Preview */}
          {selectedImages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
                title="上传图片"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="发送消息给 AI..."
                className="flex-1 resize-none outline-none text-sm bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                rows={1}
                disabled={isLoading || isChatLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                style={{ minHeight: '24px', maxHeight: '200px' }}
              />

              {(isLoading || isChatLoading) ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  title="停止生成"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white transition-colors"
                  title="发送消息"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
              由 {selectedModelData?.name || 'AI'} 驱动 • 按 Enter 发送，Shift + Enter 换行
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
}
