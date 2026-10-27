import fs from "node:fs/promises";
import path from "node:path";

const root=process.cwd(),dist=path.join(root,"dist"),out=path.join(root,"reports/mm530-phase9"),origin="https://aafnaipatro.com";
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const read=async p=>fs.readFile(p,"utf8");
const exists=async p=>{try{return (await fs.stat(p)).isFile()}catch{return false}};
const registry=JSON.parse(await read(path.join(root,"src/mm530/mm530-registry.json"))).tools;
const runtime=JSON.parse(await read(path.join(dist,"_mm530/manifest.json")));
const phase7=JSON.parse(await read(path.join(root,"data/mm530/phase7/category-manifest.json")));
const advanced=JSON.parse(await read(path.join(dist,"advancetools/module-manifest.json")));
const blockers=[];
const assert=(ok,code,detail)=>{if(!ok)blockers.push({code,detail})};
const decodeAttr=value=>String(value||"").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const attr=(tag,name)=>{
 const m=String(tag||"").match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,"i"));
 return decodeAttr(m?.[1]??m?.[2]??"").trim();
};
const tagContent=(html,selector)=>{
 if(selector==="title")return decodeAttr(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||"").trim();
 const specs={
  description:["meta","name","description","content"],
  canonical:["link","rel","canonical","href"],
  ogurl:["meta","property","og:url","content"],
  ogtitle:["meta","property","og:title","content"],
  twitter:["meta","name","twitter:title","content"],
  robots:["meta","name","robots","content"]
 };
 const spec=specs[selector];if(!spec)return"";
 const [element,keyAttr,keyValue,valueAttr]=spec;
 const tags=html.match(new RegExp(`<${element}\\b[^>]*>`,"gi"))||[];
 const tag=tags.find(x=>attr(x,keyAttr).toLowerCase()===keyValue.toLowerCase())||"";
 return attr(tag,valueAttr);
};
const visible=html=>html.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const internal=/(?:TEST_PENDING|Mission Mangal|MM530|TOOL-\d{4}|\bbatch\s*0?\d+\b|source preparation|prepared source|pre-publication|runtime QA|runtime validation pending|publication pending|publication action|draft research tool|source checkpoint|\bQA-approved\b|\bstaged(?:\s+only)?\b|Staging\s*:?[\s-]*noindex|not published|no product tests|reserved tool routes?)/i;

assert(registry.length===530,"REGISTRY_COUNT",`expected 530, got ${registry.length}`);
assert(new Set(registry.map(x=>x.id)).size===530,"DUPLICATE_ID","registry IDs are not unique");
assert(new Set(registry.map(x=>x.route)).size===530,"DUPLICATE_ROUTE","canonical routes are not unique");
assert(phase7.categories?.length===12,"CATEGORY_COUNT",`expected 12, got ${phase7.categories?.length}`);
assert(runtime.routes?.length===530,"RUNTIME_MANIFEST_COUNT",`expected 530 runtime routes, got ${runtime.routes?.length}`);
assert((runtime.failures?.length||0)===0,"RUNTIME_BUILD_FAILURES",JSON.stringify(runtime.failures||[]).slice(0,4000));
const runtimeById=new Map((runtime.routes||[]).map(x=>[x.id,x]));
const hubPath=path.join(dist,"advancetools/web-tools/index.html"),hub=await read(hubPath).catch(()=>null);
assert(Boolean(hub),"DISCOVERY_HUB_MISSING","/advancetools/web-tools/ index missing");
const oldCollections=["knittingcalculators","chordlibrary","workshopreference","fontconverters","printablepaper"];
for(const c of oldCollections)assert(await exists(path.join(dist,"advancetools",c,"index.html")),"ADVANCED_COLLECTION_MISSING",c);
for(const c of phase7.categories||[])assert(await exists(path.join(dist,"advancetools/web-tools",c.key,"index.html")),"CATEGORY_PAGE_MISSING",c.key);
assert(advanced.counts?.webTools===530,"ADVANCED_WEB_TOOL_COUNT",`module manifest says ${advanced.counts?.webTools}`);
assert(advanced.counts?.webToolCategories===12,"ADVANCED_CATEGORY_COUNT",`module manifest says ${advanced.counts?.webToolCategories}`);
assert(advanced.pages>=2029,"ADVANCED_EXISTING_PAGE_REGRESSION",`advanced module has only ${advanced.pages} pages`);

