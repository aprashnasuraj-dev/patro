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
    if(!next.type.startsWith("image/")){setFile(null);setStatus("कृपया फोटो/तस्बिर फाइल छान्नुहोस्।");return;}
    if(next.size>MAX_IMAGE_BYTES){setFile(null);setStatus("तस्बिर 16 MB भन्दा सानो हुनुपर्छ।");return;}
    setFile(next);setStatus("तस्बिर तयार छ। OCR सुरु गर्नुहोस्।");
  }

  async function recognize() {
    if (!file) return;
    setStatus("तस्बिर preprocessing र OCR हुँदैछ…");
    try {
      const result = await ocr.recognize(file, { langs: "nep+eng" });
      setText(result.text);
      setConfidence(result.confidence);
      setStatus(result.text.trim()?"OCR पूरा भयो। नतिजा तल सम्पादन, कपी वा export गर्न सक्नुहुन्छ।":"OCR पूरा भयो तर पढ्न मिल्ने पाठ भेटिएन। स्पष्ट/सीधा फोटो पुनः प्रयास गर्नुहोस्।");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "OCR गर्न सकिएन।");
    }
  }

  async function copyText(){
    if(!text)return;
    try{await navigator.clipboard.writeText(text);setStatus("OCR पाठ clipboard मा कपी भयो।");}
    catch{setStatus("Clipboard अनुमति उपलब्ध छैन। पाठ चयन गरेर कपी गर्नुहोस्।");}
  }
  function downloadText(){
    if(!text)return;
    const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="aafnai-patro-ocr.txt";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);setStatus("OCR पाठ .txt फाइलमा तयार भयो।");
  }

  return (
    <ToolPage title="आफ्नै नेपाली OCR" description="तस्बिरबाट नेपाली/अंग्रेजी Unicode पाठ निकाल्नुहोस्। Tesseract केवल OCR सुरु गर्दा dynamic import हुन्छ; फोटो server मा upload हुँदैन।">
      <section className="patro-tool-card">
        <label className="tool-block-label">तस्बिर छान्नुहोस्<input type="file" accept="image/*" capture="environment" onChange={(e) => chooseFile(e.target.files?.[0] || null)} /></label>
        {file ? <p className="tool-muted">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB · browser भित्रै OCR</p> : null}
        {preview?<figure className="ocr-local-preview"><img src={preview} alt="OCR का लागि छानिएको तस्बिर"/><figcaption>OCR अघि स्थानीय preview · यो फोटो upload हुँदैन</figcaption></figure>:null}
        <div className="tool-action-row">
          <button type="button" className="tool-primary-button" onClick={recognize} disabled={!file || ocr.busy}>{ocr.busy ? "OCR हुँदैछ…" : "OCR सुरु गर्नुहोस्"}</button>
          {ocr.busy ? <span className="tool-badge" aria-live="polite">{Math.round(ocr.progress * 100)}%</span> : null}
          {file&&!ocr.busy?<button type="button" className="tool-secondary-button" onClick={()=>chooseFile(null)}>तस्बिर हटाउनुहोस्</button>:null}
        </div>
        {status ? <p className="tool-status" role="status">{status}</p> : null}
      </section>
      <ToolResult title="आफ्नै OCR नतिजा" speechText={text}>
        <label className="tool-block-label">निकालिएको पाठ<textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="OCR नतिजा यहाँ देखिन्छ र सम्पादन गर्न सकिन्छ।" /></label>
        <div className="tool-action-row">
          {confidence != null ? <span className="tool-badge">Confidence {confidence.toFixed(0)}%</span> : null}
          <button type="button" className="tool-secondary-button" onClick={()=>void copyText()} disabled={!text}>कपी</button>
          <button type="button" className="tool-secondary-button" onClick={downloadText} disabled={!text}>TXT export</button>
          <a className="tool-link-button" href="/tools/spell-check">आफ्नै हिज्जे जाँच →</a>
          <a className="tool-link-button" href="/tools/preeti-converter">आफ्नै Preeti →</a>
        </div>
        <p className="tool-muted">साना/छायाँ परेको फोटोमा OCR त्रुटि हुन सक्छ। सीधा, उच्च contrast र पर्याप्त resolution भएको फोटोले राम्रो नतिजा दिन्छ।</p>
      </ToolResult>
    </ToolPage>
  );
}
