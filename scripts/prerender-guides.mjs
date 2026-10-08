import {readFile,mkdir,writeFile} from "node:fs/promises";
import {SITE} from "./seo-config.mjs";
const guides=JSON.parse(await readFile("seo/guides.json","utf8"));
const shell=await readFile("dist/index.html","utf8");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const row of [null,...guides]){
 const path=row?"/guides/"+row.slug:"/guides";const url=SITE+path;
 const title=row?.title||"नेपाली उपकरण प्रयोग निर्देशिका · Practical Guides";
 const description=row?.description||"मिति रूपान्तरण, नेपाली टाइपिङ, Preeti, आवाज र उमेर गणनाका व्यावहारिक निर्देशिका।";
 const body=row?`<a href="${row.tool}">${esc(row.toolLabel)}</a>${row.sections.map(([h,p])=>`<section><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join("")}<h2>सम्बन्धित निर्देशिका</h2><ul>${row.related.map(slug=>`<li><a href="/guides/${slug}">${esc(guides.find(g=>g.slug===slug).title)}</a></li>`).join("")}</ul>`:`<ul>${guides.map(g=>`<li><h2><a href="/guides/${g.slug}">${esc(g.title)}</a></h2><p>${esc(g.description)}</p><a href="${g.tool}">${esc(g.toolLabel)}</a></li>`).join("")}</ul>`;
 let html=shell.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)} · आफ्नै पात्रो</title>`).replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<meta[^>]*(?:name="(?:description|robots|googlebot|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/gi,"").replace(/<link[^>]*rel="(?:canonical|alternate)"[^>]*>/gi,"");
 const schema={"@context":"https://schema.org","@type":row?"TechArticle":"CollectionPage",headline:title,name:title,description,url,inLanguage:["ne","en"],...(row?{articleBody:row.sections.map(([h,p])=>h+"\n"+p).join("\n\n")}:{})};
 const head=`<link rel="canonical" href="${url}"><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="${row?'article':'website'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-default.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${SITE}/og-default.png"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
 html=html.replace('</head>',head+'</head>').replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body)/i,`<div id="root"><main class="seo-prerender" data-seo-prerender="true"><nav><a href="/">पात्रो</a> · <a href="/guides">निर्देशिका</a></nav><h1>${esc(title)}</h1><p>${esc(description)}</p>${body}</main></div>`);
 if(!html.includes(`<h1>${esc(title)}</h1>`))throw new Error('Guide root replacement failed: '+path);
 const dir="dist"+path;await mkdir(dir,{recursive:true});await writeFile(dir+"/index.html",html);
}
console.log('Prerendered guide hub + 5 full-text guides.');