const titles=new Map(),descriptions=new Map(),seoRows=[],crawlerRows=[];let runtimeBytes=0,leafBytes=0,referenceRetention=0,limitationRetention=0,editorialLeaves=0;
for(const tool of registry){
 const row=runtimeById.get(tool.id);assert(Boolean(row?.description)&&row.description.length>=70&&row.description.length<=165,"RUNTIME_DESCRIPTION_LENGTH",`${tool.id}: ${row?.description?.length||0}`);const runtimeDir=path.join(dist,"_mm530",tool.id),pagePath=path.join(runtimeDir,"page.html"),jsPath=path.join(runtimeDir,"tool.js"),leafPath=path.join(dist,tool.route.replace(/^\//,"")+".html");
 assert(await exists(pagePath),"RUNTIME_PAGE_MISSING",tool.id);assert(await exists(jsPath),"RUNTIME_JS_MISSING",tool.id);assert(await exists(leafPath),"LEAF_SHELL_MISSING",tool.route);
 if(!(await exists(pagePath))||!(await exists(leafPath)))continue;
 const [runtimeHtml,leafHtml,sourceHtml]=await Promise.all([read(pagePath),read(leafPath),read(path.join(root,tool.sourceDir,"page.html")).catch(()=>"")]);
 runtimeBytes+=(await fs.stat(pagePath)).size+(await fs.stat(jsPath)).size;leafBytes+=(await fs.stat(leafPath)).size;
 const expected=origin+tool.route,title=tagContent(leafHtml,"title"),desc=tagContent(leafHtml,"description"),canonical=tagContent(leafHtml,"canonical"),ogurl=tagContent(leafHtml,"ogurl"),robots=tagContent(leafHtml,"robots");
 assert(Boolean(title),"SEO_TITLE_MISSING",tool.id);assert(Boolean(desc),"SEO_DESCRIPTION_MISSING",tool.id);assert(desc.length>=70&&desc.length<=165,"SEO_DESCRIPTION_LENGTH",`${tool.id}: ${desc.length}`);assert(canonical===expected,"CANONICAL_MISMATCH",`${tool.id}: ${canonical}`);assert(ogurl===expected,"OG_URL_MISMATCH",`${tool.id}: ${ogurl}`);assert(!/noindex/i.test(robots),"LEAF_NOINDEX",tool.id);assert(Boolean(tagContent(leafHtml,"ogtitle")),"OG_TITLE_MISSING",tool.id);assert(Boolean(tagContent(leafHtml,"twitter")),"TWITTER_TITLE_MISSING",tool.id);
 const previous=titles.get(title);if(previous)assert(false,"DUPLICATE_TITLE",`${tool.id} and ${previous}: ${title}`);else titles.set(title,tool.id);
 const previousDescription=descriptions.get(desc);if(previousDescription)assert(false,"DUPLICATE_DESCRIPTION",`${tool.id} and ${previousDescription}`);else descriptions.set(desc,tool.id);
 assert(leafHtml.includes('data-mm530-static-fallback="1"'),"STATIC_FALLBACK_MISSING",tool.id);
 assert(leafHtml.includes(`<h1>${tool.title.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</h1>`)||visible(leafHtml).includes(tool.title),"STATIC_H1_MISSING",tool.id);
 const leafVisible=visible(leafHtml),leafStat=await fs.stat(leafPath);
 const frameMatches=[...leafHtml.matchAll(/<iframe\\b[^>]*class=["'][^"']*mm530-frame[^"']*["'][^>]*>/gi)];
 assert(frameMatches.length===1,"CRAWLER_DIRECT_RUNTIME",tool.id+": expected exactly one tool iframe, found "+frameMatches.length);
 assert(frameMatches[0]?.[0]?.includes('/_mm530/'+tool.id+'/page.html'),"CRAWLER_RUNTIME_TARGET",tool.id);
 const outerModuleScripts=[...leafHtml.matchAll(/<script\\b[^>]*type=["']module["'][^>]*src=/gi)];
 assert(outerModuleScripts.length===0,"CRAWLER_SPA_BOOT",tool.id+": canonical leaf still requires outer SPA JavaScript");
 assert(leafVisible.length>=220,"CRAWLER_VISIBLE_CONTENT_THIN",tool.id+": "+leafVisible.length+" visible characters");
 assert(leafStat.size<180*1024,"CRAWLER_HTML_BUDGET",tool.id+": "+leafStat.size+" bytes");
 assert(!internal.test(leafVisible),"CRAWLER_INTERNAL_COPY",tool.id);
 assert(!/research\\/sources\\.json|examples\\/fixtures\\.json/i.test(leafVisible),"CRAWLER_INTERNAL_REFERENCE",tool.id);
 const relatedStatic=[...leafHtml.matchAll(/<a\\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(x=>x[1]).filter(href=>registry.some(x=>x.route===href));
 assert(relatedStatic.length>=Math.min(3,registry.filter(x=>x.category===tool.category&&x.id!==tool.id).length),"CRAWLER_RELATED_LINKS",tool.id+": "+relatedStatic.length);
 const hasEditorial=leafHtml.includes('data-mm530-editorial="1"');
 if(hasEditorial)editorialLeaves++;
 const runtimeEditorialHeadings=(runtimeHtml.match(/<h[23]\\b/gi)||[]).length;
 if(runtimeEditorialHeadings>=2)assert(hasEditorial,"CRAWLER_EDITORIAL_LOST",tool.id+": runtime has "+runtimeEditorialHeadings+" editorial headings");
 assert(/"@type":"WebPage"/.test(leafHtml)&&/"mainEntity":\\{"@id":/.test(leafHtml)&&/"@type":"WebApplication"/.test(leafHtml),"CRAWLER_SCHEMA_GRAPH",tool.id);
 crawlerRows.push({id:tool.id,route:tool.route,htmlBytes:leafStat.size,visibleChars:leafVisible.length,relatedToolLinks:relatedStatic.length,hasEditorial,outerModuleScripts:outerModuleScripts.length});
 const runtimeCanonical=tagContent(runtimeHtml,"canonical");assert(runtimeCanonical===expected,"RUNTIME_CANONICAL_MISMATCH",tool.id);assert(!internal.test(visible(runtimeHtml)),"PUBLIC_INTERNAL_COPY",tool.id);
 const runtimeScriptMatches=[...runtimeHtml.matchAll(/<script\\b[^>]*src=["']\\.\\/tool\\.js["'][^>]*><\\/script>/gi)];
 assert(runtimeScriptMatches.length===1,"RUNTIME_SCRIPT_ATTACHMENT",tool.id+": "+runtimeScriptMatches.length+" runtime script tags");
 assert(!/research\\/sources\\.json|examples\\/fixtures\\.json/i.test(visible(runtimeHtml)),"INTERNAL_SOURCE_REFERENCE",tool.id);
 const rawReferenceLabels=[...runtimeHtml.matchAll(/<a\\b[^>]*>\\s*(https?:\\/\\/[^<]+)<\\/a>/gi)];
 assert(rawReferenceLabels.length===0,"RAW_REFERENCE_LABEL",tool.id+": "+rawReferenceLabels.length+" raw URL labels");
 if(/references?/i.test(visible(sourceHtml))){assert(/references?/i.test(visible(runtimeHtml)),"REFERENCES_LOST",tool.id);referenceRetention++}
 if(/limitations?/i.test(visible(sourceHtml))){assert(/limitations?/i.test(visible(runtimeHtml)),"LIMITATIONS_LOST",tool.id);limitationRetention++}
 if(hub)assert(hub.includes(tool.route),"DISCOVERY_LINK_MISSING",tool.id);
 const categoryHtml=await read(path.join(dist,"advancetools/web-tools",tool.category,"index.html")).catch(()=>"");assert(categoryHtml.includes(tool.route),"CATEGORY_LINK_MISSING",tool.id);
 seoRows.push({id:tool.id,route:tool.route,title,descriptionLength:desc.length,canonical});
}

const mmSitemap=await read(path.join(dist,"sitemap-mm530.xml")).catch(()=>"");const rootSitemap=await read(path.join(dist,"sitemap.xml")).catch(()=>"");
for(const tool of registry){const url=origin+tool.route;const occurrences=mmSitemap.split(url).length-1;assert(occurrences===1,"SITEMAP_CANONICAL_COUNT",`${tool.id}: ${occurrences}`)}
assert(rootSitemap.includes(origin+"/sitemap-mm530.xml"),"ROOT_SITEMAP_INTEGRATION","root sitemap index missing MM530 child");
assert(!hub?.includes("/_mm530/"),"DISCOVERY_EAGER_RUNTIME","web-tools hub references runtime assets directly");
const ffmpegDir=path.join(dist,"assets/vendor/ffmpeg"),ffmpegOriginal=path.join(ffmpegDir,"ffmpeg-core.wasm"),ffmpegManifestPath=path.join(ffmpegDir,"ffmpeg-core.wasm.parts.json");
assert(!(await exists(ffmpegOriginal)),"FFMPEG_ASSET_TOO_LARGE","unsplit ffmpeg-core.wasm must not be emitted");
assert(await exists(ffmpegManifestPath),"FFMPEG_PART_MANIFEST_MISSING","split FFmpeg manifest missing");
if(await exists(ffmpegManifestPath)){
 const manifest=JSON.parse(await read(ffmpegManifestPath));assert(Array.isArray(manifest.parts)&&manifest.parts.length>=2,"FFMPEG_PARTS_INVALID","expected at least two FFmpeg parts");
 let sum=0;for(const part of manifest.parts||[]){const rel=String(part.url||"").replace(/^\/+/, ""),p=path.join(dist,rel);const st=await fs.stat(p).catch(()=>null);assert(Boolean(st),"FFMPEG_PART_MISSING",String(part.url));if(st){assert(st.size<25*1024*1024,"FFMPEG_PART_TOO_LARGE",`${part.url}: ${st.size}`);assert(st.size===Number(part.bytes),"FFMPEG_PART_SIZE_MISMATCH",String(part.url));sum+=st.size}}
 assert(sum===Number(manifest.totalBytes),"FFMPEG_TOTAL_SIZE_MISMATCH",`${sum} != ${manifest.totalBytes}`);
}

async function dirBytes(p){let total=0;try{for(const e of await fs.readdir(p,{withFileTypes:true})){const x=path.join(p,e.name);total+=e.isDirectory()?await dirBytes(x):(await fs.stat(x)).size}}catch{}return total}
const representative={light:"TOOL-0001",pdf:"TOOL-0151",spreadsheet:"TOOL-0370",media:"TOOL-0164"};
const advancedLandingHtmlBytes=(await fs.stat(path.join(dist,"advancetools/index.html"))).size,webToolsHubHtmlBytes=(await fs.stat(hubPath)).size;
const advancedSharedAssetBytes=await dirBytes(path.join(dist,advanced.assetPrefix.replace(/^\//,"")));
const viteAssetsDir=path.join(dist,"assets");let viteChunks=[];try{for(const name of await fs.readdir(viteAssetsDir)){const p=path.join(viteAssetsDir,name),st=await fs.stat(p);if(st.isFile()&&/\.(?:m?js|css)$/.test(name))viteChunks.push({file:name,bytes:st.size})}}catch{}viteChunks.sort((a,b)=>b.bytes-a.bytes);
const perf={advancedLandingHtmlBytes,webToolsHubHtmlBytes,advancedSharedAssetBytes,advancedLandingPayloadBytes:advancedLandingHtmlBytes+advancedSharedAssetBytes,webToolsHubPayloadBytes:webToolsHubHtmlBytes+advancedSharedAssetBytes,runtimeHtmlJsTotalBytes:runtimeBytes,leafShellTotalBytes:leafBytes,viteTopChunks:viteChunks.slice(0,20),representative:{},sharedVendorBytes:{}};
const fiveMb=5*1024*1024;
assert(perf.advancedLandingPayloadBytes<fiveMb,"ADVANCED_LANDING_PAYLOAD",`${perf.advancedLandingPayloadBytes} bytes >= 5 MB`);
assert(perf.webToolsHubPayloadBytes<fiveMb,"WEB_TOOLS_HUB_PAYLOAD",`${perf.webToolsHubPayloadBytes} bytes >= 5 MB`);
for(const chunk of viteChunks)assert(chunk.bytes<fiveMb,"VITE_CHUNK_OVER_5MB",`${chunk.file}: ${chunk.bytes} bytes`);
for(const [kind,id] of Object.entries(representative))perf.representative[kind]={id,bytes:await dirBytes(path.join(dist,"_mm530",id))};
for(const [name,p] of Object.entries({pdfjs:"vendor/pdfjs",pdfLib:"vendor/pdf-lib",ffmpeg:"assets/vendor/ffmpeg",sqljs:"assets/vendor/sqljs",mathjax:"vendor/mathjax",sheetjs:"assets/vendor/sheetjs"}))perf.sharedVendorBytes[name]=await dirBytes(path.join(dist,p));

const routeReport={schema_version:"MM530_PHASE9_ROUTE_REPORT_V1",registry:registry.length,unique_ids:new Set(registry.map(x=>x.id)).size,unique_routes:new Set(registry.map(x=>x.route)).size,categories:phase7.categories?.length||0,discovery_hub:Boolean(hub),existing_advanced_collections:oldCollections,advanced_pages:advanced.pages,runtime_routes:runtime.routes?.length||0,canonical_leaf_shells:seoRows.length};
const seoReport={schema_version:"MM530_PHASE9_SEO_REPORT_V1",tools_checked:seoRows.length,unique_titles:titles.size,unique_descriptions:descriptions.size,static_fallbacks:seoRows.length,reference_pages_checked:referenceRetention,limitation_pages_checked:limitationRetention,sitemap_urls:registry.length,rows:seoRows};
const crawlerReport={schema_version:"MM530_CRAWLER_SEO_GATE_V1",status:blockers.some(x=>/^CRAWLER_/.test(x.code))?"BLOCKED":"PASS",tools_checked:crawlerRows.length,standalone_static_shells:crawlerRows.filter(x=>x.outerModuleScripts===0).length,direct_runtime_iframes:crawlerRows.length,editorial_leaves:editorialLeaves,rows:crawlerRows};
const buildReport={schema_version:"MM530_PHASE9_BUILD_REPORT_V1",runtime_manifest_routes:runtime.routes?.length||0,runtime_failures:runtime.failures||[],typescript_and_vite:"PASSED_BEFORE_THIS_POSTBUILD_VERIFIER",static_leaf_shells:seoRows.length,advanced_tool_pages:advanced.pages};
const performanceReport={schema_version:"MM530_PHASE9_PERFORMANCE_REPORT_V1",measured_from:"dist",...perf,discovery_runtime_eager:false};
const status=blockers.length?"BLOCKED":"PHASE_9_PASS",gate={schema_version:"MM530_PHASE9_GATE_V1",status,tools:registry.length,blocker_count:blockers.length,routing:blockers.some(x=>/ROUTE|MISSING|DISCOVERY|CATEGORY/.test(x.code))?"FAIL":"PASS",seo:blockers.some(x=>/SEO|CANONICAL|TITLE|SITEMAP|REFERENCES|LIMITATIONS|INTERNAL/.test(x.code))?"FAIL":"PASS",runtime_assets:blockers.some(x=>/RUNTIME/.test(x.code))?"FAIL":"PASS",performance_measured:true,publication:false};
const summary={schema_version:"MM530_PHASE9_SUMMARY_V1",status,tools:registry.length,categories:phase7.categories?.length||0,existing_advanced_collections:oldCollections.length,blockers:blockers.length,publication:false};
for(const [name,data] of Object.entries({"build-report.json":buildReport,"route-report.json":routeReport,"seo-report.json":seoReport,"crawler-seo-report.json":crawlerReport,"performance-report.json":performanceReport,"blockers.json":blockers,"gate.json":gate,"summary.json":summary}))await fs.writeFile(path.join(out,name),JSON.stringify(data,null,2)+"\n");
console.log("MM530_PHASE9_RESULT="+JSON.stringify({status,blockers:blockers.length,tools:registry.length,advancedPages:advanced.pages,performance:perf}));
if(blockers.length){console.error(JSON.stringify(blockers.slice(0,100),null,2));process.exitCode=1}
