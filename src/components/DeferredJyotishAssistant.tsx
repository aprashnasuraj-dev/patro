import { lazy, Suspense, useState, useEffect } from "react";

// Footer entry opens the existing assistant; no unsolicited floating trigger.
// Its complete chat/China/AI bundle is loaded only when the user activates it.
// Pass initiallyOpen so the FIRST tap opens the full assistant, without a second tap.
const FullAssistant = lazy(() => import("./JyotishAssistant").then((m) => ({ default: m.JyotishAssistant })));

export function DeferredJyotishAssistant() {
  const [activated, setActivated] = useState(false);
  useEffect(() => { const open = () => setActivated(true); window.addEventListener("patro:open-assistant", open); return () => window.removeEventListener("patro:open-assistant", open); }, []);
  if (activated) {
    return <Suspense fallback={<p role="status">Loading…</p>}><FullAssistant initiallyOpen showLauncher={false}/></Suspense>;
  }
  return null;
}
