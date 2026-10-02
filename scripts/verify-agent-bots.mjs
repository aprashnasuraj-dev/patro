const origin=(process.argv[2]||process.env.SEO_VERIFY_ORIGIN||"https://aafnaipatro.com").replace(/\/+$/,"");
const agents=["Googlebot","OAI-SearchBot","PerplexityBot","Claude-SearchBot"];
const failures=[];
const snapshots=[];
const extract=(html,re)=>html.match(re)?.[1]?.trim()||"";

for(const ua of agents){
  const response=await fetch(origin+"/today",{headers:{"user-agent":ua,"accept":"text/html"},redirect:"manual"});
  const text=await response.text();
  const h1=extract(text,/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g,"").trim();
  const canonical=extract(text,/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)||extract(text,/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const answer=extract(text,/<p[^>]+class=["']fact["'][^>]*>([\s\S]*?)<\/p>/i).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  if(response.status!==200)failures.push(`${ua}: /today status ${response.status}`);
  if(!h1)failures.push(`${ua}: /today missing server-visible H1`);
  if(canonical!==origin+"/today")failures.push(`${ua}: /today canonical ${canonical||"missing"}`);
  if(!answer||!/(नेपाली|Nepali|Bikram|BS|=)/i.test(answer))failures.push(`${ua}: /today missing direct calendar answer`);
  if(/id=["']root["']\s*>\s*<\/div>/i.test(text))failures.push(`${ua}: received empty SPA shell`);
  snapshots.push({ua,h1,canonical,answer});
  console.log(`${ua}: ${response.status} | H1=${JSON.stringify(h1.slice(0,100))} | canonical=${canonical}`);
}
const baseline=snapshots[0];
for(const snap of snapshots.slice(1)){
  if(snap.canonical!==baseline.canonical||snap.answer!==baseline.answer)failures.push(`${snap.ua}: factual /today answer differs from ${baseline.ua}`);
}

for(const path of ["/robots.txt","/llms.txt","/llms-full.txt","/ai.txt","/.well-known/agents.json","/.well-known/security.txt"]){
  const r=await fetch(origin+path,{headers:{"user-agent":"OAI-SearchBot"}});
  if(r.status!==200)failures.push(`${path}: status ${r.status}`);
}

const discover=await fetch(origin+"/mcp",{
  method:"POST",headers:{"content-type":"application/json","accept":"application/json","MCP-Protocol-Version":"2026-07-28"},
  body:JSON.stringify({jsonrpc:"2.0",id:1,method:"server/discover",params:{_meta:{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}})
});
const discoverBody=await discover.json().catch(()=>null);
if(discover.status!==200||!discoverBody?.result?.supportedVersions?.includes("2026-07-28"))failures.push(`/mcp: modern server/discover failed (${discover.status})`);

const tools=await fetch(origin+"/mcp",{
  method:"POST",headers:{"content-type":"application/json","accept":"application/json","MCP-Protocol-Version":"2026-07-28"},
  body:JSON.stringify({jsonrpc:"2.0",id:2,method:"tools/list",params:{_meta:{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}})
});
const toolsBody=await tools.json().catch(()=>null);
const names=(toolsBody?.result?.tools||[]).map((x)=>x.name);
for(const name of ["get_today","convert_date","get_festival"])if(!names.includes(name))failures.push(`/mcp: missing tool ${name}`);

if(failures.length){for(const failure of failures)console.error("FAIL",failure);process.exit(1);}
console.log(`Bot + MCP production verification passed for ${origin}.`);
