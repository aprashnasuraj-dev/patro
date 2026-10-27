import { useEffect, useMemo, useState } from "react";
import { MM530_CATEGORIES, MM530_TOOLS, mm530ToolForRoute } from "./registry";
import "./mm530.css";

function setTitle(title:string){document.title=title+" | Aafnai Patro"}
function categoryFromPath(path:string){
  const m=path.match(/^\/toolbox\/([^/]+)$/);return m?decodeURIComponent(m[1]):"";
}

export function Mm530ToolboxPage({path}:{path:string}){
  const category=categoryFromPath(path);
  const [query,setQuery]=useState(()=>new URLSearchParams(location.search).get("q")||"");
  useEffect(()=>setTitle(category?((MM530_CATEGORIES.find(c=>c.key===category)?.label||"Tools")+" toolbox"):"530 Web Tools"),[category]);
  const selected=MM530_CATEGORIES.find(c=>c.key===category)||null;
  const tools=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return MM530_TOOLS.filter(t=>(!selected||t.category===selected.key)&&(!q||[t.title,t.id,t.categoryLabel,t.summary].some(v=>v.toLowerCase().includes(q))));
  },[query,selected]);
  return <main className="mm530-page">
    <header className="mm530-hero">
      <span className="mm530-kicker">Aafnai Patro · Tool Library</span>
      <h1>{selected?selected.label:"530 practical browser tools"}</h1>
      <p>{selected?`${selected.count} tools in this category. Search or open any tool by its canonical URL.`:"Browse by category instead of loading a flat 530-item implementation list. Tool runtimes load only after you open a tool."}</p>
      <label className="mm530-search"><span>Search tools</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, category or TOOL ID"/></label>
    </header>
    {!selected&&<section className="mm530-categories" aria-label="Tool categories">
      {MM530_CATEGORIES.map(c=><a className="mm530-category-card" href={`/toolbox/${c.key}`} key={c.key}><strong>{c.label}</strong><span>{c.count} tools</span><small>Browse {c.label.toLowerCase()}</small></a>)}
    </section>}
    {selected&&<nav className="mm530-breadcrumb"><a href="/toolbox">All tool categories</a><span>›</span><b>{selected.label}</b></nav>}
    <section className="mm530-results" aria-label="Matching tools">
      <div className="mm530-results-head"><h2>{query?"Search results":selected?selected.label:"All tools"}</h2><span>{tools.length} shown</span></div>
      <div className="mm530-tool-grid">{tools.map(tool=><a className="mm530-tool-card" href={tool.route} key={tool.id}>
        <span className="mm530-id">{tool.id}</span><strong>{tool.title}</strong><small>{tool.summary}</small><b>{tool.categoryLabel} →</b>
      </a>)}</div>
      {!tools.length&&<div className="mm530-empty">No MM530 tool matches this search.</div>}
    </section>
  </main>
}

export function Mm530ToolPage({path}:{path:string}){
  const tool=mm530ToolForRoute(path);
  useEffect(()=>{if(tool)setTitle(tool.title)},[tool]);
  if(!tool)return <main className="mm530-page mm530-missing"><b>404</b><h1>Tool route not found</h1><p>This URL is inside an MM530 namespace but has no canonical owner.</p><a href="/toolbox">Browse all tools</a></main>;
  return <main className="mm530-page mm530-tool-page">
    <nav className="mm530-breadcrumb"><a href="/toolbox">Toolbox</a><span>›</span><a href={`/toolbox/${tool.category}`}>{tool.categoryLabel}</a><span>›</span><b>{tool.id}</b></nav>
    <header className="mm530-tool-head"><div><span className="mm530-kicker">{tool.id} · {tool.categoryLabel}</span><h1>{tool.title}</h1><p>{tool.summary}</p></div><a className="mm530-back" href={`/toolbox/${tool.category}`}>More {tool.categoryLabel.toLowerCase()}</a></header>
    <div className="mm530-frame-wrap"><iframe className="mm530-frame" src={`/_mm530/${tool.id}/page.html`} title={tool.title} loading="eager" referrerPolicy="same-origin" allow="clipboard-read; clipboard-write; camera; microphone; geolocation; fullscreen"/></div>
  </main>
}
