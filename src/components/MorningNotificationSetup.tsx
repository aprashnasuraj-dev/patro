import { useEffect, useState } from "react";
import { enableLocalMorningGreeting, getLocalMorningGreeting, morningOfferSeen } from "../localMorning";

// Installation includes morning greetings. Browser permission provides consent;
// there is no separate subscription offer or account requirement.
export function MorningInstallationCompletion({ installed }: { installed: boolean }) {
  const [status, setStatus] = useState("");
  const [needsPermission, setNeedsPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  async function activate() {
    setBusy(true);
    setStatus("बिहानको शुभ प्रभात सूचना सक्रिय हुँदैछ…");
    try {
      const result = await enableLocalMorningGreeting(getLocalMorningGreeting().name);
      setNeedsPermission(!result.ok);
      setStatus(result.ok ? "बिहान ६ बजे शुभ प्रभात सूचना सक्रिय भयो। homepage बाट बन्द गर्न सक्नुहुन्छ।" : result.reason === "permission" ? "बिहानको सूचनाका लागि ब्राउजरको अनुमति चाहिन्छ।" : "सूचना सक्रिय गर्न इन्टरनेट र समर्थित ब्राउजर चाहिन्छ। पुनः प्रयास गर्नुहोस्।");
    } catch { setNeedsPermission(true); setStatus("बिहानको सूचना सक्रिय गर्न स्थापना पूरा गर्नुहोस्।"); } finally { setBusy(false); }
  }
  useEffect(() => {
    if (!installed || morningOfferSeen() || getLocalMorningGreeting().enabled) return;
    // Browsers that require a fresh tap expose the completion action below.
    void activate();
  }, [installed]);
  if (!installed || !status) return null;
  return <aside className="ap-install-notice ap-morning-installation" role="status" lang="ne">
    <div className="ap-install-copy"><strong>एप र शुभ प्रभात सूचना</strong><p>{status}</p></div>
    {needsPermission ? <button className="ap-install-primary" type="button" disabled={busy} onClick={() => void activate()}>{busy ? "सक्रिय हुँदैछ…" : "स्थापना पूरा गर्नुहोस्"}</button> : <button type="button" onClick={() => setStatus("")}>बुझें</button>}
  </aside>;
}
