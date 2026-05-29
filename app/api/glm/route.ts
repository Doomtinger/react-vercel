import { ZhipuAI } from 'zhipuai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const zhipuai = new ZhipuAI({
      apiKey: process.env.GLM_API_KEY || '',
    });

    console.log('=== Direct GLM API Call ===');
    console.log('Messages:', messages);

    // Transform messages to handle image content
    const transformedMessages = messages.map((msg: any) => {
      if (Array.isArray(msg.content)) {
        // Handle multimodal content (text + images)
        const hasImage = msg.content.some((item: any) => item.type === 'image_url');
        if (hasImage) {
          // Use vision model for images
          return {
            role: msg.role,
            content: msg.content.map((item: any) => {
              if (item.type === 'image_url') {
                return {
                  type: 'image_url',
                  image_url: { url: item.image_url.url }
                };
              }
              return item;
            })
          };
        }
      }
      return msg;
    });

    // Determine if we need vision model
    const hasImages = messages.some((msg: any) =>
      Array.isArray(msg.content) && msg.content.some((item: any) => item.type === 'image_url')
    );

    const response = await zhipuai.chat.completions.create({
      model: hasImages ? 'glm-4v' : 'glm-4-flash',
      messages: transformedMessages,
      stream: true,
    });

    // 创建流式响应
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Direct GLM API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
