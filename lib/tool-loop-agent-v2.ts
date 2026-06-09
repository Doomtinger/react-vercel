'use client';

import { useChat } from '@ai-sdk/react';
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
    tools,
    onStep,
  } = config;

  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [iterationCount, setIterationCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const { messages, status } = useChat();

  const isLoading = status === 'streaming' || status === 'submitted';

  const addStep = (step: AgentStep) => {
    setSteps(prev => [...prev, step]);
    onStep?.(step);
  };

  const start = async (userInput: string) => {
    setSteps([]);
    setIterationCount(0);
    setIsComplete(false);

    addStep({
      id: `user-${Date.now()}`,
      type: 'user',
      content: userInput,
      timestamp: Date.now(),
    });
  };

  const reset = () => {
    setSteps([]);
    setIterationCount(0);
    setIsComplete(false);
    setInputValue('');
  };

  return {
    steps,
    messages,
    iterationCount,
    isComplete,
    isLoading,
    input: inputValue,
    setInput: setInputValue,
    start,
    reset,
    maxIterations: 10,
    tools,
  };
}
