import { FormEvent, useRef, useState } from "react";
import { useNepaliDictation } from "../patro-tools/language/react/useNepaliDictation";
import { useNepaliSpeech } from "../patro-tools/language/react/useNepaliSpeech";
import { VoiceHelp } from "../patro-tools/language/react/VoiceHelp";
import { answerPatroQuestion } from "./patroBotEngine";
import "./voice-features.css";
import { ToolPage, ToolResult } from "./ToolPrimitives";

type ChatRow = { id: string; role: "user" | "bot"; text: string };

export function PatroBotTool() {
  const [input, setInput] = useState("आज");
  const [rows, setRows] = useState<ChatRow[]>([
    { id: "hello", role: "bot", text: "नमस्ते 🙏 ‘आज’, ‘भोलि’, ‘दशैं कहिले’, ‘2083-06-13 AD’ जस्ता प्रश्न सोध्नुहोस्।" },
  ]);
  const [busy, setBusy] = useState(false);
  const [voiceQuestion, setVoiceQuestion] = useState(false);
  const spokenText = useRef('');
  const readAloud = useNepaliSpeech();
  const dictation = useNepaliDictation({ onFinal(chunk) {
    spokenText.current = (spokenText.current + chunk).slice(0, 300);
    setInput(spokenText.current);
  } });

  function toggleVoice() {
    if (dictation.listening) { dictation.stop(); return; }
    if (busy || dictation.processing) return;
    readAloud.stop(); spokenText.current = input === 'आज' ? '' : input + (input && !/\s$/.test(input) ? ' ' : '');
    setVoiceQuestion(true); setInput(spokenText.current); void dictation.start();
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const value = input.trim();
    if (!value || busy || dictation.listening || dictation.processing) return;
    const speakAnswer = voiceQuestion;
    setVoiceQuestion(false);
    setRows((current) => [...current, { id: crypto.randomUUID(), role: "user", text: value }]);
    setInput("");
    setBusy(true);
    try {
      const result = await answerPatroQuestion(value, location.origin, { helpFallback: true });
      const answer = result?.answer || "उत्तर तयार गर्न सकिएन।";
      setRows((current) => [...current, { id: crypto.randomUUID(), role: "bot", text: answer }]);
      if (speakAnswer) readAloud.speak(answer);
    } catch (error) {
      setRows((current) => [...current, {
        id: crypto.randomUUID(),
        role: "bot",
        text: error instanceof Error ? error.message : "उत्तर तयार गर्न सकिएन।",
      }]);
    } finally {
      setBusy(false);
    }
  }

  const speech = rows.filter((row) => row.role === "bot").at(-1)?.text || "";

  return (
    <ToolPage title="आफ्नै Bot" description="मिति, तिथि, चाडपर्व, मिति रूपान्तरण र पात्रोसम्बन्धी छोटा प्रश्नको छिटो सहायक।">
      <section className="patro-tool-card">
        <div className="bot-chat" aria-live="polite">
          {rows.map((row) => <div className={"bot-bubble " + row.role} key={row.id}><small>{row.role === "bot" ? <><img src="/aafnai-logo.png" alt="" width="22" height="22" loading="lazy" style={{ verticalAlign: "middle", marginRight: 6 }} />आफ्नै Bot</> : "तपाईं"}</small><p>{row.text}</p></div>)}
        </div>
        <form className="bot-input bot-input-with-voice" onSubmit={send}>
          <input value={input} onChange={(e) => { setInput(e.target.value); spokenText.current = e.target.value; }} maxLength={300} placeholder="आज, भोलि, दशैं कहिले…" aria-label="आफ्नै Bot प्रश्न" />
          <button type="button" className="tool-secondary-button bot-voice-button" aria-pressed={dictation.listening} onClick={toggleVoice} disabled={dictation.mode === "unsupported" || busy || (dictation.processing && !dictation.listening)}>{dictation.listening ? "■ रोक्नुहोस्" : "🎙 बोलेर सोध्नुहोस्"}</button>
          <button type="submit" className="tool-primary-button" disabled={busy || dictation.listening || dictation.processing}>{busy ? "उत्तर खोज्दै…" : "पठाउनुहोस्"}</button>
        </form>
        {dictation.interim ? <p role="status">{dictation.interim}</p> : null}
        {dictation.error ? <p role="alert">{dictation.error}</p> : null}
        <VoiceHelp unsupported={dictation.mode === "unsupported"} checked={dictation.capabilitiesChecked} browserFailure={dictation.browserFailure} serverAvailable={dictation.serverAvailable}/>
        {voiceQuestion ? <p className="tool-muted">बोलिसकेपछि रोक्नुहोस्, प्रश्न मिलाउनुहोस् र पठाउनुहोस्। उत्तर उपलब्ध आवाजमा पढेर सुनाइन्छ।</p> : null}
        {readAloud.error ? <p role="status">{readAloud.error} उत्तर पढ्न वा सुन्ने बटन प्रयोग गर्न सक्नुहुन्छ।</p> : null}
        <div className="tool-action-row">
          {["आज","भोलि","दशैं कहिले","2083-06-13 AD","मेष राशिफल"].map((q) => <button type="button" className="tool-link-button" key={q} onClick={() => { setInput(q); spokenText.current = q; setVoiceQuestion(false); }}>{q}</button>)}
        </div>
      </section>
      <ToolResult title="पछिल्लो उत्तर" speechText={speech}>
        <p className="tool-preview">{speech}</p>
        <p className="tool-muted">आज, भोलि, चाडपर्व वा मिति रूपान्तरणका प्रश्न सोध्नुहोस्।</p>
      </ToolResult>
    </ToolPage>
  );
}
