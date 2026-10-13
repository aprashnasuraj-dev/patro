import { useMemo } from 'react';
import { DictNav } from '../components/LearnBits.tsx';
import { Link, useSearchParams } from '../nav.tsx';
import { DICT_BASE_PATH, englishSlug, hasDevanagari, homeHead, wordPath } from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient } from '../client/index.ts';
import { SearchBox } from '../components/SearchBox.tsx';
import { WordOfDayCard } from '../components/WordOfDayCard.tsx';
import { EnglishWordOfDayCard } from '../components/EnglishWordOfDayCard.tsx';
import { learnClient } from '../client/learnClient.ts';
import { NEPALI_INITIALS, SITE, useAsync, useDocumentHead } from '../hooks.ts';

/**
 * <base> and <base>?q=...  (base = DICT_BASE_PATH = /tool/nepalidictionary)
 * `getTodayBs` should come from your Patro's date utilities; we accept it as a prop
 * so this file has no dependency on your calendar code.
 */
export default function DictionaryHome({ getTodayBs }: { getTodayBs?: () => string }) {
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const head = useMemo(() => {
    const h = homeHead(SITE, 0);
    // Result pages for arbitrary queries must not be indexed (infinite thin URLs).
    return q ? { ...h, title: `"${q}" — खोज परिणाम | ${SITE.dictName}`, robots: 'noindex,follow' } : h;
  }, [q]);
  useDocumentHead(head);

  const results = useAsync(() => (q ? dictionaryClient.search(q, 30) : Promise.resolve(null)), [q]);
  const enHits = useAsync(() => (q && !hasDevanagari(q) ? learnClient.english(q.toLowerCase()) : Promise.resolve([])), [q]);
  const bs = getTodayBs?.();

  return (
    <main className="dict dict-home" lang="ne">
      <DictNav />
      <h1>नेपाली शब्दकोश</h1>
      <SearchBox initial={q} autoFocus={!q} />

      {q ? (
        <section className="dict-block">
          {enHits.data && enHits.data.length > 0 && (
            <div className="dict-en-hits" lang="en">
              <h2>“{q}” in Nepali</h2>
              <ul className="dict-list">
                {enHits.data.slice(0, 6).map((h) => (
                  <li key={h.s}>
                    <Link to={wordPath(h.s)} lang="ne">{h.l}</Link> <span>{h.r}</span>
                    {h.d && <span className="dict-muted" lang="ne"> — {h.d}</span>}
                  </li>
                ))}
              </ul>
              <p><Link to={`${DICT_BASE_PATH}/en/${englishSlug(q.toLowerCase())}`}>All Nepali words for “{q}” →</Link></p>
            </div>
          )}
          <h2>"{q}" को खोज परिणाम</h2>
          {results.loading ? (
            <p aria-busy="true">खोज्दै…</p>
          ) : results.data?.hits.length ? (
            <ul className="dict-list">
              {results.data.hits.map((h) => (
                <li key={h.slug}>
                  <Link to={wordPath(h.slug)}>{h.lemma}</Link> <span lang="en">{h.roman}</span>
                  {h.gloss && <span className="dict-muted" lang="en"> — {h.gloss}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>कुनै शब्द भेटिएन। हिज्जे बदलेर खोज्नुहोस् (जस्तै: ि/ी, स/श)।</p>
          )}
        </section>
      ) : (
        <>
          {bs && (
            <div className="dict-wotd-pair">
              <WordOfDayCard bsDate={bs} />
              <EnglishWordOfDayCard bsDate={bs} />
            </div>
          )}
          <section className="dict-learn-grid" aria-label="सिक्ने साधन">
            <Link className="dict-card" to={`${DICT_BASE_PATH}/en`}><strong>English → नेपाली</strong><span>१२,००० अङ्ग्रेजी शब्दको नेपाली अर्थ, उच्चारणसहित</span></Link>
            <Link className="dict-card" to={`${DICT_BASE_PATH}/sikau`}><strong>सिकौँ</strong><span>A1–B2 स्तरका शब्द सूची — विद्यार्थी र नयाँ सिक्नेका लागि</span></Link>
            <Link className="dict-card" to={`${DICT_BASE_PATH}/pariksha`}><strong>परीक्षा तयारी</strong><span>पर्यायवाची, विपरीतार्थी, शुद्धाशुद्धि, उखान — SEE/लोकसेवा</span></Link>
            <Link className="dict-card" to={`${DICT_BASE_PATH}/shuddha`}><strong>शुद्धाशुद्धि जाँच</strong><span>नेपाली लेखको हिज्जे जाँच्नुहोस्</span></Link>
            <Link className="dict-card" to={`${DICT_BASE_PATH}/abhyas`}><strong>मेरा शब्द</strong><span>सुरक्षित शब्द फ्ल्यासकार्डमा दोहोर्‍याउनुहोस्</span></Link>
          </section>
          <nav className="dict-alpha" aria-label="अक्षर अनुसार">
            {NEPALI_INITIALS.map((ch) => (
              <Link key={ch} to={`${DICT_BASE_PATH}/akshar/${ch}`}>
                {ch}
              </Link>
            ))}
          </nav>
          <ul className="dict-home-links">
            <li><Link to={`${DICT_BASE_PATH}/ukhan`}>उखान टुक्का</Link></li>
          </ul>
        </>
      )}
    </main>
  );
}
