import { useMemo, useState } from 'react';
import { DictNav } from '../components/LearnBits.tsx';
import { Link } from '../nav.tsx';
import { DICT_BASE_PATH, devKey, proverbListHead, wordPath } from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient } from '../client/index.ts';
import { SITE, useAsync, useDocumentHead } from '../hooks.ts';

export default function UkhanPage() {
  const { data, loading } = useAsync(() => dictionaryClient.ukhan(), []);
  const [theme, setTheme] = useState('');
  const [q, setQ] = useState('');
  const items = data ?? [];
  useDocumentHead(useMemo(() => (items.length ? proverbListHead(SITE, items) : null), [items]));

  const themes = useMemo(() => [...new Set(items.flatMap((p) => p.themes ?? []))].sort((a, b) => a.localeCompare(b, 'ne')), [items]);
  const filtered = useMemo(() => {
    const k = devKey(q);
    return items.filter(
      (p) =>
        (!theme || p.themes?.includes(theme)) &&
        (!q || devKey(p.text).includes(k) || p.meaningNe.includes(q) || p.meaningEn?.toLowerCase().includes(q.toLowerCase())),
    );
  }, [items, theme, q]);

  return (
    <main className="dict dict-ukhan" lang="ne">
      <DictNav />
      <nav className="dict-crumbs">
        <Link to={DICT_BASE_PATH}>शब्दकोश</Link> › उखान टुक्का
      </nav>
      <h1>नेपाली उखान र टुक्का</h1>
      <div className="dict-filters">
        <input type="search" placeholder="उखान खोज्नुहोस्…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="उखान खोज्नुहोस्" />
        <div className="dict-chips" role="group" aria-label="विषय">
          <button type="button" aria-pressed={!theme} onClick={() => setTheme('')}>सबै</button>
          {themes.map((t) => (
            <button type="button" key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {loading && <p aria-busy="true">लोड हुँदैछ…</p>}
      <ul className="dict-proverb-list">
        {filtered.map((p) => (
          <li key={p.id} id={p.id}>
            <h2>
              {p.text} <span className="dict-tag">{p.kind === 'ukhan' ? 'उखान' : 'टुक्का'}</span>
            </h2>
            <p>{p.meaningNe}</p>
            {p.meaningEn && <p lang="en">{p.meaningEn}</p>}
            {p.englishEquivalent && (
              <p lang="en">
                <em>≈ {p.englishEquivalent}</em>
              </p>
            )}
            {p.slugs?.length > 0 && (
              <p className="dict-muted">
                शब्द:{' '}
                {p.slugs.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ', '}
                    <Link to={wordPath(s)}>{s}</Link>
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
