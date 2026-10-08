import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { insertDictatedText } from '../voice-insertion';

export function useDictationEditor(text: string, setText: Dispatch<SetStateAction<string>>, textarea: RefObject<HTMLTextAreaElement | null>, onCommit?: () => void) {
  const latest = useRef(text);
  const cursor = useRef(text.length);
  useLayoutEffect(() => { latest.current = text; }, [text]);
  return useCallback((chunk: string) => {
    const el = textarea.current;
    const matches = el?.value === latest.current;
    const next = insertDictatedText(latest.current, chunk, matches ? el.selectionStart : cursor.current,
      matches ? el.selectionEnd : cursor.current, el && el.maxLength >= 0 ? el.maxLength : Infinity);
    latest.current = next.text; cursor.current = next.cursor;
    setText(next.text); onCommit?.();
    requestAnimationFrame(() => { if (textarea.current === el && el) el.setSelectionRange(next.cursor, next.cursor); });
  }, [setText, textarea, onCommit]);
}

export function InlineDictationPreview({ textarea, interim }: { textarea: RefObject<HTMLTextAreaElement | null>; interim: string }) {
  const [layout, setLayout] = useState<{ style: CSSProperties; prefix: string; scroll: number; background: string } | null>(null);
  useLayoutEffect(() => {
    const el = textarea.current, parent = el?.parentElement;
    if (!el || !parent || !interim) return;
    const previous = parent.style.position;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    const measure = () => {
      const css = getComputedStyle(el);
      setLayout({ style: { position: 'absolute', pointerEvents: 'none', overflow: 'hidden', boxSizing: 'border-box',
        top: el.offsetTop + el.clientTop, left: el.offsetLeft + el.clientLeft, width: el.clientWidth, height: el.clientHeight,
        padding: css.padding, font: css.font, lineHeight: css.lineHeight, letterSpacing: css.letterSpacing, textAlign: css.textAlign as CSSProperties['textAlign'],
        whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }, prefix: el.value.slice(0, el.selectionStart), scroll: el.scrollTop, background: css.backgroundColor });
    };
    measure(); el.addEventListener('scroll', measure); el.addEventListener('select', measure); window.addEventListener('resize', measure);
    return () => { parent.style.position = previous; el.removeEventListener('scroll', measure); el.removeEventListener('select', measure); window.removeEventListener('resize', measure); };
  }, [textarea, interim]);
  if (!interim || !layout) return null;
  return <><span className="dictation-inline-preview" style={layout.style} aria-hidden="true">
    <span style={{ display: 'block', transform: `translateY(-${layout.scroll}px)` }}><span style={{ visibility: 'hidden' }}>{layout.prefix}</span><span style={{ opacity: .58, background: layout.background }}>{interim}</span></span>
  </span><span className="sr-only" role="status" aria-live="polite">{interim}</span></>;
}
