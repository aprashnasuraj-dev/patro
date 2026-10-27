import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root=process.cwd(),dist=path.join(root,"dist"),out=path.join(root,"reports/mm530-phase10"),base=process.env.MM530_BASE_URL||"http://127.0.0.1:4173",origin="https://aafnaipatro.com";
await fs.mkdir(out,{recursive:true});
const registry=JSON.parse(await fs.readFile(path.join(root,"src/mm530/mm530-registry.json"),"utf8")).tools;
const categories=[...new Set(registry.map(x=>x.category))];
const failures=[],skipped=[],checks=[];
const fail=(code,detail)=>failures.push({code,detail});
async function mapLimit(items,limit,fn){let i=0;const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(i<items.length){const n=i++;await fn(items[n],n)}});await Promise.all(workers)}

await mapLimit(registry,24,async tool=>{
 try{
  const res=await fetch(base+tool.route,{redirect:"follow"}),html=await res.text();
  if(!res.ok)fail("LEAF_HTTP",`${tool.id} ${res.status}`);
  if(!html.includes(`https://aafnaipatro.com${tool.route}`))fail("LEAF_STATIC_CANONICAL",tool.id);
  const runtime=await fetch(base+`/_mm530/${tool.id}/page.html`),js=await fetch(base+`/_mm530/${tool.id}/tool.js`);
  if(!runtime.ok)fail("RUNTIME_HTTP",`${tool.id} page ${runtime.status}`);
  if(!js.ok)fail("RUNTIME_JS_HTTP",`${tool.id} js ${js.status}`);
  if(!String(js.headers.get("content-type")||"").includes("javascript"))fail("RUNTIME_JS_MIME",`${tool.id}: ${js.headers.get("content-type")}`);
 }catch(error){fail("ROUTE_FETCH_EXCEPTION",`${tool.id}: ${error instanceof Error?error.message:String(error)}`)}
});

for(const c of categories){const res=await fetch(base+`/advancetools/web-tools/${c}/`);if(!res.ok)fail("CATEGORY_HTTP",`${c}: ${res.status}`)}
for(const p of ["/advancetools/","/advancetools/web-tools/"]){const res=await fetch(base+p);if(!res.ok)fail("DISCOVERY_HTTP",`${p}: ${res.status}`)}

const mimeChecks=[
 ["/vendor/pdfjs/pdf.mjs","javascript"],["/vendor/pdfjs/pdf.worker.mjs","javascript"],["/vendor/pdf-lib/pdf-lib.esm.min.js","javascript"],
 ["/assets/vendor/fonteditor-core/woff2.wasm","application/wasm"],["/assets/vendor/sqljs/sql-wasm.wasm","application/wasm"]
];
for(const [url,expected] of mimeChecks){const res=await fetch(base+url);const type=res.headers.get("content-type")||"";if(!res.ok)fail("SHARED_ASSET_HTTP",`${url}: ${res.status}`);else if(!type.includes(expected))fail("SHARED_ASSET_MIME",`${url}: ${type}`)}
const ffmpegHead=await fetch(base+"/mm530-runtime/ffmpeg-core.wasm",{method:"HEAD"});const ffmpegType=ffmpegHead.headers.get("content-type")||"",ffmpegLength=Number(ffmpegHead.headers.get("content-length")||0);
if(!ffmpegHead.ok)fail("FFMPEG_RUNTIME_HTTP",String(ffmpegHead.status));else if(!ffmpegType.includes("application/wasm"))fail("FFMPEG_RUNTIME_MIME",ffmpegType);else if(ffmpegLength<=25*1024*1024)fail("FFMPEG_RUNTIME_LENGTH",String(ffmpegLength));

const signatureGroups=new Map();
for(const tool of registry){const js=await fs.readFile(path.join(dist,"_mm530",tool.id,"tool.js"),"utf8").catch(()=>"");const imports=[...js.matchAll(/["'](\/(?:vendor|assets\/vendor)\/[^"']+)["']/g)].map(x=>x[1]).sort();if(imports.length){const sig=imports.join("|");if(!signatureGroups.has(sig))signatureGroups.set(sig,{id:tool.id,imports})}}
const selected=new Set(categories.map(c=>registry.find(x=>x.category===c)?.id).filter(Boolean));
for(const v of signatureGroups.values())selected.add(v.id);
for(const id of ["TOOL-0151","TOOL-0164","TOOL-0370","TOOL-0349","TOOL-0350"])selected.add(id);

