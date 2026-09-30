/**
 * Renders Newa (Prachalit) text with the right font + language tag.
 * Add once in your root layout:
 *   <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Newa&display=swap" rel="stylesheet" />
 * or with next/font:  import { Noto_Sans_Newa } from 'next/font/google'
 */
import type { CSSProperties, ReactNode } from 'react';
import { NEWA_FONT_STACK } from '../newa-script';

export function NewaText({ children, size, style, title }: { children: ReactNode; size?: number | string; style?: CSSProperties; title?: string }) {
  return (
    <span lang="new-Newa" title={title} style={{ fontFamily: NEWA_FONT_STACK, fontSize: size, lineHeight: 1.6, ...style }}>
      {children}
    </span>
  );
}
