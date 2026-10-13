import { NavLink } from '../nav.tsx';
import { DICT_BASE_PATH, LEVELS, type Level } from '../../../lib/dictionary-core/index.ts';
import { cardStore, useCards } from '../learn/store.ts';
import { speak, useCanSpeak, type SpeakLang } from '../learn/speech.ts';

/** 🔊 — speaks `text` in English or Nepali; hidden when the device has no suitable voice. */
export function SpeakButton({ text, lang, label }: { text: string; lang: SpeakLang; label?: string }) {
  const ok = useCanSpeak(lang);
  if (!ok) return null;
  return (
    <button
      type="button"
      className="dict-icon-btn"
      aria-label={label ?? (lang === 'en' ? `Pronounce ${text}` : `${text} उच्चारण सुन्नुहोस्`)}
      title={lang === 'en' ? 'Listen (English)' : 'सुन्नुहोस्'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        speak(text, lang);
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /></svg>
    </button>
  );
}

/** ☆/★ — save a word to "मेरा शब्द" (flashcards with spaced repetition). */
export function SaveButton({ id, front, back, dir = 'ne-en', compact }: { id: string; front: string; back: string; dir?: 'ne-en' | 'en-ne'; compact?: boolean }) {
  useCards(); // re-render on change
  const saved = cardStore.has(id);
  return (
    <button
      type="button"
      className={`dict-save-btn${saved ? ' is-saved' : ''}`}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        saved ? cardStore.remove(id) : cardStore.add(id, front, back, dir);
      }}
    >
      {saved ? '★' : '☆'}
      {!compact && <span>{saved ? ' सुरक्षित' : ' सिक्न राख्नुहोस्'}</span>}
    </button>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  const L = LEVELS.find((l) => l.id === level)!;
  return (
    <span className={`dict-level dict-level-${level}`} title={`${L.ne} · ${L.en}`}>
      {level}
    </span>
  );
}

/** Sub-navigation shared by every dictionary page. */
export function DictNav() {
  const due = useCards().filter((c) => c.due <= Math.floor(Date.now() / 86_400_000)).length;
  const items: Array<[string, string, string?]> = [
    ['', 'शब्दकोश'],
    ['/en', 'English → नेपाली'],
    ['/sikau', 'सिकौँ'],
    ['/abhyas', 'अभ्यास', due ? String(due) : undefined],
    ['/pariksha', 'परीक्षा तयारी'],
    ['/shuddha', 'शुद्धाशुद्धि'],
    ['/ukhan', 'उखान'],
  ];
  return (
    <nav className="dict-nav" aria-label="शब्दकोश">
      {items.map(([p, label, badge]) => (
        <NavLink key={p} to={DICT_BASE_PATH + p} end={p === ''} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
          {label}
          {badge && <span className="dict-badge">{badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
