import { lazy, Suspense, useState } from "react";

// Keep the original floating assistant trigger available on the first frame.
// Its complete chat/China/AI bundle is loaded only when the user activates it.
// Pass initiallyOpen so the FIRST tap opens the full assistant, without a second tap.
const FullAssistant = lazy(() => import("./JyotishAssistant").then((m) => ({ default: m.JyotishAssistant })));

export function DeferredJyotishAssistant() {
  const [activated, setActivated] = useState(false);
  if (activated) {
    return <Suspense fallback={<button className="jy-ai-fab" type="button" disabled aria-expanded="false" aria-controls="aafnai-bot-panel" aria-label="आफ्नै Patro Bot खुल्दैछ" title="आफ्नै Patro Bot">
      <span aria-hidden="true">आ</span><em>आफ्नै Patro Bot</em><b>आफ्नै</b>
    </button>}><FullAssistant initiallyOpen /></Suspense>;
  }
  return <button className="jy-ai-fab" type="button" onClick={() => setActivated(true)} aria-expanded="false" aria-controls="aafnai-bot-panel" aria-label="आफ्नै Patro Bot खोल्नुहोस्" title="आफ्नै Patro Bot">
    <span aria-hidden="true">आ</span><em>आफ्नै Patro Bot</em><b>आफ्नै</b>
  </button>;
}
