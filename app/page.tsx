import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { COOKIE, checkSession } from '@/lib/private-auth';
import { privateDefaults, privateTitle, API_KEY_START, API_KEY_DAYS } from '@/lib/private-profile';
import Login from '@/components/Login';
import PrivateApp from '@/components/PrivateApp';

// 개인용 사이트: 비밀번호를 맞혀야 명반 화면이 열린다.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '자미두수',
  robots: { index: false, follow: false },
};

export default async function Home() {
  const ok = checkSession((await cookies()).get(COOKIE)?.value);
  return ok ? <PrivateApp initial={privateDefaults()} title={privateTitle()} apiKeyStart={API_KEY_START} apiKeyDays={API_KEY_DAYS} /> : <Login />;
}
