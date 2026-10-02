import { useMemo, useState } from "react";
import { compareNames } from "@/patro-tools/language/name-match";
import { readLife, syncLifeTools, updateLife, type StoredNameCheck } from "./storage";
import { ToolPage, ToolResult } from "./ToolPrimitives";

export function NameCheckTool() {
  const life = readLife();
  const docTitles = life.docs.map((row) => String(row.title || row.type || "")).filter(Boolean);
  const [documentA, setDocumentA] = useState(docTitles[0] || "नागरिकता");
  const [documentB, setDocumentB] = useState(docTitles[1] || "राहदानी");
  const [nameA, setNameA] = useState("सुरज दाहाल");
  const [nameB, setNameB] = useState("Suraj Dahal");
  const [status, setStatus] = useState("");
  const [saving,setSaving]=useState(false);
  const result = useMemo(() => compareNames(nameA.trim(), nameB.trim()), [nameA, nameB]);
  const canCompare=!!nameA.trim()&&!!nameB.trim();

  async function save() {
    if(!canCompare){setStatus("तुलना गर्न दुवै नाम लेख्नुहोस्।");return;}
    if(saving)return;setSaving(true);
    const row: StoredNameCheck = { id: crypto.randomUUID(), documentA:documentA.trim()||"कागजात A", nameA:nameA.trim(), documentB:documentB.trim()||"कागजात B", nameB:nameB.trim(), updatedAt: Date.now() };
    const saved=updateLife((current) => ({ ...current, nameChecks: [...current.nameChecks, row] }));
    setStatus("जाँच सेट स्थानीय रूपमा सुरक्षित भयो। Cloud sync जाँचिँदैछ…");
    try{const synced = await syncLifeTools();setStatus(synced.synced ? "जाँच सेट निजी Google sync सहित सुरक्षित भयो।" : "जाँच सेट स्थानीय रूपमा सुरक्षित भयो। Google login भएमा sync हुन्छ।");}
    catch{setStatus(saved.nameChecks.length?"जाँच सेट स्थानीय रूपमा सुरक्षित भयो। Cloud sync अहिले उपलब्ध छैन।":"जाँच सुरक्षित गर्न सकिएन।");}
    finally{setSaving(false)}
  }

  return (
    <ToolPage title="आफ्नै नाम जाँच" description="नागरिकता, राहदानी, प्रमाणपत्र वा KYC मा रहेको नेपाली/अंग्रेजी नामको उच्चारण र हिज्जे तुलना गर्नुहोस्।">
      <section className="patro-tool-card">
        <datalist id="patro-doc-titles">{docTitles.map((title) => <option value={title} key={title} />)}</datalist>
        <div className="tool-form-grid">
          <label>कागजात A<input list="patro-doc-titles" value={documentA} maxLength={80} onChange={(e) => setDocumentA(e.target.value)} /></label>
          <label>कागजात B<input list="patro-doc-titles" value={documentB} maxLength={80} onChange={(e) => setDocumentB(e.target.value)} /></label>
          <label>नाम A<input value={nameA} maxLength={160} onChange={(e) => setNameA(e.target.value)} /></label>
          <label>नाम B<input value={nameB} maxLength={160} onChange={(e) => setNameB(e.target.value)} /></label>
        </div>
        <button type="button" className="tool-secondary-button" onClick={()=>void save()} disabled={!canCompare||saving}>{saving?"सुरक्षित हुँदैछ…":"यो जाँच सुरक्षित गर्नुहोस्"}</button>
        {status ? <p className="tool-status" role="status">{status}</p> : null}
      </section>
      <ToolResult title="आफ्नै कागजात नाम तुलना" speechText={canCompare?result.message:"दुवै नाम लेख्नुहोस्।"}>
        {canCompare?<><div className={"tool-verdict verdict-" + result.verdict}><strong>{result.message}</strong><small>{documentA||"कागजात A"} ↔ {documentB||"कागजात B"}</small></div><div className="tool-token-grid">{result.details.map((detail, index) => <div key={index}><span>{detail.tokenA || "—"}</span><b>↔</b><span>{detail.tokenB || "—"}</span><em>{detail.verdict}</em></div>)}</div></>:<p className="tool-muted">दुवै कागजातमा भएको नाम लेखेपछि तुलना देखिन्छ।</p>}
        <p className="tool-muted">यो सहायक transliteration/हिज्जे जाँच हो; सरकारी कागजात सुधार, भिसा वा KYC निर्णयको आधिकारिक प्रमाण होइन। नक्षत्रअनुसार नामका लागि “बेबी नेम” उपकरण प्रयोग गर्नुहोस्।</p>
        <a className="tool-link-button" href="/tools/baby-names">नक्षत्रअनुसार नाम →</a>
      </ToolResult>
    </ToolPage>
  );
}
