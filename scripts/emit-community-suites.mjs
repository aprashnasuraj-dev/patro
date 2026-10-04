import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const sourceRoot=path.join(root,"community-frontends");
const out=path.join(root,"dist");
const shellPath=path.join(out,"index.html");
const SITE=(process.env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");

const routeMap={
 "nepal-sambat-mandala.html":"/nepal-sambat/mandala",
 "lhosar.html":"/samudaya/lhosar",
 "tharu.html":"/samudaya/tharu",
 "mithila.html":"/samudaya/mithila",
 "kirat.html":"/samudaya/kirat",
 "hijri.html":"/samudaya/hijri",
 "samudaya-chakra.html":"/samudaya/chakra"
};
const REQUIRED_COMMUNITY_ROUTES=[
 "/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila",
 "/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"
];
const labels={
 "nepal-sambat-mandala.html":"नेपाल संवत्",
 "lhosar.html":"ल्होसार",
 "tharu.html":"थारु",
 "mithila.html":"मिथिला",
 "kirat.html":"किरात",
 "hijri.html":"हिजरी",
 "samudaya-chakra.html":"समुदाय चक्र"
};
const descriptions={
 "nepal-sambat-mandala.html":"नेपाल संवत् मिति, पर्व र पात्रो सन्दर्भ आफ्नै पात्रोको एउटै अनुभवमा हेर्नुहोस्।",
 "lhosar.html":"तामाङ, गुरुङ र शेर्पा ल्होसार चक्र तथा सम्बन्धित पर्व मिति आफ्नै पात्रोमा हेर्नुहोस्।",
 "tharu.html":"थारु समुदायका पर्व, मिति र वार्षिक चक्र आफ्नै पात्रोमा हेर्नुहोस्।",
 "mithila.html":"मिथिला तथा मैथिली पात्रोका पर्व, मिति र सांस्कृतिक चक्र आफ्नै पात्रोमा हेर्नुहोस्।",
 "kirat.html":"किरात समुदायका पर्व, उभौली–उधौली र सम्बन्धित पात्रो मिति आफ्नै पात्रोमा हेर्नुहोस्।",
 "hijri.html":"हिजरी मिति र नेपाल-सन्दर्भित इस्लामिक पर्व आफ्नै पात्रोमा हेर्नुहोस्।",
 "samudaya-chakra.html":"नेपालका समुदाय पात्रो र प्रमुख पर्व चक्र एउटै संयुक्त दृश्यमा हेर्नुहोस्।"
};

function esc(value){return String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function json(value){return JSON.stringify(value).replace(/</g,"\\u003c");}
function stripHead(html){
 return html
  .replace(/<title>[\s\S]*?<\/title>/i,"")
  .replace(/<meta\s+name=["']description["'][^>]*>/gi,"")
  .replace(/<meta\s+name=["']robots["'][^>]*>/gi,"")
  .replace(/<link\s+rel=["']canonical["'][^>]*>/gi,"")
  .replace(/<meta\s+property=["']og:(?:site_name|url|title|description)["'][^>]*>/gi,"");
}
function sourceExists(file){
 return fs.existsSync(path.join(sourceRoot,file))||fs.existsSync(path.join(sourceRoot,file.replace(".html",".src.html")));
}
function firstPaint(route,label,description){
 const siblings=Object.entries(routeMap).filter(([,value])=>value!==route).map(([file,value])=>`<a href="${esc(value)}">${esc(labels[file])}</a>`).join("");
 return `<main class="seo-prerender community-prerender" data-seo-prerender="true"><section><span>समुदाय पात्रो</span><h1>${esc(label)}</h1><p>${esc(description)}</p><nav aria-label="अन्य समुदाय पात्रो"><a href="/samudaya">सबै समुदाय</a>${siblings}</nav></section></main>`;
}
function buildPage(base,file){
 const route=routeMap[file],label=labels[file],description=descriptions[file],canonical=SITE+route;
 const head=[
  `<title>${esc(label)} · आफ्नै पात्रो</title>`,
  `<meta name="description" content="${esc(description)}">`,
  `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">`,
  `<link rel="canonical" href="${esc(canonical)}">`,
  `<meta property="og:site_name" content="आफ्नै पात्रो">`,
  `<meta property="og:title" content="${esc(label)} · आफ्नै पात्रो">`,
  `<meta property="og:description" content="${esc(description)}">`,
  `<meta property="og:url" content="${esc(canonical)}">`,
  `<meta name="x-render-mode" content="spa-prerender">`,
  `<script type="application/ld+json">${json({"@context":"https://schema.org","@type":"WebPage",name:`${label} · आफ्नै पात्रो`,url:canonical,description,inLanguage:["ne","en"],isPartOf:{"@id":SITE+"/#website"}})}</script>`
 ].join("\n");
 let html=stripHead(base).replace("</head>",head+"\n</head>");
 html=html.replace(/<div\s+id=["']root["']\s*>[\s\S]*?<\/div>/i,`<div id="root">${firstPaint(route,label,description)}</div>`);
 if(!html.includes('id="root"')||!html.includes('data-seo-prerender="true"'))throw new Error(file+" did not retain the canonical SPA root/prerender contract");
 if(!/\/assets\//.test(html))throw new Error(file+" lost the Vite asset bundle");
 return html;
}

if(!fs.existsSync(shellPath))throw new Error("Community suite requires the built Vite SPA shell at dist/index.html");
const shell=fs.readFileSync(shellPath,"utf8");
if(!shell.includes('id="root"'))throw new Error("Community suite requires #root in the canonical SPA shell");
const available=Object.keys(routeMap).filter(sourceExists);
const availableRoutes=available.map((file)=>routeMap[file]);
const missing=REQUIRED_COMMUNITY_ROUTES.filter((route)=>!availableRoutes.includes(route));
if(missing.length||available.length!==7)throw new Error("Community suite parity failure: expected 7/7 routes; missing="+missing.join(","));
console.log("[community] parity 7/7:",REQUIRED_COMMUNITY_ROUTES.join(", "));

for(const file of available){
 const html=buildPage(shell,file);
 const target=path.join(out,routeMap[file].slice(1),"index.html");
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,html);
 console.log("[community]",routeMap[file],"mode=spa-prerender","html_bytes="+Buffer.byteLength(html));
}

// /samudaya itself is also a real SPA route. A lightweight first paint keeps direct
// navigation consistent until React replaces the prerender with CommunityHub.
const hubRoute="/samudaya",hubLabel="समुदाय पात्रो",hubDescription="नेपाल संवत्, ल्होसार, थारु, मिथिला, किरात, हिजरी र समुदाय चक्र एउटै आफ्नै पात्रो अनुभवबाट खोल्नुहोस्।";
let hub=stripHead(shell).replace("</head>",`<title>${hubLabel} · आफ्नै पात्रो</title><meta name="description" content="${hubDescription}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${SITE+hubRoute}"><meta name="x-render-mode" content="spa-prerender"></head>`);
const cards=Object.entries(routeMap).map(([file,route])=>`<a href="${route}"><strong>${labels[file]}</strong></a>`).join("");
hub=hub.replace(/<div\s+id=["']root["']\s*>[\s\S]*?<\/div>/i,`<div id="root"><main class="seo-prerender community-prerender" data-seo-prerender="true"><section><span>आफ्नै पात्रो</span><h1>${hubLabel}</h1><p>${hubDescription}</p><nav>${cards}</nav></section></main></div>`);
fs.mkdirSync(path.join(out,"samudaya"),{recursive:true});
fs.writeFileSync(path.join(out,"samudaya","index.html"),hub);
