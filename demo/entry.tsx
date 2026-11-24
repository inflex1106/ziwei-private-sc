/** claude.ai 아티팩트용 데모: AI 리포트를 보는 사람의 Claude 계정(sample 기능)으로 쓴다. */
import { createRoot } from 'react-dom/client';
import ZiweiApp, { type ReportFn } from '../components/ZiweiApp';
import { SYSTEM, buildReportPrompt, QA_SYSTEM, buildQuestionPrompt } from '../lib/prompt';
import type { AskFn } from '../components/AskBox';
import { modelLabel } from '../lib/model-label';

/** sample() 결과로 실제 답변 모델을 표시. 이름을 지정한 모델이 답하면 modelApplied 가 온다. */
function demoModel(res: any): string {
  if (res?.modelApplied) return modelLabel({ id: res.modelApplied, fallback: false });
  return `답변 모델: Claude (${res?.modelTierApplied ?? '대체'} 등급) · Fable 5.2를 쓸 수 없어 보는 분의 계정에서 가능한 모델로 대체됨, 정확한 모델명은 제공되지 않음`;
}

declare global {
  interface Window { claude?: { use(name: string): Promise<any> } }
}

const ERR: Record<string, string> = {
  not_granted: 'Claude 사용을 허용하지 않아 리포트를 쓸 수 없어요.',
  rate_limited: '요청이 많아요. 잠시 후 다시 눌러 주세요.',
};

function mount(sample: any) {
  const requestReport: ReportFn | null = sample
    ? async (form, onText) => {
        try {
          const res = await sample(SYSTEM + '\n\n---\n\n' + buildReportPrompt(form), {
            model: 'claude-fable-5-2',
            modelTier: 'complex', // Fable 을 쓸 수 없는 환경이면 이 등급으로 대체
            onText: ({ text }: { text: string }) => onText(text),
          });
          return demoModel(res);
        } catch (e: any) {
          throw new Error(ERR[e?.code] ?? e?.message ?? '리포트를 받지 못했어요.');
        }
      }
    : null;
  const requestAnswer: AskFn | null = sample
    ? async (form, report, history, question, onText) => {
        try {
          const res = await sample(QA_SYSTEM + '\n\n---\n\n' + buildQuestionPrompt(form, report, history, question), {
            model: 'claude-fable-5-2',
            modelTier: 'complex',
            cache: false,
            onText: ({ text }: { text: string }) => onText(text),
          });
          return demoModel(res);
        } catch (e: any) {
          throw new Error(ERR[e?.code] ?? e?.message ?? '답변을 받지 못했어요.');
        }
      }
    : null;
  root.render(
    <ZiweiApp
      requestReport={requestReport}
      requestAnswer={requestAnswer}
      privacyNote="질문과 답변은 이 페이지에 저장되지 않아요. 이 화면에만 잠시 보이고, 페이지를 닫거나 새 명반을 만들면 사라집니다. 데모에서는 보고 계신 분의 Claude 계정으로 답변을 만들기 때문에 Claude 이용 정책에 따라 처리돼요."
      aiNote="데모 버전: AI 리포트는 지금 보고 있는 분의 Claude 계정으로 작성돼요. 정식 버전은 서버에서 Claude API로 호출합니다."
    />,
  );
}

const root = createRoot(document.getElementById('root')!);
mount(null);
window.claude?.use('sample').then((s) => s && mount(s)).catch(() => {});
