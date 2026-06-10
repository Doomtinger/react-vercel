'use client';

import { useState, useCallback } from 'react';

// 向量文档
export interface VectorDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  createdAt: number;
}

// 相似度搜索结果
export interface SimilarityResult {
  document: VectorDocument;
  score: number;
}

// 嵌入配置
export interface EmbeddingConfig {
  model?: string;
  dimension?: number;
}

// 向量存储配置
export interface VectorStoreConfig {
  embeddingConfig?: EmbeddingConfig;
  maxDocuments?: number;
}

export function useEmbeddings(config: VectorStoreConfig = {}) {
  const { embeddingConfig = { model: 'text-embedding-ada-002', dimension: 1536 } } = config;
  const [documents, setDocuments] = useState<VectorDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 生成模拟嵌入向量（实际项目中应调用真实API）
  const generateEmbedding = useCallback(async (text: string): Promise<number[]> => {
    // 模拟向量生成 - 实际应用中应该调用真实的嵌入API
    const dimension = embeddingConfig.dimension || 1536;
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return Array.from({ length: dimension }, (_, i) => {
      // 基于文本内容和位置生成确定性的伪随机向量
      const seed = hash + i * 31;
      return ((Math.sin(seed) * 10000) % 1) / 10000;
    });
  }, [embeddingConfig.dimension]);

  // 添加文档并生成嵌入
  const addDocument = useCallback(async (
    content: string,
    metadata?: Record<string, any>
  ): Promise<VectorDocument> => {
    setIsProcessing(true);

    try {
      const embedding = await generateEmbedding(content);

      const document: VectorDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        embedding,
        metadata,
        createdAt: Date.now(),
      };

      setDocuments(prev => {
        const maxDocs = config.maxDocuments || 1000;
        const updated = [...prev, document];
        return updated.slice(-maxDocs);
      });

      return document;
    } finally {
      setIsProcessing(false);
    }
  }, [generateEmbedding, config.maxDocuments]);

  // 批量添加文档
  const addDocuments = useCallback(async (
    items: Array<{ content: string; metadata?: Record<string, any> }>
  ): Promise<VectorDocument[]> => {
    setIsProcessing(true);

    try {
      const results: VectorDocument[] = [];

      for (const item of items) {
        const embedding = await generateEmbedding(item.content);
        const document: VectorDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: item.content,
          embedding,
          metadata: item.metadata,
          createdAt: Date.now(),
        };
        results.push(document);
      }

      setDocuments(prev => {
        const maxDocs = config.maxDocuments || 1000;
        const updated = [...prev, ...results];
        return updated.slice(-maxDocs);
      });

      return results;
    } finally {
      setIsProcessing(false);
    }
  }, [generateEmbedding, config.maxDocuments]);

  // 计算余弦相似度
  const cosineSimilarity = useCallback((a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }, []);

  // 相似度搜索
  const search = useCallback(async (
    query: string,
    options: {
      topK?: number;
      minScore?: number;
      filter?: (doc: VectorDocument) => boolean;
    } = {}
  ): Promise<SimilarityResult[]> => {
    const { topK = 5, minScore = 0.7, filter } = options;

    setIsProcessing(true);

    try {
      const queryEmbedding = await generateEmbedding(query);

      const results: SimilarityResult[] = documents
        .filter(doc => doc.embedding && (!filter || filter(doc)))
        .map(doc => ({
          document: doc,
          score: cosineSimilarity(queryEmbedding, doc.embedding!),
        }))
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return results;
    } finally {
      setIsProcessing(false);
    }
  }, [documents, generateEmbedding, cosineSimilarity]);

  // 删除文档
  const deleteDocument = useCallback((documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  }, []);

  // 清空所有文档
  const clearDocuments = useCallback(() => {
    setDocuments([]);
  }, []);

  // 获取文档统计
  const getStats = useCallback(() => {
    return {
      totalDocuments: documents.length,
      totalContentLength: documents.reduce((sum, doc) => sum + doc.content.length, 0),
      averageContentLength: documents.length > 0
        ? documents.reduce((sum, doc) => sum + doc.content.length, 0) / documents.length
        : 0,
      hasEmbeddings: documents.filter(doc => doc.embedding).length,
    };
  }, [documents]);

  return {
    documents,
    isProcessing,
    addDocument,
    addDocuments,
    search,
    deleteDocument,
    clearDocuments,
    getStats,
    generateEmbedding,
    cosineSimilarity,
  };
}
