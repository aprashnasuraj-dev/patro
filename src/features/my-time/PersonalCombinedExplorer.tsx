import { useMemo, useState } from "react";
import { l } from "../../useUiLanguage";
import { intersectWindows, type TimedWindow } from "./temporal-overlap";

type Window = TimedWindow & { key: string; score: number; label: string; confidence: string; reasons: string[]; cautions: string[]; missing: string[]; components: Array<{ key:string; score:number; weight:number; explanation:string }> };
type Props = { language:"ne"|"en"; timezone:string; windows:Window[]; selectedInstant:Date; onSelect:(instant:Date)=>void; };
function clock(iso:string,tz:string,lang:"ne"|"en") { return new Intl.DateTimeFormat(lang==="ne"?"ne-NP":"en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(iso)); }
export default function PersonalCombinedExplorer({language,timezone,windows,selectedInstant,onSelect}:Props) {
  const [first,setFirst]=useState(""); const [second,setSecond]=useState("");
  const [view,setView]=useState<"personal"|"combined">("combined");
  const ordered=useMemo(()=>[...windows].sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)),[windows]);
  const a=ordered.find(w=>w.key===first)||ordered[0]; const b=ordered.find(w=>w.key===second&&w.key!==a?.key)||ordered.find(w=>w.key!==a?.key);
  const selected=ordered.find(w=>Date.parse(w.start)<=selectedInstant.getTime()&&selectedInstant.getTime()<Date.parse(w.end));
  const intersection=a&&b?intersectWindows(a,b):null;
  return <section className="mt-panel" aria-label={l(language,"व्यक्तिगत र संयुक्त समय अन्वेषक","Personal and combined time explorer")} style={{padding:"clamp(16px,3vw,30px)",marginBlock:20}}>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"space-between",alignItems:"center"}}>
      <div><span className="mt-section-kicker">{l(language,"एकै क्षण · विभिन्न तह","ONE INSTANT · MULTIPLE LAYERS")}</span><h2>{l(language,"व्यक्तिगत र बहुआयामिक समय","Personal & Multidimensional Time")}</h2></div>
      <div role="group" aria-label={l(language,"दृश्य","View")} style={{display:"flex",gap:8}}>
        <button type="button" className={view==="personal"?"mt-primary":"mt-secondary"} aria-pressed={view==="personal"} onClick={()=>setView("personal")}>{l(language,"व्यक्तिगत","Personal")}</button>
        <button type="button" className={view==="combined"?"mt-primary":"mt-secondary"} aria-pressed={view==="combined"} onClick={()=>setView("combined")}>{l(language,"संयुक्त","Combined")}</button>
      </div>
    </div>
    <p>{l(language,"छानिएको समयका सबै सूचक एउटै UTC क्षणमा आधारित छन्। यी परम्परागत व्याख्या हुन्, परिणामको सम्भाव्यता होइनन्।","All displayed timing signals refer to one selected UTC instant. Traditional scores are interpretive rankings, not probabilities of outcomes.")}</p>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBlock:14}}>
      <label>{l(language,"समय छान्नुहोस्","Select window")} <select value={a?.key||""} onChange={e=>{setFirst(e.target.value); const w=ordered.find(x=>x.key===e.target.value);if(w)onSelect(new Date(w.start));}}>{ordered.map(w=><option key={w.key} value={w.key}>{clock(w.start,timezone,language)}–{clock(w.end,timezone,language)} · {w.score}/100</option>)}</select></label>
      <button type="button" className="mt-secondary" onClick={()=>onSelect(new Date())}>{l(language,"अहिले","Live now")}</button>
      <strong aria-live="polite">{selected?l(language,"सक्रिय झ्याल: ","Active window: ")+selected.score+"/100":l(language,"यस क्षणमा छानिएको झ्याल छैन","No listed window covers this instant")}</strong>
    </div>
    {a?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:12}}>
      <article style={{border:"1px solid var(--border-color, #65717b)",borderRadius:12,padding:15}}>
        <small>{l(language,"समय A","Window A")}</small><h3>{clock(a.start,timezone,language)}–{clock(a.end,timezone,language)}</h3><strong>{a.score}/100 · {a.confidence}</strong>
        <ul>{a.components.map(c=><li key={c.key}><b>{c.key}: {c.score}/100</b> ({c.weight}) — {c.explanation}</li>)}</ul>
        {!!a.missing.length&&<p>{l(language,"उपलब्ध नभएका सङ्केत: ","Missing signals: ")}{a.missing.join(", ")}</p>}
        {!!a.cautions.length&&<p>{a.cautions.join(" · ")}</p>}
      </article>
      {view==="personal"&&b?<article style={{border:"1px solid var(--border-color, #65717b)",borderRadius:12,padding:15}}>
        <label>{l(language,"समय B","Window B")} <select value={b.key} onChange={e=>setSecond(e.target.value)}>{ordered.filter(w=>w.key!==a.key).map(w=><option key={w.key} value={w.key}>{clock(w.start,timezone,language)}–{clock(w.end,timezone,language)}</option>)}</select></label>
        <h3>{clock(b.start,timezone,language)}–{clock(b.end,timezone,language)}</h3><strong>{b.score}/100 · {b.confidence}</strong>
        <p>{l(language,"स्कोर भिन्नता: ","Score difference: ")}{a.score-b.score>0?"+":""}{a.score-b.score}</p>
        <ul>{b.components.map(c=><li key={c.key}><b>{c.key}: {c.score}/100</b> ({c.weight}) — {c.explanation}</li>)}</ul>
        {!!b.missing.length&&<p>{l(language,"उपलब्ध नभएका सङ्केत: ","Missing signals: ")}{b.missing.join(", ")}</p>}
      </article>:null}
      {view==="combined"?<article style={{border:"1px solid var(--border-color, #65717b)",borderRadius:12,padding:15}}>
        <small>{l(language,"तहहरूको सम्बन्ध","Layer relationship")}</small><h3>{l(language,"छानिएको क्षण","Selected instant")}</h3>
        <p>{new Intl.DateTimeFormat(language==="ne"?"ne-NP":"en-US",{timeZone:timezone,dateStyle:"medium",timeStyle:"medium"}).format(selectedInstant)}</p>
        <p>{selected?selected.reasons.join(" · "):l(language,"कुनै सूचीकृत समय झ्यालसँग मेल खाएन।","No listed window intersects the selected instant.")}</p>
        {selected?.cautions.length?<p>{selected.cautions.join(" · ")}</p>:null}
        <p>{l(language,"तह परिवर्तनको तुलनाका लागि समय A र B प्रयोग गर्नुहोस्।","Compare two windows to reveal their interval intersection.")}</p>
        {b&&<button type="button" className="mt-secondary" onClick={()=>setView("personal")}>{l(language,"दुई समय तुलना","Compare two windows")}</button>}
      </article>:null}
    </div>:<p role="status">{l(language,"यस मिति वा स्थानका लागि समय झ्याल उपलब्ध छैन।","No timing windows are available for this date or location.")}</p>}
    {view==="personal"&&a&&b?<p role="status">{intersection?l(language,"समयहरू ओभरल्याप: ","Windows overlap: ")+clock(intersection.start,timezone,language)+"–"+clock(intersection.end,timezone,language):l(language,"दुई समय झ्याल आपसमा ओभरल्याप गर्दैनन्।","The two windows do not overlap.")}</p>:null}
  </section>;
}
