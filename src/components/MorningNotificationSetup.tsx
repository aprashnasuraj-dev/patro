import { useEffect, useState } from "react";
import { enableLocalMorningGreeting, morningOfferSeen, rememberMorningOffer } from "../localMorning";

export function MorningNotificationSetup({ installed }: { installed: boolean }) {
  const [open, setOpen] = useState(false), [name, setName] = useState("");
  const [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  useEffect(() => {
    if (!installed || morningOfferSeen()) return;
    // Persist before displaying: reloads and dismissal never start another offer loop.
    rememberMorningOffer(); setOpen(true);
  }, [installed]);
  if (!open) return null;
  async function enable() {
    if (busy) return; setBusy(true);
    const result = await enableLocalMorningGreeting(name); setBusy(false);
    if (result.ok) setOpen(false);
    else setStatus(result.reason === "permission" ? "अनुमति दिइएन। फेरि स्वतः सोधिने छैन।" : "सूचना अहिले सक्रिय भएन। पछि homepage बाट सक्रिय गर्न सक्नुहुन्छ।");
  }
  return <aside className="ap-install-notice ap-morning-setup" role="region" aria-labelledby="morning-setup-title" lang="ne">
    <button type="button" className="ap-install-close" aria-label="सूचना प्रस्ताव बन्द गर्नुहोस्" onClick={() => { rememberMorningOffer("declined"); setOpen(false); }}>×</button>
    <div className="ap-install-copy"><strong id="morning-setup-title">हरेक बिहान शुभ प्रभात सूचना पाउने?</strong><p>बिहान ६ बजे नेपालको मिति, बार, तिथि र चाडपर्व। यो अनुमति एक पटक मात्र सोधिन्छ।</p></div>
    <label>नाम (वैकल्पिक)<input value={name} onChange={e => setName(e.target.value.slice(0, 80))} autoComplete="name" /></label>
    {status ? <p role="status">{status}</p> : <button type="button" className="ap-install-primary" disabled={busy} onClick={() => void enable()}>{busy ? "सक्रिय हुँदैछ…" : "अनुमति दिएर सक्रिय गर्नुहोस्"}</button>}
    <button type="button" onClick={() => { rememberMorningOffer("declined"); setOpen(false); }}>अहिले चाहिँदैन</button>
  </aside>;
}
