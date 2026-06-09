'use client';

import { useState } from 'react';
import { useWorkflowAgent, Workflow, WorkflowStep } from '@/lib/workflow-agent';
import { useMultiAgentSystem, AgentMessage } from '@/lib/multi-agent-system';

// 预设工作流模板
const workflowTemplates = [
  {
    id: 'research-report',
    name: '研究报告生成',
    description: '从信息收集到报告生成的完整流程',
    steps: [
      { id: 'start', type: 'start' as const, name: '开始', nextSteps: ['step1'] },
      { id: 'step1', type: 'agent' as const, name: '信息收集', agentId: 'researcher', nextSteps: ['step2'] },
      { id: 'step2', type: 'agent' as const, name: '数据分析', agentId: 'analyst', nextSteps: ['step3'] },
      { id: 'step3', type: 'agent' as const, name: '报告撰写', agentId: 'writer', nextSteps: ['step4'] },
      { id: 'step4', type: 'agent' as const, name: '质量审核', agentId: 'reviewer', nextSteps: ['decision'] },
      { id: 'decision', type: 'decision' as const, name: '质量检查', nextSteps: ['end', 'step3'] },
      { id: 'end', type: 'end' as const, name: '完成' },
    ],
  },
  {
    id: 'content-creation',
    name: '内容创作',
    description: '创意生成和内容优化的协作流程',
    steps: [
      { id: 'start', type: 'start' as const, name: '开始', nextSteps: ['step1'] },
      { id: 'step1', type: 'agent' as const, name: '创意生成', agentId: 'creative', nextSteps: ['step2'] },
      { id: 'step2', type: 'agent' as const, name: '内容扩展', agentId: 'writer', nextSteps: ['decision'] },
      { id: 'decision', type: 'decision' as const, name: '创意评估', nextSteps: ['step3', 'step1'] },
      { id: 'step3', type: 'agent' as const, name: '最终审核', agentId: 'reviewer', nextSteps: ['end'] },
      { id: 'end', type: 'end' as const, name: '完成' },
    ],
  },
];

// 多Agent协作模板
const collaborationTemplates = [
  {
    id: 'market-analysis',
    name: '市场分析协作',
    description: '多Agent协作完成市场分析报告',
    participants: ['coordinator', 'researcher', 'analyst', 'writer', 'reviewer'],
    goal: '生成一份全面的市场分析报告',
    tasks: [
      {
        title: '收集市场数据',
        description: '收集相关市场的历史数据和趋势',
        assignedTo: 'researcher',
      },
      {
        title: '分析竞争格局',
        description: '分析主要竞争对手的优势和劣势',
        assignedTo: 'analyst',
        dependencies: ['收集市场数据'],
      },
      {
        title: '撰写分析报告',
        description: '基于数据分析结果撰写报告',
        assignedTo: 'writer',
        dependencies: ['分析竞争格局'],
      },
      {
        title: '审核报告质量',
        description: '检查报告的准确性和完整性',
        assignedTo: 'reviewer',
        dependencies: ['撰写分析报告'],
      },
    ],
  },
  {
    id: 'product-launch',
    name: '产品发布策划',
    description: '多Agent协作制定产品发布策略',
    participants: ['coordinator', 'creative', 'writer', 'analyst'],
    goal: '制定完整的产品发布营销策略',
    tasks: [
      {
        title: '市场调研',
        description: '调研目标市场和用户群体',
        assignedTo: 'analyst',
      },
      {
        title: '创意策划',
        description: '生成产品发布的创意方案',
        assignedTo: 'creative',
        dependencies: ['市场调研'],
      },
      {
        title: '撰写文案',
        description: '撰写产品发布的营销文案',
        assignedTo: 'writer',
        dependencies: ['创意策划'],
      },
    ],
  },
];

type TabType = 'workflow' | 'collaboration';

