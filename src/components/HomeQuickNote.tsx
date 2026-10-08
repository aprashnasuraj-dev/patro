import { VoiceHelp } from "../patro-tools/language/react/VoiceHelp";
import { InlineDictationPreview, useDictationEditor } from '../patro-tools/language/react/DictationEditor';
import { useNepaliDictation } from "../patro-tools/language/react/useNepaliDictation";
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
  const [noteDate,setNoteDate]=useState(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu"}).format(new Date()));
  const [usedVoice, setUsedVoice] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState<StoredNote[]>(() => { try { return readLife().notes; } catch { return []; } });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const insertFinal = useDictationEditor(text, setText, textarea, () => setUsedVoice(true));
  const dictation=useNepaliDictation({language:voiceLang,serverFallback:true,onFinal:insertFinal});const listening=dictation.listening;const supported=dictation.mode!=="unsupported";

  useEffect(() => {
    const refresh = () => setNotes(readLife().notes);
    window.addEventListener("patro:life-updated",refresh);
    return () => window.removeEventListener("patro:life-updated",refresh);
  }, []);

  function toggleVoice(){if(listening)dictation.stop();else void dictation.start();}

  async function save() {
    const value = text.trim();
    if (!value) return;
    dictation.stop();
    const row: StoredNote = { id: crypto.randomUUID(), text: value, date:noteDate, inputMode: usedVoice ? "voice" : voiceLang === "en-US" ? "english" : "nepali", createdAt: new Date().toISOString(), updatedAt: Date.now() };
    const next = updateLife((current) => ({ ...current, notes: [row, ...current.notes] }));
    setNotes(next.notes); setText(""); setUsedVoice(false);
    setStatus(l("यस उपकरणमा सुरक्षित भयो।", "Saved on this device."));
    try {
      const result = await syncLifeTools();
      setStatus(result.synced ? l("खातासँग पनि सुरक्षित भयो।", "Saved to your account too.") : account ? l("यस उपकरणमा सुरक्षित छ; खाता सिङ्क हुन बाँकी छ।", "Saved on this device; account sync is pending.") : l("यस उपकरणमा सुरक्षित छ; साइन इन गरे खातामा पनि रहन्छ।", "Saved here; sign in to keep it in your account."));
    } catch { /* stays local */ }
  }

  return <section className="rh-card qn-card" aria-labelledby="qn-title">
    <header className="rh-card-head"><div><span className="rh-kicker">{l("आफ्नै ठाउँ", "My space")}</span><h2 id="qn-title">{l("मेरो टिपोट", "Quick note")}</h2></div></header>
    <label className="qn-field"><span className="sr-only">{l("टिपोट लेख्नुहोस्", "Write a note")}</span>
      <textarea ref={textarea} value={text} onChange={(e) => setText(e.target.value)} rows={3} lang={voiceLang === "ne-NP" ? "ne" : "en"}
        placeholder={l("आजको काम, सम्झनु पर्ने कुरा… लेख्नुहोस् वा 🎙 थिचेर बोल्नुहोस्", "Write, or press 🎙 and speak…")} /><InlineDictationPreview textarea={textarea} interim={dictation.interim} /></label>
    <label className="qn-field">{l("मितिमा सुरक्षित गर्नुहोस्","Save to date")}<input type="date" value={noteDate} onChange={e=>setNoteDate(e.target.value)}/></label>{dictation.error&&<p role="alert">{dictation.error}</p>}<div className="qn-actions">
      <button type="button" className={`qn-mic${listening ? " is-on" : ""}`} onClick={toggleVoice} disabled={!supported || (dictation.processing && !listening)} title={!supported ? l("आवाज टाइपिङ उपलब्ध छैन; तलको सहायता हेर्नुहोस्।", "Voice typing unavailable; see help below.") : undefined} aria-pressed={listening}
        aria-label={listening ? l("बोलेर टाइप रोक्नुहोस्", "Stop voice typing") : l("बोलेर टाइप गर्नुहोस्", "Voice typing")}>{listening ? "■" : "🎙"}</button>
      <div className="qn-lang" role="group" aria-label={l("बोल्ने भाषा", "Voice language")}>
        <button type="button" aria-pressed={voiceLang === "ne-NP"} onClick={() => setVoiceLang("ne-NP")}>नेपाली</button>
        <button type="button" aria-pressed={voiceLang === "en-US"} onClick={() => setVoiceLang("en-US")}>English</button>
      </div>
      <GoogleAuthButton language={language} compact/>
      <button type="button" className="qn-save" onClick={save} disabled={!text.trim()||!noteDate||listening||dictation.processing}>{l("सुरक्षित गर्नुहोस्", "Save")}</button>
    </div>
    <VoiceHelp unsupported={!supported} checked={dictation.capabilitiesChecked} browserFailure={dictation.browserFailure} serverAvailable={dictation.serverAvailable} language={voiceLang}/>
    {status ? <p className="qn-status" role="status">{status}</p> : null}
    {notes.length ? <ul className="qn-list">{notes.filter(n=>(n.date||n.createdAt.slice(0,10))===noteDate).map((n) => <li key={n.id}><small>{formatDate(n.createdAt, language, { year: false, time: true })}{n.inputMode === "voice" ? " · 🎙" : ""}</small><p>{n.text}</p></li>)}</ul> : null}
    <footer className="hx-foot"><span /><a href="/me/notes">{l("सबै टिपोट", "All notes")} →</a></footer>
  </section>;
}
