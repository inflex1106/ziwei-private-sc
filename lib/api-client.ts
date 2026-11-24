import type { ReportFn } from '@/components/ZiweiApp';
import type { AskFn } from '@/components/AskBox';
import { splitModel, modelLabel } from '@/lib/model-label';

/** 서버 API 를 스트리밍으로 호출해 받은 글을 onText 로 넘긴다. */
async function streamFrom(url: string, payload: unknown, onText: (whole: string) => void): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let acc = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
    onText(splitModel(acc).text);
  }
  const { text, model } = splitModel(acc);
  onText(text);
  return modelLabel(model);
}

export const requestReport: ReportFn = (form, onText) => streamFrom('/api/report', form, onText);
export const requestAnswer: AskFn = (form, report, history, question, onText) =>
  streamFrom('/api/ask', { form, report, history, question }, onText);
