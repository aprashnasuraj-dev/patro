/**
 * Tap-to-translate for Aafnai Patro's reading pages (news, rashifal, history, guides…).
 * Lazy-loaded by src/PatroRouter.tsx; double-click or select a Nepali/English word to see
 * its meaning, hear it and save it for practice.
 */
import { WordLookup } from './components/WordLookup.tsx';
import './dictionary.css';

export default function ReadingLookup() {
  return <WordLookup />;
}
