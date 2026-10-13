import { Link } from '../nav.tsx';
import { DICT_BASE_PATH, englishSlug, hashKey, normalizeDateKey, wordPath } from '../../../lib/dictionary-core/index.ts';
import { learnClient } from '../client/learnClient.ts';
import { useAsync } from '../hooks.ts';
import { SaveButton, SpeakButton } from './LearnBits.tsx';

/**
 * "Today's English word" — for students learning English. Picked deterministically from
 * the 300–3,000 most common English words (useful, not trivial), changing at Nepal midnight
 * with the BS date, like WordOfDayCard.
 *
 *   <EnglishWordOfDayCard bsDate={today.bsIso} />
 */
export function EnglishWordOfDayCard({ bsDate }: { bsDate: string }) {
  const { data } = useAsync(async () => {
    const top = await learnClient.topEnglish();
    const pool = top.filter((t) => t[1] > 300 && t[1] <= 3000 && !t[0].includes(' '));
    if (!pool.length) return null;
    const n = parseInt(hashKey('en-wotd:' + normalizeDateKey(bsDate)), 16) % pool.length;
    const [key, , lemma, roman, slug] = pool[n];
    const hits = await learnClient.english(key);
    return { key, lemma, roman, slug, others: hits.slice(1, 4) };
  }, [bsDate]);
  if (!data) return null;
  return (
    <article className="dict-wotd dict-wotd--en" lang="en">
      <p className="dict-wotd-label">Today's English word · आजको अङ्ग्रेजी शब्द</p>
      <h3 className="dict-wotd-lemma">
        <Link to={`${DICT_BASE_PATH}/en/${englishSlug(data.key)}`}>{data.key}</Link> <SpeakButton text={data.key} lang="en" />
        <SaveButton id={`en:${data.key}`} front={data.key} back={data.lemma} dir="en-ne" compact />
      </h3>
      <p className="dict-wotd-def" lang="ne">
        नेपालीमा: <Link to={wordPath(data.slug)}>{data.lemma}</Link> <small lang="en">({data.roman})</small>
        {data.others.length > 0 && <span className="dict-muted"> · {data.others.map((o) => o.l).join(', ')}</span>}
      </p>
    </article>
  );
}
