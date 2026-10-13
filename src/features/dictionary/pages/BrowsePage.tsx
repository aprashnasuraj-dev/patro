import { DictNav } from '../components/LearnBits.tsx';
import { Link, useParams } from '../nav.tsx';
import { DICT_BASE_PATH, wordPath } from '../../../lib/dictionary-core/index.ts';
import { dictionaryClient } from '../client/index.ts';
import { NEPALI_INITIALS, SITE, useAsync, useDocumentHead } from '../hooks.ts';

/** <base>/akshar/:initial and <base>/akshar/:initial/:page */
export default function BrowsePage() {
  const params = useParams();
  const initial = decodeURIComponent(params.initial ?? 'क');
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const { data, loading } = useAsync(() => dictionaryClient.browse(initial, page), [initial, page]);
  const path = `${DICT_BASE_PATH}/akshar/${initial}${page > 1 ? `/${page}` : ''}`;

  useDocumentHead({
    title: `"${initial}" बाट सुरु हुने नेपाली शब्द${page > 1 ? ` (पृष्ठ ${page})` : ''} | ${SITE.dictName}`,
    description: `"${initial}" अक्षरबाट सुरु हुने नेपाली शब्द र तिनको अर्थ।`,
    canonical: SITE.origin + path.split('/').map(encodeURIComponent).join('/'),
    robots: data && data.items.length === 0 ? 'noindex,follow' : undefined,
    jsonLd: [],
  });

  return (
    <main className="dict dict-browse" lang="ne">
      <DictNav />
      <nav className="dict-crumbs">
        <Link to={DICT_BASE_PATH}>शब्दकोश</Link> › {initial}
      </nav>
      <h1>"{initial}" बाट सुरु हुने शब्दहरू</h1>
      <nav className="dict-alpha">
        {NEPALI_INITIALS.map((ch) => (
          <Link key={ch} to={`${DICT_BASE_PATH}/akshar/${ch}`} aria-current={ch === initial ? 'page' : undefined}>
            {ch}
          </Link>
        ))}
      </nav>
      {loading && <p aria-busy="true">लोड हुँदैछ…</p>}
      <ul className="dict-list">
        {data?.items.map((it) => (
          <li key={it.slug}>
            <Link to={wordPath(it.slug)}>{it.lemma}</Link> <span lang="en">{it.roman}</span>
          </li>
        ))}
      </ul>
      {data && data.pages > 1 && (
        <nav className="dict-pager">
          {Array.from({ length: data.pages }, (_, i) => (
            <Link key={i} to={`${DICT_BASE_PATH}/akshar/${initial}${i ? `/${i + 1}` : ''}`} aria-current={i + 1 === page ? 'page' : undefined}>
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
