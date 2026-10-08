import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
export function comparePublishedUrls(baseline,candidate){
 const before=new Set(baseline),after=new Set(candidate);
 return {baseline_count:before.size,candidate_count:after.size,removed:[...before].filter(path=>!after.has(path)).sort(),added:[...after].filter(path=>!before.has(path)).sort()};
}
export async function verifyPublishedUrls(directory="public"){
 const baseline=JSON.parse(await readFile("seo/published-url-baseline.json","utf8"));
 if(baseline.schema!==1||baseline.url_count!==baseline.paths.length||baseline.paths.length<22000)throw new Error("Invalid published URL baseline");
 const root=resolve(directory);const index=await readFile(resolve(root,"sitemap.xml"),"utf8");
 const paths=new Set();let children=0;
 for(const match of index.matchAll(/<loc>([^<]+)<\/loc>/g)){
  const url=new URL(match[1].replace(/&amp;/g,"&"));
  if(url.origin!==baseline.origin||!/^\/sitemap[\w-]*\.xml$/.test(url.pathname))throw new Error("Unexpected sitemap child: "+url);
  const xml=await readFile(resolve(root,url.pathname.slice(1)),"utf8");
  if(!xml.includes("<urlset"))throw new Error("Not a URL sitemap: "+url);
  children++;
  for(const entry of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
   const page=new URL(entry[1].replace(/&amp;/g,"&"));if(page.origin!==baseline.origin||page.search||page.hash)throw new Error("Noncanonical candidate URL: "+page);
   paths.add(page.pathname);
  }
 }
 const result=comparePublishedUrls(baseline.paths,paths);
 const report={verified_at:new Date().toISOString(),directory,baseline_captured_at:baseline.captured_at,baseline_sha256:createHash("sha256").update(JSON.stringify(baseline.paths)).digest("hex"),sitemap_count:children,...result};
 await mkdir("reports",{recursive:true});await writeFile(`reports/url-preservation-${directory==="dist"?"dist":"source"}.json`,JSON.stringify(report,null,2)+"\n");
 if(result.removed.length)throw new Error(`URL preservation failed: ${result.removed.length} existing published URLs missing. First: ${result.removed.slice(0,5).join(", ")}`);
 console.log(`URL preservation passed: ${result.baseline_count} existing URLs retained; ${result.added.length} added; 0 removed (${directory}).`);
 return report;
}
if(process.argv[1]&&import.meta.url===new URL("file://"+resolve(process.argv[1])).href)await verifyPublishedUrls(process.argv[2]||"public");
