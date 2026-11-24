'use client';

import { useState } from 'react';
import type { BirthForm } from '../lib/build';
import { QA_LIMITS, type QA } from '../lib/prompt';
import { renderMarkdown } from '../lib/markdown';
import CopyButton, { toPlain } from './CopyButton';

export type AskFn = (
  form: BirthForm,
  report: string,
  history: QA[],
  question: string,
  onText: (whole: string) => void,
) => Promise<string | void>; // 실제 답변 모델 표시(한 줄)

const EXAMPLES = ['올해 연애운은 어때요?', '이직을 고민 중인데 어떤 일이 잘 맞을까요?', '돈을 모으려면 어떤 습관이 좋을까요?', '사람들과 더 잘 지내는 팁이 있을까요?'];

export const PRIVACY_NOTE =
  '질문과 답변은 이 서비스에 저장되지 않아요. 이 화면에만 잠시 보이고, 페이지를 닫거나 새 명반을 만들면 사라집니다. 답변을 만들기 위해 질문과 명반 정보가 AI 제공사(Anthropic)로 전송되며, 제공사 정책에 따라 남용 방지 목적으로 일정 기간 보관될 수 있어요.';

export default function AskBox({
  form,
  report,
  requestAnswer,
  privacyNote = PRIVACY_NOTE,
}: {
  form: BirthForm;
  report: string;
  requestAnswer: AskFn;
  privacyNote?: string;
}) {
  const [history, setHistory] = useState<QA[]>([]);
  const [q, setQ] = useState('');
  const [pending, setPending] = useState<QA | null>(null);
  const [models, setModels] = useState<string[]>([]);

  const ask = async (question: string) => {
    const text = question.trim().slice(0, QA_LIMITS.question);
    if (!text || pending) return;
    setQ('');
    let answer = '';
    let model = '';
    setPending({ q: text, a: '' });
    try {
      model =
        (await requestAnswer(form, report, history, text, (whole) => {
          answer = whole;
          setPending({ q: text, a: whole });
        })) || '';
    } catch (x) {
      answer = `**${(x as Error).message || '답변을 받지 못했어요.'}**`;
    }
    setHistory((h) => [...h, { q: text, a: answer }]);
    setModels((m) => [...m, model]);
    setPending(null);
  };

  const items = pending ? [...history, pending] : history;

  return (
    <section className="ask" aria-labelledby="ask-title">
      <h2 id="ask-title">더 궁금한 게 있나요?</h2>
      <p className="legend">명반을 바탕으로 쉬운 말로 답해 드려요. 이 명반에 대한 질문만 받을 수 있어요.</p>

      {items.map((it, i) => (
        <div key={i} className="qa">
          <p className="q">Q. {it.q}</p>
          {it.a ? (
            <>
              <article className="report" dangerouslySetInnerHTML={{ __html: renderMarkdown(it.a) }} />
              {models[i] && <p className="model-tag">🤖 {models[i]}</p>}
              {it !== pending && <CopyButton label="답변 복사" getText={() => `Q. ${it.q}\n\n${toPlain(it.a)}`} />}
            </>
          ) : (
            <p className="legend">생각하는 중… (보통 10~30초 걸려요)</p>
          )}
        </div>
      ))}

      {history.length > 0 && !pending && (
        <CopyButton
          label="리포트와 질문·답변 전체 복사"
          getText={() => [toPlain(report), ...history.map((h) => `Q. ${h.q}\n\n${toPlain(h.a)}`)].join('\n\n――――――\n\n')}
        />
      )}

      {history.length === 0 && !pending && (
        <div className="chips">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="chip" onClick={() => ask(e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor="ask-q" className="sr-only">질문</label>
        <textarea
          id="ask-q"
          rows={2}
          maxLength={QA_LIMITS.question}
          placeholder="예: 내년에 이사를 가도 괜찮을까요?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              ask(q);
            }
          }}
        />
        <button type="submit" disabled={!!pending || !q.trim()}>
          {pending ? '답변 중…' : '질문하기'}
        </button>
      </form>
      <p className="privacy">🔒 {privacyNote}</p>
    </section>
  );
}
