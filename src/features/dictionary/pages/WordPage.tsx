import { useMemo } from 'react';
import { Link, Navigate, useParams } from '../nav.tsx';
import { DICT_BASE_PATH, decodeSlug, wordHead, wordPath, type WordPayload } from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient, type WordResult } from '../client/index.ts';
import { SearchBox } from '../components/SearchBox.tsx';
import { WordView } from '../components/WordView.tsx';
import { SITE, takeBootData, useAsync, useDocumentHead } from '../hooks.ts';

export default function WordPage() {
  const slug = decodeSlug(useParams().slug ?? '');

  // Prerendered page? Use the inlined payload for the first render (no fetch, no flash).
  const boot = useMemo(
    () => takeBootData<{ kind: 'word'; payload: WordPayload }>((d) => d?.kind === 'word' && d.payload?.keys?.slug === slug),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initial: WordResult | null = boot ? { kind: 'ok', payload: boot.payload } : null;
  const { data, loading } = useAsync(() => dictionaryClient.word(slug), [slug], initial);

  const head = useMemo(
    () => {
      if (data?.kind !== 'ok') return null;
      const h = wordHead(data.payload.entry, data.payload.keys.slug, data.payload.keys.roman, SITE);
      // Stubs (no definition yet) are useful in-app but too thin for search engines.
      return data.payload.entry.senses.length ? h : { ...h, title: `${data.payload.entry.lemma} | ${SITE.dictName}`, robots: 'noindex,follow' };
    },
    [data],
  );
  useDocumentHead(head);

  if (loading && !data) return <main className="dict dict-loading" aria-busy="true" />;
  if (data?.kind === 'redirect') return <Navigate to={wordPath(data.slug)} replace />;
  if (!data || data.kind === 'not_found') return <NotFound slug={slug} />;
  return (
    <>
      <div className="dict-topbar">
        <SearchBox />
      </div>
      <WordView p={data.payload} />
    </>
  );
}

function NotFound({ slug }: { slug: string }) {
  useDocumentHead({
    title: `${slug} — शब्द भेटिएन`,
    description: '',
    canonical: SITE.origin + DICT_BASE_PATH,
    robots: 'noindex,follow',
    jsonLd: [],
  });
  return (
    <main className="dict dict-404" lang="ne">
      <h1>"{slug}" शब्द भेटिएन</h1>
      <p>हिज्जे जाँच्नुहोस् वा फेरि खोज्नुहोस्।</p>
      <SearchBox initial={slug} autoFocus />
      <p>
        <Link to={DICT_BASE_PATH}>शब्दकोशको गृहपृष्ठ →</Link>
      </p>
    </main>
  );
}
