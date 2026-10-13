import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from '../nav.tsx';
import { DICT_BASE_PATH, wordPath, type SearchHit } from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient } from '../client/index.ts';
import { useDebounced } from '../hooks.ts';

/**
 * Accessible combobox (WAI-ARIA 1.2 pattern). Accepts Devanagari, Romanized
 * Nepali and English: "घर", "ghar", "house", "घरको अर्थ", "rhymes with maya".
 * Pairs well with your existing /nepali-typing transliterator if you want a
 * "type in Roman → Devanagari" toggle; the search itself does not need it.
 */
export function SearchBox({ autoFocus = false, initial = '' }: { autoFocus?: boolean; initial?: string }) {
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [intent, setIntent] = useState<string>('any');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(q.trim(), 120);
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!debounced) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    dictionaryClient
      .search(debounced, 8, ctrl.signal)
      .then((r) => {
        setHits(r.hits);
        setIntent(r.intent);
        setActive(r.hits.length ? 0 : -1);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [debounced]);

  const go = (h?: SearchHit) => {
    setOpen(false);
    if (h) {
      navigate(intent === 'rhyme' ? `${DICT_BASE_PATH}/anupras/${h.slug}` : wordPath(h.slug));
    } else if (q.trim()) {
      navigate(`${DICT_BASE_PATH}?q=${encodeURIComponent(q.trim())}`);
    }
    inputRef.current?.blur();
  };

  return (
    <form
      className="dict-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(hits[active] ?? undefined);
      }}
    >
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        lang="ne"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder="शब्द खोज्नुहोस् · ghar · house"
        aria-label="शब्द खोज्नुहोस्"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <button type="submit">खोज</button>
      {open && hits.length > 0 && (
        <ul id={listId} role="listbox" className="dict-suggest">
          {hits.map((h, i) => (
            <li
              key={h.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(h)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="dict-suggest-lemma">{h.lemma}</span>
              <span className="dict-suggest-roman" lang="en">{h.roman}</span>
              {h.gloss && <span className="dict-suggest-gloss" lang="en">{h.gloss}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
