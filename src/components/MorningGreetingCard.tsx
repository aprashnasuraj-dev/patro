import { useEffect, useState } from "react";
import { disableLocalMorningGreeting, enableLocalMorningGreeting, getLocalMorningGreeting } from "../localMorning";

// Settings only: no homepage promotion and no manually entered name.
export function MorningGreetingCard() {
  const [enabled, setEnabled] = useState(() => getLocalMorningGreeting().enabled);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const sync = () => setEnabled(getLocalMorningGreeting().enabled);
    window.addEventListener("patro:morning-config", sync);
    return () => window.removeEventListener("patro:morning-config", sync);
  }, []);
  async function toggle() {
    setBusy(true);
    try {
      if (enabled) await disableLocalMorningGreeting();
      else {
        const result = await enableLocalMorningGreeting();
        if (!result.ok) { setStatus(result.reason === "permission" ? "ब्राउजर सेटिङबाट सूचना अनुमति दिनुहोस्।" : "सूचना अहिले सक्रिय भएन। पुनः प्रयास गर्नुहोस्।"); return; }
      }
      setStatus("");
    } catch { setStatus("परिवर्तन सुरक्षित भएन। इन्टरनेट जोडेर पुनः प्रयास गर्नुहोस्।"); }
    finally { setBusy(false); }
  }
  return <section className="mp-card" aria-labelledby="morning-settings-title">
    <h2 id="morning-settings-title">बिहानको सूचना</h2>
    <button type="button" role="switch" aria-checked={enabled} disabled={busy} onClick={() => void toggle()}>{enabled ? "सूचना बन्द गर्नुहोस्" : "सूचना सक्रिय गर्नुहोस्"}</button>
    {status ? <p role="status">{status}</p> : null}
  </section>;
}
