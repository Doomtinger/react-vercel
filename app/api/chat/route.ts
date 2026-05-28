import { anthropic } from '@ai-sdk/anthropic';
import { createCohere } from '@ai-sdk/cohere';
import { deepseek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { streamText } from 'ai';
import { ZhipuAI } from 'zhipuai';

// 环境变量检查
const checkEnvVars = () => ({
  ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
  MISTRAL_API_KEY: !!process.env.MISTRAL_API_KEY,
  COHERE_API_KEY: !!process.env.COHERE_API_KEY,
  XAI_API_KEY: !!process.env.XAI_API_KEY,
  DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
  DOUBAO_API_KEY: !!process.env.DOUBAO_API_KEY,
  GLM_API_KEY: !!process.env.GLM_API_KEY,
});

// Model configuration - only create model instances when needed
function getModel(modelId: string) {
  const models: Record<string, any> = {
    // Anthropic Claude
    'claude-3-5-sonnet': () => anthropic('claude-3-5-sonnet-20241022'),
    'claude-3-5-haiku': () => anthropic('claude-3-5-haiku-20241022'),
    'claude-3-opus': () => anthropic('claude-3-opus-20240229'),

    // OpenAI GPT
    'gpt-4o': () =>
      createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'dummy',
      })('gpt-4o'),
    'gpt-4o-mini': () =>
      createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'dummy',
      })('gpt-4o-mini'),
    'gpt-4-turbo': () =>
      createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'dummy',
      })('gpt-4-turbo'),
    'gpt-3.5-turbo': () =>
      createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'dummy',
      })('gpt-3.5-turbo'),

    // Google Gemini
    'gemini-2.0-flash-exp': () =>
      createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || 'dummy',
      })('gemini-2.0-flash-exp'),
    'gemini-1.5-pro': () =>
      createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || 'dummy',
      })('gemini-1.5-pro'),

    // Mistral
    'mistral-large': () =>
      createMistral({
        apiKey: process.env.MISTRAL_API_KEY || 'dummy',
      })('mistral-large-latest'),
    'mistral-medium': () =>
      createMistral({
        apiKey: process.env.MISTRAL_API_KEY || 'dummy',
      })('mistral-medium-latest'),
    'codestral': () =>
      createMistral({
        apiKey: process.env.MISTRAL_API_KEY || 'dummy',
      })('codestral-latest'),

    // Cohere
    'command-r-plus': () =>
      createCohere({
        apiKey: process.env.COHERE_API_KEY || 'dummy',
      })('command-r-plus'),
    'command-r': () =>
      createCohere({
        apiKey: process.env.COHERE_API_KEY || 'dummy',
      })('command-r'),

    // xAI Grok
    'grok-beta': () =>
      createXai({
        apiKey: process.env.XAI_API_KEY || 'dummy',
      })('grok-beta'),

    // DeepSeek
    'deepseek-chat': () => deepseek('deepseek-chat'),
    'deepseek-coder': () => deepseek('deepseek-coder'),
    'deepseek-reasoner': () => deepseek('deepseek-reasoner'),

    // 豆包 (Doubao/ByteDance)
    // 需要在火山引擎控制台创建推理接口并获取端点 ID
    // 控制台：https://console.volcengine.com/ark
    // 将下面的 YOUR_ENDPOINT_ID 替换为你实际的推理端点 ID
    'doubao-pro-32k': () =>
      createOpenAI({
        apiKey: process.env.DOUBAO_API_KEY || 'dummy',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      })(process.env.DOUBAO_ENDPOINT_PRO_32K || 'YOUR_ENDPOINT_ID'),
    'doubao-pro-128k': () =>
      createOpenAI({
        apiKey: process.env.DOUBAO_API_KEY || 'dummy',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      })(process.env.DOUBAO_ENDPOINT_PRO_128K || 'YOUR_ENDPOINT_ID'),
    'doubao-lite-32k': () =>
      createOpenAI({
        apiKey: process.env.DOUBAO_API_KEY || 'dummy',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      })(process.env.DOUBAO_ENDPOINT_LITE_32K || 'YOUR_ENDPOINT_ID'),

    // 智谱 AI GLM (使用 OpenAI 兼容接口)
    // 模型名称参考：https://open.bigmodel.cn/dev/api
    'glm-4-flash': () =>
      createOpenAI({
        apiKey: process.env.GLM_API_KEY || 'dummy',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      })('glm-4-flash'),
    'glm-4-plus': () =>
      createOpenAI({
        apiKey: process.env.GLM_API_KEY || 'dummy',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      })('glm-4-plus'),
    'glm-4-air': () =>
      createOpenAI({
        apiKey: process.env.GLM_API_KEY || 'dummy',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      })('glm-4-air'),
    'glm-4': () =>
      createOpenAI({
        apiKey: process.env.GLM_API_KEY || 'dummy',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      })('glm-4'),
    'glm-3-turbo': () =>
      createOpenAI({
        apiKey: process.env.GLM_API_KEY || 'dummy',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      })('glm-3-turbo'),
  };

  const modelFactory = models[modelId];
  if (!modelFactory) {
    return null;
  }

  return modelFactory();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = 'deepseek-chat' } = body;

    console.log('=== Chat API Request ===');
    console.log('Model:', model);
    console.log('Messages:', JSON.stringify(messages, null, 2));
    console.log('GLM API Key exists:', !!process.env.GLM_API_KEY);
    console.log('GLM API Key value:', process.env.GLM_API_KEY ? 'set' : 'not set');

    const languageModel = getModel(model);

    if (!languageModel) {
      console.error('Model not found:', model);
      return new Response(
        JSON.stringify({
          error: `Model ${model} not found`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting stream...');

    const result = streamText({
      model: languageModel,
      messages,
    });

    console.log('Stream created successfully');

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);

    // Extract error message
    let errorMessage = 'Failed to process request';
    let errorDetails = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    } else if (typeof error === 'object' && error !== null) {
      errorMessage =
        (error as any).message || 'Failed to process request';
      errorDetails = JSON.stringify(error, null, 2);
    }

    // Check for specific API errors
    if (errorMessage.includes('Insufficient Balance')) {
      errorMessage = 'API 余额不足，请充值后重试';
    } else if (errorMessage.includes('API key')) {
      errorMessage = 'API Key 配置错误或未设置';
    } else if (errorMessage.includes('rate limit')) {
      errorMessage = 'API 调用频率超限，请稍后重试';
    } else if (errorMessage.includes('Not Found')) {
      errorMessage = '模型不存在或 API 格式错误';
    } else if (errorMessage.includes('does not exist')) {
      errorMessage = '推理端点不存在，请检查配置';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      availableModels: [
        'claude-3-5-sonnet',
        'claude-3-5-haiku',
        'claude-3-opus',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'mistral-large',
        'mistral-medium',
        'codestral',
        'command-r-plus',
        'command-r',
        'grok-beta',
        'deepseek-chat',
        'deepseek-coder',
        'deepseek-reasoner',
        'doubao-pro-32k',
        'doubao-pro-128k',
        'doubao-lite-32k',
        'glm-4-flash',
        'glm-4-plus',
        'glm-4-air',
        'glm-3-turbo',
      ],
      envStatus: checkEnvVars(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
