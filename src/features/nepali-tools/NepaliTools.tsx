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
    const controller = new AbortController();
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot || element.attachShadow({ mode: "open" });

    setFallback(false);
    const loading = document.createElement("p");
    loading.textContent = "नेपाली टाइपिङ तयार हुँदैछ…";
    shadow.replaceChildren(loading);

    async function init() {
      const response = await fetch(`${BASE}/index.html`, { signal: controller.signal, cache: "force-cache" });
      if (!response.ok) throw new Error("load_failed");

      const [html, module] = await Promise.all([
        response.text(),
        import(/* @vite-ignore */ `${BASE}/app.mjs`) as Promise<ToolsModule>,
      ]);

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
      shadow.replaceChildren(stylesheet, document.importNode(main, true));
      cleanup = module.mountNepaliTools(shadow, { mode });

      navigator.serviceWorker?.ready
        .then((registration) => registration.active?.postMessage({ type: "WARM_LANGUAGE_TOOLS" }))
        .catch(() => undefined);
    }

    init().catch((reason) => {
      if (cancelled || controller.signal.aborted) return;
      console.warn("Nepali typing adapter switched to packaged fallback", reason);
      shadow.replaceChildren();
      setFallback(true);
    });

    return () => {
      cancelled = true;
      controller.abort();
      cleanup?.();
      shadow.replaceChildren();
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
