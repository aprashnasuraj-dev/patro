import { useEffect, useMemo, useState } from "react";
import { BookOpen, FlaskConical, Image as ImageIcon, Search, Layers3 } from "lucide-react";
import "./aafnai-library.css";

type LibraryArticle={
  topic_id:string; priority:number; slug:string; title:string; sector:string; topic:string;
  tags?:string[]; dek?:string|null; quick_summary?:string[];
  canonical_url:string; research_url:string; blog_url:string;
  visual_count:number; source_count:number; claim_count:number;
};
type Catalog={
  release:string; name:string; article_count:number; snapshot_commit:string;
  sector_counts:Record<string,number>; topic_counts:Record<string,number>; articles:LibraryArticle[];
};
const INITIAL=48;

function n(v:number){return new Intl.NumberFormat("en-US").format(v)}
function matches(article:LibraryArticle,q:string){
  if(!q)return true;
  const hay=[article.title,article.sector,article.topic,...(article.tags||[]),article.dek||"",article.topic_id].join(" ").toLowerCase();
  return q.split(/\s+/).every(part=>hay.includes(part));
}

export default function AafnaiLibrary(){
  const[catalog,setCatalog]=useState<Catalog|null>(null);
  const[error,setError]=useState("");
  const[query,setQuery]=useState("");
  const[sector,setSector]=useState("all");
  const[topic,setTopic]=useState("all");
  const[visible,setVisible]=useState(INITIAL);

  useEffect(()=>{
    let active=true;
    fetch("/data/library/phase1/catalog.json",{headers:{"accept":"application/json"}})
      .then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()})
      .then(data=>{if(active)setCatalog(data)})
      .catch(()=>{if(active)setError("Phase 1 catalogue is being prepared and is not public yet.")});
    return()=>{active=false};
  },[]);

  const sectors=useMemo(()=>Object.entries(catalog?.sector_counts||{}).sort((a,b)=>b[1]-a[1]),[catalog]);
  const topics=useMemo(()=>{
    if(!catalog)return[] as string[];
    const set=new Set<string>();
    for(const a of catalog.articles)if(sector==="all"||a.sector===sector)set.add(a.topic);
    return [...set].sort((a,b)=>a.localeCompare(b));
  },[catalog,sector]);
  const filtered=useMemo(()=>{
    if(!catalog)return[] as LibraryArticle[];
    const q=query.trim().toLowerCase();
    return catalog.articles.filter(a=>(sector==="all"||a.sector===sector)&&(topic==="all"||a.topic===topic)&&matches(a,q));
  },[catalog,query,sector,topic]);
  const shown=filtered.slice(0,visible);

  useEffect(()=>setVisible(INITIAL),[query,sector,topic]);

  return <main className="library-page">
    <section className="library-hero" aria-labelledby="library-title">
      <div className="library-kicker">AAFNAI LIBRARY · आफ्नै लाइब्रेरी</div>
      <h1 id="library-title">A practical research library built for reading, checking and learning.</h1>
      <p>Phase 1 brings together source-backed explainers, calculators, troubleshooting guides and technical research. Every article keeps its evidence trail and original visuals attached to the same article identity.</p>
      <div className="library-stat-grid" aria-label="Library release summary">
        <div><strong>{catalog?n(catalog.article_count):"2,640"}</strong><span>Phase 1 articles</span></div>
        <div><strong>{catalog?n(Object.keys(catalog.sector_counts).length):"—"}</strong><span>sectors</span></div>
        <div><strong>3</strong><span>stable URL surfaces</span></div>
        <div><strong>1:1</strong><span>article ↔ research identity</span></div>
      </div>
    </section>

    <section className="library-shell" aria-label="Aafnai Library dashboard">
      <aside className="library-sectors" aria-label="Browse by sector">
        <div className="library-panel-title"><Layers3 size={18}/><span>Sectors</span></div>
        <button className={sector==="all"?"active":""} onClick={()=>{setSector("all");setTopic("all")}}>
          <span>All sectors</span><b>{catalog?n(catalog.article_count):"—"}</b>
        </button>
        {sectors.map(([name,count])=><button key={name} className={sector===name?"active":""} onClick={()=>{setSector(name);setTopic("all")}}>
          <span>{name}</span><b>{n(count)}</b>
        </button>)}
      </aside>

      <div className="library-main">
        <div className="library-toolbar">
          <label className="library-search"><Search size={19}/><span className="sr-only">Search library</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, topic, tag or MMG ID…" /></label>
          <select value={topic} onChange={e=>setTopic(e.target.value)} aria-label="Filter by topic">
            <option value="all">All topics</option>
            {topics.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="library-result-head">
          <div><b>{catalog?n(filtered.length):"—"}</b> results{sector!=="all"?" in "+sector:""}</div>
          <span>Article · Research · Evidence</span>
        </div>

        {error&&!catalog?<div className="library-empty"><BookOpen size={28}/><h2>Library release is being prepared</h2><p>{error}</p></div>:null}

        <div className="library-card-grid">
          {shown.map(article=><article className="library-card" key={article.topic_id}>
            <div className="library-card-meta"><span>{article.sector}</span><small>{article.topic_id}</small></div>
            <h2><a href={article.canonical_url}>{article.title}</a></h2>
            {article.dek?<p>{article.dek}</p>:null}
            <div className="library-badges">
              <span><FlaskConical size={14}/>{article.source_count} sources</span>
              <span><ImageIcon size={14}/>{article.visual_count} visuals</span>
              <span>{article.claim_count} mapped claims</span>
            </div>
            <div className="library-card-actions">
              <a className="primary" href={article.canonical_url}><BookOpen size={16}/>Read article</a>
              <a href={article.research_url}><FlaskConical size={16}/>Research</a>
            </div>
          </article>)}
        </div>

        {visible<filtered.length?<button className="library-more" onClick={()=>setVisible(v=>v+48)}>Show more articles</button>:null}
      </div>
    </section>

    <section className="library-principles">
      <div><b>One identity</b><span>The article, evidence ledger, citations and visuals share one MMG identity and integrity record.</span></div>
      <div><b>Readable first</b><span>The article URL is canonical. Research stays available separately without fragmenting the public story.</span></div>
      <div><b>Phase-safe</b><span>Phase 1 is frozen at 2,640 IDs. Later drafts remain in Phase 2 until explicitly released.</span></div>
    </section>
  </main>
}
