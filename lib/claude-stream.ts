import Anthropic from '@anthropic-ai/sdk';
import { MODEL_MARK, HEARTBEAT, type ModelInfo } from './model-label';

/**
 * Claude 호출 → 텍스트 스트림 응답.
 * 개인정보 원칙: 요청 내용(출생 정보, 질문, 답변)을 서버에 저장하거나 로그로 남기지 않는다.
 * 이 파일에 console.log 등으로 본문을 찍지 말 것.
 */
export function streamClaude(system: string, userContent: string, maxTokens = 16000): Response {
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    // Claude Fable 5.2: 생각(thinking)은 항상 켜져 있어 thinking 파라미터를 보내지 않는다.
    model: 'claude-fable-5-2',
    max_tokens: maxTokens,
    output_config: { effort: 'high' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // AI가 생각하는 동안(첫 글자까지 1분 넘게 걸리기도 함) 아무것도 안 보내면
      // 휴대폰 브라우저(Safari 등)나 중간 네트워크가 연결을 끊는다("Load failed").
      // 그래서 몇 초마다 보이지 않는 글자(HEARTBEAT)를 보내 연결을 살려 둔다. 화면에서는 지운다.
      controller.enqueue(encoder.encode(HEARTBEAT));
      const beat = setInterval(() => controller.enqueue(encoder.encode(HEARTBEAT)), 5000);
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
          controller.enqueue(encoder.encode('\n\n(이번 요청은 AI가 답하지 않았어요. 잠시 후 다시 시도해 주세요.)'));
        } else if (final.stop_reason === 'max_tokens') {
          controller.enqueue(encoder.encode('\n\n(리포트가 길어서 중간에 끊겼어요.)'));
        }
        // 실제로 답한 모델 (서버 측 대체가 일어났으면 그 모델)
        const fallback = (final.usage.iterations ?? []).some((it) => it.type === 'fallback_message');
        const info: ModelInfo = { id: final.model, fallback };
        controller.enqueue(encoder.encode(MODEL_MARK + JSON.stringify(info)));
      } catch (e) {
        if (e instanceof Anthropic.AuthenticationError) {
          controller.enqueue(encoder.encode('\n\n[오류] API 키가 올바르지 않습니다.'));
        } else if (e instanceof Anthropic.RateLimitError) {
          controller.enqueue(encoder.encode('\n\n[오류] 요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.'));
        } else if (e instanceof Anthropic.APIError) {
          controller.enqueue(encoder.encode(`\n\n[오류] AI 호출 실패 (${e.status ?? '네트워크'})`));
        } else {
          controller.enqueue(encoder.encode('\n\n[오류] 알 수 없는 오류가 발생했습니다.'));
        }
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
