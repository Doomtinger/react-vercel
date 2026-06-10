'use client';

import { useState } from 'react';
import { useRAG } from '@/lib/rag';

// 示例文档库
const sampleDocuments = [
  {
    id: 'tech-guide',
    name: '技术指南',
    content: `
# React 18 新特性指南

React 18 引入了许多重要的新特性，主要包括并发渲染、自动批处理、Suspense改进等。

并发渲染是React 18最重要的更新。它允许React准备多个版本的UI，使得应用能够更好地响应用户输入。

自动批处理（Automatic Batching）可以减少不必要的重新渲染，提高应用性能。

Suspense现在支持服务端渲染，使得数据获取更加灵活。

Transitions API帮助开发者区分紧急和非紧急更新，优化用户体验。

useDeferredValue和useTransition hooks让开发者更好地控制更新优先级。

新的hydrateRoot API替代了旧的hydrate方法，提供了更好的并发水合支持。
    `,
    metadata: { type: 'guide', category: 'technology', tags: ['react', 'frontend'] },
  },
  {
    id: 'ai-concepts',
    name: 'AI基础概念',
    content: `
# 人工智能基础概念

机器学习是人工智能的一个分支，它使计算机能够从数据中学习并改进。

深度学习是机器学习的子集，使用神经网络来模拟人脑的学习过程。

自然语言处理（NLP）是AI的一个重要应用领域，专注于计算机与人类语言之间的交互。

大型语言模型（LLM）是近年来AI领域的重要突破，如GPT系列模型。

Transformer架构是现代语言模型的基础，它使用自注意力机制处理序列数据。

检索增强生成（RAG）结合了检索和生成两种技术，提高了AI回答的准确性。

向量嵌入将文本转换为数字向量，使得计算机能够理解文本的语义关系。
    `,
    metadata: { type: 'concept', category: 'ai', tags: ['ai', 'ml', 'nlp'] },
  },
  {
    id: 'web-performance',
    name: 'Web性能优化',
    content: `
# Web性能优化最佳实践

性能优化对用户体验至关重要。主要优化策略包括：

代码分割（Code Splitting）：将代码分成多个块，按需加载，减少初始加载时间。

懒加载（Lazy Loading）：延迟加载非关键资源，提高首屏渲染速度。

图片优化：使用现代图片格式（WebP、AVIF）和响应式图片技术。

缓存策略：合理使用浏览器缓存和CDN，减少网络请求。

性能监控：使用Core Web Vitals指标监控页面性能。

减少JavaScript执行时间：避免长任务，使用Web Workers处理复杂计算。

CSS优化：移除未使用的CSS，使用CSS containment减少重排重绘。

资源预加载：使用preload和prefetch提前加载关键资源。
    `,
    metadata: { type: 'guide', category: 'performance', tags: ['web', 'optimization'] },
  },
  {
    id: 'microservices',
    name: '微服务架构',
    content: `
# 微服务架构设计原则

微服务架构将单一应用程序分解为一组小型服务，每个服务运行在自己的进程中。

服务间通信：使用REST API、GraphQL或消息队列进行服务间通信。

数据管理：每个服务管理自己的数据库，避免共享数据库。

服务发现：使用服务注册中心实现动态服务发现。

API网关：作为系统的统一入口，处理路由、认证、限流等横切关注点。

弹性设计：实现断路器模式、重试机制和超时处理，提高系统弹性。

容器化：使用Docker和Kubernetes实现服务的容器化部署和编排。

可观测性：实现日志、指标和链路追踪，监控系统健康状态。

持续部署：每个服务独立部署，加快迭代速度。
    `,
    metadata: { type: 'architecture', category: 'backend', tags: ['microservices', 'architecture'] },
  },
];

type TabType = 'index' | 'search' | 'history';

