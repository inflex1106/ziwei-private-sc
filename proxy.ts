import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, checkSession } from '@/lib/private-auth';

// 개인용 사이트: 로그인하지 않은 사람은 AI API(=내 API 키)를 쓸 수 없다.
export function proxy(req: NextRequest) {
  if (!checkSession(req.cookies.get(COOKIE)?.value)) {
    return new NextResponse('비밀번호를 먼저 입력해 주세요.', { status: 401 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
