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
  const modeText = dictation.processing
    ? (language === "ne-NP" ? "आवाजलाई पाठमा बदलिँदैछ…" : "Transcribing recording…")
    : dictation.mode === "browser"
      ? `${meta.short} · Live recognition`
      : dictation.mode === "server"
        ? `${meta.short} · Accurate server transcription`
        : dictation.capabilitiesChecked
          ? "यो ब्राउजरमा आवाज टाइपिङ उपलब्ध छैन"
          : "Voice service जाँच हुँदैछ…";

  function chooseLanguage(next: DictationLanguage) {
    if (next === language || dictation.processing) return;
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
    if (dictation.processing) return;
    if (dictation.listening) dictation.stop();
    setText("");
    setCopied(false);
  }

  return (
    <ToolPage
      title="आवाजबाट टाइपिङ · Voice to Text"
      description="नेपाली वा English छानेर बोलाइलाई सम्पादन गर्न मिल्ने पाठमा बदल्नुहोस्। Live recognition वा अझ भरपर्दो recorded server transcription मध्ये उपलब्ध विकल्प छान्न सकिन्छ।"
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
              disabled={dictation.processing}
            >
              <strong>नेपाली</strong>
              <small>नेपाली बोली → नेपाली पाठ</small>
            </button>
            <button
              type="button"
              className={language === "en-US" ? "is-active" : ""}
              aria-pressed={language === "en-US"}
              onClick={() => chooseLanguage("en-US")}
              disabled={dictation.processing}
            >
              <strong>English</strong>
              <small>English speech → English text</small>
            </button>
          </div>
        </div>

        {(dictation.browserAvailable || dictation.serverAvailable) ? (
          <div className="voice-engine-panel">
            <div>
              <span className="tool-badge">पहिचान विधि · Recognition mode</span>
              <p className="tool-muted">Live mode तुरुन्तै लेख्छ। Server mode ले बोल्दै गर्दा प्रत्येक छोटो recording को पाठ तयार गर्छ।</p>
            </div>
            <div className="voice-engine-picker" role="group" aria-label="Voice recognition engine">
              {dictation.browserAvailable ? (
                <button
                  type="button"
                  className={dictation.mode === "browser" ? "is-active" : ""}
                  aria-pressed={dictation.mode === "browser"}
                  onClick={() => dictation.selectMode("browser")}
                  disabled={dictation.listening || dictation.processing}
                >
                  <strong>⚡ Live</strong>
                  <small>Browser recognition</small>
                </button>
              ) : null}
              {dictation.serverAvailable ? (
                <button
                  type="button"
                  className={dictation.mode === "server" ? "is-active" : ""}
                  aria-pressed={dictation.mode === "server"}
                  onClick={() => dictation.selectMode("server")}
                  disabled={dictation.listening || dictation.processing}
                >
                  <strong>🎯 Accurate</strong>
                  <small>Server transcription</small>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {dictation.mode === "server" && (dictation.listening || dictation.processing || dictation.progress.completed > 0) ? (
          <span className="tool-badge" role="status" aria-live="polite">
            {dictation.progress.elapsedSeconds}s · {dictation.progress.completed} {language === "ne-NP" ? "खण्ड तयार" : "chunks ready"} · {dictation.progress.pending} {language === "ne-NP" ? "प्रतीक्षामा" : "pending"}
          </span>
        ) : null}
        <div className="voice-capture-panel">
          <div className="voice-capture-status">
            <span className="tool-badge" aria-live="polite">{modeText}</span>
            <p>{meta.punctuation}</p>
            {dictation.mode === "server" ? (
              <p className="tool-muted">हरेक 12 सेकेन्डमा recording transcription का लागि पठाइन्छ। Stop थिच्दा बाँकी आवाज पनि पठाइन्छ।</p>
            ) : null}
          </div>
          {!dictation.listening ? (
            <button
              type="button"
              className="tool-primary-button voice-record-button"
              onClick={() => void dictation.start()}
              disabled={dictation.mode === "unsupported" || dictation.processing}
              aria-busy={dictation.processing}
            >
              {dictation.processing
                ? (language === "ne-NP" ? "⏳ पाठ तयार हुँदैछ…" : "⏳ Transcribing…")
                : dictation.mode === "server"
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
          <button type="button" className="tool-link-button" onClick={clearTranscript} disabled={dictation.processing || (!text && !dictation.listening)}>
            खाली गर्नुहोस् · Clear
          </button>
          {language === "ne-NP" ? <a className="tool-link-button" href="/tools/spell-check" onClick={()=>{try{sessionStorage.setItem("patro.language.handoff",text)}catch{}}}>नेपाली हिज्जे जाँच →</a> : null}
        </div>
      </section>

      <ToolResult title={language === "ne-NP" ? "टाइप भएको पाठ" : "English transcript"} speechText={text}>
        <p className="tool-preview" lang={language === "ne-NP" ? "ne" : "en"}>{text || meta.empty}</p>
        <p className="tool-muted">
          Live mode मा Patro ले audio संग्रह गर्दैन। Server transcription प्रयोग हुँदा छोटो recording transcription का लागि मात्र पठाइन्छ; Patro ले recording संग्रह गर्दैन।
        </p>
      </ToolResult>
    </ToolPage>
  );
}
