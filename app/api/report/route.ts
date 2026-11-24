import { streamClaude } from '@/lib/claude-stream';
import type { BirthForm } from '@/lib/build';
import { SYSTEM, buildReportPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';

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
