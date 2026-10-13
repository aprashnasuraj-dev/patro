import { useMemo, useState } from 'react';
import { DictNav } from '../components/LearnBits.tsx';
import { Link, useParams } from '../nav.tsx';
import {
  DICT_BASE_PATH, POS_LABELS, RHYME_LABELS, decodeSlug, groupRhymes, rhymeHead, wordPath,
  type PartOfSpeech, type RhymeHit,
} from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient } from '../client/index.ts';
import { SITE, useAsync, useDocumentHead } from '../hooks.ts';

/** <base>/anupras/:slug — the poet/songwriter tool. */
export default function RhymePage() {
  const slug = decodeSlug(useParams().slug ?? '');
  const [syllables, setSyllables] = useState<number | undefined>();
  const [pos, setPos] = useState<PartOfSpeech | undefined>();
  const [min, setMin] = useState<RhymeHit['strength']>('slant');

  const word = useAsync(() => dictionaryClient.word(slug), [slug]);
  const hits = useAsync(() => dictionaryClient.rhymes(slug, { syllables, pos, min }), [slug, syllables, pos, min]);

  const payload = word.data?.kind === 'ok' ? word.data.payload : null;
  const head = useMemo(
    () => (payload && hits.data ? rhymeHead(payload.entry.lemma, slug, payload.keys.roman, hits.data.length, SITE, !!payload.rhymePage) : null),
    [payload, hits.data, slug],
  );
  useDocumentHead(head);

  const groups = groupRhymes(hits.data ?? []);
  const lemma = payload?.entry.lemma ?? slug;

  return (
    <main className="dict dict-rhyme" lang="ne">
      <DictNav />
      <nav className="dict-crumbs">
        <Link to={DICT_BASE_PATH}>शब्दकोश</Link> › <Link to={wordPath(slug)}>{lemma}</Link> › अनुप्रास
      </nav>
      <h1>{lemma}सँग मिल्ने शब्द</h1>
      {payload && <p lang="en">Words that rhyme with {payload.keys.roman}</p>}

      <div className="dict-filters">
        <label>
          अक्षर सङ्ख्या
          <select value={syllables ?? ''} onChange={(e) => setSyllables(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">सबै</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          शब्दभेद
          <select value={pos ?? ''} onChange={(e) => setPos((e.target.value || undefined) as PartOfSpeech | undefined)}>
            <option value="">सबै</option>
            {(['noun', 'adjective', 'verb', 'adverb'] as const).map((p) => (
              <option key={p} value={p}>{POS_LABELS[p].ne}</option>
            ))}
          </select>
        </label>
        <label>
          मिलान
          <select value={min} onChange={(e) => setMin(e.target.value as RhymeHit['strength'])}>
            <option value="double">{RHYME_LABELS.double.ne}</option>
            <option value="single">{RHYME_LABELS.single.ne}</option>
            <option value="slant">{RHYME_LABELS.slant.ne}</option>
            <option value="vowel">{RHYME_LABELS.vowel.ne}</option>
          </select>
        </label>
      </div>

      {hits.loading && <p aria-busy="true">खोज्दै…</p>}
      {!hits.loading && !hits.data?.length && <p>यस शब्दसँग मिल्ने शब्द भेटिएन।</p>}
      {(['double', 'single', 'slant', 'vowel'] as const)
        .filter((k) => groups[k].length)
        .map((k) => (
          <section className="dict-block" key={k}>
            <h2>
              {RHYME_LABELS[k].ne} <small lang="en">{RHYME_LABELS[k].en}</small>
            </h2>
            <ul className="dict-chips">
              {groups[k].map((h) => (
                <li key={h.slug}>
                  <Link to={wordPath(h.slug)}>{h.lemma}</Link> <small>{h.syllables}</small>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </main>
  );
}