const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
async function noOverflow(label){const result=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));if(result.sw>result.cw+2)fail("HORIZONTAL_OVERFLOW",`${label}: ${result.sw} > ${result.cw}`)}
for(const p of ["/advancetools/","/advancetools/web-tools/",...categories.map(c=>`/advancetools/web-tools/${c}/`)]){
 pageErrors.length=0;const res=await page.goto(base+p,{waitUntil:"domcontentloaded",timeout:30000});if(!res?.ok())fail("BROWSER_DISCOVERY_HTTP",`${p}: ${res?.status()}`);await noOverflow(p);if(pageErrors.length)fail("BROWSER_DISCOVERY_ERROR",`${p}: ${pageErrors.join(" | ")}`);
}
await page.goto(base+"/advancetools/web-tools/",{waitUntil:"domcontentloaded"});const search=page.locator("#search");if(await search.count()){await search.fill(registry[0].title);await page.waitForTimeout(150);const href=await page.locator("#web-tool-search-results a").first().getAttribute("href").catch(()=>null);if(href!==registry[0].route)fail("DISCOVERY_SEARCH",`expected ${registry[0].route}, got ${href}`)}else fail("DISCOVERY_SEARCH_CONTROL","search input missing");

for(const id of selected){const tool=registry.find(x=>x.id===id);if(!tool)continue;pageErrors.length=0;const res=await page.goto(base+tool.route,{waitUntil:"domcontentloaded",timeout:30000});if(!res?.ok()){fail("BROWSER_LEAF_HTTP",`${id}: ${res?.status()}`);continue}try{await page.locator(".mm530-tool-page").waitFor({state:"visible",timeout:15000});const frame=page.frameLocator(".mm530-frame");await frame.locator("body").waitFor({state:"attached",timeout:15000});const text=await frame.locator("body").innerText({timeout:10000});if(text.trim().length<20)fail("IFRAME_EMPTY",id);await noOverflow(tool.route)}catch(error){fail("BROWSER_RUNTIME_LOAD",`${id}: ${error instanceof Error?error.message:String(error)}`)}
 if(pageErrors.length)fail("BROWSER_PAGE_ERROR",`${id}: ${pageErrors.join(" | ")}`);
 if(id==="TOOL-0349"||id==="TOOL-0350")skipped.push({id,status:"SKIPPED_EXTERNAL_DEVICE",reason:"Runtime shell and permissions verified; no physical camera/microphone/display device required in CI."});
 else checks.push({id,status:"PASS"});
}
await browser.close();

const screen=await fetch(base+"/editors/screen-recorder-online"),cam=await fetch(base+"/validators/webcam-mic-test");
const screenPolicy=screen.headers.get("permissions-policy")||"",camPolicy=cam.headers.get("permissions-policy")||"";
if(!/camera=\(self\)/.test(screenPolicy)||!/microphone=\(self\)/.test(screenPolicy)||!/display-capture=\(self\)/.test(screenPolicy))fail("SCREEN_RECORDER_PERMISSIONS",screenPolicy);
if(!/camera=\(self\)/.test(camPolicy)||!/microphone=\(self\)/.test(camPolicy))fail("WEBCAM_PERMISSIONS",camPolicy);
const normal=await fetch(base+registry.find(x=>x.id==="TOOL-0001").route),normalPolicy=normal.headers.get("permissions-policy")||"";
if(/camera=\(self\)/.test(normalPolicy))fail("UNSCOPED_CAMERA_PERMISSION",normalPolicy);

const status=failures.length?"BLOCKED":"PASS";
const report={schema_version:"MM530_PHASE10_BROWSER_REPORT_V1",status,all_leaf_routes_http_checked:registry.length,all_runtime_entrypoints_checked:registry.length,discovery_pages_browser_checked:categories.length+2,representative_runtime_browser_checks:checks.length,material_runtime_signatures:signatureGroups.size,device_fallbacks:skipped,failures};
await fs.writeFile(path.join(out,"browser-report.json"),JSON.stringify(report,null,2)+"\n");
console.log("MM530_PHASE10_BROWSER_RESULT="+JSON.stringify({status,failures:failures.length,leafRoutes:registry.length,runtimeEntrypoints:registry.length,browserChecks:checks.length,signatures:signatureGroups.size,skipped:skipped.length}));
if(failures.length){console.error(JSON.stringify(failures.slice(0,100),null,2));process.exitCode=1}
