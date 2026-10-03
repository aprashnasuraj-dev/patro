import type { ReactNode } from "react";
import { ReadAloudButton } from "./ReadAloudButton";

export function ToolPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="patro-tool-page">
      <nav className="tool-breadcrumbs" aria-label="मार्ग">
        <a href="/">आफ्नै पात्रो</a><span aria-hidden="true">›</span><a href="/tools">उपकरण</a><span aria-hidden="true">›</span><span aria-current="page">{title}</span>
      </nav>
      <section className="patro-tool-hero">
        <div className="patro-tool-hero-copy">
          <p className="eyebrow">आफ्नै पात्रो · उपकरण</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="tool-trust-row" aria-label="उपकरणका विशेषता">
            <span>मोबाइलमैत्री</span><span>सरल प्रयोग</span><span>स्पष्ट नतिजा</span>
          </div>
        </div>
        <a className="tool-link-button tool-back-button" href="/tools">← सबै उपकरण</a>
      </section>
      {children}
    </main>
  );
}

export function ToolResult({ title, speechText, children }: { title: string; speechText?: string; children: ReactNode }) {
  return (
    <section className="patro-tool-card patro-tool-result" aria-live="polite">
      <header className="tool-result-header">
        <div><span className="tool-result-kicker">नतिजा</span><h2>{title}</h2></div>
        {speechText ? <ReadAloudButton text={speechText} /> : null}
      </header>
      {children}
    </section>
  );
}
