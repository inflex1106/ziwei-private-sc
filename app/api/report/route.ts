import { streamClaude } from '@/lib/claude-stream';
import type { BirthForm } from '@/lib/build';
import { SYSTEM, buildReportPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';
// AI가 길게 생각하고 쓰는 동안 서버 함수가 중간에 끊기지 않게 (Vercel 최대 5분)
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return new Response(
      'AI 리포트를 쓰려면 서버에 ANTHROPIC_API_KEY 환경변수를 설정해야 합니다. (.env.example 참고)',
      { status: 501 },
    );
  }

  let userContent: string;
  try {
    userContent = buildReportPrompt((await req.json()) as BirthForm);
  } catch (e) {
    return new Response(`입력값 오류: ${(e as Error).message}`, { status: 400 });
  }

  return streamClaude(SYSTEM, userContent);
}
