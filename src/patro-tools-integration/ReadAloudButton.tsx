import { useEffect, useMemo, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { splitForSpeech } from "@/patro-tools/language/react/useNepaliSpeech";

type Props = {
  text?: string;
  getText?: () => string;
  label?: string;
  className?: string;
};

function preferredVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === "ne-NP") ||
    voices.find((voice) => voice.lang.startsWith("ne")) ||
    voices.find((voice) => voice.lang === "hi-IN") ||
    voices.find((voice) => voice.lang.startsWith("hi")) ||
    voices[0] ||
    null
  );
}

export function ReadAloudButton({ text = "", getText, label = "सुन्नुहोस्", className = "tool-read-button" }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [voiceTick, setVoiceTick] = useState(0);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voice = useMemo(() => (supported ? preferredVoice() : null), [supported, voiceTick]);

  useEffect(() => {
    if (!supported) return;
    const changed = () => setVoiceTick((value) => value + 1);
    window.speechSynthesis.addEventListener("voiceschanged", changed);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", changed);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  function play() {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const value = (getText?.() || text).replace(/\s+/g, " ").trim();
    if (!value) return;
    window.speechSynthesis.cancel();
    const chunks = splitForSpeech(value);
    setSpeaking(true);
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = voice?.lang || "ne-NP";
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      if (index === chunks.length - 1) {
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
      }
      window.speechSynthesis.speak(utterance);
    });
  }

  return (
    <button type="button" className={className} onClick={play} disabled={!supported} aria-pressed={speaking}>
      {speaking ? <><Square size={16} /> रोक्नुहोस्</> : <><Volume2 size={17} /> {label}</>}
    </button>
  );
}
