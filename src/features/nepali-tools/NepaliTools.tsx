import { useEffect, useRef, useState } from "react";

export type NepaliMode = "typing" | "preeti-to-unicode" | "unicode-to-preeti";
const BASE = "/nepali-tools";

type ToolsModule = {
  mountNepaliTools: (root: ShadowRoot, options: { mode: NepaliMode }) => () => void;
};

/** Native React adapter. The Shadow DOM isolates the editor/converter stylesheet without using an iframe. */
export function NepaliTools({ mode = "typing" }: { mode?: NepaliMode }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const controller = new AbortController();
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot || element.attachShadow({ mode: "open" });

    setError("");
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
      if (!main) throw new Error("load_failed");

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

    init().catch(() => {
      if (!cancelled) setError("नेपाली टाइपिङ अहिले लोड हुन सकेन। पृष्ठ फेरि खोल्नुहोस्।");
    });

    return () => {
      cancelled = true;
      controller.abort();
      cleanup?.();
      shadow.replaceChildren();
    };
  }, [mode]);

  return (
    <section aria-label="Nepali typing tools" style={{ background: "#f5f4ef", minHeight: "100vh" }}>
      {error && (
        <p role="alert" style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
          {error} <a href={`${BASE}/index.html`}>टाइपिङ उपकरण खोल्नुहोस्</a>
        </p>
      )}
      <div ref={host} />
    </section>
  );
}