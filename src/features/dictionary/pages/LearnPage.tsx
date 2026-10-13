import { useMemo, useState } from 'react';
import { Link, useParams } from '../nav.tsx';
import { DICT_BASE_PATH, LEVELS, TOOL_PAGES, englishSlug, toolHead, wordPath, type Level } from '../../../lib/dictionary-core/index.ts';
import { learnClient } from '../client/learnClient.ts';
import { DictNav, LevelBadge, SaveButton, SpeakButton } from '../components/LearnBits.tsx';
import { cardStore } from '../learn/store.ts';
import { SITE, useAsync, useDocumentHead } from '../hooks.ts';

const LIST_LEVELS = LEVELS.filter((l) => l.id !== 'C1');
const PAGE = 100;

export const listTitle = (lang: 'ne' | 'en', level: Level) => {
  const L = LEVELS.find((l) => l.id === level)!;
  return lang === 'ne'
    ? `धेरै प्रयोग हुने नेपाली शब्द — ${level} (${L.ne}) · Common Nepali words with English meaning`
    : `${level} English words with Nepali meaning · अङ्ग्रेजी शब्द — ${L.ne}`;
};

/** <base>/sikau — hub */
export function LearnHome() {
  useDocumentHead(useMemo(() => toolHead(SITE, TOOL_PAGES.sikau.path, TOOL_PAGES.sikau.title, TOOL_PAGES.sikau.description), []));
  return (
    <main className="dict dict-learn" lang="ne">
      <DictNav />
      <h1>शब्द सिकौँ</h1>
      <p className="dict-muted">सबैभन्दा धेरै प्रयोग हुने शब्दबाट सुरु गर्नुहोस्। हरेक शब्दमा ☆ थिच्नुहोस् — त्यो "अभ्यास" मा फ्ल्यासकार्ड बन्छ र सही समयमा दोहोरिन्छ।</p>
      <div className="dict-learn-grid">
        <section className="dict-card">
          <h2>नेपाली शब्द <small lang="en">for learners of Nepali &amp; students</small></h2>
          <ul>
            {LIST_LEVELS.map((L) => (
              <li key={L.id}>
                <Link to={`${DICT_BASE_PATH}/sikau/ne-${L.id}`}>
                  <LevelBadge level={L.id} /> {L.ne}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="dict-card" lang="en">
          <h2>English words <small lang="ne">अङ्ग्रेजी सिक्नेहरूका लागि</small></h2>
          <ul>
            {LIST_LEVELS.map((L) => (
              <li key={L.id}>
                <Link to={`${DICT_BASE_PATH}/sikau/en-${L.id}`}>
                  <LevelBadge level={L.id} /> {L.en}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p>
        <Link to={`${DICT_BASE_PATH}/pariksha`}>परीक्षा तयारी क्विज →</Link> · <Link to={`${DICT_BASE_PATH}/abhyas`}>मेरा फ्ल्यासकार्ड →</Link>
      </p>
    </main>
  );
}

/** <base>/sikau/:list   (ne-A1 … ne-B2, en-A1 … en-B2) */
export function LearnListPage() {
  const list = useParams().list ?? 'ne-A1';
  const [lang, level] = list.split('-') as ['ne' | 'en', Level];
  const [page, setPage] = useState(0);
  const ne = useAsync(() => (lang === 'ne' ? learnClient.neList(level) : Promise.resolve([])), [list]);
  const en = useAsync(() => (lang === 'en' ? learnClient.enList(level) : Promise.resolve([])), [list]);
  const title = listTitle(lang, level);
  useDocumentHead(useMemo(() => toolHead(SITE, `/sikau/${list}`, title, `${title}. अर्थ, उच्चारण र उदाहरणसहित; फ्ल्यासकार्ड र क्विजबाट अभ्यास गर्नुहोस्।`), [list, title]));

  const items = lang === 'ne' ? ne.data ?? [] : en.data ?? [];
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const slice = items.slice(page * PAGE, (page + 1) * PAGE);

  const saveAll = () => {
    if (lang === 'ne') for (const it of slice as NonNullable<typeof ne.data>) cardStore.add(it.s, it.l, it.e, 'ne-en');
    else for (const it of slice as NonNullable<typeof en.data>) cardStore.add(`en:${it.k}`, it.k, it.m.map((m) => m[0]).join(', '), 'en-ne');
  };

  return (
    <main className="dict dict-learn-list" lang="ne">
      <DictNav />
      <nav className="dict-crumbs">
        <Link to={`${DICT_BASE_PATH}/sikau`}>सिकौँ</Link> › {list}
      </nav>
      <h1>
        <LevelBadge level={level} /> {title}
      </h1>
      <nav className="dict-chips dict-level-switch">
        {LIST_LEVELS.map((L) => (
          <Link key={L.id} to={`${DICT_BASE_PATH}/sikau/${lang}-${L.id}`} aria-current={L.id === level ? 'page' : undefined} onClick={() => setPage(0)}>
            {L.id}
          </Link>
        ))}
        <Link to={`${DICT_BASE_PATH}/sikau/${lang === 'ne' ? 'en' : 'ne'}-${level}`} onClick={() => setPage(0)}>
          {lang === 'ne' ? 'English list →' : 'नेपाली सूची →'}
        </Link>
      </nav>
      <div className="dict-actions">
        <button type="button" onClick={saveAll}>☆ यो पृष्ठका {slice.length} शब्द अभ्यासमा राख्नुहोस्</button>
        <Link to={`${DICT_BASE_PATH}/pariksha?mode=${lang === 'ne' ? 'meaning-en' : 'meaning-ne'}&level=${level}`}>यो स्तरको क्विज →</Link>
      </div>

      {(ne.loading || en.loading) && <p aria-busy="true">लोड हुँदैछ…</p>}
      <table className="dict-table">
        <tbody>
          {lang === 'ne'
            ? (slice as NonNullable<typeof ne.data>).map((it, i) => (
                <tr key={it.s}>
                  <td className="dict-num">{page * PAGE + i + 1}</td>
                  <td>
                    <Link to={wordPath(it.s)} className="dict-table-lemma">{it.l}</Link> <SpeakButton text={it.l} lang="ne" />
                    <div className="dict-muted" lang="en">{it.r}</div>
                  </td>
                  <td>
                    <div lang="en">{it.e}</div>
                    {it.x && <div className="dict-table-ex">{it.x[0]}</div>}
                  </td>
                  <td><SaveButton id={it.s} front={it.l} back={it.e} compact /></td>
                </tr>
              ))
            : (slice as NonNullable<typeof en.data>).map((it, i) => (
                <tr key={it.k}>
                  <td className="dict-num">{page * PAGE + i + 1}</td>
                  <td lang="en">
                    <Link to={`${DICT_BASE_PATH}/en/${englishSlug(it.k)}`} className="dict-table-lemma">{it.k}</Link> <SpeakButton text={it.k} lang="en" />
                  </td>
                  <td>
                    {it.m.map(([l, r, s], j) => (
                      <span key={s}>
                        {j > 0 && ', '}
                        <Link to={wordPath(s)}>{l}</Link> <small className="dict-muted" lang="en">{r}</small>
                      </span>
                    ))}
                  </td>
                  <td><SaveButton id={`en:${it.k}`} front={it.k} back={it.m.map((m) => m[0]).join(', ')} dir="en-ne" compact /></td>
                </tr>
              ))}
        </tbody>
      </table>
      {pages > 1 && (
        <nav className="dict-pager">
          {Array.from({ length: pages }, (_, i) => (
            <a key={i} href="#" aria-current={i === page ? 'page' : undefined} onClick={(e) => (e.preventDefault(), setPage(i), window.scrollTo(0, 0))}>
              {i + 1}
            </a>
          ))}
        </nav>
      )}
    </main>
  );
}
