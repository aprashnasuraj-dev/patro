import { useEffect, useState } from "react";
import { useNepaliOcr } from "@/patro-tools/language/react/useNepaliOcr";
import { ToolPage, ToolResult } from "./ToolPrimitives";

export function OcrTool() {
  const ocr = useNepaliOcr();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => () => { void ocr.dispose(); }, [ocr.dispose]);

  async function recognize() {
    if (!file) return;
    setStatus("तस्बिर preprocessing र OCR हुँदैछ…");
    try {
      const result = await ocr.recognize(file, { langs: "nep+eng" });
      setText(result.text);
      setConfidence(result.confidence);
      setStatus("OCR पूरा भयो।");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "OCR गर्न सकिएन।");
    }
  }

  return (
    <ToolPage title="आफ्नै नेपाली OCR" description="तस्बिरबाट नेपाली/अंग्रेजी Unicode पाठ निकाल्नुहोस्। Tesseract केवल OCR सुरु गर्दा dynamic import हुन्छ; फोटो server मा upload हुँदैन।">
      <section className="patro-tool-card">
        <label className="tool-block-label">तस्बिर छान्नुहोस्<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        {file ? <p className="tool-muted">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p> : null}
        <div className="tool-action-row">
          <button type="button" className="tool-primary-button" onClick={recognize} disabled={!file || ocr.busy}>{ocr.busy ? "OCR हुँदैछ…" : "OCR सुरु गर्नुहोस्"}</button>
          {ocr.busy ? <span className="tool-badge">{Math.round(ocr.progress * 100)}%</span> : null}
        </div>
        {status ? <p className="tool-status" role="status">{status}</p> : null}
      </section>
      <ToolResult title="आफ्नै OCR नतिजा" speechText={text}>
        <label className="tool-block-label">निकालिएको पाठ<textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <div className="tool-action-row">
          {confidence != null ? <span className="tool-badge">Confidence {confidence.toFixed(0)}%</span> : null}
          <button type="button" className="tool-secondary-button" onClick={() => navigator.clipboard?.writeText(text)} disabled={!text}>कपी</button>
          <a className="tool-link-button" href="/tools/spell-check">आफ्नै हिज्जे जाँच →</a>
          <a className="tool-link-button" href="/tools/preeti-converter">आफ्नै Preeti →</a>
        </div>
        <p className="tool-muted">साना/छायाँ परेको फोटोमा OCR त्रुटि हुन सक्छ। फोटो browser भित्रै preprocess र recognize हुन्छ।</p>
      </ToolResult>
    </ToolPage>
  );
}
