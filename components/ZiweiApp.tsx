'use client';

import { useMemo, useState } from 'react';
import { buildChart, CITIES, isKoreaDst8788, type BirthForm, type ChartResult } from '../lib/build';
import { ko, SIHUA_KO, BRIGHT_KO, BRANCHES_KO, STEMS_KO, ganzhiKo } from '../lib/ko';
import type { Palace } from '../lib/ziwei/types';
import { renderMarkdown } from '../lib/markdown';
import Notes from './Notes';
import AskBox, { type AskFn } from './AskBox';

const HUA_CLS: Record<string, string> = { 禄: 'lu', 权: 'quan', 科: 'ke', 忌: 'ji' };

// 전통 4x4 배치: 지지 고정 위치
const GRID: (number | null)[][] = [
  [5, 6, 7, 8],
  [4, null, null, 9],
  [3, null, null, 10],
  [2, 1, 0, 11],
];

function PalaceCell({ p, isCur }: { p: Palace; isCur: boolean }) {
  const major = p.stars.filter((s) => s.type === 'major');
  const good = p.stars.filter((s) => s.type === 'lucky');
  const bad = p.stars.filter((s) => s.type === 'sha');
  const star = (s: Palace['stars'][number]) => (
    <span key={s.name} className={`star ${s.type}`} title={s.name}>
      {ko(s.name)}
      {s.brightnessRaw && <small className="bright">{BRIGHT_KO[s.brightnessRaw]?.ko}</small>}
      {s.siHua && <b className={`sihua h-${HUA_CLS[s.siHua]}`}>{SIHUA_KO[s.siHua].slice(1)}</b>}
    </span>
  );
  return (
    <div className={`cell ${p.isMingGong ? 'ming' : ''} ${isCur ? 'cur' : ''}`}>
      <div className="majors">
        {major.length ? major.map(star) : <span className="empty">공궁{p.borrowedStars?.length ? ` (차성 ${p.borrowedStars.map(ko).join('·')})` : ''}</span>}
      </div>
      <div className="minors">{good.map(star)}</div>
      <div className="minors">{bad.map(star)}</div>
      <div className="foot">
        <span className="pname">
          {ko(p.name)}
          {p.isShenGong && <em className="shen">신</em>}
        </span>
        <span className="age">{p.daXianAge ? `${p.daXianAge[0]}~${p.daXianAge[1]}` : ''}</span>
        <span className="gz">{STEMS_KO[p.stem]}{BRANCHES_KO[p.branch]}</span>
      </div>
    </div>
  );
}

/** 리포트를 받아 onText 로 흘려보내고, 실제 답변 모델 표시(한 줄)를 돌려준다. */
export type ReportFn = (form: BirthForm, onText: (whole: string) => void) => Promise<string | void>;

