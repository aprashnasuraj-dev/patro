import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const registry=JSON.parse(await fs.readFile(path.join(root,"src/mm530/mm530-registry.json"),"utf8")).tools;
const outRoot=path.join(root,"public/_mm530");
const origin="https://aafnaipatro.com";
const INTERNAL_VISIBLE=/(?:TEST_PENDING|Mission Mangal|MM530|TOOL-\d{4}|\bbatch\s*0?\d+\b|source preparation|prepared source|pre-publication|runtime QA|runtime validation pending|publication pending|publication action|draft research tool|source checkpoint|\bQA-approved\b|\bstaged(?:\s+only)?\b|Staging\s*:?[\s-]*noindex|not published|no product tests|product tests have not been executed|reserved tool routes?|published route|before hydration|fixtures\\.json)/i;

async function exists(p){try{await fs.access(p);return true}catch{return false}}
function decodeHtml(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">")}
function cleanPublicText(value){
 return String(value||"")
  .replace(/Scope:\s*TOOL-\d{4}\.\s*/gi,"")
  .replace(/Staging:\s*noindex(?:,\s*not published)?\.\s*/gi,"")
  .replace(/AafnaiPatro\s*·\s*F\d+\s*·\s*TOOL-\d{4}/gi,"Aafnai Patro")
  .replace(/Mission Mangal(?:\s*·\s*TOOL-\d{4})?/gi,"Aafnai Patro")
  .replace(/\bTOOL-\d{4}\b/g," ")
  .replace(/\bTEST_PENDING\b/gi," ")
  .replace(/\bPrivate browser tool\s*·\s*staging\b/gi,"Private browser tool")
  .replace(/\bDraft research tool\s*[—-]\s*2026 source review\b/gi,"Browser-local reference tool")
  .replace(/\b(?:source preparation|runtime QA|publication pending|staging mode|source checkpoint)\b[^.]*\.?/gi," ")
  .replace(/\s+/g," ").trim();
}
function extractTitle(html,fallback){return cleanPublicText(decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||fallback))||fallback}
function boundedDescription(value,title,categoryLabel){
 let text=cleanPublicText(value);
 if(text.length<70)text=`Use ${title} directly in your browser. Review the inputs, method, examples, references and limitations before relying on the result. ${categoryLabel||"Web tool"}.`;
 text=text.replace(/\s+/g," ").trim();
 if(text.length>165){const cut=text.slice(0,164);text=(cut.replace(/\s+\S*$/,"").trim()||cut.trim()).replace(/[,:;\-–—]+$/,"")+"…";}
 if(text.length<70)text=(text+" Review the stated assumptions and limitations before use.").slice(0,165).trim();
 return text;
}
function extractDescription(html,title,categoryLabel){
 const tag=html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)?.[0]||"";
 const value=decodeHtml(tag.match(/content="([^"]*)"/i)?.[1]??tag.match(/content='([^']*)'/i)?.[1]??"").replace(/\s+/g," ").trim();
 return boundedDescription(value,title,categoryLabel);
}
function sanitizeProductionHtml(html){
 // Strip only publication/internal preparation markers; preserve substantive guide copy.
 // Remove whole status-only elements emitted by source-preparation templates.
 const statusOnly=/(?:Developer workspace|Source preview|Source preparation|Prepared source|Pre-publication|Runtime validation pending|Staging\s*:?[\s-]*noindex|staged only|not published|no product tests|publication action|publication URL|reserved tool routes?|published route|source is prepared|before hydration|fixtures\\.json)/i;
 html=html.replace(/<(p|small|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,tag=>statusOnly.test(visibleText(tag))?"":tag);
 html=html.replace(/<section\b[^>]*>\s*<h2>Integration note<\/h2>[\s\S]*?<\/section>/gi,"");
 html=html.replace(/<span\b[^>]*class=["'][^"']*staging[^"']*["'][^>]*>[^<]*<\/span>/gi,"");
 html=html.replace(/<footer\b[^>]*>(?:(?!<\/footer>)[\s\S])*(?:TEST_PENDING|Client-side preparation|Reserved route)(?:(?!<\/footer>)[\s\S])*<\/footer>/gi,"");
 html=html.replace(/<(?:small|p)\b[^>]*>(?:(?!<\/(?:small|p)>)[\s\S])*(?:Source preparation status|Source preparation only|Product testing and publication pending|No runtime QA claim|Runtime validation pending|Staging mode: noindex|QA-approved\?|source checkpoint is TEST_PENDING)(?:(?!<\/(?:small|p)>)[\s\S])*<\/(?:small|p)>/gi,"");
 return html
  .replace(/\bDeveloper studio\b/gi,"Tool workspace")
  .replace(/\s*·\s*staged\b/gi,"")
  .replace(/This is (?:a )?staged[^.]*\./gi,"")
  .replace(/Private browser utility\s*·\s*batch\s*0?\d+/gi,"Private browser utility")
  .replace(/Source preview\s*·\s*Not published/gi,"")
  .replace(/\bbatch\s*0?\d+\b/gi,"")
  .replace(/Scope:\s*TOOL-\d{4}\.\s*/gi,"")
  .replace(/Staging:\s*noindex(?:,\s*not published)?\.\s*/gi,"")
  .replace(/AafnaiPatro\s*·\s*F\d+\s*·\s*TOOL-\d{4}/gi,"Aafnai Patro")
  .replace(/Mission Mangal(?:\s*·\s*TOOL-\d{4})?/gi,"Aafnai Patro")
  .replace(/TOOL-\d{4}\s*·\s*browser-local\s*·\s*TEST_PENDING/gi,"Browser-local tool")
  .replace(/Browser-local\s*•\s*TEST_PENDING/gi,"Browser-local tool")
  .replace(/Private browser tool\s*·\s*staging/gi,"Private browser tool")
  .replace(/Draft research tool\s*[—-]\s*2026 source review/gi,"Browser-local reference tool")
  .replace(/\bTOOL-\d{4}\b/g,"")
  .replace(/\bTEST_PENDING\b/gi,"")
  .replace(/\b(?:staged only|not published|pre-publication source|source preparation|prepared source only|runtime validation pending|no publication action)\b[^.·]*[.·]?/gi," ")
  .replace(/\s+·\s+·\s+/g," · ")
  .replace(/\s{2,}/g," ");
}
function escapeAttr(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function injectSeo(html,tool,title,description){
 html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,"")
          .replace(/<meta\b[^>]*(?:property|name)=["'](?:og:title|og:description|og:url|twitter:card|twitter:title|twitter:description)["'][^>]*>/gi,"");
 const canonical=origin+tool.route,head=`<link rel="canonical" href="${canonical}"><meta property="og:title" content="${escapeAttr(title)}"><meta property="og:description" content="${escapeAttr(description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeAttr(title)}"><meta name="twitter:description" content="${escapeAttr(description)}">`;
 return html.replace(/<\/head>/i,head+"</head>");
}
function visibleText(html){return decodeHtml(html.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim()}
async function copyTree(src,dst){
 if(!await exists(src))return;
 const st=await fs.stat(src);
 if(st.isDirectory()){await fs.mkdir(dst,{recursive:true});for(const name of await fs.readdir(src))await copyTree(path.join(src,name),path.join(dst,name));return}
 if(/\.(?:ts|tsx)$/.test(src)||/[/\\](?:tests|research)[/\\]/.test(src)||/[/\\]tool\.json$/.test(src)||/[/\\]page\.html$/.test(src))return;
 await fs.mkdir(path.dirname(dst),{recursive:true});await fs.copyFile(src,dst);
}
async function copyRuntime(srcRel,dstRel){
 const src=path.join(root,srcRel),dst=path.join(root,"public",dstRel);if(!await exists(src))return;
 await fs.mkdir(path.dirname(dst),{recursive:true});const st=await fs.stat(src);if(st.isDirectory())await fs.cp(src,dst,{recursive:true});else await fs.copyFile(src,dst);
}

await fs.rm(outRoot,{recursive:true,force:true});await fs.mkdir(outRoot,{recursive:true});
await Promise.all([
 copyRuntime("node_modules/pdfjs-dist/legacy/build/pdf.mjs","vendor/pdfjs/pdf.mjs"),
 copyRuntime("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs","vendor/pdfjs/pdf.worker.mjs"),
 copyRuntime("node_modules/pdf-lib/dist/pdf-lib.esm.min.js","vendor/pdf-lib/pdf-lib.esm.min.js"),
 copyRuntime("node_modules/fonteditor-core/woff2/woff2.wasm","assets/vendor/fonteditor-core/woff2.wasm"),
 copyRuntime("node_modules/sql.js/dist/sql-wasm.wasm","assets/vendor/sqljs/sql-wasm.wasm"),
 copyRuntime("node_modules/@ffmpeg/core/dist/esm","assets/vendor/ffmpeg"),
 copyRuntime("node_modules/mathjax","vendor/mathjax")
]);
const sheetWrapper=path.join(root,"public/assets/vendor/sheetjs/xlsx-0.20.3/xlsx.mjs");
await fs.mkdir(path.dirname(sheetWrapper),{recursive:true});
await fs.writeFile(sheetWrapper,`await import('/_mm530/TOOL-0370/src/vendor/xlsx.bundle.js');const x=globalThis.XLSX;if(!x?.read||!x?.write||!x?.utils)throw new Error('Spreadsheet runtime unavailable');export const read=x.read;export const write=x.write;export const utils=x.utils;export default x;\n`);

const failures=[],routes=[];
for(const tool of registry){
 const srcDir=path.join(root,tool.sourceDir),dst=path.join(outRoot,tool.id),entry=path.join(srcDir,"src/ui.ts"),page=path.join(srcDir,"page.html");
 try{
  if(!await exists(entry)||!await exists(page))throw new Error("missing tool entry or page");
  await fs.mkdir(dst,{recursive:true});await copyTree(srcDir,dst);
  await build({entryPoints:[entry],bundle:true,format:"esm",platform:"browser",target:"es2022",outfile:path.join(dst,"tool.js"),logLevel:"silent",conditions:["browser","module","import"],external:["/vendor/*","/assets/vendor/*"]});
  const original=await fs.readFile(page,"utf8"),title=extractTitle(original,tool.title),description=extractDescription(original,tool.title,tool.categoryLabel);
  let html=sanitizeProductionHtml(original);
  html=injectSeo(html,tool,title,description);
  html=html.replace(/<script\b[^>]*type=["']module["'][^>]*src=["'][^"']*ui\.(?:ts|js)["'][^>]*><\/script>/i,'<script type="module" src="./tool.js"></script>');
  html=html.replace(/<script\b[^>]*src=["'][^"']*ui\.(?:ts|js)["'][^>]*><\/script>/i,'<script type="module" src="./tool.js"></script>');
  if(await exists(path.join(dst,"tool.css"))&&!html.includes("./tool.css"))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="./tool.css"></head>');
  const visible=visibleText(html);if(INTERNAL_VISIBLE.test(visible))throw new Error("internal QA/developer wording remains in production-visible copy");
  await fs.writeFile(path.join(dst,"page.html"),html);
  routes.push({id:tool.id,route:tool.route,title:tool.title,description,category:tool.category,categoryLabel:tool.categoryLabel});
 }catch(error){failures.push({id:tool.id,error:error instanceof Error?error.message:String(error)})}
}
await fs.writeFile(path.join(outRoot,"manifest.json"),JSON.stringify({schemaVersion:2,tools:registry.length,routes,failures},null,2)+"\n");
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1}else console.log(`Web tools prepared: ${registry.length}/${registry.length} route bundles; production copy audit clean`);
