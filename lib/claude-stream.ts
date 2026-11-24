import Anthropic from '@anthropic-ai/sdk';
import { MODEL_MARK, type ModelInfo } from './model-label';

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
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
