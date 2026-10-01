import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildSync } from "esbuild";

const root=process.cwd(), src=path.join(root,"community-frontends"), out=path.join(root,"dist");
const bundleFile=path.join(src,".engine.bundle.js");
buildSync({entryPoints:[path.join(src,"entry.ts")],bundle:true,minify:true,format:"iife",globalName:"S",outfile:bundleFile,target:"es2020",logLevel:"silent"});
const bundle=fs.readFileSync(bundleFile,"utf8").replaceAll("</script","<\\/script");
const kitJs=fs.readFileSync(path.join(src,"kit.js"),"utf8");
const kitCss=fs.readFileSync(path.join(src,"kit.css"),"utf8");
const routeMap={
 "nepal-sambat-mandala.html":"/nepal-sambat/mandala",
 "lhosar.html":"/samudaya/lhosar","tharu.html":"/samudaya/tharu",
 "mithila.html":"/samudaya/mithila","kirat.html":"/samudaya/kirat",
 "hijri.html":"/samudaya/hijri","samudaya-chakra.html":"/samudaya/chakra"
};
const REQUIRED_COMMUNITY_ROUTES=[
 "/nepal-sambat/mandala",
 "/samudaya/lhosar",
 "/samudaya/tharu",
 "/samudaya/mithila",
 "/samudaya/kirat",
 "/samudaya/hijri",
 "/samudaya/chakra"
];
const labels={
 "nepal-sambat-mandala.html":"नेपाल संवत्","lhosar.html":"ल्होसार","tharu.html":"थारु",
 "mithila.html":"मिथिला","kirat.html":"किरात","hijri.html":"हिजरी","samudaya-chakra.html":"चक्र"
};
const available=Object.keys(routeMap).filter(f=>fs.existsSync(path.join(src,f))||fs.existsSync(path.join(src,f.replace(".html",".src.html"))));
const availableRoutes=available.map(f=>routeMap[f]);
const missing=REQUIRED_COMMUNITY_ROUTES.filter(route=>!availableRoutes.includes(route));
if(missing.length||available.length!==7) throw new Error("Community suite parity failure: expected 7/7 routes; missing="+missing.join(","));
console.log("[community] parity 7/7:",REQUIRED_COMMUNITY_ROUTES.join(", "));
function Nav(){
 return React.createElement("nav",{className:"samudaya-suite-menu","aria-label":"Community Suite"},
  React.createElement("a",{href:"/samudaya",className:"suite-home"},"समुदाय"),
  ...available.map(f=>React.createElement("a",{href:routeMap[f],key:f},labels[f])));
}
const nav=renderToStaticMarkup(React.createElement(Nav));
const shellCss=`<style id="samudaya-suite-shell">
.samudaya-suite-menu{position:relative;z-index:2147480000;display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:9px 10px;background:#07101ff2;border-bottom:1px solid #ffffff22;font:700 12px/1.2 system-ui,-apple-system,"Noto Sans Devanagari",sans-serif}
.samudaya-suite-menu a{color:#f4f8ff;text-decoration:none;padding:7px 8px;border:1px solid #ffffff22;border-radius:999px}.samudaya-suite-menu .suite-home{background:#f4f8ff;color:#07101f}
html,body{max-width:100%;overflow-x:hidden}@media(max-width:360px){.samudaya-suite-menu{gap:4px;padding:7px 6px}.samudaya-suite-menu a{font-size:10px;padding:5px 6px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}
</style>`;
function decorate(html,file){
 for(const [old,r] of Object.entries(routeMap)) html=html.replaceAll('href="'+old+'"','href="'+r+'"');
 html=html.replace("</head>",'<meta name="x-render-mode" content="static-prerender">'+shellCss+"</head>");
 html=html.replace(/<body([^>]*)>/i,(m,a)=>"<body"+a+">"+nav);
 const js=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].reduce((n,m)=>n+Buffer.byteLength(m[1]||""),0);
 if(js>200*1024) throw new Error(file+" exceeds 200 KB JavaScript: "+js);
 if(/Loading\.\.\.|>Loading<|>लोड हुँदै</i.test(html)) throw new Error(file+" contains terminal loading placeholder");
 return {html,js};
}
for(const file of Object.keys(routeMap)){
 let html;
 const portable=path.join(src,file), source=path.join(src,file.replace(".html",".src.html"));
 if(fs.existsSync(portable)) html=fs.readFileSync(portable,"utf8");
 else if(fs.existsSync(source)) html=fs.readFileSync(source,"utf8").replace("/*__KIT_CSS__*/",kitCss).replace("/*__BUNDLE__*/",bundle).replace("/*__KIT_JS__*/",kitJs);
 else continue;
 const x=decorate(html,file), target=path.join(out,routeMap[file].slice(1),"index.html");
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,x.html);
 console.log("[community]",routeMap[file],"js_bytes="+x.js,"html_bytes="+Buffer.byteLength(x.html));
}
fs.rmSync(bundleFile,{force:true});
const cards=available.map(f=>React.createElement("a",{href:routeMap[f],key:f,className:"card"},React.createElement("strong",null,labels[f]),React.createElement("small",null,routeMap[f])));
const hub="<!doctype html><html lang=\"ne\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>समुदाय · Community Suite | आफ्नै पात्रो</title><style>body{margin:0;background:#07101f;color:#eef4ff;font:16px/1.55 system-ui,-apple-system,\"Noto Sans Devanagari\",sans-serif}main{max-width:1000px;margin:auto;padding:30px 16px 64px}h1{font-size:clamp(36px,7vw,64px);margin:.25em 0}p{color:#aebcd0;max-width:720px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.card{display:grid;gap:6px;padding:20px;border:1px solid #2a3a52;border-radius:18px;background:#0d182a;color:inherit;text-decoration:none}.card small{color:#9fb0c8}.back{color:#9ed7ff}html,body{max-width:100%;overflow-x:hidden}</style></head><body><main>"+renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement("a",{href:"/",className:"back"},"← आफ्नै पात्रो"),React.createElement("h1",null,"समुदाय · Community Suite"),React.createElement("p",null,"सात समुदाय अनुभव: नेपाल संवत्, ल्होसार, थारु, मिथिला, किरात, हिजरी र समुदाय चक्र। मितिहरू इञ्जिनबाट आउँछन्; आधिकारिक घोषणाले सम्भावित मिति override गर्छ।"),React.createElement("div",{className:"grid"},...cards)))+"</main></body></html>";
fs.mkdirSync(path.join(out,"samudaya"),{recursive:true});fs.writeFileSync(path.join(out,"samudaya","index.html"),hub);
