/**
 * Pronunciation with the browser's built-in speech engine (free, works offline on
 * most phones). English voices are everywhere; Nepali (ne-NP) voices exist on
 * many Android/Chrome builds — when absent we fall back to a Hindi voice, which
 * reads Devanagari reasonably, and finally hide the button.
 */
import { useEffect, useState } from 'react';

export type SpeakLang = 'en' | 'ne';

function voices(): SpeechSynthesisVoice[] {
  return typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices();
}

export function pickVoice(lang: SpeakLang): SpeechSynthesisVoice | null {
  const v = voices();
  if (lang === 'en') return v.find((x) => /^en-(GB|IN|US)/i.test(x.lang)) ?? v.find((x) => x.lang.startsWith('en')) ?? null;
  return v.find((x) => /^ne/i.test(x.lang)) ?? v.find((x) => /^hi/i.test(x.lang)) ?? null;
}

export function speak(text: string, lang: SpeakLang, rate = lang === 'en' ? 0.9 : 0.85) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.lang = v?.lang ?? (lang === 'en' ? 'en-US' : 'ne-NP');
  u.rate = rate;
  speechSynthesis.speak(u);
}

/** true once a usable voice for `lang` is available (voices load asynchronously). */
export function useCanSpeak(lang: SpeakLang): boolean {
  const [ok, setOk] = useState(() => !!pickVoice(lang));
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const update = () => setOk(!!pickVoice(lang));
    update();
    speechSynthesis.addEventListener?.('voiceschanged', update);
    return () => speechSynthesis.removeEventListener?.('voiceschanged', update);
  }, [lang]);
  return ok;
}
