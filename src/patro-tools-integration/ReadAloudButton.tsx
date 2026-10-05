import { Square, Volume2 } from "lucide-react";
import { useNepaliSpeech } from "@/patro-tools/language/react/useNepaliSpeech";

type Props = {
  text?: string;
  getText?: () => string;
  label?: string;
  className?: string;
  rate?: number;
};

export function ReadAloudButton({
  text = "",
  getText,
  label = "सुन्नुहोस्",
  className = "tool-read-button",
  rate = 0.9,
}: Props) {
  const speech = useNepaliSpeech();

  function play() {
    if (speech.speaking) {
      speech.stop();
      return;
    }
    const value = (getText?.() || text).trim();
    if (!value) return;
    speech.speak(value, { rate });
  }

  const disabled = !speech.supported || !(getText?.() || text).trim();
  const voiceHint = speech.voiceName
    ? `${speech.voiceName}${speech.voiceLanguage ? ` · ${speech.voiceLanguage}` : ""}`
    : "System voice";

  return (
    <button
      type="button"
      className={className}
      onClick={play}
      disabled={disabled}
      aria-pressed={speech.speaking}
      title={speech.error || voiceHint}
    >
      {speech.speaking ? <><Square size={16} /> रोक्नुहोस्</> : <><Volume2 size={17} /> {label}</>}
    </button>
  );
}
