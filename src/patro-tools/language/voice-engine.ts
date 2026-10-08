export const VOICE_ENGINE_KEY = 'patro.voice.engine.v1';
type Locale = 'ne-NP' | 'en-US';
const TTL = 86_400_000;

export function browserEngineHint(language: Locale, now = Date.now()): boolean | null {
  try {
    const stored = JSON.parse(localStorage.getItem(VOICE_ENGINE_KEY) || '{}');
    const row = stored.version === 1 ? stored.locales?.[language] : undefined;
    return typeof row?.working === 'boolean' && Number.isFinite(row.at) && now >= row.at && now - row.at < TTL ? row.working : null;
  } catch { return null; }
}
export function rememberBrowserEngine(language: Locale, working: boolean, now = Date.now()) {
  try {
    const old = JSON.parse(localStorage.getItem(VOICE_ENGINE_KEY) || '{}');
    const locales = old.version === 1 && old.locales && typeof old.locales === 'object' ? old.locales : {};
    localStorage.setItem(VOICE_ENGINE_KEY, JSON.stringify({ version: 1, locales: { ...locales, [language]: { working, at: now } } }));
  } catch { /* Recognition must work even when local storage is blocked. */ }
}
