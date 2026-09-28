import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

export type ThemePreset = "slate" | "crimson" | "saffron";
export type UiLanguage = "en" | "ne";

const ROUTES = [
  ["/", "Calendar · पात्रो"],
  ["/aaja", "Today · आज"],
  ["/tithi", "Tithi · तिथि"],
  ["/fm", "FM Radio · एफएम"],
  ["/tv", "Live TV · टिभी"],
  ["/jyotish", "Jyotish · ज्योतिष"],
  ["/jyotish/janma-patro", "Janma Patro · जन्मपत्रो"],
  ["/jyotish/rashifal", "Rashifal · राशिफल"],
  ["/time-machine", "Time Machine · समय यात्रा"],
  ["/samachar", "Samachar · समाचार"]
] as const;

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function Skeleton({ className = "", label = "Loading" }: { className?: string; label?: string }) {
  return <span className={"ui-skeleton " + className} role="status" aria-label={label} />;
}

export function AppChrome({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<UiLanguage>(() =>
    readStored("patro.ui.language", ["en", "ne"] as const, "ne")
  );
  const [theme, setTheme] = useState<ThemePreset>(() =>
    readStored("patro.ui.theme", ["slate", "crimson", "saffron"] as const, "slate")
  );
  const [dark, setDark] = useState(() => readStored("patro.ui.mode", ["dark", "light"] as const, "dark") === "dark");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [media, setMedia] = useState<{ active: boolean; title: string; muted: boolean }>({
    active: false,
    title: "Media idle",
    muted: false
  });

  const filteredRoutes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ROUTES.slice(0, 6);
    return ROUTES.filter(([, label]) => label.toLowerCase().includes(needle)).slice(0, 8);
  }, [query]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = dark ? "dark" : "light";
    document.documentElement.lang = language === "ne" ? "ne" : "en";
    try {
      localStorage.setItem("patro.ui.language", language);
      localStorage.setItem("patro.ui.theme", theme);
      localStorage.setItem("patro.ui.mode", dark ? "dark" : "light");
    } catch {
      // Storage can be unavailable in privacy mode; the UI still works for the session.
    }
  }, [dark, language, theme]);

  useEffect(() => {
    const onMedia = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean; title?: string; muted?: boolean }>).detail || {};
      setMedia((current) => ({
        active: detail.active ?? current.active,
        title: detail.title ?? current.title,
        muted: detail.muted ?? current.muted
      }));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        return;
      }
      if (event.key.toLowerCase() === "m" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
        window.dispatchEvent(new CustomEvent("patro:toggle-mute"));
      }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => document.getElementById("patro-quick-search")?.focus());
      }
    };
    window.addEventListener("patro:media-status", onMedia);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("patro:media-status", onMedia);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const first = filteredRoutes[0];
    if (first) window.location.assign(first[0]);
  }

  return (
    <div className="patro-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="patro-nav" aria-label="Primary navigation">
        <a className="patro-brand tap-target" href="/" aria-label="Nepali Patro home">
          <span aria-hidden="true">☀</span>
          <span><strong>नेपाली पात्रो</strong><small>Nepali Patro</small></span>
        </a>

        <nav className="patro-nav-links" aria-label="Main sections">
          <a className="tap-target" href="/">पात्रो</a>
          <a className="tap-target" href="/fm">FM</a>
          <a className="tap-target" href="/tv">TV</a>
          <a className="tap-target" href="/jyotish">ज्योतिष</a>\n          <a className="tap-target" href="/jyotish/janma-patro">चिना</a>
        </nav>

        <div className="patro-nav-actions">
          <button
            className={"media-chip tap-target " + (media.active ? "is-live" : "")}
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("patro:toggle-player"))}
            aria-label={media.active ? "Open media player: " + media.title : "Open media player"}
          >
            <span className="live-dot" aria-hidden="true" />
            <span className="media-chip-label">{media.active ? media.title : "Media"}</span>
            <span aria-hidden="true">{media.muted ? "🔇" : "♪"}</span>
          </button>

          <button className="tap-target iconish" type="button" onClick={() => setSearchOpen((v) => !v)} aria-label="Open quick search">
            ⌕
          </button>

          <button
            className="tap-target bilingual-toggle"
            type="button"
            onClick={() => setLanguage((v) => v === "en" ? "ne" : "en")}
            aria-label="Toggle English and Nepali interface labels"
          >
            {language === "en" ? "EN" : "ने"}
          </button>

          <button
            className="tap-target iconish"
            type="button"
            onClick={() => setDark((v) => !v)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "☾" : "☀"}
          </button>

          <label className="theme-select" aria-label="Traditional theme preset">
            <span className="sr-only">Theme preset</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemePreset)}>
              <option value="slate">Deep Slate</option>
              <option value="crimson">Crimson · रातो</option>
              <option value="saffron">Saffron · पहेंलो</option>
            </select>
          </label>
        </div>

        {searchOpen && (
          <div className="quick-search-panel" role="dialog" aria-modal="false" aria-label="Quick navigation">
            <form onSubmit={submitSearch}>
              <label htmlFor="patro-quick-search" className="sr-only">Search Patro features</label>
              <input
                id="patro-quick-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={language === "ne" ? "फिचर खोज्नुहोस्…" : "Search features…"}
                autoComplete="off"
              />
            </form>
            <div className="quick-search-results">
              {filteredRoutes.map(([path, label]) => (
                <a href={path} key={path}>{label}<span aria-hidden="true">→</span></a>
              ))}
            </div>
            <small>Tip: press <kbd>/</kbd> to search, <kbd>M</kbd> to mute, <kbd>Esc</kbd> to close.</small>
          </div>
        )}
      </header>

      <div id="main-content" tabIndex={-1}>{children}</div>
    </div>
  );
}
