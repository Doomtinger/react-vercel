import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = 'glm-4-flash', tools } = body;

    console.log('=== Agent Chat API Request ===');
    console.log('Model:', model);
    console.log('Messages:', messages.length);
    console.log('Tools:', tools ? Object.keys(tools).length : 0);

    // 模型配置
    const models: Record<string, any> = {
      'glm-4-flash': createOpenAI({
        apiKey: process.env.GLM_API_KEY || 'dummy',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      })('glm-4-flash'),
      'glm-4-plus': createOpenAI({
        apiKey: process.env.GLM_API_KEY || 'dummy',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      })('glm-4-plus'),
      'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022'),
      'claude-3-5-haiku': anthropic('claude-3-5-haiku-20241022'),
    };

    const languageModel = models[model] || models['glm-4-flash'];

    // 构建 AI SDK 工具配置
    const toolConfig = tools ? Object.entries(tools).reduce((acc, [name, tool]: [string, any]) => {
      acc[name] = {
        description: tool.description,
        parameters: tool.parameters,
      };
      return acc;
    }, {} as Record<string, any>) : undefined;

    console.log('Tool config:', toolConfig ? Object.keys(toolConfig) : 'none');

    const result = streamText({
      model: languageModel,
      messages,
      tools: toolConfig,
      maxSteps: 10, // 允许多步循环
    });

    console.log('Stream created');

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in agent chat API:', error);

    let errorMessage = 'Failed to process request';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'Agent Chat API is ready',
      supportedModels: ['glm-4-flash', 'glm-4-plus', 'claude-3-5-sonnet', 'claude-3-5-haiku'],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
