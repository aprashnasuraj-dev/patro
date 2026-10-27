import { useEffect, useMemo, useState } from "react";
import { MM530_TOOLS, mm530ToolForRoute } from "./registry";
import "./mm530.css";

const SITE_ORIGIN="https://aafnaipatro.com";

type RuntimeSeo={id:string;route:string;title:string;description:string;category:string;categoryLabel:string};
type RuntimeManifest={schemaVersion:number;routes?:RuntimeSeo[]};

function fallbackDescription(title:string,category:string){
  return `Use ${title} directly in your browser. Review the tool's inputs, examples, references and limitations before relying on the result. Category: ${category}.`;
}
function useRouteSeo(tool:ReturnType<typeof mm530ToolForRoute>,description:string){
 useEffect(()=>{
  if(!tool)return;
  const previousTitle=document.title;
  const canonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const canonicalWas=canonical?.href||"";
  const canonicalNode=canonical||document.head.appendChild(Object.assign(document.createElement("link"),{rel:"canonical"}));
  canonicalNode.dataset.mm530Owned=canonical?"false":"true";
  canonicalNode.href=SITE_ORIGIN+tool.route;
  const metaSpecs:[string,string,string][]=[
   ["name","description",description],
   ["property","og:title",tool.title],
   ["property","og:description",description],
   ["property","og:url",SITE_ORIGIN+tool.route],
   ["name","twitter:card","summary"],
   ["name","twitter:title",tool.title],
   ["name","twitter:description",description]
  ];
  const restores:Array<()=>void>=[];
  for(const [attr,key,value] of metaSpecs){
   let node=document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
   const created=!node,old=node?.content||"";
   if(!node){node=document.createElement("meta");node.setAttribute(attr,key);node.dataset.mm530Seo="1";document.head.appendChild(node)}
   node.content=value;
   restores.push(()=>{if(created)node?.remove();else if(node)node.content=old});
  }
  document.title=`${tool.title} | Aafnai Patro`;
  const breadcrumbs={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
   {"@type":"ListItem","position":1,"name":"Advanced tools","item":SITE_ORIGIN+"/advancetools/"},
   {"@type":"ListItem","position":2,"name":"Web tools","item":SITE_ORIGIN+"/advancetools/web-tools/"},
   {"@type":"ListItem","position":3,"name":tool.categoryLabel,"item":SITE_ORIGIN+`/advancetools/web-tools/${tool.category}/`},
   {"@type":"ListItem","position":4,"name":tool.title,"item":SITE_ORIGIN+tool.route}
  ]};
  const application={"@context":"https://schema.org","@type":"WebApplication","name":tool.title,"url":SITE_ORIGIN+tool.route,"description":description,"applicationCategory":"UtilitiesApplication","operatingSystem":"Web browser","isPartOf":{"@type":"WebSite","name":"Aafnai Patro","url":SITE_ORIGIN}};
  const scripts=[breadcrumbs,application].map(data=>{const x=document.createElement("script");x.type="application/ld+json";x.dataset.mm530Seo="1";x.textContent=JSON.stringify(data);document.head.appendChild(x);return x});
  return()=>{document.title=previousTitle;for(const fn of restores.reverse())fn();for(const x of scripts)x.remove();if(canonicalNode.dataset.mm530Owned==="true")canonicalNode.remove();else canonicalNode.href=canonicalWas};
 },[tool,description]);
}

export function Mm530ToolPage({path}:{path:string}){
 const tool=mm530ToolForRoute(path);
 const [description,setDescription]=useState(()=>tool?fallbackDescription(tool.title,tool.categoryLabel):"");
 useEffect(()=>{
  if(!tool)return;
  setDescription(fallbackDescription(tool.title,tool.categoryLabel));
  const controller=new AbortController();
  fetch("/_mm530/manifest.json",{cache:"force-cache",signal:controller.signal}).then(r=>r.ok?r.json():null).then((m:RuntimeManifest|null)=>{
   const row=m?.routes?.find(x=>x.route===tool.route||x.id===tool.id);
   if(row?.description)setDescription(row.description);
  }).catch(()=>{});
  return()=>controller.abort();
 },[tool]);
 useRouteSeo(tool,description);
 const related=useMemo(()=>tool?MM530_TOOLS.filter(x=>x.category===tool.category&&x.route!==tool.route).slice(0,4):[],[tool]);

 if(!tool)return <main className="mm530-page mm530-missing"><b>404</b><h1>Tool not found</h1><p>We could not find a web tool at this address.</p><a href="/advancetools/web-tools/">Browse web tools</a></main>;
 return <main className="mm530-page mm530-tool-page">
   <nav className="mm530-breadcrumb" aria-label="Breadcrumb"><a href="/advancetools/">Advanced tools</a><span>›</span><a href="/advancetools/web-tools/">Web tools</a><span>›</span><a href={`/advancetools/web-tools/${tool.category}/`}>{tool.categoryLabel}</a><span>›</span><b>{tool.title}</b></nav>
   <header className="mm530-tool-head"><div><span className="mm530-kicker">Browser tool · {tool.categoryLabel}</span><h1>{tool.title}</h1><p>{description}</p></div><a className="mm530-back" href={`/advancetools/web-tools/${tool.category}/`}>More {tool.categoryLabel.toLowerCase()}</a></header>
   <div className="mm530-frame-wrap"><iframe className="mm530-frame" src={`/_mm530/${tool.id}/page.html`} title={tool.title} loading="eager" referrerPolicy="same-origin" allow="clipboard-read; clipboard-write; camera; microphone; geolocation; fullscreen"/></div>
   {related.length>0&&<section className="mm530-related" aria-labelledby="mm530-related-title"><div className="mm530-results-head"><h2 id="mm530-related-title">Related {tool.categoryLabel.toLowerCase()}</h2><a href={`/advancetools/web-tools/${tool.category}/`}>Browse category</a></div><div className="mm530-tool-grid">{related.map(item=><a className="mm530-tool-card" href={item.route} key={item.route}><strong>{item.title}</strong><small>{fallbackDescription(item.title,item.categoryLabel)}</small><b>Open tool →</b></a>)}</div></section>}
 </main>;
}
