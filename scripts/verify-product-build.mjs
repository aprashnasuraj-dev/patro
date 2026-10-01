import { access, readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root=process.cwd();
const dist=resolve(root,"dist");
const requiredFiles=[
  "index.html",
  "sw.js",
  "manifest.webmanifest",
  "tools/index.html",
  "settings/community/index.html",
  "admin/community-suites/index.html",
  "jyotish/janma-patro/index.html",
  "jyotish/matchmaking/index.html",
  "nepali-typing/index.html",
  "samudaya/index.html",
  "nepal-sambat/mandala/index.html",
  "samudaya/lhosar/index.html",
  "samudaya/tharu/index.html",
  "samudaya/mithila/index.html",
  "samudaya/kirat/index.html",
  "samudaya/hijri/index.html",
  "samudaya/chakra/index.html"
];

const missing=[];
for(const relative of requiredFiles){
  try{await access(resolve(dist,relative));}
  catch{missing.push(relative);}
}
if(missing.length)throw new Error("product-build: missing migration artifacts: "+missing.join(", "));

const rootHtml=await readFile(resolve(dist,"index.html"),"utf8");
if(!/\/assets\//.test(rootHtml))throw new Error("product-build: root SPA has no /assets bundle");
if(/\/astro\/assets\//.test(rootHtml))throw new Error("product-build: stale /astro/assets bundle path returned");

const assetsDir=resolve(dist,"assets");
const assetNames=await readdir(assetsDir);
const jsAssets=[];
for(const name of assetNames){
  const full=resolve(assetsDir,name);
  const info=await stat(full);
  if(info.isFile()&&/\.js$/.test(name)&&info.size>0)jsAssets.push(name);
}
if(!jsAssets.length)throw new Error("product-build: no executable JavaScript bundle emitted");

const communityFiles=requiredFiles.filter((x)=>x==="nepal-sambat/mandala/index.html"||x.startsWith("samudaya/")&&x!=="samudaya/index.html");
if(communityFiles.length!==7)throw new Error("product-build: Community Suite inventory must stay exactly 7 experiences");

console.log(JSON.stringify({
  ok:true,
  required_files:requiredFiles.length,
  community_experiences:communityFiles.length,
  js_assets:jsAssets.length,
  root:"dist/index.html"
},null,2));
