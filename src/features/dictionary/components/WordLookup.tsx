import { useEffect, useRef, useState } from 'react';
import { Link } from '../nav.tsx';
import { DICT_BASE_PATH, POS_LABELS, englishSlug, hasDevanagari, wordPath, type PartOfSpeech } from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient } from '../client/index.ts';
import { learnClient } from '../client/learnClient.ts';
import { SaveButton, SpeakButton } from './LearnBits.tsx';

interface Found {
  kind: 'ne' | 'en';
  term: string;
  slug: string;
  lemma: string;
  roman: string;
  pos?: string;
  ne?: string;
  en?: string;
  more?: string[];
}

/**
 * Tap-to-translate for the WHOLE app. Mount once near the root of Aafnai Patro:
 *
 *   <WordLookup />            // inside your <RouterProvider>/<BrowserRouter> tree
 *
 * Double-click (desktop) or select (mobile long-press) any Nepali or English word in
 * news, rashifal, history, festival pages… and a small card shows its meaning,
 * pronunciation and a ☆ to save it for practice. Inputs, textareas and elements with
 * [data-no-lookup] are ignored.
 */
export function WordLookup({ disabled = false }: { disabled?: boolean }) {
  const [card, setCard] = useState<{ x: number; y: number; data: Found | null; term: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (disabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const lookup = async () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      if (!node || node.closest('input,textarea,[contenteditable],[data-no-lookup],.dict-lookup')) return;
      const term = sel.toString().trim().replace(/[।,.!?;:"'“”‘’()]+/g, '');
      if (!term || term.length > 40 || term.split(/\s+/).length > 3) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const x = Math.min(Math.max(12, rect.left + rect.width / 2 - 150), window.innerWidth - 312);
      const y = rect.bottom + 8 + window.scrollY;
      const id = ++reqId.current;
      setCard({ x, y, term, data: null });
      const data = await find(term);
      if (id === reqId.current) setCard({ x, y, term, data });
    };

    const onSelect = () => {
      clearTimeout(timer);
      timer = setTimeout(lookup, 450); // wait until the user finishes selecting
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setCard(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCard(null);
    document.addEventListener('dblclick', lookup);
    document.addEventListener('selectionchange', onSelect);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('dblclick', lookup);
      document.removeEventListener('selectionchange', onSelect);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [disabled]);

  if (!card) return null;
  const d = card.data;
  return (
    <div ref={ref} className="dict-lookup" role="dialog" aria-label="शब्दको अर्थ" style={{ left: card.x, top: card.y }}>
      {!d ? (
        <p className="dict-muted">“{card.term}” खोज्दै…</p>
      ) : d.slug === '' ? (
        <p className="dict-muted">
          “{card.term}” भेटिएन। <Link to={`${DICT_BASE_PATH}?q=${encodeURIComponent(card.term)}`}>शब्दकोशमा खोज्नुहोस्</Link>
        </p>
      ) : (
        <>
          <div className="dict-lookup-head">
            {d.kind === 'en' && (
              <span className="dict-lookup-en" lang="en">
                {d.term} <SpeakButton text={d.term} lang="en" /> →
              </span>
            )}
            <strong lang="ne">{d.lemma}</strong> <small lang="en">{d.roman}</small>
            {d.kind === 'ne' && <SpeakButton text={d.lemma} lang="ne" />}
            {d.pos && <span className="dict-pos">{POS_LABELS[d.pos as PartOfSpeech]?.ne ?? d.pos}</span>}
          </div>
          {d.ne && <p lang="ne">{d.ne}</p>}
          {d.en && <p className="dict-en" lang="en">{d.en}</p>}
          {d.more && d.more.length > 0 && <p className="dict-muted" lang="ne">अरू: {d.more.join(', ')}</p>}
          <div className="dict-lookup-actions">
            <SaveButton
              id={d.kind === 'en' ? `en:${d.term}` : d.slug}
              front={d.kind === 'en' ? d.term : d.lemma}
              back={d.kind === 'en' ? [d.lemma, ...(d.more ?? [])].join(', ') : d.en ?? d.ne ?? ''}
              dir={d.kind === 'en' ? 'en-ne' : 'ne-en'}
            />
            <Link to={d.kind === 'en' ? `${DICT_BASE_PATH}/en/${englishSlug(d.term)}` : wordPath(d.slug)} onClick={() => setCard(null)}>
              पूरा अर्थ →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

async function find(term: string): Promise<Found> {
  if (!hasDevanagari(term)) {
    const hits = await learnClient.english(term.toLowerCase());
    if (hits.length) {
      const h = hits[0];
      return { kind: 'en', term: term.toLowerCase(), slug: h.s, lemma: h.l, roman: h.r, pos: h.p, ne: h.d, more: hits.slice(1, 4).map((x) => x.l) };
    }
  }
  const res = await dictionaryClient.search(term, 1);
  const hit = res.hits[0];
  if (!hit) return { kind: 'ne', term, slug: '', lemma: term, roman: '' };
  const w = await dictionaryClient.word(hit.slug);
  if (w.kind !== 'ok') return { kind: 'ne', term, slug: hit.slug, lemma: hit.lemma, roman: hit.roman, en: hit.gloss };
  const s = w.payload.entry.senses[0];
  return {
    kind: 'ne', term, slug: hit.slug, lemma: hit.lemma, roman: hit.roman,
    pos: s?.pos ?? w.payload.entry.posHint, ne: s?.ne, en: [...new Set(w.payload.entry.senses.flatMap((x) => x.en ?? []))].slice(0, 4).join(', ') || undefined,
  };
}
