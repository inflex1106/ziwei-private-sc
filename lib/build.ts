/**
 * 입력 폼 → 명반. 한국 출생을 기본으로 가정한다.
 * 엔진(lib/ziwei)은 Renhuai123/ziwei-doushu (MIT) 에서 가져왔다.
 */
import { generateTrueSolarChart } from './ziwei/chart-entry';
import { lunarToSolar } from './ziwei/lunar-solar';
import type { ZiweiChart } from './ziwei/types';
import { ko, SIHUA_KO, BRIGHT_KO, STAR_TYPE_KO, BRANCHES_KO, STEMS_KO, ganzhiKo } from './ko';

export interface BirthForm {
  name?: string;
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
  timeKnown: boolean;
  hour: number; // 0-23 (시계 시각)
  minute: number;
  gender: 'male' | 'female';
  longitude: number; // 출생지 경도
  /** 출생 당시 서머타임이 적용된 시각이면 true → 1시간 빼서 표준시로 바꾼다 */
  dst: boolean;
  /** 해외 출생 등: 표준시 UTC 오프셋(분). 비우면 한국 표준시 규칙을 자동 적용 */
  utcOffsetMinutes?: number;
}

export const CITIES: { name: string; lng: number }[] = [
  { name: '서울', lng: 126.98 },
  { name: '인천', lng: 126.71 },
  { name: '수원', lng: 127.03 },
  { name: '춘천', lng: 127.73 },
  { name: '강릉', lng: 128.9 },
  { name: '대전', lng: 127.38 },
  { name: '청주', lng: 127.49 },
  { name: '전주', lng: 127.15 },
  { name: '광주', lng: 126.85 },
  { name: '대구', lng: 128.6 },
  { name: '포항', lng: 129.37 },
  { name: '울산', lng: 129.31 },
  { name: '부산', lng: 129.08 },
  { name: '창원', lng: 128.68 },
  { name: '제주', lng: 126.53 },
];

/**
 * 한국 표준시 이력(가정):
 *  - 1954-03-21 ~ 1961-08-09 : UTC+8:30 (동경 127.5° 기준)
 *  - 그 외 현대 : UTC+9:00
 * 1908~1911, 1912 이전 등 더 오래된 구간은 다루지 않는다.
 */
export function koreaStdOffset(y: number, m: number, d: number): number {
  const v = y * 10000 + m * 100 + d;
  if (v >= 19540321 && v < 19610810) return 510;
  return 540;
}

/** 1987·1988년 한국 서머타임 구간(02:00~03:00 경계는 날짜 단위로 근사). 그 이전 서머타임은 사용자가 직접 체크. */
export function isKoreaDst8788(y: number, m: number, d: number): boolean {
  const v = y * 10000 + m * 100 + d;
  return (v >= 19870510 && v < 19871011) || (v >= 19880508 && v < 19881009);
}

export type ChartResult = {
  chart: ZiweiChart;
  solarDate: { year: number; month: number; day: number };
  notes: string[];
};

export function buildChart(f: BirthForm): ChartResult {
  const notes: string[] = [];
  let solar = { year: f.year, month: f.month, day: f.day };
  if (f.calendar === 'lunar') {
    const s = lunarToSolar(f.year, f.month, f.day, !!f.isLeapMonth);
    if (!s) throw new Error('존재하지 않는 음력 날짜입니다. (윤달 여부를 확인해 주세요)');
    solar = s;
    notes.push(`음력 ${f.year}.${f.month}.${f.day}${f.isLeapMonth ? '(윤달)' : ''} → 양력 ${s.year}.${s.month}.${s.day}`);
  }

  let hour = f.timeKnown ? f.hour : 12;
  let minute = f.timeKnown ? f.minute : 0;
  if (!f.timeKnown) notes.push('출생 시각을 몰라 정오(12:00, 오시)로 가정했습니다. 시각에 따라 명궁이 바뀌므로 참고용입니다.');

  if (f.timeKnown && f.dst) {
    // 서머타임 시각 → 표준시로 1시간 되돌림 (자정 넘김 처리)
    let total = hour * 60 + minute - 60;
    if (total < 0) {
      total += 1440;
      const prev = new Date(Date.UTC(solar.year, solar.month - 1, solar.day - 1));
      solar = { year: prev.getUTCFullYear(), month: prev.getUTCMonth() + 1, day: prev.getUTCDate() };
    }
    hour = Math.floor(total / 60);
    minute = total % 60;
    notes.push('서머타임 시각이라 1시간을 빼서 표준시로 계산했습니다.');
  }

  const utcOffsetMinutes = f.utcOffsetMinutes ?? koreaStdOffset(solar.year, solar.month, solar.day);
  if (utcOffsetMinutes === 510) notes.push('1954~1961년 한국 표준시(UTC+8:30)를 적용했습니다.');

  const chart = generateTrueSolarChart(
    { year: solar.year, month: solar.month, day: solar.day, hour: 0, gender: f.gender, longitude: f.longitude, name: f.name },
    { year: solar.year, month: solar.month, day: solar.day, clockHour: hour, clockMinute: minute, utcOffsetMinutes },
  );
  notes.push(`출생지 경도 ${f.longitude}°로 진태양시를 보정해 ${BRANCHES_KO[chart.birthInfo.hour]}시(${'子丑寅卯辰巳午未申酉戌亥'[chart.birthInfo.hour]}時)로 배치했습니다.`);
  return { chart, solarDate: solar, notes };
}

/** AI 에게 넘길 간결한 한국어 요약 데이터 */
export function chartForAI(chart: ZiweiChart, form: Pick<BirthForm, 'name' | 'gender'>) {
  const li = chart.lunarInfo;
  const cur = chart.daXians[chart.currentDaXianIndex];
  return {
    이름: form.name || '사용자',
    성별: form.gender === 'male' ? '남' : '여',
    현재나이_만: chart.currentAge,
    음력생일: `${li.lunarYear}년 ${li.isLeapMonth ? '윤' : ''}${Math.abs(li.lunarMonth)}월 ${li.lunarDay}일`,
    사주: li.fourPillars?.map(ganzhiKo).join(' '),
    오행국: ko(chart.wuxingJuName),
    명주: ko(chart.mingZhu ?? ''),
    신주: ko(chart.shenZhu ?? ''),
    현재대한: cur ? { 나이: `${cur.startAge}~${cur.endAge}세`, 궁: ko(cur.palaceName) } : null,
    십이궁: chart.palaces
      .slice()
      .sort((a, b) => (a.isMingGong ? -1 : b.isMingGong ? 1 : 0))
      .map((p) => ({
        궁: ko(p.name) + (p.isShenGong ? '(신궁)' : ''),
        간지: STEMS_KO[p.stem] + BRANCHES_KO[p.branch],
        대한나이: p.daXianAge ? `${p.daXianAge[0]}~${p.daXianAge[1]}` : undefined,
        별: p.stars
          .filter((s) => s.type !== 'minor')
          .map((s) => {
            const b = s.brightnessRaw ? BRIGHT_KO[s.brightnessRaw]?.ko : '';
            const h = s.siHua ? SIHUA_KO[s.siHua] : '';
            return `${ko(s.name)}(${STAR_TYPE_KO[s.type]}${b ? ',' + b : ''}${h ? ',' + h : ''})`;
          }),
        공궁차성: p.isEmpty && p.borrowedStars?.length ? p.borrowedStars.map(ko) : undefined,
      })),
  };
}
