import { useMemo, useState } from 'react';
import { Link } from '../nav.tsx';
import { DICT_BASE_PATH, TOOL_PAGES, toolHead, type SpellToken } from '../../../lib/dictionary-core/index.ts';
import { DictNav } from '../components/LearnBits.tsx';
import { replaceToken, useSpellCheck } from '../learn/useSpellCheck.ts';
import { SITE, useDocumentHead } from '../hooks.ts';

const SAMPLE = 'मेरो गाउँमा पुजा भएको थियो। सबैजना खुशि थिए र विस्वास गर्थे कि आगामि वर्ष राम्रो हुनेछ।';

/** <base>/shuddha — Nepali spell checker (शुद्धाशुद्धि जाँच). */
export default function SpellCheckPage() {
  useDocumentHead(useMemo(() => toolHead(SITE, TOOL_PAGES.shuddha.path, TOOL_PAGES.shuddha.title, TOOL_PAGES.shuddha.description), []));
  const [text, setText] = useState(SAMPLE);
  const { tokens, ready } = useSpellCheck(text, 150);
  const [open, setOpen] = useState<number | null>(null);
  const issues = tokens.filter((t) => t.status === 'suspect' || t.status === 'unknown');
  const strong = tokens.filter((t) => t.status === 'suspect' && t.suggestions?.length === 1);

  const fixAll = () => {
    let out = text;
    for (const t of [...strong].sort((a, b) => b.start - a.start)) out = replaceToken(out, t, t.suggestions![0]);
    setText(out);
  };

  // render text with highlighted tokens
  const parts: Array<string | SpellToken> = [];
  let pos = 0;
  for (const t of tokens) {
    if (t.start > pos) parts.push(text.slice(pos, t.start));
    parts.push(t);
    pos = t.start + t.text.length;
  }
  if (pos < text.length) parts.push(text.slice(pos));

  return (
    <main className="dict dict-spell" lang="ne">
      <DictNav />
      <h1>शुद्धाशुद्धि जाँच</h1>
      <p className="dict-muted">
        नेपाली लेख टाइप वा पेस्ट गर्नुहोस्। <mark className="sp-suspect">रातो</mark> = लगभग पक्का गल्ती (ि/ी, ु/ू, श/ष/स, ब/व…),{' '}
        <mark className="sp-unknown">पहेँलो</mark> = शब्दकोशमा भेटिएन (नाम वा नयाँ शब्द पनि हुन सक्छ)।
      </p>
      <textarea className="dict-spell-input" lang="ne" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="यहाँ नेपाली लेख्नुहोस्…" aria-label="नेपाली पाठ" />
      <div className="dict-actions">
        <span>{ready ? `${issues.length} सम्भावित गल्ती` : 'शब्दकोश लोड हुँदैछ…'}</span>
        {strong.length > 0 && <button type="button" className="dict-primary" onClick={fixAll}>✔ {strong.length} पक्का गल्ती सच्याउनुहोस्</button>}
        <button type="button" onClick={() => navigator.clipboard?.writeText(text)}>प्रतिलिपि</button>
        <button type="button" onClick={() => setText('')}>खाली गर्नुहोस्</button>
      </div>
      <div className="dict-spell-preview" aria-live="polite">
        {parts.map((p, k) =>
          typeof p === 'string' ? (
            <span key={k}>{p}</span>
          ) : p.status === 'ok' || p.status === 'skip' ? (
            <span key={k}>{p.text}</span>
          ) : (
            <span key={k} className="sp-wrap">
              <button type="button" className={`sp-${p.status}`} onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}>
                {p.text}
              </button>
              {open === k && (
                <span className="sp-pop" role="menu">
                  {p.suggestions?.length ? (
                    p.suggestions.map((s) => (
                      <button key={s} type="button" role="menuitem" onClick={() => (setText(replaceToken(text, p, s)), setOpen(null))}>
                        {s}
                      </button>
                    ))
                  ) : (
                    <span className="dict-muted">सुझाव छैन</span>
                  )}
                  <Link to={`${DICT_BASE_PATH}?q=${encodeURIComponent(p.text)}`} role="menuitem">शब्दकोशमा खोज्नुहोस्</Link>
                </span>
              )}
            </span>
          ),
        )}
      </div>
      <section className="dict-block dict-muted">
        <h2>कसरी काम गर्छ?</h2>
        <p>
          ४९ हजारभन्दा बढी शुद्ध नेपाली शब्द र तिनका ५०८ रूपावली नियम (–को, –मा, –हरू, –एको, –छ…) प्रयोग गरेर हरेक शब्द जाँचिन्छ।
          तपाईंको लेख कहीँ पठाइँदैन — जाँच तपाईंकै फोन/कम्प्युटरमा हुन्छ।
        </p>
        <p>
          <Link to={`${DICT_BASE_PATH}/pariksha?mode=spelling`}>शुद्धाशुद्धि क्विज खेल्नुहोस् →</Link>
        </p>
      </section>
    </main>
  );
}
