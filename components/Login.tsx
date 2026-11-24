'use client';

import { useActionState } from 'react';
import { login } from '@/app/private-actions';

export default function Login() {
  const [msg, action, pending] = useActionState(login, '');
  return (
    <main>
      <form action={action} className="form lock">
        <h1>🔒 비밀번호를 입력하세요</h1>
        <input name="password" type="password" inputMode="numeric" autoComplete="current-password" autoFocus required placeholder="비밀번호" />
        <button type="submit" disabled={pending}>{pending ? '확인 중…' : '들어가기'}</button>
        {msg && <p className="err">{msg}</p>}
      </form>
    </main>
  );
}