export default function RAGDemoPage() {
  const [activeTab, setActiveTab] = useState<TabType>('index');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [queryInput, setQueryInput] = useState('');
  const [chunkStrategy, setChunkStrategy] = useState<'character' | 'paragraph' | 'sentence'>('paragraph');

  const rag = useRAG({
    chunkSize: 300,
    chunkOverlap: 50,
    topK: 3,
    minScore: 0.5,
    maxContextLength: 2000,
  });

  const handleIndexDocument = async (docId: string) => {
    const doc = sampleDocuments.find(d => d.id === docId);
    if (!doc) return;

    await rag.indexDocument(doc.content, doc.metadata, chunkStrategy);
    setSelectedDocs(prev => new Set([...prev, docId]));
  };

  const handleIndexAll = async () => {
    for (const doc of sampleDocuments) {
      if (!selectedDocs.has(doc.id)) {
        await rag.indexDocument(doc.content, doc.metadata, chunkStrategy);
        setSelectedDocs(prev => new Set([...prev, doc.id]));
      }
    }
  };

  const handleSearch = async () => {
    if (!queryInput.trim()) return;

    setActiveTab('search');
    await rag.query(queryInput, {
      topK: 3,
      minScore: 0.5,
      includeSources: true,
    });
  };

  const stats = rag.getStats();

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧面板 - 文档索引 */}
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            RAG 检索增强生成
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            索引文档并进行智能检索
          </p>
        </div>

        {/* 分块策略选择 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            分块策略
          </label>
          <select
            value={chunkStrategy}
            onChange={(e) => setChunkStrategy(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="paragraph">按段落分块</option>
            <option value="sentence">按句子分块</option>
            <option value="character">按字符分块</option>
          </select>
        </div>

        {/* 文档列表 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              文档库
            </h2>
            <button
              onClick={handleIndexAll}
              disabled={rag.isProcessing || selectedDocs.size === sampleDocuments.length}
              className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              全部索引
            </button>
          </div>

          <div className="space-y-2">
            {sampleDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 rounded-lg border transition-all ${
                  selectedDocs.has(doc.id)
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {doc.metadata.category} • {doc.metadata.tags.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleIndexDocument(doc.id)}
                    disabled={rag.isProcessing || selectedDocs.has(doc.id)}
                    className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                      selectedDocs.has(doc.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {selectedDocs.has(doc.id) ? '已索引' : '索引'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            索引统计
          </h3>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>文档块数:</span>
              <span className="font-medium">{stats.totalChunks}</span>
            </div>
            <div className="flex justify-between">
              <span>查询次数:</span>
              <span className="font-medium">{stats.totalQueries}</span>
            </div>
            <div className="flex justify-between">
              <span>平均上下文长度:</span>
              <span className="font-medium">{Math.round(stats.averageContextLength)} 字符</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab导航 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'search'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              智能检索
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              查询历史 ({rag.history.length})
            </button>
          </div>
        </div>

        {/* 搜索区域 */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {/* 搜索框 */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="输入问题进行检索..."
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={rag.isProcessing}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!queryInput.trim() || rag.isProcessing}
                    className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium transition-colors"
                  >
                    {rag.isProcessing ? '检索中...' : '检索'}
                  </button>
                </div>

                {/* 示例问题 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    'React 18有哪些新特性？',
                    '什么是检索增强生成？',
                    '如何优化Web性能？',
                    '微服务架构的设计原则',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setQueryInput(example);
                        handleSearch();
                      }}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* 最新结果 */}
              {rag.history.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    检索结果
                  </h3>

                  {/* 上下文 */}
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                      检索到的上下文
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {rag.history[rag.history.length - 1].context}
                    </p>
                  </div>

                  {/* 相关来源 */}
                  {rag.history[rag.history.length - 1].sources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        相关来源
                      </h4>
                      <div className="space-y-2">
                        {rag.history[rag.history.length - 1].sources.map((source, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                相似度: {(source.score * 100).toFixed(1)}%
                              </span>
                              {source.metadata?.category && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  {source.metadata.category}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {source.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 历史记录 */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {rag.history.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">
                    暂无查询历史
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rag.history.map((result, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {result.query}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          上下文长度: {result.context.length} 字符
                        </span>
                      </div>

                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {result.context.slice(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
