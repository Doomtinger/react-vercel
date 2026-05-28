import { createOpenAI } from '@ai-sdk/openai';

/**
 * 创建智谱 AI 适配器
 * 智谱 AI 提供 OpenAI 兼容的 API
 */
export function createZhipuAI(options: { apiKey: string }) {
  return createOpenAI({
    apiKey: options.apiKey,
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  });
}
