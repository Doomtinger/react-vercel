'use client';

import { useState, useCallback } from 'react';

// 工作流步骤类型
export type WorkflowStepType = 'start' | 'process' | 'decision' | 'agent' | 'merge' | 'end';

// 工作流步骤定义
export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  description?: string;
  agentId?: string;
  condition?: string; // 决策条件
  nextSteps?: string[]; // 下一步骤ID列表
  input?: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  error?: string;
}

// 工作流定义
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  startStepId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  currentStepId?: string;
  variables?: Record<string, any>;
}

// Agent定义
export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  model?: string;
}

// WorkflowAgent配置
export interface WorkflowAgentConfig {
  onStepStart?: (step: WorkflowStep) => void;
  onStepComplete?: (step: WorkflowStep) => void;
  onStepError?: (step: WorkflowStep, error: Error) => void;
  onWorkflowComplete?: (workflow: Workflow) => void;
  onWorkflowError?: (workflow: Workflow, error: Error) => void;
}

export function useWorkflowAgent(config: WorkflowAgentConfig = {}) {
  const [workflows, setWorkflows] = useState<Record<string, Workflow>>({});
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [agents] = useState<Agent[]>([
    {
      id: 'coordinator',
      name: '协调者',
      role: '工作流协调',
      description: '负责整体工作流的调度和协调',
      capabilities: ['任务分配', '进度跟踪', '结果汇总'],
      model: 'glm-4-flash',
    },
    {
      id: 'researcher',
      name: '研究员',
      role: '信息收集',
      description: '负责收集和分析信息',
      capabilities: ['网络搜索', '数据分析', '报告生成'],
      model: 'glm-4-flash',
    },
    {
      id: 'analyst',
      name: '分析师',
      role: '数据分析',
      description: '负责深度分析和推理',
      capabilities: ['逻辑推理', '数据分析', '趋势预测'],
      model: 'glm-4-plus',
    },
    {
      id: 'writer',
      name: '写作者',
      role: '内容生成',
      description: '负责生成高质量的文本内容',
      capabilities: ['文案写作', '报告撰写', '内容优化'],
      model: 'glm-4-flash',
    },
    {
      id: 'reviewer',
      name: '审核员',
      role: '质量把控',
      description: '负责审核和改进输出结果',
      capabilities: ['质量检查', '错误修正', '改进建议'],
      model: 'glm-4-flash',
    },
  ]);

  const createWorkflow = (workflow: Omit<Workflow, 'id' | 'status'>): { id: string; workflow: Workflow } => {
    const id = `workflow-${Date.now()}`;
    const newWorkflow: Workflow = {
      ...workflow,
      id,
      status: 'idle',
    };
    setWorkflows(prev => ({ ...prev, [id]: newWorkflow }));
    return { id, workflow: newWorkflow };
  };

  const updateWorkflow = useCallback((
    workflowId: string,
    updates: Partial<Workflow>
  ) => {
    setWorkflows(prev => ({
      ...prev,
      [workflowId]: { ...prev[workflowId], ...updates },
    }));
  }, []);

  const updateStep = useCallback((
    workflowId: string,
    stepId: string,
    updates: Partial<WorkflowStep>
  ) => {
    setWorkflows(prev => {
      const workflow = prev[workflowId];
      if (!workflow) return prev;

      const updatedSteps = workflow.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      );

      return {
        ...prev,
        [workflowId]: { ...workflow, steps: updatedSteps },
      };
    });
  }, []);

  const executeStep = async (
    workflowId: string,
    step: WorkflowStep
  ): Promise<WorkflowStep> => {
    config.onStepStart?.(step);

    // 更新步骤状态为运行中
    updateStep(workflowId, step.id, {
      status: 'running',
      startTime: Date.now(),
    });

    try {
      let result: any;

      switch (step.type) {
        case 'start':
          result = { message: '工作流开始' };
          break;

        case 'agent':
          // 模拟agent执行
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          result = {
            agentId: step.agentId,
            output: `${step.name}完成`,
            timestamp: Date.now(),
          };
          break;

        case 'decision':
          // 简单决策逻辑
          result = {
            decision: Math.random() > 0.5 ? 'yes' : 'no',
            reason: '基于条件的决策结果',
          };
          break;

        case 'process':
          await new Promise(resolve => setTimeout(resolve, 500));
          result = { processed: true };
          break;

        case 'merge':
          result = { merged: true };
          break;

        case 'end':
          result = { message: '工作流完成' };
          break;

        default:
          result = {};
      }

      // 更新步骤为完成状态
      const completedStep: WorkflowStep = {
        ...step,
        status: 'completed',
        output: result,
        endTime: Date.now(),
      };

      updateStep(workflowId, step.id, completedStep);
      config.onStepComplete?.(completedStep);

      return completedStep;

    } catch (error) {
      const failedStep: WorkflowStep = {
        ...step,
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误',
        endTime: Date.now(),
      };

      updateStep(workflowId, step.id, failedStep);
      config.onStepError?.(failedStep, error as Error);

      throw error;
    }
  };

  const runWorkflow = async (workflowId: string, workflowParam?: Workflow) => {
    const workflow = workflowParam || workflows[workflowId];
    if (!workflow) throw new Error('工作流不存在');

    setActiveWorkflowId(workflowId);
    updateWorkflow(workflowId, { status: 'running', currentStepId: workflow.startStepId });

    try {
      let currentStepId = workflow.startStepId;
      const visitedSteps = new Set<string>();

      while (currentStepId && visitedSteps.size < workflow.steps.length) {
        visitedSteps.add(currentStepId);

        const currentStep = workflow.steps.find(s => s.id === currentStepId);
        if (!currentStep) break;

        const completedStep = await executeStep(workflowId, currentStep);

        // 决定下一步
        let nextStepId: string | undefined;

        if (completedStep.type === 'decision' && completedStep.output) {
          // 基于决策结果选择路径
          const decision = completedStep.output.decision;
          nextStepId = decision === 'yes'
            ? completedStep.nextSteps?.[0]
            : completedStep.nextSteps?.[1];
        } else if (completedStep.nextSteps && completedStep.nextSteps.length > 0) {
          nextStepId = completedStep.nextSteps[0];
        } else if (completedStep.type === 'end') {
          break;
        }

        currentStepId = nextStepId;
        if (currentStepId) {
          updateWorkflow(workflowId, { currentStepId });
        }
      }

      updateWorkflow(workflowId, { status: 'completed', currentStepId: undefined });
      config.onWorkflowComplete?.(workflow);

    } catch (error) {
      updateWorkflow(workflowId, { status: 'failed' });
      config.onWorkflowError?.(workflow, error as Error);
    } finally {
      setActiveWorkflowId(null);
    }
  };

  const pauseWorkflow = (workflowId: string) => {
    updateWorkflow(workflowId, { status: 'paused' });
  };

  const resumeWorkflow = (workflowId: string) => {
    const workflow = workflows[workflowId];
    if (workflow?.status === 'paused') {
      runWorkflow(workflowId);
    }
  };

  const resetWorkflow = (workflowId: string) => {
    const workflow = workflows[workflowId];
    if (!workflow) return;

    const resetSteps = workflow.steps.map(step => ({
      ...step,
      status: 'pending' as const,
      output: undefined,
      error: undefined,
      startTime: undefined,
      endTime: undefined,
    }));

    updateWorkflow(workflowId, {
      steps: resetSteps,
      status: 'idle',
      currentStepId: workflow.startStepId,
    });
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => {
      const updated = { ...prev };
      delete updated[workflowId];
      return updated;
    });
  };

  return {
    workflows,
    activeWorkflowId,
    agents,
    createWorkflow,
    runWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    resetWorkflow,
    deleteWorkflow,
    getWorkflow: (id: string) => workflows[id],
  };
}
