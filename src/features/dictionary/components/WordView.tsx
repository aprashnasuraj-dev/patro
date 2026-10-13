import { Link } from '../nav.tsx';
import { DictNav, LevelBadge, SaveButton, SpeakButton } from './LearnBits.tsx';
import {
  DICT_BASE_PATH, englishSlug, levelForRank, ORIGIN_LABELS, POS_LABELS, REGISTER_LABELS, RHYME_LABELS, groupRhymes, wordPath,
  type WordLink, type WordPayload,
} from '../../../lib/dictionary-core/index.ts';

/**
 * Same markup/classes as src/lib/dictionary-core/render.ts → renderWord() (Worker + build), so the
 * switch from prerendered HTML to React is invisible.
 */
export function WordView({ p }: { p: WordPayload }) {
  const e = p.entry;
  const g = groupRhymes(p.rhymes);
  const en = [...new Set(e.senses.flatMap((s) => s.en ?? []))];
  return (
    <main className="dict dict-word" lang="ne">
      <DictNav />
      <nav className="dict-crumbs" aria-label="breadcrumb">
        <Link to={DICT_BASE_PATH}>शब्दकोश</Link> › <span>{e.lemma}</span>
      </nav>

      <header className="dict-head">
        <h1 className="dict-lemma">{e.lemma}</h1>
        <p className="dict-roman" lang="en">{p.keys.roman}</p>
        {e.audio ? <AudioButton src={e.audio} /> : <SpeakButton text={e.lemma} lang="ne" />}
        {e.freq ? <LevelBadge level={levelForRank(e.freq)} /> : null}
        {e.senses.length > 0 && <SaveButton id={p.keys.slug} front={e.lemma} back={en.slice(0, 3).join(', ') || e.senses[0].ne} />}
        {e.etymology && e.etymology.origin !== 'unknown' && (
          <p className="dict-origin">
            {ORIGIN_LABELS[e.etymology.origin].ne}
            {e.etymology.from ? ` ← ${e.etymology.from}` : ''}
          </p>
        )}
        {p.links.variants.length > 0 && <p className="dict-variants">अरू रूप: {p.links.variants.join(', ')}</p>}
      </header>

      {e.senses.length === 0 && (
        <section className="dict-block dict-stub">
          <p>
            यो शब्द शब्दकोशमा छ तर यसको अर्थ अझै लेखिएको छैन।{' '}
            {e.posHint && <span className="dict-pos">{POS_LABELS[e.posHint].ne}</span>}
          </p>
          <p className="dict-muted">तल यसका रूप र अनुप्रास हेर्न सक्नुहुन्छ। अर्थ थप्न सुझाव दिनुहोस्।</p>
        </section>
      )}

      {e.senses.length > 0 && (
      <section className="dict-block dict-senses">
        <h2>अर्थ</h2>
        <ol>
          {e.senses.map((s) => (
            <li key={s.id} id={s.id}>
              <span className="dict-pos">{POS_LABELS[s.pos].ne}</span>
              {s.register && s.register !== 'neutral' && <span className="dict-tag">{REGISTER_LABELS[s.register]}</span>}
              <p className="dict-def">{s.ne}</p>
              {s.en?.length ? (
                <p className="dict-en" lang="en">
                  {s.en.map((g, i) => (
                    <span key={g}>
                      {i > 0 && ', '}
                      <Link to={`${DICT_BASE_PATH}/en/${englishSlug(g)}`}>{g}</Link>
                    </span>
                  ))}
                  <SpeakButton text={s.en.join(', ')} lang="en" />
                </p>
              ) : null}
              {s.usageNote && <p className="dict-note">{s.usageNote}</p>}
              {s.examples?.map((x, i) => (
                <blockquote className="dict-ex" key={i}>
                  <p lang="ne">{x.ne}</p>
                  {x.en && <p lang="en">{x.en}</p>}
                </blockquote>
              ))}
            </li>
          ))}
        </ol>
      </section>
      )}

      <Links title="पर्यायवाची शब्द" items={p.links.synonyms} cls="dict-syn" />
      <Links title="विपरीतार्थी शब्द" items={p.links.antonyms} cls="dict-ant" />
      <Links title="सम्बन्धित शब्द" items={p.links.related} cls="dict-rel" />

      {p.rhymes.length > 0 && (
        <section className="dict-block dict-rhymes">
          <h2>
            अनुप्रास मिल्ने शब्द <small lang="en">Rhymes</small>
          </h2>
          {(['double', 'single', 'slant'] as const)
            .filter((k) => g[k].length)
            .map((k) => (
              <div key={k}>
                <h3>{RHYME_LABELS[k].ne}</h3>
                <ul className="dict-chips">
                  {g[k].map((h) => (
                    <li key={h.slug}>
                      <Link to={wordPath(h.slug)}>{h.lemma}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {p.rhymePage && (
            <p>
              <Link to={`${DICT_BASE_PATH}/anupras/${p.keys.slug}`}>सबै अनुप्रास हेर्नुहोस् →</Link>
            </p>
          )}
        </section>
      )}

      {p.proverbs.length > 0 && (
        <section className="dict-block dict-proverbs">
          <h2>उखान टुक्का</h2>
          <ul>
            {p.proverbs.map((x) => (
              <li key={x.id}>
                <strong>{x.text}</strong> — {x.meaningNe}
                {x.englishEquivalent && <em lang="en"> ({x.englishEquivalent})</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.forms && p.forms.length > 0 && (
        <section className="dict-block dict-forms">
          <h2>
            रूपावली <small lang="en">Forms</small>
          </h2>
          <p className="dict-forms-list">{p.forms.join(' · ')}</p>
        </section>
      )}

      {en.length > 0 && (
        <section className="dict-block dict-en-summary" lang="en">
          <h2>{p.keys.roman} meaning in English</h2>
          <p>
            <strong>{e.lemma}</strong> ({p.keys.roman}) means <em>{en.slice(0, 4).join(', ')}</em> in English.
          </p>
          <p className="dict-actions">
            <Link to={`${DICT_BASE_PATH}/abhyas`}>Practise your saved words →</Link>{' '}
            <Link to={`${DICT_BASE_PATH}/pariksha?mode=meaning-en`}>Take a quick quiz →</Link>
          </p>
        </section>
      )}
      {p.credits && p.credits.length > 0 && (
        <footer className="dict-credits">
          <span>स्रोत:</span>{' '}
          {p.credits.map((c, i) => (
            <span key={c.name}>
              {i > 0 && '; '}
              {c.url ? (
                <a href={c.url} rel="noopener" target="_blank">
                  {c.name}
                </a>
              ) : (
                c.name
              )}{' '}
              ({c.license})
            </span>
          ))}
        </footer>
      )}
    </main>
  );
}

function Links({ title, items, cls }: { title: string; items: WordLink[]; cls: string }) {
  if (!items.length) return null;
  return (
    <section className={`dict-block ${cls}`}>
      <h2>{title}</h2>
      <ul className="dict-chips">
        {items.map((i) => (
          <li key={i.lemma}>{i.slug ? <Link to={wordPath(i.slug)}>{i.lemma}</Link> : i.lemma}</li>
        ))}
      </ul>
    </section>
  );
}

function AudioButton({ src }: { src: string }) {
  return (
    <button
      type="button"
      className="dict-audio"
      aria-label="उच्चारण सुन्नुहोस्"
      onClick={() => {
        void new Audio(src).play();
      }}
    >
      🔊
    </button>
  );
}
