import {useEffect,useState} from "react";
import guides from "../../seo/guides.json";
import "./growth.css";
const QUICK=[{path:"/today",label:"आजको नेपाली मिति"},{path:"/convert",label:"मिति रूपान्तरण"},{path:"/tools/nepali-typing",label:"नेपाली टाइपिङ"},{path:"/tools/preeti-converter",label:"Preeti ↔ Unicode"},{path:"/rashifal",label:"आजको राशिफल"},{path:"/festivals",label:"चाडपर्व"}];
const KEY="aafnai.shortcuts.v1";
const allowed=new Set([...QUICK.map(row=>row.path),...guides.map(row=>row.tool)]);
function savedPaths():string[]{try{const value=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(value)?value.filter((p):p is string=>typeof p==="string"&&allowed.has(p)).slice(0,6):[]}catch{return []}}
export function DiscoveryPanel({path}:{path:string}){
  const[saved,setSaved]=useState<string[]>(savedPaths);const[message,setMessage]=useState("");
  useEffect(()=>{setMessage("")},[path]);
  const publicPath=allowed.has(path)||path==="/"||path==="/guides"||guides.some(row=>path==="/guides/"+row.slug);
  if(!publicPath)return null;
  const guide=guides.find(row=>row.tool===path);
  const save=()=>{const next=saved.includes(path)?saved.filter(p=>p!==path):[path,...saved].slice(0,6);try{localStorage.setItem(KEY,JSON.stringify(next));setSaved(next);setMessage("यो उपकरणमा सुरक्षित भयो।")}catch{setMessage("Browser मा सुरक्षित गर्न सकिएन।")}};
  const share=async()=>{
    // Share only a public canonical path; never form values, birth details or query strings.
    const url=new URL(path,"https://aafnaipatro.com");url.searchParams.set("utm_source","share");url.searchParams.set("utm_medium","referral");url.searchParams.set("utm_campaign","useful_tools");
    try{if(navigator.share){await navigator.share({title:document.title,url:url.href});setMessage("साझा भयो।")}else{await navigator.clipboard.writeText(url.href);setMessage("लिङ्क कपी भयो।")}}catch(error){if(!(error instanceof DOMException&&error.name==="AbortError"))setMessage("लिङ्क कपी गर्न browser अनुमति जाँच्नुहोस्।")}
  };
  const links=[...QUICK,...guides.map(row=>({path:row.tool,label:row.toolLabel}))];
  return <aside className="ap-discovery" aria-label="उपयोगी उपकरण र निर्देशिका"><h2>फेरि काम लाग्ने उपकरण</h2>
    <nav aria-label="छिटो खोल्नुहोस्">{QUICK.filter(row=>row.path!==path).map(row=><a key={row.path} href={row.path}>{row.label}</a>)}</nav>
    {saved.length?<div><h3>तपाईंका सुरक्षित उपकरण</h3><nav>{saved.map(p=><a key={p} href={p}>{links.find(row=>row.path===p)?.label||p}</a>)}</nav></div>:null}
    <div className="ap-growth-actions"><button type="button" onClick={share}>लिङ्क साझा गर्नुहोस्</button>{allowed.has(path)?<button type="button" onClick={save}>{saved.includes(path)?"सुरक्षितबाट हटाउनुहोस्":"यो उपकरण सुरक्षित गर्नुहोस्"}</button>:null}<a href={guide?"/guides/"+guide.slug:"/guides"}>{guide?"प्रयोग गर्ने तरिका":"प्रयोग निर्देशिका"}</a></div><p role="status" aria-live="polite">{message}</p>
  </aside>;
}
