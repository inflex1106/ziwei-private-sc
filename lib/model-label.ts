/** 응답 끝에 붙는 "실제 답변 모델" 표시. 서버는 본문 뒤에 MODEL_MARK + JSON 을 붙인다. */
export const MODEL_MARK = '\u001eMODEL:';

export type ModelInfo = { id: string; fallback: boolean };

const NAMES: Record<string, string> = {
  'claude-fable-5-2': 'Claude Fable 5.2',
  'claude-mythos-5-2': 'Claude Mythos 5.2',
  'claude-fable-5-1': 'Claude Fable 5.1',
  'claude-opus-5-5': 'Claude Opus 5.5',
  'claude-opus-5': 'Claude Opus 5',
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'claude-haiku-5-5': 'Claude Haiku 5.5',
};

export function modelName(id: string): string {
  return NAMES[id] ?? id;
}

/** 화면에 보일 한 줄. 예: "답변 모델: Claude Fable 5.2 (claude-fable-5-2)" */
export function modelLabel(info: ModelInfo | null | undefined): string {
  if (!info?.id) return '';
  const base = `답변 모델: ${modelName(info.id)}${NAMES[info.id] ? ` (${info.id})` : ''}`;
  return info.fallback ? `${base} · 요청한 모델이 답하지 않아 자동으로 대체됨` : base;
}

/** 스트림으로 받은 전체 문자열에서 본문과 모델 정보를 나눈다. */
export function splitModel(raw: string): { text: string; model: ModelInfo | null } {
  const i = raw.indexOf(MODEL_MARK);
  if (i < 0) return { text: raw, model: null };
  try {
    return { text: raw.slice(0, i), model: JSON.parse(raw.slice(i + MODEL_MARK.length)) as ModelInfo };
  } catch {
    return { text: raw.slice(0, i), model: null };
  }
}
