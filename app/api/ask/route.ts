import { streamClaude } from '@/lib/claude-stream';
import type { BirthForm } from '@/lib/build';
import { QA_SYSTEM, buildQuestionPrompt, type QA } from '@/lib/prompt';

export const runtime = 'nodejs';

/** 추가 질문. 질문·답변은 저장하지 않으며, 이전 대화는 브라우저가 요청마다 보내 준다. */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return new Response('AI 답변을 쓰려면 서버에 ANTHROPIC_API_KEY 환경변수를 설정해야 합니다.', { status: 501 });
  }
  let userContent: string;
  try {
    const body = (await req.json()) as { form: BirthForm; report: string; history: QA[]; question: string };
    userContent = buildQuestionPrompt(body.form, body.report, Array.isArray(body.history) ? body.history : [], body.question);
  } catch (e) {
    return new Response(`입력값 오류: ${(e as Error).message}`, { status: 400 });
  }
  return streamClaude(QA_SYSTEM, userContent, 8000);
}
