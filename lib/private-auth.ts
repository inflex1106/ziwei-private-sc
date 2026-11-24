import { createHmac, timingSafeEqual } from 'node:crypto';

/** 개인 페이지(/me) 비밀번호. Vercel 환경 변수 PRIVATE_PASSWORD 에만 두고 코드에는 적지 않는다. */
export const COOKIE = 'zw_me';

export function passwordConfigured() {
  return !!process.env.PRIVATE_PASSWORD;
}

/** 쿠키에 넣을 값: 비밀번호 자체가 아니라 비밀번호로 만든 서명. 비밀번호를 바꾸면 기존 로그인은 자동으로 풀린다. */
export function sessionToken() {
  return createHmac('sha256', process.env.PRIVATE_PASSWORD ?? '').update('ziwei-me-session-v1').digest('hex');
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(input: string) {
  const pw = process.env.PRIVATE_PASSWORD;
  return !!pw && same(input.trim(), pw);
}

export function checkSession(cookieValue: string | undefined) {
  return passwordConfigured() && !!cookieValue && same(cookieValue, sessionToken());
}
