// Read-only HTTP audit. This does not submit URLs or invoke deployment/build services.
import {writeFile,mkdir} from "node:fs/promises";
const origin=(process.argv[2]||"https://aafnaipatro.com").replace(/\/+$/,"");
const paths=["/","/today","/convert","/tools/nepali-typing","/tools/preeti-converter","/tools/age","/calendar/2083/06","/festivals","/guides","/guides/bs-ad-date-conversion","/robots.txt","/sitemap.xml","/sitemap-guides.xml","/sitemap-growth.xml",
 // International entry points: inspect crawler-facing HTML, not just sitemap membership.
 "/moon","/moon/london","/moon/new-york","/moon/kathmandu",
 "/eclipse/2027-08-02","/de/mond","/fr/lune","/es/luna","/it/luna",
 "/nepal/time","/nepal/trek-weather/everest-base-camp",
 "/us/diwali-2026","/weather/charikot","/missing-growth-audit-page"];
const agents=["Mozilla/5.0 (compatible; PatroGrowthAudit/1.0)","Googlebot","OAI-SearchBot"];
const results=[];let cursor=0;
const jobs=paths.flatMap(path=>agents.map(agent=>({path,agent})));
async function worker(){while(cursor<jobs.length){const {path,agent}=jobs[cursor++];const start=performance.now();try{
 const response=await fetch(origin+path,{headers:{"user-agent":agent},redirect:"follow",signal:AbortSignal.timeout(20000)});
 const text=await response.text();const type=response.headers.get("content-type")||"";
 const canonical=text.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]||text.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1]||null;
 const title=text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||null;
 const h1=text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,"")||null;
 const problems=[];const missing=path.includes("missing-growth");
 if(response.status!==(missing?404:200))problems.push(`status ${response.status}`);
 if(!missing&&!/\.(txt|xml)$/.test(path)&&response.status===200){if(!canonical)problems.push("missing canonical");else if(canonical!==origin+path)problems.push("canonical points to another route: "+canonical);if(!title||!h1)problems.push("missing server title/H1");if(/noindex/i.test(response.headers.get("x-robots-tag")||""))problems.push("noindex header on public page")}
 if(/\.xml$/.test(path)&&response.status===200&&!type.includes("xml"))problems.push("sitemap is not XML");
 results.push({path,agent,status:response.status,url:response.url,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),title,h1,canonical,type,problems});
 }catch(error){results.push({path,agent,error:error.message,problems:["request failed; distinguish network policy from origin failure"]})}}}
await Promise.all(Array.from({length:4},worker));
for(const path of paths){const rows=results.filter(row=>row.path===path&&row.status===200);const baseline=rows[0];if(baseline)for(const row of rows.slice(1)){if(row.canonical!==baseline.canonical||row.h1!==baseline.h1)row.problems.push("crawler/browser canonical or primary answer mismatch")}}

const report={checked_at:new Date().toISOString(),origin,notes:"HTTP timings are single observations, not Core Web Vitals. HTTP success/sitemap membership do not prove Google indexing; use authenticated Search Console URL Inspection for actual indexed status. 403 may originate from environment policy or site protection.",results:results.sort((a,b)=>a.path.localeCompare(b.path)||a.agent.localeCompare(b.agent))};
await mkdir("reports",{recursive:true});await writeFile("reports/growth-http-audit.json",JSON.stringify(report,null,2)+"\n");
for(const row of report.results)console.log(`${row.status||"ERR"} ${row.path} ${row.agent}: ${row.problems.join("; ")||"HTTP checks passed"}`);
if(results.some(row=>row.problems.length))process.exitCode=1;
