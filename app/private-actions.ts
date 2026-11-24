'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, checkPassword, passwordConfigured, sessionToken } from '@/lib/private-auth';

export async function login(_prev: string, data: FormData): Promise<string> {
  if (!passwordConfigured()) return '아직 서버에 비밀번호(PRIVATE_PASSWORD)가 설정되지 않았어요.';
  if (!checkPassword(String(data.get('password') ?? ''))) {
    // 마구 넣어 보는 시도를 느리게
    await new Promise((r) => setTimeout(r, 1500));
    return '비밀번호가 맞지 않아요.';
  }
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/');
}

export async function logout() {
  (await cookies()).delete({ name: COOKIE, path: '/' });
  redirect('/');
}
