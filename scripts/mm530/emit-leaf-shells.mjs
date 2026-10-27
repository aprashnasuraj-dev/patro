import fs from "node:fs/promises";
import path from "node:path";

const root=process.cwd();
const dist=path.join(root,"dist");
const origin="https://aafnaipatro.com";
const registry=JSON.parse(await fs.readFile(path.join(root,"src/mm530/mm530-registry.json"),"utf8")).tools;
const runtime=JSON.parse(await fs.readFile(path.join(dist,"_mm530/manifest.json"),"utf8"));
if(registry.length!==530||runtime.routes?.length!==530||runtime.failures?.length)throw new Error("MM530 runtime manifest is not a clean 530-tool build.");
const runtimeById=new Map(runtime.routes.map(x=>[x.id,x]));
const base=await fs.readFile(path.join(dist,"index.html"),"utf8");

function esc(value){return String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function replaceMeta(html,attr,key,value){
 const re=new RegExp(`<meta\\b[^>]*${attr}=["']${key.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g,"\\$&")}["'][^>]*>`,"i");
 const tag=`<meta ${attr}="${key}" content="${esc(value)}">`;
 return re.test(html)?html.replace(re,tag):html.replace("</head>",tag+"</head>");
}
function visible(html){return String(html).replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&(?:nbsp|#160);/gi," ").replace(/&(?:amp|#38);/gi,"&").replace(/\s+/g," ").trim()}
function editorialFromRuntime(html){
 const blocks=[...String(html).matchAll(/<(section|article)\b[^>]*>[\s\S]*?<\/\1>/gi)].map(x=>x[0]);
 const editorial=blocks.map(block=>{
  const opening=block.match(/^<[^>]+>/)?.[0]||"";
  const attrs=opening.toLowerCase();
  const docsLike=/(?:guide|reading|docs|documentation|info|notes|evidence|help|learn|reference|faq)/i.test(attrs);
  const workspaceLike=/(?:workbench|workspace|results?|controls?|input-panel|output-panel|tool(?:\s|$)|editor|preview)/i.test(attrs);
  if(workspaceLike&&!docsLike)return "";
  let cleaned=block
   .replace(/<form\b[\s\S]*?<\/form>/gi,"")
   .replace(/<button\b[\s\S]*?<\/button>/gi,"")
   .replace(/<textarea\b[\s\S]*?<\/textarea>/gi,"")
   .replace(/<select\b[\s\S]*?<\/select>/gi,"")
   .replace(/<input\b[^>]*>/gi,"")
   .replace(/<(?:canvas|video|audio)\b[\s\S]*?<\/(?:canvas|video|audio)>/gi,"")
   .replace(/<script\b[\s\S]*?<\/script>/gi,"")
   .replace(/<style\b[\s\S]*?<\/style>/gi,"")
   .replace(/\s(?:data-tool|data-export-[\w-]+)=["'][^"']*["']/gi,"");
  const text=visible(cleaned);
  if(text.length<24||!/<h[23]\b/i.test(cleaned))return "";
  if(/^(?:results?|inputs?|work area|interactive workspace)\b/i.test(text)&&text.length<120)return "";
  return cleaned;
 }).filter(Boolean).join("\n");
 return editorial;
}
function iframePermissions(tool){
 const cap=["clipboard-read","clipboard-write"];
 if(tool.id==="TOOL-0349")cap.push("camera","microphone","display-capture");
 if(tool.id==="TOOL-0350")cap.push("camera","microphone");
 return cap.join("; ");
}
function relatedLinks(tool){
 const peers=registry.filter(x=>x.category===tool.category);
 const at=peers.findIndex(x=>x.id===tool.id);
 if(at<0||peers.length<2)return [];
 const out=[];
 for(const offset of [-3,-2,-1,1,2,3]){
  const item=peers[(at+offset+peers.length)%peers.length];
  if(item&&item.id!==tool.id&&!out.some(x=>x.id===item.id))out.push(item);
 }
 return out;
}
const shellCss=`<style data-mm530-static-shell>
.mm530-static-fallback{max-width:1180px;margin:0 auto;padding:20px 18px 56px;font-family:Inter,"Noto Sans Devanagari",system-ui,sans-serif;color:#17231b}
.mm530-static-fallback a{color:inherit;text-underline-offset:3px}.mm530-breadcrumb{display:flex;gap:8px;flex-wrap:wrap;font-size:.9rem;opacity:.78;margin:4px 0 22px}
.mm530-tool-head{padding:18px 0 20px}.mm530-tool-head h1{font-size:clamp(1.8rem,4vw,3rem);line-height:1.08;margin:.25rem 0 .7rem}.mm530-tool-head p{max-width:850px;font-size:1.05rem;line-height:1.65}
.mm530-kicker{font-size:.82rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.72}
.mm530-frame-wrap{border:1px solid rgba(23,35,27,.14);border-radius:16px;overflow:hidden;background:#fff;min-height:760px}
.mm530-frame{display:block;width:100%;height:clamp(760px,85vh,1080px);border:0;background:#fff}
.mm530-editorial{max-width:900px;margin:34px auto 0;line-height:1.7;content-visibility:auto;contain-intrinsic-size:700px}.mm530-related{content-visibility:auto;contain-intrinsic-size:320px}.mm530-editorial section,.mm530-editorial article{margin:26px 0}.mm530-editorial h2{font-size:1.45rem;margin:1.6rem 0 .55rem}.mm530-editorial h3{font-size:1.15rem}.mm530-editorial pre{overflow:auto;max-width:100%;padding:14px;border-radius:10px;background:#f5f7f5}.mm530-editorial img{max-width:100%;height:auto}
.mm530-related{margin:38px 0 0}.mm530-related-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.mm530-related-grid a{display:block;border:1px solid rgba(23,35,27,.14);border-radius:12px;padding:14px;text-decoration:none}.mm530-related-grid strong{display:block;margin-bottom:4px}
@media(max-width:680px){.mm530-static-fallback{padding:14px 12px 42px}.mm530-frame-wrap{min-height:680px}.mm530-frame{height:780px}}
</style>`;

function stripSpaBoot(html){
 return html
  .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>\s*/gi,"")
  .replace(/<script\b[^>]*type=["']module["'][^>]*src=["'][^"']+["'][^>]*>\s*<\/script>\s*/gi,"")
  .replace(/<script\b[^>]*src=["'][^"']*\/assets\/[^"']+\.js["'][^>]*>\s*<\/script>\s*/gi,"");
}
function leafHtml(tool,row,runtimeHtml){
 const canonical=origin+tool.route,description=row.description||tool.summary||`Use ${tool.title} directly in your browser.`;
 let html=stripSpaBoot(base).replace(/<html\b[^>]*lang=["'][^"']*["']/i,'<html lang="en"');
 html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(tool.title)} | Aafnai Patro</title>`);
 html=replaceMeta(html,"name","description",description);
 html=replaceMeta(html,"name","robots","index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
 html=replaceMeta(html,"name","googlebot","index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
 html=replaceMeta(html,"property","og:title",tool.title+" | Aafnai Patro");
 html=replaceMeta(html,"property","og:description",description);
 html=replaceMeta(html,"property","og:url",canonical);
 html=replaceMeta(html,"name","twitter:title",tool.title+" | Aafnai Patro");
 html=replaceMeta(html,"name","twitter:description",description);
 html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${canonical}">`);
 html=html.replace(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=[^>]*>/gi,"");
 const appId=canonical+"#tool";
 const data={"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","@id":canonical+"#page","url":canonical,"name":tool.title,"description":description,"mainEntity":{"@id":appId},"breadcrumb":{"@id":canonical+"#breadcrumb"}},
  {"@type":"BreadcrumbList","@id":canonical+"#breadcrumb","itemListElement":[
   {"@type":"ListItem","position":1,"name":"Aafnai Patro","item":origin+"/"},
   {"@type":"ListItem","position":2,"name":"Advanced tools","item":origin+"/advancetools/"},
   {"@type":"ListItem","position":3,"name":"Web tools","item":origin+"/advancetools/web-tools/"},
   {"@type":"ListItem","position":4,"name":tool.categoryLabel,"item":origin+`/advancetools/web-tools/${tool.category}/`},
   {"@type":"ListItem","position":5,"name":tool.title,"item":canonical}
  ]},
  {"@type":"WebApplication","@id":appId,"name":tool.title,"url":canonical,"description":description,"applicationCategory":"UtilitiesApplication","operatingSystem":"Web browser","isAccessibleForFree":true,"isPartOf":{"@type":"WebSite","name":"Aafnai Patro","url":origin}}
 ]};
 const schema=`<script type="application/ld+json" data-mm530-static="1">${JSON.stringify(data).replaceAll("<","\\u003c")}</script>`;
 const related=relatedLinks(tool);
 const editorial=editorialFromRuntime(runtimeHtml);
 const relatedHtml=related.length?`<section class="mm530-related" aria-labelledby="mm530-related-title"><h2 id="mm530-related-title">Related ${esc(tool.categoryLabel.toLowerCase())}</h2><div class="mm530-related-grid">${related.map(item=>`<a href="${esc(item.route)}"><strong>${esc(item.title)}</strong><span>${esc(item.summary||`Open this ${item.categoryLabel.toLowerCase()} tool.`)}</span></a>`).join("")}</div></section>`:"";
 const fallback=`<main class="mm530-static-fallback mm530-tool-page" data-mm530-static-fallback="1"><nav class="mm530-breadcrumb" aria-label="Breadcrumb"><a href="/">Aafnai Patro</a><span>›</span><a href="/advancetools/">Advanced tools</a><span>›</span><a href="/advancetools/web-tools/">Web tools</a><span>›</span><a href="/advancetools/web-tools/${esc(tool.category)}/">${esc(tool.categoryLabel)}</a><span>›</span><span aria-current="page">${esc(tool.title)}</span></nav><header class="mm530-tool-head"><span class="mm530-kicker">Browser tool · ${esc(tool.categoryLabel)}</span><h1>${esc(tool.title)}</h1><p>${esc(description)}</p></header><div class="mm530-frame-wrap"><iframe class="mm530-frame" src="/_mm530/${esc(tool.id)}/page.html" title="${esc(tool.title)}" loading="eager" referrerpolicy="same-origin" allow="${esc(iframePermissions(tool))}"></iframe></div>${editorial?`<div class="mm530-editorial" data-mm530-editorial="1">${editorial}</div>`:""}${relatedHtml}</main>`;
 html=html.replace('<div id="root"></div>',`<div id="root">${fallback}</div>`);
 return html.replace("</head>",shellCss+schema+"</head>");
}

const urls=[],editorialStats=[];
for(const tool of registry){
 const row=runtimeById.get(tool.id);if(!row)throw new Error(`Missing runtime SEO for ${tool.id}`);
 const runtimePath=path.join(dist,"_mm530",tool.id,"page.html"),runtimeHtml=await fs.readFile(runtimePath,"utf8");
 const target=path.join(dist,tool.route.replace(/^\//,"")+".html");
 const leaf=leafHtml(tool,row,runtimeHtml);
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target,leaf);
 const editorial=editorialFromRuntime(runtimeHtml);
 editorialStats.push({id:tool.id,route:tool.route,editorialTextChars:visible(editorial).length,hasEditorial:Boolean(editorial)});
 urls.push(origin+tool.route);
}
await fs.writeFile(path.join(dist,"sitemap-mm530.xml"),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${url}</loc></url>`).join("")}</urlset>\\n`);
await fs.mkdir(path.join(root,"reports"),{recursive:true});
await fs.writeFile(path.join(root,"reports/mm530-editorial-retention.json"),JSON.stringify({schema_version:"MM530_EDITORIAL_RETENTION_V1",tools:editorialStats.length,with_editorial:editorialStats.filter(x=>x.hasEditorial).length,rows:editorialStats},null,2)+"\n");
console.log(`MM530 static leaf shells emitted: ${urls.length}/530 with direct runtime, crawlable editorial content, related links, and no SPA bootstrap`);
