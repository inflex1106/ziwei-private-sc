'use client';

import ZiweiApp from '@/components/ZiweiApp';
import { requestReport, requestAnswer } from '@/lib/api-client';
import type { BirthForm } from '@/lib/build';
import { logout } from '@/app/private-actions';

const DAY = 86400000;
/** 한국 날짜(YYYY-MM-DD) → 그날 0시(UTC 기준 일수) */
const kstDayNumber = (ms: number) => Math.floor((ms + 9 * 3600000) / DAY);

function ApiPeriod({ start, days }: { start: string; days: number }) {
  const [y, m, d] = start.split('-').map(Number);
  const startDay = Date.UTC(y, m - 1, d) / DAY;
  const endDay = startDay + days - 1;
  const end = new Date(endDay * DAY);
  const left = endDay - kstDayNumber(Date.now()) + 1; // 오늘 포함 남은 날
  const fmt = (mm: number, dd: number) => `${mm}월 ${dd}일`;
  return (
    <p className="hint">
      🔑 AI 리포트 사용 가능 기간: {y}년 {fmt(m, d)} ~ {fmt(end.getUTCMonth() + 1, end.getUTCDate())}
      {left > 0 ? ` (오늘 포함 ${left}일 남음)` : ' (기간이 끝났어요. 명반 보기는 계속 돼요)'}
    </p>
  );
}

export default function PrivateApp({
  initial,
  title,
  apiKeyStart,
  apiKeyDays,
}: {
  initial: Partial<BirthForm>;
  title: string;
  apiKeyStart: string;
  apiKeyDays: number;
}) {
  return (
    <ZiweiApp
      title={title}
      initial={initial}
      requestReport={requestReport}
      requestAnswer={requestAnswer}
      headerExtra={
        <>
          <ApiPeriod start={apiKeyStart} days={apiKeyDays} />
          <form action={logout}>
            <button type="submit" className="linkish">잠그기(로그아웃)</button>
          </form>
        </>
      }
    />
  );
}
