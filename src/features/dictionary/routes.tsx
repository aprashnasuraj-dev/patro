/**
 * Aafnai Patro Nepali dictionary — mounted at DICT_BASE_PATH = '/tool/nepalidictionary'.
 *
 * In src/PatroRouter.tsx:
 *   const NepaliDictionary = lazy(() => import('./features/dictionary/routes').then((m) => ({ default: m.DictionaryApp })));
 *   if (path === "/tool/nepalidictionary" || path.startsWith("/tool/nepalidictionary/")) return <NepaliDictionary path={path} />;
 *
 * Every page is lazy-loaded so the calendar's first paint doesn't grow.
 */
import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { adToBs, formatBsDate } from '../../../packages/core/src';
import { DICT_BASE_PATH } from '../../lib/dictionary-core/keys.ts';
import { ParamsProvider } from './nav.tsx';
import { startAccountSync } from './learn/store.ts';
import { WordLookup } from './components/WordLookup.tsx';
import './dictionary.css';

const DictionaryHome = lazy(() => import('./pages/DictionaryHome.tsx'));
const WordPage = lazy(() => import('./pages/WordPage.tsx'));
const RhymePage = lazy(() => import('./pages/RhymePage.tsx'));
const UkhanPage = lazy(() => import('./pages/UkhanPage.tsx'));
const BrowsePage = lazy(() => import('./pages/BrowsePage.tsx'));
const EnglishHome = lazy(() => import('./pages/EnglishPage.tsx').then((m) => ({ default: m.EnglishHome })));
const EnglishWordPage = lazy(() => import('./pages/EnglishPage.tsx').then((m) => ({ default: m.EnglishWordPage })));
const LearnHome = lazy(() => import('./pages/LearnPage.tsx').then((m) => ({ default: m.LearnHome })));
const LearnListPage = lazy(() => import('./pages/LearnPage.tsx').then((m) => ({ default: m.LearnListPage })));
const PracticePage = lazy(() => import('./pages/PracticePage.tsx'));
const QuizPage = lazy(() => import('./pages/QuizPage.tsx'));
const SpellCheckPage = lazy(() => import('./pages/SpellCheckPage.tsx'));

/** Today's Bikram Sambat date (YYYY-MM-DD, Nepal time) — keys the Word of the Day cards. */
function nepalTodayBs(): string {
  try {
    const ad = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return formatBsDate(adToBs(ad));
  } catch {
    return '';
  }
}
let todayBs: () => string = nepalTodayBs;
export function setDictionaryTodayBs(fn: () => string) {
  todayBs = fn;
}
function Home() {
  return <DictionaryHome getTodayBs={() => todayBs()} />;
}

/** Relative patterns, most specific first; ':slug' must stay last. */
const ROUTES: Array<[string, ComponentType]> = [
  ['', Home],
  ['ukhan', UkhanPage],
  ['akshar/:initial', BrowsePage],
  ['akshar/:initial/:page', BrowsePage],
  ['anupras/:slug', RhymePage],
  ['en', EnglishHome],
  ['en/:word', EnglishWordPage],
  ['sikau', LearnHome],
  ['sikau/:list', LearnListPage],
  ['abhyas', PracticePage],
  ['pariksha', QuizPage],
  ['shuddha', SpellCheckPage],
  [':slug', WordPage],
];

export function matchDictionaryRoute(pathname: string): { Page: ComponentType; params: Record<string, string> } | null {
  const clean = pathname.replace(/\/+$/, '');
  if (clean !== DICT_BASE_PATH && !clean.startsWith(DICT_BASE_PATH + '/')) return null;
  const segs = clean.slice(DICT_BASE_PATH.length).split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  for (const [pattern, Page] of ROUTES) {
    const parts = pattern ? pattern.split('/') : [];
    if (parts.length !== segs.length) continue;
    const params: Record<string, string> = {};
    if (parts.every((p, i) => (p.startsWith(':') ? ((params[p.slice(1)] = segs[i]), true) : p === segs[i]))) return { Page, params };
  }
  return null;
}

function Loading() {
  return <main className="dict dict-loading" aria-busy="true" />;
}

/** The whole dictionary as one component — `path` comes from PatroRouter. */
export function DictionaryApp({ path }: { path: string }) {
  useEffect(() => {
    startAccountSync(); // signed-in users get their saved words on every device
  }, []);
  const m = matchDictionaryRoute(path);
  if (!m) return null;
  const { Page, params } = m;
  return (
    <ParamsProvider value={params}>
      <Suspense fallback={<Loading />}>
        <Page key={path} />
      </Suspense>
      <WordLookup />
    </ParamsProvider>
  );
}

// ── Pieces to reuse elsewhere in Aafnai Patro ────────────────────────────────
export { WordLookup };
export { WordOfDayCard } from './components/WordOfDayCard.tsx';
export { EnglishWordOfDayCard } from './components/EnglishWordOfDayCard.tsx';
export { SearchBox } from './components/SearchBox.tsx';
export { DictNav, SaveButton, SpeakButton, LevelBadge } from './components/LearnBits.tsx';
export { cardStore, useCards, useStats, startAccountSync } from './learn/store.ts';
export { useSpellCheck, loadSpellIndex, replaceToken } from './learn/useSpellCheck.ts';
export { speak } from './learn/speech.ts';
export { DICT_BASE_PATH };
