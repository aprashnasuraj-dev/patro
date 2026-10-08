import { lazy, Suspense, useEffect, useRef, useState } from "react";

// The below-the-calendar note/voice editor must not pull speech and private-note
// dependencies into the first paint. Load it when approached, or at idle.
const HomeQuickNote = lazy(() => import("./HomeQuickNote").then((m) => ({ default: m.HomeQuickNote })));
type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function DeferredHomeQuickNote({ language }: { language: "ne" | "en" }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as IdleWindow;
    let idle: number | undefined;
    const timer = window.setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(() => setReady(true), { timeout: 6500 });
      else setReady(true);
    }, 4500);
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setReady(true);
            observer?.disconnect();
          }
        }, { rootMargin: "350px" })
      : null;
    if (host.current) observer?.observe(host.current);
    return () => {
      window.clearTimeout(timer);
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
      observer?.disconnect();
    };
  }, []);

  // Reserve room so inserting the full editor doesn't move the calendar above.
  const placeholder = <section className="rh-card qn-card" style={{ minHeight: 240 }} aria-busy="true" aria-label={language === "en" ? "Quick note" : "मेरो टिपोट"}>
    <header className="rh-card-head"><div>
      <span className="rh-kicker">{language === "en" ? "My space" : "आफ्नै ठाउँ"}</span>
      <h2>{language === "en" ? "Quick note" : "मेरो टिपोट"}</h2>
    </div></header>
    <p>{language === "en" ? "Preparing your private notes…" : "तपाईंको टिपोट तयार हुँदैछ…"}</p>
  </section>;
  return <div ref={host}>{ready
    ? <Suspense fallback={placeholder}><HomeQuickNote language={language} /></Suspense>
    : placeholder}</div>;
}
