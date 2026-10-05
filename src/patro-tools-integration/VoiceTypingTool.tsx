import { useCallback, useState } from "react";
import { DictationLanguage, useNepaliDictation } from "@/patro-tools/language/react/useNepaliDictation";
import { ToolPage, ToolResult } from "./ToolPrimitives";
import "./voice-typing.css";

const LANGUAGE_META: Record<DictationLanguage, {
  label: string;
  short: string;
  start: string;
  listening: string;
  placeholder: string;
  empty: string;
  punctuation: string;
}> = {
  "ne-NP": {
    label: "नेपाली",
    short: "नेपाली · नेपाल",
    start: "🎙 नेपाली बोल्न सुरु गर्नुहोस्",
    listening: "सुन्दैछ",
    placeholder: "नेपालीमा बोल्नुहोस्—पाठ यहाँ देखिन्छ…",
    empty: "अहिलेसम्म नेपाली पाठ छैन।",
    punctuation: "‘पूर्णविराम’, ‘अल्पविराम’, ‘प्रश्नचिन्ह’, ‘उद्गार चिन्ह’ वा ‘नयाँ लाइन’ भन्न सक्नुहुन्छ।",
  },
  "en-US": {
    label: "English",
    short: "English · US",
    start: "🎙 Start English voice typing",
    listening: "Listening",
    placeholder: "Speak in English—your transcript appears here…",
    empty: "No English transcript yet.",
    punctuation: "Say period, comma, question mark, exclamation mark, new line, or new paragraph.",
  },
};

export function VoiceTypingTool() {
  const [language, setLanguage] = useState<DictationLanguage>("ne-NP");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const appendFinal = useCallback((chunk: string) => setText((current) => current + chunk), []);
  const dictation = useNepaliDictation({
    language,
    serverFallback: true,
    onFinal: appendFinal,
  });
  const meta = LANGUAGE_META[language];
  const modeText = dictation.mode === "browser"
    ? `${meta.short} · Live recognition`
    : dictation.mode === "server"
      ? `${meta.short} · Recorded recognition`
      : "यो ब्राउजरमा आवाज टाइपिङ उपलब्ध छैन";

  function chooseLanguage(next: DictationLanguage) {
    if (next === language) return;
    if (dictation.listening) dictation.stop();
    setLanguage(next);
    setCopied(false);
  }

  async function copyTranscript() {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text.trimEnd());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function clearTranscript() {
    if (dictation.listening) dictation.stop();
    setText("");
    setCopied(false);
  }

  return (
    <ToolPage
      title="आवाजबाट टाइपिङ · Voice to Text"
      description="नेपाली वा English छानेर बोलाइलाई तुरुन्तै सम्पादन गर्न मिल्ने पाठमा बदल्नुहोस्। Live recognition उपलब्ध नभए छोटो recording बाट पनि पाठ तयार गर्न सकिन्छ।"
    >
      <section className="patro-tool-card voice-typing-card">
        <div className="voice-language-panel">
          <div>
            <span className="tool-badge">भाषा छान्नुहोस् · Choose language</span>
            <h2>कुन भाषामा बोल्नुहुन्छ?</h2>
            <p className="tool-muted">पहिले भाषा छान्नुहोस्, त्यसपछि माइक्रोफोन सुरु गर्नुहोस्।</p>
          </div>
          <div className="voice-language-picker" role="group" aria-label="Voice recognition language">
            <button
              type="button"
              className={language === "ne-NP" ? "is-active" : ""}
              aria-pressed={language === "ne-NP"}
              onClick={() => chooseLanguage("ne-NP")}
            >
              <strong>नेपाली</strong>
              <small>नेपाली बोली → नेपाली पाठ</small>
            </button>
            <button
              type="button"
              className={language === "en-US" ? "is-active" : ""}
              aria-pressed={language === "en-US"}
              onClick={() => chooseLanguage("en-US")}
            >
              <strong>English</strong>
              <small>English speech → English text</small>
            </button>
          </div>
        </div>

        <div className="voice-capture-panel">
          <div className="voice-capture-status">
            <span className="tool-badge">{modeText}</span>
            <p>{meta.punctuation}</p>
            {dictation.mode === "server" ? (
              <p className="tool-muted">Stop थिचेपछि रेकर्ड गरिएको आवाजलाई पाठमा बदलिन्छ। एक पटकमा अधिकतम 60 सेकेन्ड बोल्न सकिन्छ।</p>
            ) : null}
          </div>
          {!dictation.listening ? (
            <button
              type="button"
              className="tool-primary-button voice-record-button"
              onClick={() => void dictation.start()}
              disabled={dictation.mode === "unsupported"}
            >
              {dictation.mode === "server"
                ? (language === "ne-NP" ? "🎙 रेकर्ड सुरु गर्नुहोस्" : "🎙 Start recording")
                : meta.start}
            </button>
          ) : (
            <button type="button" className="tool-secondary-button voice-record-button is-listening" onClick={dictation.stop}>
              <span className="voice-live-dot" aria-hidden="true" />
              ■ {language === "ne-NP" ? "रोक्नुहोस्" : "Stop listening"}
            </button>
          )}
        </div>

        {dictation.interim ? (
          <p className="tool-interim voice-live-transcript" aria-live="polite">
            <strong>{meta.listening}:</strong> {dictation.interim}
          </p>
        ) : null}
        {dictation.error ? <p className="tool-status" role="alert">{dictation.error}</p> : null}

        <label className="tool-block-label voice-transcript-label">
          <span>ट्रान्सक्रिप्ट · Transcript</span>
          <textarea
            rows={12}
            value={text}
            onChange={(event) => { setText(event.target.value); setCopied(false); }}
            placeholder={meta.placeholder}
            lang={language === "ne-NP" ? "ne" : "en"}
            spellCheck={language === "en-US"}
          />
        </label>

        <div className="tool-action-row">
          <button type="button" className="tool-secondary-button" onClick={copyTranscript} disabled={!text}>
            {copied ? "✓ कपी भयो" : "कपी · Copy"}
          </button>
          <button type="button" className="tool-link-button" onClick={clearTranscript} disabled={!text && !dictation.listening}>
            खाली गर्नुहोस् · Clear
          </button>
          {language === "ne-NP" ? <a className="tool-link-button" href="/tools/spell-check">नेपाली हिज्जे जाँच →</a> : null}
        </div>
      </section>

      <ToolResult title={language === "ne-NP" ? "टाइप भएको पाठ" : "English transcript"} speechText={text}>
        <p className="tool-preview" lang={language === "ne-NP" ? "ne" : "en"}>{text || meta.empty}</p>
        <p className="tool-muted">
          Live mode मा Patro ले audio संग्रह गर्दैन। Recorded recognition प्रयोग हुँदा छोटो recording पाठमा बदल्न पठाइन्छ र Patro ले recording संग्रह गर्दैन।
        </p>
      </ToolResult>
    </ToolPage>
  );
}