export default function ZiweiApp({
  requestReport,
  requestAnswer,
  aiNote,
  privacyNote,
  initial,
  title = '자미두수 명반 만들기',
  headerExtra,
}: {
  requestReport: ReportFn | null;
  requestAnswer?: AskFn | null;
  aiNote?: string;
  privacyNote?: string;
  /** 입력칸 기본값 (개인 페이지용) */
  initial?: Partial<BirthForm>;
  title?: string;
  headerExtra?: React.ReactNode;
}) {
  const [f, setF] = useState<BirthForm>(() => ({
    name: '',
    calendar: 'solar',
    year: 1990,
    month: 5,
    day: 15,
    isLeapMonth: false,
    timeKnown: true,
    hour: 14,
    minute: 30,
    gender: 'female',
    longitude: 126.98,
    dst: false,
    ...initial,
  }));
  const [city, setCity] = useState(() => CITIES.find((c) => c.lng === f.longitude)?.name ?? 'custom');
  // 숫자 칸은 문자열로 들고 있다가 제출할 때 숫자로 바꾼다 (지우면 빈칸이 되도록)
  const [txt, setTxt] = useState(() => ({ year: String(f.year), month: String(f.month), day: String(f.day), lng: String(f.longitude) }));
  const setT = (k: keyof typeof txt, v: string, max: number) =>
    setTxt((o) => ({ ...o, [k]: k === 'lng' ? v.replace(/[^\d.\-]/g, '').slice(0, max) : v.replace(/\D/g, '').slice(0, max) }));
  const [result, setResult] = useState<ChartResult | null>(null);
  const [err, setErr] = useState('');
  const [report, setReport] = useState('');
  const [reportModel, setReportModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<BirthForm | null>(null);
  const [tab, setTab] = useState<'chart' | 'notes'>('chart');

  const set = <K extends keyof BirthForm>(k: K, v: BirthForm[K]) => setF((o) => ({ ...o, [k]: v }));
  const dstHint = f.calendar === 'solar' && isKoreaDst8788(+txt.year, +txt.month, +txt.day);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setReport('');
    try {
      const label = { year: '년도', month: '월', day: '일', lng: '경도' } as const;
      const empty = (['year', 'month', 'day'] as const).find((k) => txt[k] === '');
      if (empty) throw new Error(`생년월일의 ${label[empty]}를 입력해 주세요.`);
      const next: BirthForm = { ...f, year: +txt.year, month: +txt.month, day: +txt.day };
      if (city === 'custom') {
        if (txt.lng === '' || !Number.isFinite(+txt.lng)) throw new Error('출생지 경도를 숫자로 입력해 주세요.');
        next.longitude = +txt.lng;
      }
      setF(next);
      setResult(buildChart(next));
      setSubmitted(next);
    } catch (x) {
      setResult(null);
      setErr((x as Error).message);
    }
  };

  const askAI = async () => {
    if (!submitted || !requestReport) return;
    setLoading(true);
    setReport('');
    setReportModel('');
    try {
      setReportModel((await requestReport(submitted, setReport)) || '');
    } catch (x) {
      setReport(`**${(x as Error).message || '리포트를 받지 못했습니다.'}**`);
    } finally {
      setLoading(false);
    }
  };

  const chart = result?.chart;
  const byBranch = useMemo(() => {
    const m: Record<number, Palace> = {};
    chart?.palaces.forEach((p) => (m[p.branch] = p));
    return m;
  }, [chart]);
  const curBranch = chart ? chart.daXians[chart.currentDaXianIndex]?.palaceBranch : -1;

  return (
    <main>
      <header>
        <h1>{title}</h1>
        <p className="sub">출생 정보를 넣으면 명반을 그리고, AI가 쉬운 말로 풀어 드려요.</p>
        {headerExtra}
      </header>

      <nav className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'chart'} className={tab === 'chart' ? 'on' : ''} onClick={() => setTab('chart')}>명반</button>
        <button type="button" role="tab" aria-selected={tab === 'notes'} className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>참고할 점</button>
      </nav>

      {tab === 'notes' && <Notes />}
      <div hidden={tab !== 'chart'}>

      <form onSubmit={onSubmit} className="form">
        <label>
          이름(선택)
          <input value={f.name} maxLength={20} onChange={(e) => set('name', e.target.value)} placeholder="홍길동" />
        </label>
        <div className="row">
          <span className="lbl">성별</span>
          <label className="radio"><input type="radio" checked={f.gender === 'female'} onChange={() => set('gender', 'female')} /> 여</label>
          <label className="radio"><input type="radio" checked={f.gender === 'male'} onChange={() => set('gender', 'male')} /> 남</label>
        </div>
        <div className="row">
          <span className="lbl">달력</span>
          <label className="radio"><input type="radio" checked={f.calendar === 'solar'} onChange={() => set('calendar', 'solar')} /> 양력</label>
          <label className="radio"><input type="radio" checked={f.calendar === 'lunar'} onChange={() => set('calendar', 'lunar')} /> 음력</label>
          {f.calendar === 'lunar' && (
            <label className="radio"><input type="checkbox" checked={!!f.isLeapMonth} onChange={(e) => set('isLeapMonth', e.target.checked)} /> 윤달</label>
          )}
        </div>
        <div className="row">
          <span className="lbl">생년월일</span>
          <input id="by" className="num4" type="text" inputMode="numeric" placeholder="1990" value={txt.year} onChange={(e) => setT('year', e.target.value, 4)} />년
          <input id="bm" className="num2" type="text" inputMode="numeric" placeholder="5" value={txt.month} onChange={(e) => setT('month', e.target.value, 2)} />월
          <input id="bd" className="num2" type="text" inputMode="numeric" placeholder="15" value={txt.day} onChange={(e) => setT('day', e.target.value, 2)} />일
        </div>
        <div className="row">
          <span className="lbl">태어난 시각</span>
          <input
            type="time"
            disabled={!f.timeKnown}
            value={`${String(f.hour).padStart(2, '0')}:${String(f.minute).padStart(2, '0')}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              setF((o) => ({ ...o, hour: h || 0, minute: m || 0 }));
            }}
          />
          <label className="radio"><input type="checkbox" checked={!f.timeKnown} onChange={(e) => set('timeKnown', !e.target.checked)} /> 시각 모름</label>
        </div>
        <div className="row">
          <span className="lbl">출생지</span>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              const c = CITIES.find((x) => x.name === e.target.value);
              if (c) set('longitude', c.lng);
            }}
          >
            {CITIES.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
            <option value="custom">직접 입력(경도)</option>
          </select>
          {city === 'custom' && (
            <input id="lng" className="num4" type="text" inputMode="decimal" placeholder="126.98" value={txt.lng} onChange={(e) => setT('lng', e.target.value, 8)} />
          )}
        </div>
        <div className="row">
          <label className="radio">
            <input type="checkbox" checked={f.dst} onChange={(e) => set('dst', e.target.checked)} /> 서머타임 기간에 태어났어요
          </label>
          {dstHint && !f.dst && <span className="hint">1987·88년 서머타임 기간이에요. 당시 시계 기준이면 체크하세요.</span>}
        </div>
        <button type="submit">명반 만들기</button>
        {err && <p className="err">{err}</p>}
      </form>

      {chart && (
        <section>
          <div className="grid">
            {GRID.map((row, r) =>
              row.map((b, c) => {
                if (b === null) {
                  if (r === 1 && c === 1) {
                    const li = chart.lunarInfo;
                    return (
                      <div key="center" className="center">
                        <h2>{submitted?.name || '나'}의 명반</h2>
                        <p>양력 {result!.solarDate.year}.{result!.solarDate.month}.{result!.solarDate.day} · {submitted?.gender === 'male' ? '남' : '여'} · {ko(chart.yinYangGender ?? '')}</p>
                        <p>음력 {li.lunarYear}.{li.isLeapMonth ? '윤' : ''}{Math.abs(li.lunarMonth)}.{li.lunarDay} {BRANCHES_KO[chart.birthInfo.hour]}시</p>
                        <p>사주 {li.fourPillars?.map(ganzhiKo).join(' ')}</p>
                        <p>{ko(chart.wuxingJuName)} · 명주 {ko(chart.mingZhu ?? '')} · 신주 {ko(chart.shenZhu ?? '')}</p>
                        <p>현재 만 {chart.currentAge}세 · 대한 {ko(chart.daXians[chart.currentDaXianIndex]?.palaceName ?? '')}</p>
                        <ul className="notes">{result!.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                      </div>
                    );
                  }
                  return null;
                }
                const p = byBranch[b];
                return p ? <PalaceCell key={b} p={p} isCur={b === curBranch} /> : <div key={b} />;
              }),
            )}
          </div>
          <p className="legend">
            <span className="star major">주성</span> <span className="star lucky">길성</span> <span className="star sha">살성</span> · 작은 글자 = 밝기(묘·왕·득·리·평·불·함) · <b className="sihua h-lu">록</b><b className="sihua h-quan">권</b><b className="sihua h-ke">과</b><b className="sihua h-ji">기</b> = 사화 · 굵은 테두리 = 명궁, 점선 = 현재 대한
          </p>

          <div className="ai">
            {requestReport ? (
              <button onClick={askAI} disabled={loading}>{loading ? 'AI가 리포트를 쓰는 중…' : '✨ AI 재미 분석 리포트 받기'}</button>
            ) : (
              <p className="hint">이 화면에서는 AI 리포트를 쓸 수 없어요.</p>
            )}
            {aiNote && <p className="legend">{aiNote}</p>}
            {loading && !report && <p className="legend">생각하는 중… (보통 10~40초 걸려요)</p>}
            {report && <article className="report" dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />}
            {report && !loading && reportModel && <p className="model-tag">🤖 {reportModel}</p>}
            {report && !loading && submitted && requestAnswer && (
              <AskBox key={report} form={submitted} report={report} requestAnswer={requestAnswer} privacyNote={privacyNote} />
            )}
          </div>
        </section>
      )}

      </div>

      <footer>
        명반 계산 엔진: <a href="https://github.com/Renhuai123/ziwei-doushu">Renhuai123/ziwei-doushu</a> (MIT) · iztro (MIT) · lunar-javascript (MIT).
        이 페이지의 결과는 재미와 참고용입니다.
      </footer>
    </main>
  );
}
