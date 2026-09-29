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
  const result = useMemo(() => compareNames(nameA, nameB), [nameA, nameB]);

  async function save() {
    const row: StoredNameCheck = { id: crypto.randomUUID(), documentA, nameA, documentB, nameB, updatedAt: Date.now() };
    updateLife((current) => ({ ...current, nameChecks: [...current.nameChecks, row] }));
    const synced = await syncLifeTools();
    setStatus(synced.synced ? "जाँच सेट निजी Google sync सहित सुरक्षित भयो।" : "यो उपकरणमा स्थानीय रूपमा सुरक्षित भयो।");
  }

  return (
    <ToolPage title="कागजात नाम जाँच" description="नागरिकता, राहदानी, प्रमाणपत्र वा KYC मा रहेको नेपाली/अंग्रेजी नामको उच्चारण र हिज्जे तुलना गर्नुहोस्।">
      <section className="patro-tool-card">
        <datalist id="patro-doc-titles">{docTitles.map((title) => <option value={title} key={title} />)}</datalist>
        <div className="tool-form-grid">
          <label>कागजात A<input list="patro-doc-titles" value={documentA} onChange={(e) => setDocumentA(e.target.value)} /></label>
          <label>कागजात B<input list="patro-doc-titles" value={documentB} onChange={(e) => setDocumentB(e.target.value)} /></label>
          <label>नाम A<input value={nameA} onChange={(e) => setNameA(e.target.value)} /></label>
          <label>नाम B<input value={nameB} onChange={(e) => setNameB(e.target.value)} /></label>
        </div>
        <button type="button" className="tool-secondary-button" onClick={save}>यो जाँच सुरक्षित गर्नुहोस्</button>
        {status ? <p className="tool-status">{status}</p> : null}
      </section>
      <ToolResult title="तुलना" speechText={result.message}>
        <div className={"tool-verdict verdict-" + result.verdict}><strong>{result.message}</strong><small>{documentA} ↔ {documentB}</small></div>
        <div className="tool-token-grid">{result.details.map((detail, index) => <div key={index}><span>{detail.tokenA || "—"}</span><b>↔</b><span>{detail.tokenB || "—"}</span><em>{detail.verdict}</em></div>)}</div>
        <p className="tool-muted">यो सहायक जाँच हो; सरकारी कागजात सुधार, भिसा वा KYC निर्णयको आधिकारिक प्रमाण होइन।</p>
      </ToolResult>
    </ToolPage>
  );
}
