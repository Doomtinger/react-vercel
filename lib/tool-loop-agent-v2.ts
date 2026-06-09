'use client';

import { useChat, ToolInvocation } from '@ai-sdk/react';
import { useState } from 'react';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any) => Promise<any>;
}

export interface AgentStep {
  id: string;
  type: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: ToolInvocation[];
  toolResults?: any[];
  timestamp: number;
}

export interface ToolLoopAgentConfig {
  model?: string;
  maxIterations?: number;
  systemPrompt?: string;
  tools: ToolDefinition[];
  onStep?: (step: AgentStep) => void;
  onComplete?: (finalAnswer: string) => void;
  onError?: (error: Error) => void;
}

export function useToolLoopAgent(config: ToolLoopAgentConfig) {
  const {
    model = 'glm-4-flash',
    maxIterations = 10,
    systemPrompt,
    tools,
    onStep,
    onComplete,
    onError,
  } = config;

  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [iterationCount, setIterationCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // 构建 AI SDK 所需的工具配置
  const toolConfigurations = tools.reduce((acc, tool) => {
    acc[tool.name] = {
      description: tool.description,
      parameters: tool.parameters,
      execute: async (args: any) => {
        try {
          const result = await tool.execute(args);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          throw error;
        }
      },
    };
    return acc;
  }, {} as Record<string, any>);

  const { messages, handleSubmit, isLoading, input, setInput, append } = useChat({
    api: '/api/chat-agent',
    body: { model },
    initialMessages: systemPrompt ? [{ role: 'system', content: systemPrompt }] : [],
    tools: toolConfigurations,
    onFinish: (message) => {
      if (message.role === 'assistant' && message.toolInvocations?.length === 0) {
        // 没有工具调用，说明是最终答案
        const finalAnswer = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        setIsComplete(true);
        onComplete?.(finalAnswer);
      }
    },
    onToolCallEnd: ({ toolCall }) => {
      console.log('Tool call completed:', toolCall);
    },
  });

  const addStep = (step: AgentStep) => {
    setSteps(prev => [...prev, step]);
    onStep?.(step);
  };

  const start = async (userInput: string) => {
    setSteps([]);
    setIterationCount(0);
    setIsComplete(false);

    // 添加用户输入步骤
    addStep({
      id: `user-${Date.now()}`,
      type: 'user',
      content: userInput,
      timestamp: Date.now(),
    });

    // 提交到 chat
    append({
      role: 'user',
      content: userInput,
    });
  };

  const reset = () => {
    setSteps([]);
    setIterationCount(0);
    setIsComplete(false);
    setInput('');
  };

  return {
    steps,
    messages,
    iterationCount,
    isComplete,
    isLoading,
    input,
    setInput,
    start,
    reset,
    handleSubmit,
    maxIterations,
    tools,
  };
}
