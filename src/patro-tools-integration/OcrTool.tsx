import { useEffect, useState } from "react";
import { useNepaliOcr } from "@/patro-tools/language/react/useNepaliOcr";
import { ToolPage, ToolResult } from "./ToolPrimitives";

const MAX_IMAGE_BYTES=16*1024*1024;

export function OcrTool() {
  const ocr = useNepaliOcr();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => () => { void ocr.dispose(); }, [ocr.dispose]);
  useEffect(()=>{
    if(!file){setPreview("");return;}
    const url=URL.createObjectURL(file);setPreview(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);

  function chooseFile(next:File|null){
    setText("");setConfidence(null);
    if(!next){setFile(null);setStatus("");return;}
    if(!next.type.startsWith("image/")){setFile(null);setStatus("कृपया फोटो वा तस्बिर फाइल छान्नुहोस्।");return;}
    if(next.size>MAX_IMAGE_BYTES){setFile(null);setStatus("तस्बिर 16 MB भन्दा सानो हुनुपर्छ।");return;}
    setFile(next);setStatus("तस्बिर तयार छ। अक्षर पढ्न सुरु गर्नुहोस्।");
  }

  async function recognize() {
    if (!file) return;
    setStatus("तस्बिरबाट अक्षर पढिँदैछ…");
    try {
      const result = await ocr.recognize(file, { langs: "nep+eng" });
      setText(result.text);
      setConfidence(result.confidence);
      setStatus(result.text.trim()?"पाठ तयार भयो। तल सम्पादन, कपी वा सुरक्षित गर्न सक्नुहुन्छ।":"पढ्न मिल्ने पाठ भेटिएन। अझ स्पष्ट र सीधा फोटोबाट फेरि प्रयास गर्नुहोस्।");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "तस्बिरबाट पाठ निकाल्न सकिएन।");
    }
  }

  async function copyText(){
    if(!text)return;
    try{await navigator.clipboard.writeText(text);setStatus("पाठ कपी भयो।");}
    catch{setStatus("कपी गर्न अनुमति उपलब्ध छैन। पाठ चयन गरेर कपी गर्नुहोस्।");}
  }
  function downloadText(){
    if(!text)return;
    const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="aafnai-patro-ocr.txt";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);setStatus("पाठ .txt फाइलका रूपमा तयार भयो।");
  }

  return (
    <ToolPage title="नेपाली OCR · तस्बिरबाट पाठ" description="फोटो वा तस्बिरमा भएको नेपाली र English पाठ निकालेर तुरुन्तै सम्पादन गर्न मिल्ने बनाउनुहोस्। छानिएको फोटो तपाईंको उपकरणमै प्रशोधन हुन्छ।">
      <section className="patro-tool-card">
        <label className="tool-block-label">तस्बिर छान्नुहोस्<input type="file" accept="image/*" capture="environment" onChange={(e) => chooseFile(e.target.files?.[0] || null)} /></label>
        {file ? <p className="tool-muted">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p> : null}
        {preview?<figure className="ocr-local-preview"><img src={preview} alt="पाठ निकाल्न छानिएको तस्बिर"/><figcaption>छानिएको तस्बिरको झलक</figcaption></figure>:null}
        <div className="tool-action-row">
          <button type="button" className="tool-primary-button" onClick={recognize} disabled={!file || ocr.busy}>{ocr.busy ? "अक्षर पढिँदैछ…" : "पाठ निकाल्नुहोस्"}</button>
          {ocr.busy ? <span className="tool-badge" aria-live="polite">{Math.round(ocr.progress * 100)}%</span> : null}
          {file&&!ocr.busy?<button type="button" className="tool-secondary-button" onClick={()=>chooseFile(null)}>तस्बिर हटाउनुहोस्</button>:null}
        </div>
        {status ? <p className="tool-status" role="status">{status}</p> : null}
      </section>
      <ToolResult title="निकालिएको पाठ" speechText={text}>
        <label className="tool-block-label">पाठ<textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="तस्बिरबाट निकालिएको पाठ यहाँ देखिन्छ र सम्पादन गर्न सकिन्छ।" /></label>
        <div className="tool-action-row">
          {confidence != null ? <span className="tool-badge">पठन स्पष्टता {confidence.toFixed(0)}%</span> : null}
          <button type="button" className="tool-secondary-button" onClick={()=>void copyText()} disabled={!text}>कपी</button>
          <button type="button" className="tool-secondary-button" onClick={downloadText} disabled={!text}>TXT सुरक्षित गर्नुहोस्</button>
          <a className="tool-link-button" href="/tools/spell-check">हिज्जे जाँच →</a>
          <a className="tool-link-button" href="/tools/preeti-converter">Preeti रूपान्तरण →</a>
        </div>
        <p className="tool-muted">सीधा, उज्यालो र स्पष्ट तस्बिरबाट अक्षर अझ राम्रो पढिन्छ। निकालिएको पाठ औपचारिक प्रयोगअघि एकपटक जाँच्नुहोस्।</p>
      </ToolResult>
    </ToolPage>
  );
}
