'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { GenerativeUI } from '@/lib/generative-ui';

const demos = [
  {
    id: 'ui-list',
    title: '生成列表',
    description: '生成一个待办事项列表',
    input: '创建一个待办事项列表UI，包含3个任务：完成代码审查、编写测试用例、更新文档。请用```ui JSON```格式输出。',
  },
  {
    id: 'ui-chart',
    title: '数据可视化',
    description: '生成销售数据图表',
    input: '创建一个销售数据图表，展示北京、上海、广州三个城市的销售额，分别是120、150、180万元。请用```ui JSON```格式输出。',
  },
  {
    id: 'ui-table',
    title: '数据表格',
    description: '生成产品对比表格',
    input: '创建一个产品对比表格，比较三款产品A、B、C的价格(999/1299/799元)、功能(基础/高级/基础)和评分(4.5/4.8/4.2)。请用```ui JSON```格式输出。',
  },
  {
    id: 'ui-card',
    title: '信息卡片',
    description: '生成用户信息卡片',
    input: '创建一个用户信息卡片，显示姓名张三、邮箱zhangsan@example.com、职位软件工程师、部门技术部。请用```ui JSON```格式输出。',
  },
];

export default function AgentDemoPage() {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleDemoClick = (demo: typeof demos[0]) => {
    setSelectedDemo(demo.id);
    setInputValue(demo.input);
    sendMessage(
      { text: demo.input },
      {
        body: {
          model: 'glm-4-flash',
        },
      }
    );
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (inputValue?.trim()) {
      sendMessage(
        { text: inputValue },
        {
          body: {
            model: 'glm-4-flash',
          },
        }
      );
      setInputValue('');
    }
  };

  const getMessageContent = (message: any): string => {
    if (typeof message === 'string') return message;
    if (message.content) return message.content;
    if (message.parts) {
      return message.parts
        .filter((part: any) => part.type === 'text' && part.text !== undefined)
        .map((part: any) => part.text)
        .join('');
    }
    return '';
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧边栏 */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            生成式UI Demo
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            选择一个示例体验AI生成UI的能力
          </p>
        </div>

        <div className="space-y-3">
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleDemoClick(demo)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                selectedDemo === demo.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {demo.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {demo.description}
              </p>
            </button>
          ))}
        </div>

        {/* 功能说明 */}
        <div className="mt-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            功能特点
          </h3>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li>• AI 动态生成UI组件</li>
            <li>• 支持多种UI类型</li>
            <li>• 实时渲染展示</li>
            <li>• 简洁的JSON语法</li>
          </ul>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col">
        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  生成式UI演示
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  从左侧选择一个示例开始体验
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* 消息内容 */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <GenerativeUI content={getMessageContent(message)} />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue || ''}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入你的问题..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue?.trim() || isLoading}
              className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium transition-colors"
            >
              {isLoading ? '生成中...' : '发送'}
            </button>
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