export default function MultiAgentDemoPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workflow');

  // WorkflowAgent Hook
  const workflowAgent = useWorkflowAgent({
    onStepStart: (step) => console.log('步骤开始:', step.name),
    onStepComplete: (step) => console.log('步骤完成:', step.name),
    onWorkflowComplete: (workflow) => console.log('工作流完成:', workflow.name),
  });

  // MultiAgentSystem Hook
  const multiAgentSystem = useMultiAgentSystem({
    onAgentMessage: (message) => console.log('Agent消息:', message),
    onTaskComplete: (task) => console.log('任务完成:', task.title),
    onSessionComplete: (session) => console.log('会话完成:', session.name),
  });

  const [selectedWorkflowTemplate, setSelectedWorkflowTemplate] = useState<string | null>(null);
  const [selectedCollabTemplate, setSelectedCollabTemplate] = useState<string | null>(null);

  // 创建工作流
  const handleCreateWorkflow = (templateId: string) => {
    const template = workflowTemplates.find(t => t.id === templateId);
    if (!template) return;

    setSelectedWorkflowTemplate(templateId);

    const { id: workflowId, workflow } = workflowAgent.createWorkflow({
      name: `${template.name} - ${new Date().toLocaleTimeString()}`,
      description: template.description,
      steps: template.steps.map(step => ({
        ...step,
        status: 'pending' as const,
      })),
      startStepId: 'start',
    });

    // 立即运行工作流，传入工作流对象避免状态更新延迟问题
    workflowAgent.runWorkflow(workflowId, workflow);
  };

  // 创建协作会话
  const handleCreateCollaboration = (templateId: string) => {
    const template = collaborationTemplates.find(t => t.id === templateId);
    if (!template) return;

    setSelectedCollabTemplate(templateId);

    const { id: sessionId, session } = multiAgentSystem.createSession({
      name: `${template.name} - ${new Date().toLocaleTimeString()}`,
      description: template.description,
      goal: template.goal,
      participants: template.participants,
      tasks: [],
    });

    // 添加任务
    template.tasks.forEach(task => {
      multiAgentSystem.addTask(sessionId, task);
    });

    // 立即运行会话，传入会话对象避免状态更新延迟问题
    multiAgentSystem.runSession(sessionId, session);
  };

  // 获取Agent状态颜色
  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // 获取步骤状态颜色
  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-gray-300 bg-gray-50';
      case 'running': return 'border-blue-500 bg-blue-50';
      case 'completed': return 'border-green-500 bg-green-50';
      case 'failed': return 'border-red-500 bg-red-50';
      case 'skipped': return 'border-gray-400 bg-gray-100';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const activeWorkflow = Object.values(workflowAgent.workflows).find(w => w.id === workflowAgent.activeWorkflowId);
  const activeSession = Object.values(multiAgentSystem.sessions).find(s => s.id === multiAgentSystem.activeSessionId);

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧面板 - 模板选择 */}
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        {/* Tab切换 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'workflow'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            工作流
          </button>
          <button
            onClick={() => setActiveTab('collaboration')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'collaboration'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            多Agent协作
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'workflow' ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                工作流模板
              </h2>
              {workflowTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleCreateWorkflow(template.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedWorkflowTemplate === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    {template.steps.length} 个步骤
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                协作模板
              </h2>
              {collaborationTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleCreateCollaboration(template.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedCollabTemplate === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                  <div className="mt-2 flex gap-2 text-xs text-gray-500">
                    <span>{template.participants.length} Agents</span>
                    <span>•</span>
                    <span>{template.tasks.length} Tasks</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Agent状态 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Agent 状态
          </h3>
          <div className="space-y-2">
            {multiAgentSystem.agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getAgentStatusColor(agent.status)}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {agent.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 工作流视图 */}
        {activeTab === 'workflow' && activeWorkflow && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {activeWorkflow.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{activeWorkflow.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    activeWorkflow.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    activeWorkflow.status === 'completed' ? 'bg-green-100 text-green-700' :
                    activeWorkflow.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {activeWorkflow.status === 'running' ? '运行中' :
                     activeWorkflow.status === 'completed' ? '已完成' :
                     activeWorkflow.status === 'failed' ? '失败' : '待机'}
                  </span>
                </div>
              </div>

              {/* 工作流步骤 */}
              <div className="space-y-3">
                {activeWorkflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg border-2 ${getStepStatusColor(step.status)} ${
                      activeWorkflow.currentStepId === step.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {step.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {step.type === 'agent' && step.agentId
                              ? `执行者: ${workflowAgent.agents.find(a => a.id === step.agentId)?.name || step.agentId}`
                              : `类型: ${step.type}`}
                          </p>
                          {step.output && (
                            <div className="mt-2 p-2 bg-white dark:bg-gray-700 rounded text-xs">
                              <span className="font-medium">输出:</span> {JSON.stringify(step.output)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                        step.status === 'pending' ? 'bg-gray-400' :
                        step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'failed' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* 重置按钮 */}
              {activeWorkflow.status !== 'running' && (
                <button
                  onClick={() => {
                    workflowAgent.resetWorkflow(activeWorkflow.id);
                    setSelectedWorkflowTemplate(null);
                  }}
                  className="mt-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  重置工作流
                </button>
              )}
            </div>
          </div>
        )}

        {/* 协作视图 */}
        {activeTab === 'collaboration' && activeSession && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto grid grid-cols-2 gap-6">
              {/* 左列 - 任务列表 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  任务列表
                </h3>
                <div className="space-y-3">
                  {activeSession.tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        task.status === 'completed' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                        task.status === 'in_progress' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                        task.status === 'failed' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                        'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {task.assignedTo && (
                              <span className="font-medium">
                                {multiAgentSystem.agents.find(a => a.id === task.assignedTo)?.name}
                              </span>
                            )}
                          </p>
                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500">
                              依赖: {task.dependencies.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                          task.status === 'pending' ? 'bg-gray-400' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'completed' ? 'bg-green-500' :
                          'bg-red-500'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右列 - 消息流 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  协作消息
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activeSession.messages.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      暂无消息
                    </p>
                  ) : (
                    activeSession.messages.map((message) => {
                      const fromAgent = multiAgentSystem.agents.find(a => a.id === message.from);
                      return (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.type === 'request' ? 'bg-blue-50 dark:bg-blue-900/20' :
                            message.type === 'response' ? 'bg-green-50 dark:bg-green-900/20' :
                            'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {fromAgent?.name || message.from}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.type}
                            </span>
                            {message.to !== 'all' && (
                              <span className="text-xs text-gray-500">
                                → {multiAgentSystem.agents.find(a => a.id === message.to)?.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            {typeof message.content === 'string'
                              ? message.content
                              : JSON.stringify(message.content)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 会话状态 */}
                {activeSession.status !== 'running' && (
                  <button
                    onClick={() => {
                      multiAgentSystem.resetSession(activeSession.id);
                      setSelectedCollabTemplate(null);
                    }}
                    className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors"
                  >
                    重置协作会话
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {((activeTab === 'workflow' && !activeWorkflow) ||
          (activeTab === 'collaboration' && !activeSession)) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {activeTab === 'workflow' ? '工作流演示' : '多Agent协作演示'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                从左侧选择一个模板开始体验
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
