import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      DOUBAO_API_KEY: !!process.env.DOUBAO_API_KEY,
      GLM_API_KEY: !!process.env.GLM_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    },
    allKeys: Object.keys(process.env)
      .filter(key => key.includes('API') || key.includes('KEY'))
      .sort(),
  });
}
