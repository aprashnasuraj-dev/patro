import { useState } from "react";
import { useNepaliDictation } from "@/patro-tools/language/react/useNepaliDictation";
import { ToolPage, ToolResult } from "./ToolPrimitives";

export function VoiceTypingTool() {
  const [text, setText] = useState("");
  const dictation = useNepaliDictation({
    serverFallback: false,
    onFinal: (chunk) => setText((current) => current + chunk),
  });

  return (
    <ToolPage title="आवाजबाट नेपाली टाइपिङ" description="Chrome/Edge को Nepali speech recognition प्रयोग गरेर बोलाइलाई Unicode नेपाली पाठमा बदल्नुहोस्। Mero Patro ले audio upload गर्दैन।">
      <section className="patro-tool-card">
        <div className="tool-action-row">
          <span className="tool-badge">{dictation.mode === "browser" ? "Browser speech · ne-NP" : "यो browser मा उपलब्ध छैन"}</span>
          {!dictation.listening
            ? <button type="button" className="tool-primary-button" onClick={dictation.start} disabled={dictation.mode !== "browser"}>🎙 बोल्न सुरु गर्नुहोस्</button>
            : <button type="button" className="tool-secondary-button" onClick={dictation.stop}>■ रोक्नुहोस्</button>}
        </div>
        {dictation.interim ? <p className="tool-interim">सुन्दैछ: {dictation.interim}</p> : null}
        {dictation.error ? <p className="tool-status" role="alert">{dictation.error}</p> : null}
        <label className="tool-block-label">Unicode नेपाली पाठ<textarea rows={11} value={text} onChange={(e) => setText(e.target.value)} placeholder="यहाँ बोलिएको पाठ आउँछ…" /></label>
        <div className="tool-action-row">
          <button type="button" className="tool-secondary-button" onClick={() => navigator.clipboard?.writeText(text)} disabled={!text}>कपी</button>
          <button type="button" className="tool-link-button" onClick={() => setText("")} disabled={!text}>खाली गर्नुहोस्</button>
          <a className="tool-link-button" href="/tools/spell-check">हिज्जे जाँच →</a>
        </div>
      </section>
      <ToolResult title="टाइप भएको पाठ" speechText={text}>
        <p className="tool-preview">{text || "अहिलेसम्म पाठ छैन।"}</p>
        <p className="tool-muted">Speech recognition browser/OS सेवा हुन सक्छ; audio Mero Patro Supabase मा पठाइँदैन। Paid Google/Azure fallback key नभएकाले UI मा देखाइएको छैन।</p>
      </ToolResult>
    </ToolPage>
  );
}
