import type { ReactNode } from "react";
import { ReadAloudButton } from "./ReadAloudButton";

export function ToolPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="patro-tool-page">
      <section className="patro-tool-hero">
        <div>
          <p className="eyebrow">मेरो पात्रो · उपकरण</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <a className="tool-link-button" href="/tools">← सबै उपकरण</a>
      </section>
      {children}
    </main>
  );
}

export function ToolResult({ title, speechText, children }: { title: string; speechText?: string; children: ReactNode }) {
  return (
    <section className="patro-tool-card patro-tool-result" aria-live="polite">
      <header className="tool-result-header">
        <h2>{title}</h2>
        {speechText ? <ReadAloudButton text={speechText} /> : null}
      </header>
      {children}
    </section>
  );
}
