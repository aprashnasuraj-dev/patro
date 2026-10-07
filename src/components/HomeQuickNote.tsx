import { useAccount } from "../auth/account-client";
import { GoogleAuthButton } from "../auth/GoogleAuthButton";
import { useEffect, useRef, useState } from "react";
import { readLife, syncLifeTools, updateLife, type StoredNote } from "../patro-tools-integration/storage";
import { formatDate } from "../nepaliDate";

type Lang = "ne" | "en";

/** "मेरो टिपोट" — quick text or voice note on the homepage; same store as मेरो ठाउँ → नोट. */
export function HomeQuickNote({ language }: { language: Lang }) {
  const account = useAccount();
  const l = (ne: string, en: string) => (language === "en" ? en : ne);
  const [text, setText] = useState("");
  const [voiceLang, setVoiceLang] = useState<"ne-NP" | "en-US">("ne-NP");
  const [listening, setListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState<StoredNote[]>(() => { try { return readLife().notes.slice(0, 2); } catch { return []; } });
  const recognition = useRef<any>(null);
  const base = useRef("");
  const supported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => () => { try { recognition.current?.stop(); } catch { /* ignore */ } }, []);

  useEffect(() => {
    const refresh = () => setNotes(readLife().notes.slice(0,2));
    window.addEventListener("patro:life-updated",refresh);
    return () => window.removeEventListener("patro:life-updated",refresh);
  }, []);

  function toggleVoice() {
    if (listening) { recognition.current?.stop(); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setStatus(l("यो ब्राउजरमा बोलेर टाइप गर्न मिल्दैन। Chrome वा Edge प्रयोग गर्नुहोस्।", "Voice typing needs Chrome or Edge.")); return; }
    const r = new Recognition();
    recognition.current = r;
    r.lang = voiceLang; r.interimResults = true; r.continuous = true;
    base.current = text ? text.replace(/\s*$/, " ") : "";
    r.onresult = (event: any) => {
      let heard = "";
      for (let i = 0; i < event.results.length; i++) heard += event.results[i][0].transcript;
      setText(base.current + heard);
      setUsedVoice(true);
    };
    r.onerror = (event: any) => setStatus(event?.error === "not-allowed" ? l("माइक्रोफोन अनुमति दिनुहोस्।", "Allow microphone access.") : l("आवाज बुझ्न सकिएन। फेरि प्रयास गर्नुहोस्।", "Couldn't hear that. Try again."));
    r.onend = () => setListening(false);
    try { r.start(); setListening(true); setStatus(l("सुन्दैछ… बोल्नुहोस्।", "Listening… speak now.")); } catch { setListening(false); }
  }

  async function save() {
    const value = text.trim();
    if (!value) return;
    recognition.current?.stop();
    const row: StoredNote = { id: crypto.randomUUID(), text: value, inputMode: usedVoice ? "voice" : voiceLang === "en-US" ? "english" : "nepali", createdAt: new Date().toISOString(), updatedAt: Date.now() };
    const next = updateLife((current) => ({ ...current, notes: [row, ...current.notes] }));
    setNotes(next.notes.slice(0, 2)); setText(""); setUsedVoice(false);
    setStatus(l("यस उपकरणमा सुरक्षित भयो।", "Saved on this device."));
    try {
      const result = await syncLifeTools();
      setStatus(result.synced ? l("खातासँग पनि सुरक्षित भयो।", "Saved to your account too.") : account ? l("यस उपकरणमा सुरक्षित छ; खाता सिङ्क हुन बाँकी छ।", "Saved on this device; account sync is pending.") : l("यस उपकरणमा सुरक्षित छ; साइन इन गरे खातामा पनि रहन्छ।", "Saved here; sign in to keep it in your account."));
    } catch { /* stays local */ }
  }

  return <section className="rh-card qn-card" aria-labelledby="qn-title">
    <header className="rh-card-head"><div><span className="rh-kicker">{l("आफ्नै ठाउँ", "My space")}</span><h2 id="qn-title">{l("मेरो टिपोट", "Quick note")}</h2></div></header>
    <label className="qn-field"><span className="sr-only">{l("टिपोट लेख्नुहोस्", "Write a note")}</span>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} lang={voiceLang === "ne-NP" ? "ne" : "en"}
        placeholder={l("आजको काम, सम्झनु पर्ने कुरा… लेख्नुहोस् वा 🎙 थिचेर बोल्नुहोस्", "Write, or press 🎙 and speak…")} /></label>
    <div className="qn-actions">
      {supported ? <button type="button" className={`qn-mic${listening ? " is-on" : ""}`} onClick={toggleVoice} aria-pressed={listening}
        aria-label={listening ? l("बोलेर टाइप रोक्नुहोस्", "Stop voice typing") : l("बोलेर टाइप गर्नुहोस्", "Voice typing")}>{listening ? "■" : "🎙"}</button> : null}
      {supported ? <div className="qn-lang" role="group" aria-label={l("बोल्ने भाषा", "Voice language")}>
        <button type="button" aria-pressed={voiceLang === "ne-NP"} onClick={() => setVoiceLang("ne-NP")}>नेपाली</button>
        <button type="button" aria-pressed={voiceLang === "en-US"} onClick={() => setVoiceLang("en-US")}>English</button>
      </div> : null}
      <GoogleAuthButton language={language} compact/>
      <button type="button" className="qn-save" onClick={save} disabled={!text.trim()}>{l("सुरक्षित गर्नुहोस्", "Save")}</button>
    </div>
    {status ? <p className="qn-status" role="status">{status}</p> : null}
    {notes.length ? <ul className="qn-list">{notes.map((n) => <li key={n.id}><small>{formatDate(n.createdAt, language, { year: false, time: true })}{n.inputMode === "voice" ? " · 🎙" : ""}</small><p>{n.text}</p></li>)}</ul> : null}
    <footer className="hx-foot"><span /><a href="/me/notes">{l("सबै टिपोट", "All notes")} →</a></footer>
  </section>;
}
