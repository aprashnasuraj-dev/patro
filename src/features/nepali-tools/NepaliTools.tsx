import { useEffect, useRef, useState } from "react";

export type NepaliMode = "typing" | "preeti-to-unicode" | "unicode-to-preeti";
const BASE = "/nepali-tools";

type ToolsModule = {
  mountNepaliTools: (root: ShadowRoot, options: { mode: NepaliMode }) => () => void;
};

function standaloneUrl(mode: NepaliMode) {
  return `${BASE}/index.html?mode=${encodeURIComponent(mode)}`;
}

/**
 * Native React adapter for the packaged Nepali writing suite.
 * The Shadow DOM keeps the editor styling isolated. If a browser cannot mount the adapter,
 * the exact same packaged tool is embedded as a resilient same-origin fallback instead of
 * exposing a broken route.
 */
export function NepaliTools({ mode = "typing" }: { mode?: NepaliMode }) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let shadow: ShadowRoot | undefined;
    const controller = new AbortController();
    const element = host.current;
    if (!element) return;

    setFallback(false);

    async function init() {
      // Load both dependencies before exposing a Shadow DOM to release-gate/browser checks.
      // This keeps the adapter atomic: observers see either a fully mounted native tool or
      // the same-origin iframe fallback, never the short intermediate DOM without handlers.
      const [response, module] = await Promise.all([
        fetch(`${BASE}/index.html`, { signal: controller.signal, cache: "force-cache" }),
        import(/* @vite-ignore */ `${BASE}/app.mjs`) as Promise<ToolsModule>,
      ]);
      if (!response.ok) throw new Error("load_failed");
      const html = await response.text();
      if (cancelled) return;

      const doc = new DOMParser().parseFromString(html, "text/html");
      const main = doc.querySelector("main");
      if (!main || typeof module.mountNepaliTools !== "function") throw new Error("load_failed");

      for (const anchor of main.querySelectorAll<HTMLAnchorElement>('a[href^="./"]')) {
        anchor.href = `${BASE}/${anchor.getAttribute("href")!.slice(2)}`;
      }

      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = `${BASE}/styles.css`;
      shadow = element.shadowRoot || element.attachShadow({ mode: "open" });
      shadow.replaceChildren(stylesheet, document.importNode(main, true));
      cleanup = module.mountNepaliTools(shadow, { mode });

      navigator.serviceWorker?.ready
        .then((registration) => registration.active?.postMessage({ type: "WARM_LANGUAGE_TOOLS" }))
        .catch(() => undefined);
    }

    init().catch((reason) => {
      if (cancelled || controller.signal.aborted) return;
      console.warn("Nepali typing adapter switched to packaged fallback", reason);
      shadow?.replaceChildren();
      setFallback(true);
    });

    return () => {
      cancelled = true;
      controller.abort();
      cleanup?.();
      shadow?.replaceChildren();
    };
  }, [mode]);

  return (
    <main aria-label="Nepali typing tools" style={{ background: "#f5f4ef", minHeight: "100vh" }}>
      <h1 style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
        नेपाली टाइपिङ · Nepali Typing
      </h1>
      {fallback ? (
        <iframe
          title="आफ्नै नेपाली टाइपिङ"
          src={standaloneUrl(mode)}
          data-nepali-tools-fallback
          style={{ display: "block", width: "100%", minHeight: "calc(100vh - 72px)", height: "1100px", border: 0, background: "#f5f4ef" }}
        />
      ) : (
        <div ref={host} data-nepali-tools-host />
      )}
    </main>
  );
}
