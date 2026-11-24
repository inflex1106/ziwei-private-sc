'use client';

import { useState } from 'react';

/** 마크다운 기호(#, **, - 등)를 빼고 메신저에 붙여 넣기 좋은 글로 바꾼다. */
export function toPlain(md: string): string {
  return md
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 오래된 브라우저용
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }
}

/** 누르면 글을 복사한다. getText 는 누르는 순간의 글을 돌려준다. */
export default function CopyButton({ getText, label = '복사' }: { getText: () => string; label?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  return (
    <button
      type="button"
      className="copy"
      onClick={async () => {
        setState((await copyText(getText())) ? 'ok' : 'fail');
        setTimeout(() => setState('idle'), 2000);
      }}
    >
      {state === 'ok' ? '✓ 복사됐어요' : state === 'fail' ? '복사하지 못했어요' : `📋 ${label}`}
    </button>
  );
}
