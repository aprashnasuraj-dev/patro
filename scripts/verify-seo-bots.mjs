const origin=(process.argv[2]||process.env.SEO_VERIFY_ORIGIN||"https://aafnaipatro.com").replace(/\/+$/,"");
const agents=["Googlebot","OAI-SearchBot","PerplexityBot","Claude-SearchBot"];
const failures=[];
const snapshots=[];
const extract=(html,re)=>html.match(re)?.[1]?.trim()||"";
const normalize=(html)=>html
  .replace(/dateModified\"\s*:\s*\"[^\"]+\"/g,'dateModified":"<dynamic>"')
  .replace(/accessed \d{4}-\d{2}-\d{2}/g,"accessed <date>")
  .replace(/\s+/g," ")
  .trim();

for(const ua of agents){
  const response=await fetch(origin+"/today",{headers:{"user-agent":ua,"accept":"text/html"},redirect:"manual"});
  const text=await response.text();
  const h1=extract(text,/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g,"").trim();
  const canonical=extract(text,/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)||extract(text,/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if(response.status!==200)failures.push(`${ua}: /today status ${response.status}`);
  if(response.status>=300&&response.status<400)failures.push(`${ua}: /today must never redirect`);
  if(!h1)failures.push(`${ua}: /today missing server-visible H1`);
  if(canonical!==origin+"/today")failures.push(`${ua}: /today canonical ${canonical||"missing"}`);
  if(!/(नेपाली|Nepali|Bikram|BS)/i.test(text))failures.push(`${ua}: /today missing calendar answer text`);
  if(/id=["']root["']\s*>\s*<\/div>/i.test(text))failures.push(`${ua}: received empty SPA shell`);
  if(!/Aafnai Patro|आफ्नै पात्रो/.test(text))failures.push(`${ua}: site identity missing`);
  snapshots.push({ua,html:normalize(text)});
  console.log(`${ua}: ${response.status} | H1=${JSON.stringify(h1.slice(0,120))} | canonical=${canonical}`);
}

if(snapshots.length){
  const baseline=snapshots[0].html;
  for(const item of snapshots.slice(1))if(item.html!==baseline)failures.push(`${item.ua}: bot-visible /today HTML differs from Googlebot after dynamic timestamp normalization`);
}

for(const path of ["/robots.txt","/llms.txt","/llms-full.txt","/ai.txt","/.well-known/agents.json","/.well-known/security.txt"]){
  const r=await fetch(origin+path,{headers:{"user-agent":"OAI-SearchBot"}});
  if(r.status!==200)failures.push(`${path}: status ${r.status}`);
}

const descriptor=await fetch(origin+"/mcp",{headers:{accept:"application/json"}});
if(descriptor.status!==200)failures.push(`/mcp: GET status ${descriptor.status}`);
else{
  const body=await descriptor.json().catch(()=>null);
  for(const tool of ["get_today","convert_date","get_festival"]){
    if(!body||!Array.isArray(body.tools)||!body.tools.some((x)=>String(x?.name||x)===tool))failures.push(`/mcp: ${tool} discovery missing`);
  }
}

const discovery=await fetch(origin+"/mcp",{
  method:"POST",
  headers:{"content-type":"application/json","MCP-Protocol-Version":"2026-07-28","Mcp-Method":"server/discover"},
  body:JSON.stringify({jsonrpc:"2.0",id:"seo-smoke",method:"server/discover",params:{}})
});
if(discovery.status!==200)failures.push(`/mcp: modern server/discover status ${discovery.status}`);
else{
  const body=await discovery.json().catch(()=>null);
  if(body?.result?.supportedVersions?.[0]!=="2026-07-28")failures.push("/mcp: modern discovery version mismatch");
}

const list=await fetch(origin+"/mcp",{
  method:"POST",
  headers:{"content-type":"application/json","MCP-Protocol-Version":"2026-07-28","Mcp-Method":"tools/list"},
  body:JSON.stringify({jsonrpc:"2.0",id:"seo-tools",method:"tools/list",params:{}})
});
if(list.status!==200)failures.push(`/mcp: modern tools/list status ${list.status}`);
else{
  const body=await list.json().catch(()=>null);
  for(const tool of ["get_today","convert_date","get_festival"]){
    if(!body?.result?.tools?.some((x)=>x?.name===tool))failures.push(`/mcp tools/list: ${tool} missing`);
  }
}

if(failures.length){for(const failure of failures)console.error("FAIL",failure);process.exit(1);}
console.log(`Bot-perspective verification passed for ${origin}: ${agents.join(", ")}.`);
console.log("Agent discovery files and MCP 2026-07-28 descriptor/discovery/tools-list are reachable.");
