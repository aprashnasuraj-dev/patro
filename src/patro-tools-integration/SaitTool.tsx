import { useState } from "react";
import { findSait, type SaitResult } from "@/patro-tools/sait/finder";
import type { SaitKind } from "@/patro-tools/sait/rules";
import { primePanchangRange, panchangProvider } from "./panchangAdapter";
import { SAIT_LABELS, SAIT_NOTICE } from "./data/sait-config";
import { ToolPage, ToolResult } from "./ToolPrimitives";

type OfficialRow = {
  fact_date: string;
  key: string;
  value?: { label_ne?: string; label_en?: string; start_local?: string };
  source_title?: string;
  source_url?: string;
};

const MAX_RANGE_DAYS=180;
function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function plusDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function rangeDays(from:string,to:string){
  const a=Date.parse(from+"T00:00:00Z"),b=Date.parse(to+"T00:00:00Z");
  return Number.isFinite(a)&&Number.isFinite(b)?Math.floor((b-a)/86400000):NaN;
}

export function SaitTool() {
  const today = todayNepal();
  const [kind, setKind] = useState<SaitKind>("vivah");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(plusDays(today, 30));
  const [rows, setRows] = useState<SaitResult[]>([]);
  const [official, setOfficial] = useState<OfficialRow[]>([]);
  const [status, setStatus] = useState("");
  const [busy,setBusy]=useState(false);

  function preset(days:number){setFrom(today);setTo(plusDays(today,days));setStatus(`${days} दिनको खोज अवधि तयार भयो।`)}

  async function search() {
    const span=rangeDays(from,to);
    if(!Number.isFinite(span)){setStatus("सही सुरु र अन्तिम मिति छान्नुहोस्।");return;}
    if(span<0){setStatus("अन्तिम मिति सुरु मितिभन्दा अगाडि हुन सक्दैन।");return;}
    if(span>MAX_RANGE_DAYS){setStatus(`एक पटकमा बढीमा ${MAX_RANGE_DAYS} दिन खोज्नुहोस्। यसले पञ्चाङ्ग गणना छिटो र स्थिर राख्छ।`);return;}
    setBusy(true);setStatus(`पञ्चाङ्ग र आधिकारिक सूची जाँचिँदैछ… (${span+1} दिन)`);
    try {
      const q = new URLSearchParams({ kind, from, to });
      const [officialResponse] = await Promise.all([
        fetch("/api/v1/tools/official-sait?" + q.toString(), { headers: { Accept: "application/json" } }),
        primePanchangRange(from, to),
      ]);
      const payload = await officialResponse.json() as { official?: OfficialRow[]; error?: string };
      const off = officialResponse.ok ? (payload.official || []) : [];
      setOfficial(off);
      const results = findSait({ kind, from, to, provider: panchangProvider, officialDates: off.map((x) => x.fact_date) });
      setRows(results);
      setStatus(results.length || off.length ? `${off.length} आधिकारिक र ${results.filter(x=>!x.official).length} सम्भावित नतिजा तयार भयो।` : "यो अवधिमा मिल्ने साइत भेटिएन।");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "साइत निकाल्न सकिएन।");
    } finally {setBusy(false);}
  }

  const computed = rows.filter((x) => !x.official);
  const speech = [
    ...official.map((x) => "आधिकारिक " + (x.value?.label_ne || SAIT_LABELS[kind]) + " " + x.fact_date),
    ...computed.slice(0, 5).map((x) => "सम्भावित " + SAIT_LABELS[kind] + " " + x.date),
  ].join("। ");

  return (
    <ToolPage title="आफ्नै साइत" description={SAIT_NOTICE}>
      <section className="patro-tool-card">
        <div className="tool-form-grid">
          <label>कार्य<select value={kind} onChange={(e) => setKind(e.target.value as SaitKind)}>{Object.entries(SAIT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>देखि<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>सम्म<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="tool-action-row" aria-label="छिटो अवधि">
          {[7,30,90,180].map(days=><button key={days} type="button" className="tool-link-button" onClick={()=>preset(days)}>{days} दिन</button>)}
        </div>
        <button type="button" className="tool-primary-button" onClick={()=>void search()} disabled={busy}>{busy?"साइत खोजिँदैछ…":"आफ्नै साइत खोज्नुहोस्"}</button>
        {status ? <p className="tool-status" role="status">{status}</p> : null}
      </section>

      <ToolResult title="आफ्नै साइत नतिजा" speechText={speech}>
        {official.length > 0 ? (
          <section>
            <h3>आधिकारिक</h3>
            <div className="tool-event-list">{official.map((row, index) => (
              <article className="tool-event" key={row.key + "-" + index}>
                <div><span className="tool-badge">आधिकारिक</span><strong>{row.value?.label_ne || SAIT_LABELS[kind]}</strong><small>{row.fact_date}{row.value?.start_local ? " · " + row.value.start_local.slice(11) : ""}</small></div>
                <div><small>{row.source_title || "Official source"}</small>{row.source_url ? <a href={row.source_url} target="_blank" rel="noreferrer">स्रोत</a> : null}</div>
              </article>
            ))}</div>
          </section>
        ) : <p className="tool-muted">चयन गरिएको काम/अवधिका लागि आधिकारिक सूची डेटा उपलब्ध छैन।</p>}

        <section>
          <h3>सम्भावित · गणनात्मक</h3>
          <div className="tool-event-list">{computed.slice(0, 12).map((row) => (
            <article className="tool-event" key={row.date}>
              <div><span className="tool-badge">सम्भावित</span><strong>{row.date}</strong><small>{row.weekday} · {row.lunar}</small></div>
              <div><span>{row.nakshatra} · {row.yoga}</span><small>{row.reasons.slice(0, 3).join(" · ")}</small>{row.warnings.length ? <small>सावधानी: {row.warnings.slice(0, 2).join(" · ")}</small> : null}</div>
            </article>
          ))}</div>
        </section>
        <p className="tool-muted">{SAIT_NOTICE}</p>
      </ToolResult>
    </ToolPage>
  );
}
