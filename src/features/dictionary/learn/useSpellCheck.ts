/**
 * useSpellCheck(text) — reusable anywhere in Aafnai Patro (e.g. the Nepali typing
 * tool): returns tokens marked ok / suspect / unknown with suggestions.
 * The ~50k-word lexicon (~1 MB, ~250 KB gzipped) loads lazily on first use and is cached.
 */
import { useEffect, useMemo, useState } from 'react';
import { buildSpellIndex, checkSpelling, type SpellIndex, type SpellToken } from '../../../lib/dictionary-core/index.ts';
import { learnClient } from '../client/learnClient.ts';
import { useDebounced } from '../hooks.ts';

let indexPromise: Promise<SpellIndex> | null = null;
export function loadSpellIndex(): Promise<SpellIndex> {
  indexPromise ??= learnClient.spellWords().then(buildSpellIndex);
  return indexPromise;
}

export function useSpellCheck(text: string, delay = 250): { tokens: SpellToken[]; ready: boolean } {
  const [idx, setIdx] = useState<SpellIndex | null>(null);
  useEffect(() => {
    let alive = true;
    loadSpellIndex().then((i) => alive && setIdx(i));
    return () => {
      alive = false;
    };
  }, []);
  const t = useDebounced(text, delay);
  const tokens = useMemo(() => (idx ? checkSpelling(t, idx) : []), [idx, t]);
  return { tokens, ready: !!idx };
}

/** Apply a replacement for the token at `start` (keeps the rest of the text intact). */
export function replaceToken(text: string, tok: SpellToken, replacement: string): string {
  return text.slice(0, tok.start) + replacement + text.slice(tok.start + tok.text.length);
}
