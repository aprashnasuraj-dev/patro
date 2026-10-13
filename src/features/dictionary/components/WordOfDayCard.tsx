import { Link } from '../nav.tsx';
import { wordPath } from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient } from '../client/index.ts';
import { useAsync } from '../hooks.ts';

/**
 * "आजको शब्द" card — drop it on the Patro home screen next to today's tithi.
 *
 *   <WordOfDayCard bsDate={today.bs.iso} />      // e.g. "2083-06-14" or "२०८३-०६-१४"
 *
 * Pass the BS date your calendar already computes (Asia/Kathmandu), so the word
 * changes at Nepal midnight together with the calendar.
 */
export function WordOfDayCard({ bsDate, compact = false }: { bsDate: string; compact?: boolean }) {
  const { data, loading } = useAsync(() => dictionaryClient.wotd(bsDate), [bsDate]);
  if (loading) return <div className="dict-wotd dict-wotd--loading" aria-busy="true" />;
  if (!data) return null;
  return (
    <article className={`dict-wotd${compact ? ' dict-wotd--compact' : ''}`} lang="ne">
      <p className="dict-wotd-label">आजको शब्द</p>
      <h3 className="dict-wotd-lemma">
        <Link to={wordPath(data.slug)}>{data.lemma}</Link> <small lang="en">{data.roman}</small>
      </h3>
      <p className="dict-wotd-def">{data.ne}</p>
      {data.en.length > 0 && <p className="dict-wotd-en" lang="en">{data.en.join(', ')}</p>}
      {!compact && data.example && <blockquote className="dict-ex"><p>{data.example.ne}</p></blockquote>}
    </article>
  );
}
