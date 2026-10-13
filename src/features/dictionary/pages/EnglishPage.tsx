import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '../nav.tsx';
import {
  DICT_BASE_PATH, POS_LABELS, TOOL_PAGES, englishFromSlug, englishHead, englishSlug, levelForRank, toolHead, wordPath,
  type PartOfSpeech,
} from '../../../lib/dictionary-core/index.ts';
import { learnClient, type EnHit } from '../client/learnClient.ts';
import { DictNav, LevelBadge, SaveButton, SpeakButton } from '../components/LearnBits.tsx';
import { SITE, takeBootData, useAsync, useDebounced, useDocumentHead } from '../hooks.ts';

/** <base>/en — English → Nepali home: search + the most useful English words. */
export function EnglishHome() {
  useDocumentHead(useMemo(() => toolHead(SITE, TOOL_PAGES.en.path, TOOL_PAGES.en.title, TOOL_PAGES.en.description), []));
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim().toLowerCase(), 120);
  const navigate = useNavigate();
  const sugg = useAsync(() => (dq.length >= 2 ? learnClient.englishPrefix(dq, 10) : Promise.resolve([])), [dq]);
  const top = useAsync(() => learnClient.topEnglish(), []);

  return (
    <main className="dict dict-en" lang="en">
      <DictNav />
      <h1>English → नेपाली</h1>
      <p className="dict-muted" lang="ne">अङ्ग्रेजी शब्द लेख्नुहोस्, नेपाली अर्थ, उच्चारण र उदाहरण हेर्नुहोस्।</p>
      <form
        className="dict-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`${DICT_BASE_PATH}/en/${englishSlug(q)}`);
        }}
      >
        <input type="search" lang="en" autoFocus autoComplete="off" placeholder="Type an English word… e.g. house, happy, run" value={q} onChange={(e) => setQ(e.target.value)} aria-label="English word" />
        <button type="submit">खोज</button>
      </form>
      {sugg.data && sugg.data.length > 0 && (
        <ul className="dict-list dict-en-sugg">
          {sugg.data.map(([k, h]) => (
            <li key={k}>
              <Link to={`${DICT_BASE_PATH}/en/${englishSlug(k)}`}>{k}</Link> <span lang="ne">— {h.l}</span>
            </li>
          ))}
        </ul>
      )}
      <section className="dict-block">
        <h2>Most useful English words · सबैभन्दा उपयोगी अङ्ग्रेजी शब्द</h2>
        <ul className="dict-chips">
          {(top.data ?? []).filter((t) => !t[0].includes(' ')).slice(0, 120).map(([k, , lemma]) => (
            <li key={k}>
              <Link to={`${DICT_BASE_PATH}/en/${englishSlug(k)}`}>{k}</Link> <small lang="ne">{lemma}</small>
            </li>
          ))}
        </ul>
        <p>
          <Link to={`${DICT_BASE_PATH}/sikau/en-A1`}>Level-wise English word lists (A1–B2) →</Link>
        </p>
      </section>
    </main>
  );
}

/** <base>/en/:word — "house meaning in Nepali". */
export function EnglishWordPage() {
  const key = englishFromSlug(useParams().word ?? '');
  const boot = useMemo(() => takeBootData<{ kind: 'en'; key: string; hits: EnHit[] }>((d) => d?.kind === 'en' && d.key === key), []); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: hits, loading } = useAsync(() => learnClient.english(key), [key], boot?.hits ?? null);
  const [rank, setRank] = useState<number | undefined>();
  useEffect(() => {
    learnClient.topEnglish().then((t) => setRank(t.find((x) => x[0] === key)?.[1]));
  }, [key]);
  useDocumentHead(useMemo(() => (hits ? englishHead(key, hits, SITE) : null), [hits, key]));

  const list = hits ?? [];
  return (
    <main className="dict dict-en-word" lang="en">
      <DictNav />
      <nav className="dict-crumbs">
        <Link to={DICT_BASE_PATH}>शब्दकोश</Link> › <Link to={`${DICT_BASE_PATH}/en`}>English → नेपाली</Link> › {key}
      </nav>
      <header className="dict-head">
        <h1 className="dict-lemma dict-lemma-en">
          {key} <SpeakButton text={key} lang="en" />
        </h1>
        <p className="dict-roman" lang="ne">
          {key}को नेपाली अर्थ {rank && <LevelBadge level={levelForRank(rank)} />}
        </p>
        {list[0] && <SaveButton id={`en:${key}`} front={key} back={list.slice(0, 3).map((h) => h.l).join(', ')} dir="en-ne" />}
      </header>

      {loading && !hits && <p aria-busy="true">खोज्दै…</p>}
      {!loading && list.length === 0 && (
        <section className="dict-block dict-stub" lang="ne">
          <p>"{key}" को नेपाली अर्थ अहिले शब्दकोशमा भेटिएन।</p>
          <p>
            <Link to={`${DICT_BASE_PATH}?q=${encodeURIComponent(key)}`}>सबै शब्दकोशमा खोज्नुहोस् →</Link>
          </p>
        </section>
      )}

      {list.length > 0 && (
        <section className="dict-block">
          <h2 lang="ne">नेपाली अर्थ · Nepali meanings</h2>
          <ol className="dict-en-hits">
            {list.map((h) => (
              <li key={h.s}>
                <div className="dict-en-hit-head">
                  <Link to={wordPath(h.s)} className="dict-en-hit-lemma" lang="ne">
                    {h.l}
                  </Link>
                  <span className="dict-roman">{h.r}</span>
                  <span className="dict-pos" lang="ne">{POS_LABELS[h.p as PartOfSpeech]?.ne ?? h.p}</span>
                  <SpeakButton text={h.l} lang="ne" />
                </div>
                <p className="dict-def" lang="ne">{h.d}</p>
                <p className="dict-en">{h.g}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {list.length > 0 && (
        <section className="dict-block dict-en-summary">
          <h2>How to say "{key}" in Nepali</h2>
          <p>
            The most common Nepali word for <strong>{key}</strong> is <strong lang="ne">{list[0].l}</strong> ({list[0].r})
            {list.length > 1 && <>. Other words: {list.slice(1, 5).map((h) => `${h.l} (${h.r})`).join(', ')}</>}.
          </p>
          <p>
            <Link to={`${DICT_BASE_PATH}/pariksha?mode=meaning-ne`}>Practise English → Nepali →</Link>
          </p>
        </section>
      )}
    </main>
  );
}
