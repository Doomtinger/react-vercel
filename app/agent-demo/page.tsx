'use client';

import { useState } from 'react';
import { useToolLoopAgent, ToolDefinition } from '@/lib/tool-loop-agent-v2';
import { GenerativeUI, UITemplates } from '@/lib/generative-ui';

// 示例工具定义
const demoTools: ToolDefinition[] = [
  {
    name: 'calculate',
    description: '执行数学计算',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '要计算的数学表达式'
        }
      },
      required: ['expression']
    },
    execute: async ({ expression }) => {
      try {
        // 安全的数学计算
        const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
        // eslint-disable-next-line no-eval
        const result = eval(sanitized);
        return { expression, result };
      } catch (error) {
        throw new Error('计算失败');
      }
    }
  },

  {
    name: 'get_weather',
    description: '获取指定城市的天气信息',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称'
        }
      },
      required: ['city']
    },
    execute: async ({ city }) => {
      // 模拟天气数据
      const mockWeather = {
        北京: { temp: 25, condition: '晴天', humidity: 45 },
        上海: { temp: 28, condition: '多云', humidity: 60 },
        广州: { temp: 32, condition: '雷阵雨', humidity: 80 },
        深圳: { temp: 30, condition: '晴天', humidity: 70 },
      };

      const weather = mockWeather[city as keyof typeof mockWeather];
      if (!weather) {
        return { error: '找不到该城市的天气信息' };
      }

      return {
        city,
        ...weather,
        forecast: '未来三天天气平稳'
      };
    }
  },

  {
    name: 'search_data',
    description: '搜索数据库信息',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        }
      },
      required: ['query']
    },
    execute: async ({ query }) => {
      // 模拟搜索结果
      return {
        query,
        results: [
          { id: 1, title: `${query} 相关结果 1`, relevance: 0.95 },
          { id: 2, title: `${query} 相关结果 2`, relevance: 0.88 },
          { id: 3, title: `${query} 相关结果 3`, relevance: 0.75 },
        ],
        total: 3
      };
    }
  },

  {
    name: 'generate_ui',
    description: '生成UI组件',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'UI类型',
          enum: ['chart', 'card', 'list', 'table']
        },
        data: {
          type: 'object',
          description: 'UI数据'
        }
      },
      required: ['type']
    },
    execute: async ({ type, data }) => {
      return {
        type,
        data,
        message: `UI组件已生成: ${type}`
      };
    }
  }
];

const systemPrompt = `你是一个智能助手，可以使用多种工具来帮助用户完成任务。

当遇到需要计算的问题时，使用 calculate 工具。
当用户询问天气时，使用 get_weather 工具。
当用户需要搜索信息时，使用 search_data 工具。
当用户需要数据可视化时，使用 generate_ui 工具。

在回答时，如果数据适合可视化，可以生成UI组件来展示。
生成UI时使用以下格式：

\`\`\`ui
{
  "type": "card",
  "props": { "title": "标题" },
  "children": [...]
}
\`\`\`

每次调用工具后，根据工具结果给出清晰的回答。如果需要多步推理，可以连续调用多个工具。`;

export default function AgentDemoPage() {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const agent = useToolLoopAgent({
    model: 'glm-4-flash',
    maxIterations: 10,
    systemPrompt,
    tools: demoTools,
    onStep: (step) => {
      console.log('Agent step:', step);
    },
    onComplete: (finalAnswer) => {
      console.log('Agent completed:', finalAnswer);
    },
    onError: (error) => {
      console.error('Agent error:', error);
    },
  });

  const demos = [
    {
      id: 'math',
      title: '数学计算',
      description: '多步骤数学问题求解',
      input: '计算 (15 + 25) * 3 - 45 的结果，然后对这个结果加 100',
    },
    {
      id: 'weather',
      title: '天气查询',
      description: '查询多个城市的天气',
      input: '帮我查一下北京和上海的天气，然后告诉我哪个城市更适合外出活动',
    },
    {
      id: 'search',
      title: '信息搜索',
      description: '搜索相关信息并总结',
      input: '搜索关于"机器学习"的信息，然后总结前3条结果',
    },
    {
      id: 'ui',
      title: '生成式UI',
      description: '让AI生成可视化界面',
      input: '创建一个展示销售数据的UI，包含北京、上海、广州三个城市的销售额，分别是120、150、180万元',
    },
  ];

  const handleDemoClick = (demo: typeof demos[0]) => {
    setSelectedDemo(demo.id);
    agent.start(demo.input);
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agent.input.trim()) {
      agent.start(agent.input);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧边栏 - Demo选择 */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ToolLoopAgent Demo
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            选择一个示例来体验多步循环和生成式UI功能
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

        {/* 工具列表 */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            可用工具
          </h2>
          <div className="space-y-2">
            {demoTools.map((tool) => (
              <div
                key={tool.name}
                className="p-2 rounded bg-gray-100 dark:bg-gray-700 text-xs"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {tool.name}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {tool.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mt-8 p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            运行状态
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">迭代次数:</span>
              <span className="font-medium">{agent.iterationCount}/{agent.maxIterations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">状态:</span>
              <span className={`font-medium ${
                agent.isComplete ? 'text-green-600' :
                agent.isLoading ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                {agent.isComplete ? '已完成' : agent.isLoading ? '运行中' : '待机'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col">
        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {agent.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  准备就绪
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  从左侧选择一个示例开始体验
                </p>
              </div>
            </div>
          ) : (
            agent.messages.map((message, index) => (
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
                  {message.content && typeof message.content === 'string' && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <GenerativeUI content={message.content} />
                    </div>
                  )}

                  {/* 工具调用显示 */}
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.toolInvocations.map((tool, toolIndex) => (
                        <div
                          key={toolIndex}
                          className="p-2 rounded bg-gray-100 dark:bg-gray-700 text-xs"
                        >
                          <div className="font-mono font-medium">
                            📞 {tool.toolName}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mt-1">
                            {JSON.stringify(tool.toolCallId, null, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* 加载状态 */}
          {agent.isLoading && (
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
          <form onSubmit={handleMessageSubmit} className="flex gap-2">
            <input
              type="text"
              value={agent.input}
              onChange={(e) => agent.setInput(e.target.value)}
              placeholder="输入你的问题..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={agent.isLoading}
            />
            <button
              type="submit"
              disabled={!agent.input.trim() || agent.isLoading}
              className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium transition-colors"
            >
              {agent.isLoading ? '运行中...' : '发送'}
            </button>
            <button
              type="button"
              onClick={agent.reset}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >
              重置
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
