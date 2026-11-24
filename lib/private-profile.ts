import { CITIES, type BirthForm } from '@/lib/build';

/**
 * 개인 사이트 입력칸 기본값과 제목.
 * 개인 정보는 코드에 적지 않고 Vercel 환경 변수에서 읽는다. 서버에서만 읽고, 비밀번호를 맞힌 뒤에만 브라우저로 보낸다.
 *
 *   PRIVATE_NAME    예) 홍길동            (제목은 '길동만의 자미두수 명반' 처럼 이름에서 성을 뺀 부분으로)
 *   PRIVATE_GENDER  여 또는 남
 *   PRIVATE_BIRTH   예) 1990-05-15 14:30  (음력이면 앞에 '음력 ', 윤달이면 '음력윤달 ')
 *   PRIVATE_CITY    예) 서울              (출생지 목록에 있는 도시 이름)
 *   PRIVATE_TITLE   (선택) 제목을 직접 정하고 싶을 때
 */
export function privateDefaults(): Partial<BirthForm> {
  const env = process.env;
  const out: Partial<BirthForm> = {};
  if (env.PRIVATE_NAME) out.name = env.PRIVATE_NAME.trim();
  if (env.PRIVATE_GENDER) out.gender = env.PRIVATE_GENDER.trim().startsWith('남') ? 'male' : 'female';

  const m = env.PRIVATE_BIRTH?.trim().match(/^(음력윤달|음력|양력)?\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    out.calendar = m[1]?.startsWith('음력') ? 'lunar' : 'solar';
    out.isLeapMonth = m[1] === '음력윤달';
    out.year = +m[2];
    out.month = +m[3];
    out.day = +m[4];
    out.timeKnown = m[5] !== undefined;
    if (m[5] !== undefined) {
      out.hour = +m[5];
      out.minute = +m[6];
    }
  }

  const city = CITIES.find((c) => c.name === env.PRIVATE_CITY?.trim());
  if (city) out.longitude = city.lng;
  return out;
}

export function privateTitle(): string {
  if (process.env.PRIVATE_TITLE) return process.env.PRIVATE_TITLE.trim();
  const name = process.env.PRIVATE_NAME?.trim();
  const given = name && name.length === 3 ? name.slice(1) : name; // 세 글자 이름이면 성을 뺀다
  return `${given || '나'}만의 자미두수 명반`;
}

/**
 * AI(API 키) 사용 가능 기간 표시용. 시작일을 1일째로 세어 API_KEY_DAYS 일째 되는 날까지.
 * 예: 11월 24일 시작, 7일 → 11월 30일까지. 키를 새로 받으면 시작일만 바꾸면 된다.
 */
export const API_KEY_START = '2026-11-24';
export const API_KEY_DAYS = 7;
