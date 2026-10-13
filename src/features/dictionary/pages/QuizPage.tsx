import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from '../nav.tsx';
import { DICT_BASE_PATH, LEVELS, TOOL_PAGES, englishSlug, toolHead, wordPath, type Level, type QuizItem, type QuizKind } from '../../../lib/dictionary-core/index.ts';
import { learnClient } from '../client/learnClient.ts';
import { DictNav, SaveButton, SpeakButton } from '../components/LearnBits.tsx';
import { QUIZ_MODES, buildQuiz } from '../learn/quiz.ts';
import { cardStore, recordQuizResult, useStats } from '../learn/store.ts';
import { SITE, useAsync, useDocumentHead } from '../hooks.ts';

const ROUND = 10;

/** <base>/pariksha — exam-style practice: synonyms, antonyms, spelling, ukhan, meanings. */
export default function QuizPage() {
  useDocumentHead(useMemo(() => toolHead(SITE, TOOL_PAGES.pariksha.path, TOOL_PAGES.pariksha.title, TOOL_PAGES.pariksha.description), []));
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as QuizKind) || null;
  const level = (params.get('level') as Level | 'all') || 'all';
  const bank = useAsync(() => learnClient.quizBank(), []);
  const stats = useStats();
  const [round, setRound] = useState(0);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const questions: QuizItem[] = useMemo(() => {
    if (!bank.data || !mode) return [];
    // fresh questions every round, stable within a round
    return buildQuiz(bank.data, mode, level, ROUND, (Date.now() / 1000) | 0);
  }, [bank.data, mode, level, round]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setI(0);
    setPicked(null);
    setScore(0);
  }, [mode, level, round]);

  const setMode = (m: QuizKind | null) => setParams((p) => {
    const n = new URLSearchParams(p);
    m ? n.set('mode', m) : n.delete('mode');
    return n;
  });
  const setLevel = (l: string) => setParams((p) => {
    const n = new URLSearchParams(p);
    n.set('level', l);
    return n;
  });

  if (!mode) {
    return (
      <main className="dict dict-quiz" lang="ne">
        <DictNav />
        <h1>परीक्षा तयारी</h1>
        <p className="dict-muted">SEE, कक्षा ११–१२ र लोकसेवाका नेपाली विषयमा सोधिने प्रश्नजस्तै छोटा क्विज। हरेक राउन्डमा {ROUND} प्रश्न।</p>
        <div className="dict-quiz-modes">
          {QUIZ_MODES.map((m) => (
            <button key={m.id} type="button" className="dict-card dict-quiz-mode" onClick={() => setMode(m.id)}>
              <strong>{m.ne}</strong>
              <span lang="en">{m.en}</span>
              {m.exam && <small>{m.exam}</small>}
              {stats.bestScore[m.id] !== undefined && <small>उत्कृष्ट: {stats.bestScore[m.id]}/{ROUND}</small>}
            </button>
          ))}
        </div>
      </main>
    );
  }

  const q = questions[i];
  const done = questions.length > 0 && i >= questions.length;
  const meta = QUIZ_MODES.find((m) => m.id === mode)!;

  const choose = (k: number) => {
    if (picked !== null || !q) return;
    setPicked(k);
    if (k === q.answer) setScore((s) => s + 1);
    else if (q.slug && (mode === 'meaning-en' || mode === 'synonym' || mode === 'antonym' || mode === 'spelling')) {
      // missed words go straight into the flashcard deck — the quiz feeds spaced repetition
      const correct = q.options[q.answer];
      if (mode === 'meaning-en') cardStore.add(q.slug, q.q, correct, 'ne-en');
    }
  };
  const nextQ = () => {
    if (i + 1 >= questions.length) recordQuizResult(mode, level, score, questions.length);
    setI(i + 1);
    setPicked(null);
  };

  return (
    <main className="dict dict-quiz" lang="ne">
      <DictNav />
      <nav className="dict-crumbs">
        <a href="#" onClick={(e) => (e.preventDefault(), setMode(null))}>परीक्षा तयारी</a> › {meta.ne}
      </nav>
      <div className="dict-quiz-bar">
        <label>
          स्तर{' '}
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">सबै</option>
            {LEVELS.map((L) => <option key={L.id} value={L.id}>{L.id} — {L.ne}</option>)}
          </select>
        </label>
        <span className="dict-quiz-progress">{Math.min(i + 1, questions.length)}/{questions.length} · अङ्क {score}</span>
      </div>

      {bank.loading && <p aria-busy="true">प्रश्न तयार हुँदैछ…</p>}

      {q && !done && (
        <section className="dict-quiz-q" aria-live="polite">
          {q.hint && <p className="dict-muted">{q.hint}</p>}
          <h2 lang={mode === 'meaning-ne' ? 'en' : 'ne'}>
            {q.q} {mode === 'meaning-ne' && <SpeakButton text={q.q} lang="en" />}
          </h2>
          <ol className="dict-options">
            {q.options.map((o, k) => (
              <li key={k}>
                <button
                  type="button"
                  lang={mode === 'meaning-en' ? 'en' : 'ne'}
                  className={picked === null ? '' : k === q.answer ? 'is-right' : k === picked ? 'is-wrong' : 'is-dim'}
                  onClick={() => choose(k)}
                  disabled={picked !== null}
                >
                  {o}
                </button>
              </li>
            ))}
          </ol>
          {picked !== null && (
            <div className="dict-quiz-after">
              <p>{picked === q.answer ? '✅ सही!' : `❌ सही उत्तर: ${q.options[q.answer]}`}</p>
              {q.slug && (
                <p>
                  <Link to={wordPath(q.slug)} target="_blank">शब्दको पूरा अर्थ →</Link>{' '}
                  {mode === 'meaning-ne' && <Link to={`${DICT_BASE_PATH}/en/${englishSlug(q.q)}`} target="_blank">English page →</Link>}{' '}
                  {mode !== 'ukhan' && <SaveButton id={q.slug} front={mode === 'meaning-ne' ? q.options[q.answer] : q.q} back={mode === 'meaning-ne' ? q.q : q.options[q.answer]} compact />}
                </p>
              )}
              <button type="button" className="dict-primary" onClick={nextQ} autoFocus>
                {i + 1 >= questions.length ? 'नतिजा हेर्नुहोस्' : 'अर्को प्रश्न →'}
              </button>
            </div>
          )}
        </section>
      )}

      {done && (
        <section className="dict-block dict-done">
          <h2>नतिजा: {score}/{questions.length}</h2>
          <p>{score === questions.length ? '🏆 उत्कृष्ट!' : score >= questions.length * 0.7 ? '👏 राम्रो!' : '💪 अझै अभ्यास गरौँ।'}</p>
          <div className="dict-actions">
            <button type="button" className="dict-primary" onClick={() => setRound((r) => r + 1)}>फेरि खेल्नुहोस्</button>
            <button type="button" onClick={() => setMode(null)}>अर्को प्रकार</button>
            <Link to={`${DICT_BASE_PATH}/abhyas`}>गलत भएका शब्द अभ्यास गर्नुहोस् →</Link>
          </div>
        </section>
      )}
    </main>
  );
}
