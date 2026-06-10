'use client';

import { useState, useCallback } from 'react';
import { useEmbeddings, VectorDocument, SimilarityResult } from './embeddings';

// RAG配置
export interface RAGConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
  minScore?: number;
  maxContextLength?: number;
}

// 文档块
export interface DocumentChunk {
  id: string;
  content: string;
  documentId: string;
  chunkIndex: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

// RAG查询结果
export interface RAGResult {
  query: string;
  context: string;
  sources: Array<{
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  answer?: string;
  timestamp: number;
}

// 分块策略
type ChunkStrategy = 'character' | 'paragraph' | 'sentence';

export function useRAG(config: RAGConfig = {}) {
  const {
    chunkSize = 500,
    chunkOverlap = 50,
    topK = 3,
    minScore = 0.6,
    maxContextLength = 4000,
  } = config;

  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [history, setHistory] = useState<RAGResult[]>([]);

  const embeddings = useEmbeddings({
    maxDocuments: 500,
  });

  // 文档分块
  const chunkDocument = useCallback((
    content: string,
    strategy: ChunkStrategy = 'paragraph'
  ): DocumentChunk[] => {
    const chunks: DocumentChunk[] = [];
    const documentId = `doc-${Date.now()}`;

    switch (strategy) {
      case 'paragraph': {
        const paragraphs = content.split(/\n\n+/);
        let currentContent = '';

        paragraphs.forEach((para, index) => {
          if (currentContent.length + para.length > chunkSize && currentContent) {
            chunks.push({
              id: `${documentId}-chunk-${chunks.length}`,
              content: currentContent.trim(),
              documentId,
              chunkIndex: chunks.length,
            });
            currentContent = para;
          } else {
            currentContent += (currentContent ? '\n\n' : '') + para;
          }
        });

        if (currentContent) {
          chunks.push({
            id: `${documentId}-chunk-${chunks.length}`,
            content: currentContent.trim(),
            documentId,
            chunkIndex: chunks.length,
          });
        }
        break;
      }

      case 'sentence': {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        let currentContent = '';

        sentences.forEach((sentence) => {
          if (currentContent.length + sentence.length > chunkSize && currentContent) {
            chunks.push({
              id: `${documentId}-chunk-${chunks.length}`,
              content: currentContent.trim(),
              documentId,
              chunkIndex: chunks.length,
            });
            // 保留overlap
            const overlapLength = Math.min(chunkOverlap, currentContent.length);
            currentContent = currentContent.slice(-overlapLength) + ' ' + sentence;
          } else {
            currentContent += (currentContent ? ' ' : '') + sentence;
          }
        });

        if (currentContent) {
          chunks.push({
            id: `${documentId}-chunk-${chunks.length}`,
            content: currentContent.trim(),
            documentId,
            chunkIndex: chunks.length,
          });
        }
        break;
      }

      case 'character':
      default: {
        for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
          const chunkContent = content.slice(i, i + chunkSize);
          if (chunkContent) {
            chunks.push({
              id: `${documentId}-chunk-${chunks.length}`,
              content: chunkContent.trim(),
              documentId,
              chunkIndex: chunks.length,
            });
          }
        }
        break;
      }
    }

    return chunks;
  }, [chunkSize, chunkOverlap]);

  // 索引文档
  const indexDocument = useCallback(async (
    content: string,
    metadata?: Record<string, any>,
    strategy: ChunkStrategy = 'paragraph'
  ): Promise<DocumentChunk[]> => {
    // 分块
    const documentChunks = chunkDocument(content, strategy);

    // 为每个块生成嵌入
    const chunksWithEmbeddings = await Promise.all(
      documentChunks.map(async (chunk) => {
        const embedding = await embeddings.generateEmbedding(chunk.content);
        return {
          ...chunk,
          embedding,
          metadata,
        };
      })
    );

    // 保存块
    setChunks(prev => [...prev, ...chunksWithEmbeddings]);

    return chunksWithEmbeddings;
  }, [chunkDocument, embeddings]);

  // 检索相关文档
  const retrieve = useCallback(async (
    query: string,
    options?: { topK?: number; minScore?: number }
  ): Promise<SimilarityResult[]> => {
    const { topK: retrievedTopK = topK, minScore: retrievedMinScore = minScore } = options || {};

    const queryEmbedding = await embeddings.generateEmbedding(query);

    const results: SimilarityResult[] = chunks
      .filter(chunk => chunk.embedding)
      .map(chunk => ({
        document: {
          id: chunk.id,
          content: chunk.content,
          embedding: chunk.embedding,
          metadata: chunk.metadata,
          createdAt: Date.now(),
        },
        score: embeddings.cosineSimilarity(queryEmbedding, chunk.embedding!),
      }))
      .filter(result => result.score >= retrievedMinScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, retrievedTopK);

    return results;
  }, [chunks, topK, minScore, embeddings]);

  // 构建上下文
  const buildContext = useCallback((results: SimilarityResult[]): string => {
    let context = '';
    let totalLength = 0;

    for (const result of results) {
      const content = result.document.content;
      if (totalLength + content.length <= maxContextLength) {
        context += (context ? '\n\n' : '') + content;
        totalLength += content.length;
      } else {
        const remaining = maxContextLength - totalLength;
        if (remaining > 0) {
          context += (context ? '\n\n' : '') + content.slice(0, remaining);
        }
        break;
      }
    }

    return context;
  }, [maxContextLength]);

  // RAG查询
  const query = useCallback(async (
    question: string,
    options?: { topK?: number; minScore?: number; includeSources?: boolean }
  ): Promise<RAGResult> => {
    const { topK: queryTopK = topK, includeSources = true } = options || {};

    // 检索相关文档
    const results = await retrieve(question, { topK: queryTopK });

    // 构建上下文
    const context = buildContext(results);

    // 构建结果
    const ragResult: RAGResult = {
      query: question,
      context,
      sources: includeSources ? results.map(r => ({
        content: r.document.content,
        score: r.score,
        metadata: r.document.metadata,
      })) : [],
      timestamp: Date.now(),
    };

    // 保存到历史
    setHistory(prev => [...prev, ragResult]);

    return ragResult;
  }, [retrieve, buildContext, topK]);

  // 批量索引文档
  const indexDocuments = useCallback(async (
    documents: Array<{ content: string; metadata?: Record<string, any> }>,
    strategy?: ChunkStrategy
  ): Promise<number> => {
    let totalChunks = 0;

    for (const doc of documents) {
      const indexedChunks = await indexDocument(doc.content, doc.metadata, strategy);
      totalChunks += indexedChunks.length;
    }

    return totalChunks;
  }, [indexDocument]);

  // 清空索引
  const clearIndex = useCallback(() => {
    setChunks([]);
    setHistory([]);
  }, []);

  // 获取统计信息
  const getStats = useCallback(() => {
    return {
      totalChunks: chunks.length,
      totalQueries: history.length,
      averageContextLength: history.length > 0
        ? history.reduce((sum, h) => sum + h.context.length, 0) / history.length
        : 0,
    };
  }, [chunks, history]);

  return {
    chunks,
    history,
    isProcessing: embeddings.isProcessing,
    indexDocument,
    indexDocuments,
    retrieve,
    query,
    clearIndex,
    getStats,
    chunkDocument,
  };
}
