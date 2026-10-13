import { useMemo, useState } from 'react';
import { Link } from '../nav.tsx';
import { DICT_BASE_PATH, TOOL_PAGES, dueCards, englishSlug, today, toolHead, wordPath } from '../../../lib/dictionary-core/index.ts';
import { DictNav, SpeakButton } from '../components/LearnBits.tsx';
import { cardStore, useCards, useStats } from '../learn/store.ts';
import { SITE, useDocumentHead } from '../hooks.ts';

/** <base>/abhyas — spaced-repetition flashcards for saved words (मेरा शब्द). */
export default function PracticePage() {
  useDocumentHead(useMemo(() => toolHead(SITE, TOOL_PAGES.abhyas.path, TOOL_PAGES.abhyas.title, TOOL_PAGES.abhyas.description, 'noindex,follow'), []));
  const cards = useCards();
  const stats = useStats();
  const due = dueCards(cards, today());
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState<'review' | 'all'>('review');
  const card = due[0];

  const grade = (g: 0 | 3 | 4 | 5) => {
    if (!card) return;
    cardStore.review(card.id, g);
    setFlipped(false);
  };
  const exportCsv = () => {
    const rows = [['front', 'back', 'direction', 'next review (days from today)'], ...cards.map((c) => [c.front, c.back, c.dir, String(c.due - today())])];
    const blob = new Blob(['﻿' + rows.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mera-shabda.csv';
    a.click();
  };
  const linkFor = (id: string) => (id.startsWith('en:') ? `${DICT_BASE_PATH}/en/${englishSlug(id.slice(3))}` : wordPath(id));

  return (
    <main className="dict dict-practice" lang="ne">
      <DictNav />
      <h1>अभ्यास · मेरा शब्द</h1>
      <div className="dict-stats">
        <div><strong>{due.length}</strong><span>आज दोहोर्याउने</span></div>
        <div><strong>{cards.length}</strong><span>जम्मा शब्द</span></div>
        <div><strong>{stats.streak}🔥</strong><span>दिन लगातार</span></div>
        <div><strong>{stats.reviewed}</strong><span>दोहोर्याइएका</span></div>
      </div>
      <div className="dict-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'review'} onClick={() => setTab('review')}>आजको अभ्यास</button>
        <button role="tab" aria-selected={tab === 'all'} onClick={() => setTab('all')}>सबै शब्द ({cards.length})</button>
      </div>

      {tab === 'review' &&
        (cards.length === 0 ? (
          <section className="dict-block dict-stub">
            <p>अहिलेसम्म कुनै शब्द सुरक्षित गरिएको छैन।</p>
            <p>
              शब्दको पेजमा वा <Link to={`${DICT_BASE_PATH}/sikau`}>सिकौँ</Link> सूचीमा ☆ थिच्नुहोस्।
            </p>
          </section>
        ) : !card ? (
          <section className="dict-block dict-done">
            <p>🎉 आजका सबै शब्द दोहोर्याउनुभयो! भोलि फेरि आउनुहोस्।</p>
            <p>
              <Link to={`${DICT_BASE_PATH}/pariksha`}>क्विज खेल्नुहोस् →</Link>
            </p>
          </section>
        ) : (
          <section className="dict-flash" aria-live="polite">
            <button type="button" className={`dict-flash-card${flipped ? ' is-flipped' : ''}`} onClick={() => setFlipped(true)}>
              <span className="dict-flash-front" lang={card.dir === 'en-ne' ? 'en' : 'ne'}>{card.front}</span>
              {flipped ? (
                <span className="dict-flash-back" lang={card.dir === 'en-ne' ? 'ne' : 'en'}>{card.back}</span>
              ) : (
                <span className="dict-muted">उत्तर हेर्न थिच्नुहोस्</span>
              )}
            </button>
            <div className="dict-flash-tools">
              <SpeakButton text={card.front} lang={card.dir === 'en-ne' ? 'en' : 'ne'} />
              <Link to={linkFor(card.id)}>पूरा अर्थ →</Link>
            </div>
            {flipped && (
              <div className="dict-grade">
                <button onClick={() => grade(0)} className="g0">फेरि<small>&lt;1 दिन</small></button>
                <button onClick={() => grade(3)} className="g3">गाह्रो</button>
                <button onClick={() => grade(4)} className="g4">ठीक</button>
                <button onClick={() => grade(5)} className="g5">सजिलो</button>
              </div>
            )}
          </section>
        ))}

      {tab === 'all' && (
        <section className="dict-block">
          <div className="dict-actions">
            <button type="button" onClick={exportCsv} disabled={!cards.length}>⬇ CSV डाउनलोड</button>
          </div>
          <table className="dict-table">
            <tbody>
              {cards.map((c) => (
                <tr key={c.id}>
                  <td><Link to={linkFor(c.id)}>{c.front}</Link></td>
                  <td>{c.back}</td>
                  <td className="dict-muted">{c.due <= today() ? 'आज' : `${c.due - today()} दिनमा`}</td>
                  <td><button type="button" className="dict-icon-btn" aria-label="हटाउनुहोस्" onClick={() => cardStore.remove(c.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
