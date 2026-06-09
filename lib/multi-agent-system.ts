'use client';

import { useState, useCallback } from 'react';

// Agent状态
export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

// 消息类型
export interface AgentMessage {
  id: string;
  from: string; // 发送者agent ID
  to: string | 'all'; // 接收者agent ID或广播
  type: 'request' | 'response' | 'notification' | 'broadcast';
  content: any;
  timestamp: number;
  inReplyTo?: string; // 回复的消息ID
}

// Agent任务
export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // 负责的agent ID
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies?: string[]; // 依赖的任务ID
  input?: any;
  output?: any;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

// Agent定义
export interface MultiAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
  model?: string;
  currentTask?: string;
  messageHistory: AgentMessage[];
}

// 协作会话
export interface CollaborationSession {
  id: string;
  name: string;
  description: string;
  goal: string;
  participants: string[]; // 参与的agent ID列表
  tasks: AgentTask[];
  messages: AgentMessage[];
  status: 'active' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

// 多Agent系统配置
export interface MultiAgentSystemConfig {
  onAgentMessage?: (message: AgentMessage) => void;
  onTaskComplete?: (task: AgentTask) => void;
  onSessionComplete?: (session: CollaborationSession) => void;
}

export function useMultiAgentSystem(config: MultiAgentSystemConfig = {}) {
  const [agents, setAgents] = useState<MultiAgent[]>([
    {
      id: 'coordinator',
      name: '协调者',
      role: '工作流协调',
      description: '负责任务分配和整体协调',
      capabilities: ['任务分配', '进度跟踪', '结果汇总', '冲突解决'],
      status: 'idle',
      model: 'glm-4-flash',
      messageHistory: [],
    },
    {
      id: 'researcher',
      name: '研究员',
      role: '信息收集',
      description: '负责收集和整理相关信息',
      capabilities: ['信息搜索', '数据收集', '资料整理'],
      status: 'idle',
      model: 'glm-4-flash',
      messageHistory: [],
    },
    {
      id: 'analyst',
      name: '分析师',
      role: '深度分析',
      description: '负责数据分析和逻辑推理',
      capabilities: ['数据分析', '逻辑推理', '趋势预测', '模型评估'],
      status: 'idle',
      model: 'glm-4-plus',
      messageHistory: [],
    },
    {
      id: 'writer',
      name: '写作者',
      role: '内容生成',
      description: '负责生成高质量的文本内容',
      capabilities: ['文案写作', '报告撰写', '内容优化', '多语言翻译'],
      status: 'idle',
      model: 'glm-4-flash',
      messageHistory: [],
    },
    {
      id: 'reviewer',
      name: '审核员',
      role: '质量把控',
      description: '负责审核和改进输出质量',
      capabilities: ['质量检查', '错误修正', '改进建议', '风险评估'],
      status: 'idle',
      model: 'glm-4-flash',
      messageHistory: [],
    },
    {
      id: 'creative',
      name: '创意师',
      role: '创意生成',
      description: '负责产生创新性的想法和方案',
      capabilities: ['创意生成', '方案设计', '头脑风暴', '创新思维'],
      status: 'idle',
      model: 'glm-4-plus',
      messageHistory: [],
    },
  ]);

  const [sessions, setSessions] = useState<Record<string, CollaborationSession>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const updateAgentStatus = useCallback((agentId: string, status: AgentStatus) => {
    setAgents(prev => prev.map(agent =>
      agent.id === agentId ? { ...agent, status } : agent
    ));
  }, []);

  const addAgentMessage = useCallback((agentId: string, message: AgentMessage) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        return {
          ...agent,
          messageHistory: [...agent.messageHistory, message],
        };
      }
      return agent;
    }));
    config.onAgentMessage?.(message);
  }, [config]);

  const createSession = (session: Omit<CollaborationSession, 'id' | 'messages' | 'createdAt' | 'status'>): { id: string; session: CollaborationSession } => {
    const id = `session-${Date.now()}`;
    const newSession: CollaborationSession = {
      ...session,
      id,
      messages: [],
      createdAt: Date.now(),
      status: 'active',
    };
    setSessions(prev => ({ ...prev, [id]: newSession }));
    return { id, session: newSession };
  };

  const addTask = useCallback((sessionId: string, task: Omit<AgentTask, 'id' | 'createdAt'>) => {
    const newTask: AgentTask = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: Date.now(),
    };

    setSessions(prev => {
      const session = prev[sessionId];
      if (!session) return prev;

      return {
        ...prev,
        [sessionId]: {
          ...session,
          tasks: [...session.tasks, newTask],
        },
      };
    });

    return newTask;
  }, []);

  const updateTask = useCallback((sessionId: string, taskId: string, updates: Partial<AgentTask>) => {
    setSessions(prev => {
      const session = prev[sessionId];
      if (!session) return prev;

      const updatedTasks = session.tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );

      return {
        ...prev,
        [sessionId]: { ...session, tasks: updatedTasks },
      };
    });

    // 如果任务完成，触发回调
    if (updates.status === 'completed') {
      const session = sessions[sessionId];
      const task = session?.tasks.find(t => t.id === taskId);
      if (task) {
        config.onTaskComplete?.({ ...task, ...updates });
      }
    }
  }, [sessions, config]);

  const executeTask = async (sessionId: string, task: AgentTask) => {
    try {
      // 更新agent状态为busy
      updateAgentStatus(task.assignedTo, 'busy');

      // 更新任务状态为进行中
      updateTask(sessionId, task.id, {
        status: 'in_progress',
        startedAt: Date.now(),
      });

      // 模拟agent执行任务
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // 生成任务结果
      const result = {
        message: `${task.assignedTo} 完成了任务: ${task.title}`,
        output: `任务 ${task.title} 的执行结果`,
        timestamp: Date.now(),
      };

      // 更新任务状态为完成
      updateTask(sessionId, task.id, {
        status: 'completed',
        output: result,
        completedAt: Date.now(),
      });

      // 更新agent状态为idle
      updateAgentStatus(task.assignedTo, 'idle');

      return result;

    } catch (error) {
      // 任务失败
      updateTask(sessionId, task.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误',
        completedAt: Date.now(),
      });

      updateAgentStatus(task.assignedTo, 'error');

      throw error;
    }
  };

  const sendMessage = (sessionId: string, from: string, to: string | 'all', type: AgentMessage['type'], content: any) => {
    const message: AgentMessage = {
      id: `msg-${Date.now()}`,
      from,
      to,
      type,
      content,
      timestamp: Date.now(),
    };

    // 添加到会话消息历史
    setSessions(prev => {
      const session = prev[sessionId];
      if (!session) return prev;

      return {
        ...prev,
        [sessionId]: {
          ...session,
          messages: [...session.messages, message],
        },
      };
    });

    // 添加到发送者的消息历史
    addAgentMessage(from, message);

    // 如果是点对点消息，也添加到接收者的消息历史
    if (to !== 'all') {
      addAgentMessage(to, message);
    }

    return message;
  };

  const runSession = async (sessionId: string, sessionParam?: CollaborationSession) => {
    const session = sessionParam || sessions[sessionId];
    if (!session) throw new Error('会话不存在');

    setActiveSessionId(sessionId);

    try {
      // 按依赖关系执行任务
      const taskQueue = [...session.tasks];
      const completedTasks = new Set<string>();

      while (taskQueue.length > 0) {
        // 找出可以执行的任务（所有依赖都已完成）
        const availableTaskIndex = taskQueue.findIndex(task =>
          task.dependencies?.every(dep => completedTasks.has(dep)) !== false &&
          task.status === 'pending'
        );

        if (availableTaskIndex === -1) break;

        const task = taskQueue.splice(availableTaskIndex, 1)[0];

        // 在任务开始前，让相关agents之间发送消息协调
        if (task.assignedTo !== 'coordinator') {
          sendMessage(
            sessionId,
            'coordinator',
            task.assignedTo,
            'request',
            {
              type: 'task_assignment',
              task: {
                id: task.id,
                title: task.title,
                description: task.description,
              },
            }
          );
        }

        // 执行任务
        await executeTask(sessionId, task);

        completedTasks.add(task.id);

        // 任务完成后，发送通知
        sendMessage(
          sessionId,
          task.assignedTo,
          'coordinator',
          'response',
          {
            type: 'task_complete',
            taskId: task.id,
            output: task.output,
          }
        );
      }

      // 所有任务完成
      setSessions(prev => {
        const session = prev[sessionId];
        if (!session) return prev;

        return {
          ...prev,
          [sessionId]: {
            ...session,
            status: 'completed',
            completedAt: Date.now(),
          },
        };
      });

      config.onSessionComplete?.(sessions[sessionId]);

    } catch (error) {
      setSessions(prev => {
        const session = prev[sessionId];
        if (!session) return prev;

        return {
          ...prev,
          [sessionId]: { ...session, status: 'failed' },
        };
      });
    } finally {
      setActiveSessionId(null);
    }
  };

  const resetSession = (sessionId: string) => {
    const session = sessions[sessionId];
    if (!session) return;

    const resetTasks = session.tasks.map(task => ({
      ...task,
      status: 'pending' as const,
      output: undefined,
      error: undefined,
      startedAt: undefined,
      completedAt: undefined,
    }));

    setSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...session,
        tasks: resetTasks,
        messages: [],
        status: 'active',
      },
    }));
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const updated = { ...prev };
      delete updated[sessionId];
      return updated;
    });
  };

  return {
    agents,
    sessions,
    activeSessionId,
    createSession,
    addTask,
    updateTask,
    sendMessage,
    runSession,
    resetSession,
    deleteSession,
    getSession: (id: string) => sessions[id],
    getAgent: (id: string) => agents.find(a => a.id === id),
  };
}
