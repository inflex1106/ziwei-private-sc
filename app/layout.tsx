import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '자미두수',
  description: '출생 정보로 자미두수 명반을 만들고 AI가 쉬운 말로 풀어 주는 테스트 페이지',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
