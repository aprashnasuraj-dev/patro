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
 const re=new RegExp(`<meta\\b[^>]*${attr}=["']${key.replace(/[.*+?^$\{\}()|[\\]\\]/g,"\\$&")}["'][^>]*>`,"i");
 const tag=`<meta ${attr}="${key}" content="${esc(value)}">`;
 return re.test(html)?html.replace(re,tag):html.replace("</head>",tag+"</head>");
}
function leafHtml(tool,row){
 const canonical=origin+tool.route,description=row.description||tool.summary||`Use ${tool.title} directly in your browser.`;
 let html=base.replace(/<html\\b[^>]*lang=["'][^"']*["']/i,'<html lang="en"');
 html=html.replace(/<title>[\\s\\S]*?<\\/title>/i,`<title>${esc(tool.title)} | Aafnai Patro</title>`);
 html=replaceMeta(html,"name","description",description);
 html=replaceMeta(html,"name","robots","index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
 html=replaceMeta(html,"name","googlebot","index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
 html=replaceMeta(html,"property","og:title",tool.title+" | Aafnai Patro");
 html=replaceMeta(html,"property","og:description",description);
 html=replaceMeta(html,"property","og:url",canonical);
 html=replaceMeta(html,"name","twitter:title",tool.title+" | Aafnai Patro");
 html=replaceMeta(html,"name","twitter:description",description);
 html=html.replace(/<link\\b[^>]*rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${canonical}">`);
 html=html.replace(/<link\\b[^>]*rel=["']alternate["'][^>]*hreflang=[^>]*>/gi,"");
 const data=[
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
   {"@type":"ListItem","position":1,"name":"Advanced tools","item":origin+"/advancetools/"},
   {"@type":"ListItem","position":2,"name":"Web tools","item":origin+"/advancetools/web-tools/"},
   {"@type":"ListItem","position":3,"name":tool.categoryLabel,"item":origin+`/advancetools/web-tools/${tool.category}/`},
   {"@type":"ListItem","position":4,"name":tool.title,"item":canonical}
  ]},
  {"@context":"https://schema.org","@type":"WebApplication","name":tool.title,"url":canonical,"description":description,"applicationCategory":"UtilitiesApplication","operatingSystem":"Web browser","isPartOf":{"@type":"WebSite","name":"Aafnai Patro","url":origin}}
 ];
 const schemas=data.map(x=>`<script type="application/ld+json" data-mm530-static="1">${JSON.stringify(x).replaceAll("<","\\u003c")}</script>`).join("");
 const fallback=`<main class="mm530-static-fallback" data-mm530-static-fallback="1"><nav aria-label="Breadcrumb"><a href="/advancetools/">Advanced tools</a> › <a href="/advancetools/web-tools/">Web tools</a> › <a href="/advancetools/web-tools/${esc(tool.category)}/">${esc(tool.categoryLabel)}</a></nav><h1>${esc(tool.title)}</h1><p>${esc(description)}</p><p><a href="/advancetools/web-tools/${esc(tool.category)}/">Browse more ${esc(tool.categoryLabel.toLowerCase())}</a></p></main>`;
 html=html.replace('<div id="root"></div>',`<div id="root">${fallback}</div>`);
 return html.replace("</head>",schemas+"</head>");
}

const urls=[];
for(const tool of registry){
 const row=runtimeById.get(tool.id);if(!row)throw new Error(`Missing runtime SEO for ${tool.id}`);
 const target=path.join(dist,tool.route.replace(/^\\//,""),"index.html");
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target,leafHtml(tool,row));
 urls.push(origin+tool.route);
}
await fs.writeFile(path.join(dist,"sitemap-mm530.xml"),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${url}</loc></url>`).join("")}</urlset>\n`);
console.log(`MM530 static leaf shells emitted: ${urls.length}/530 with route-specific SEO and sitemap`);
