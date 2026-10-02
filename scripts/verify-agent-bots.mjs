const origin=(process.argv[2]||process.env.SEO_SMOKE_ORIGIN||"").replace(/\/+$/,"");
if(!/^https?:\/\//.test(origin)){
  console.error("Usage: node scripts/verify-agent-bots.mjs https://aafnaipatro.com");
  process.exit(2);
}

const agents=["Googlebot","OAI-SearchBot","PerplexityBot","Claude-SearchBot"];
const results=[];

function normalizeHtml(html){
  return html
    .replace(/dateModified\"\s*:\s*\"[^\"]+\"/g,'dateModified":"<dynamic>"')
    .replace(/accessed \d{4}-\d{2}-\d{2}/g,"accessed <date>")
    .replace(/\s+/g," ")
    .trim();
}

for(const userAgent of agents){
  const response=await fetch(origin+"/today",{headers:{"user-agent":userAgent,accept:"text/html"},redirect:"manual"});
  const html=await response.text();
  if(response.status!==200)throw new Error(`${userAgent}: /today returned ${response.status}`);
  if(response.status>=300&&response.status<400)throw new Error(`${userAgent}: /today must not redirect`);
  if(!/<h1[\s>]/i.test(html))throw new Error(`${userAgent}: /today raw HTML has no H1`);
  if(!html.includes("Aafnai Patro")&&!html.includes("आफ्नै पात्रो"))throw new Error(`${userAgent}: Aafnai Patro identity missing`);
  if(!html.includes('rel="canonical" href="'+origin+'/today"'))throw new Error(`${userAgent}: /today does not self-canonicalize`);
  if(/<div\s+id="root"\s*>\s*<\/div>/i.test(html))throw new Error(`${userAgent}: bot received empty SPA shell instead of factual HTML`);
  results.push({userAgent,html:normalizeHtml(html),source:response.headers.get("x-patro-seo-source")||"dynamic"});
}

const baseline=results[0].html;
for(const result of results.slice(1)){
  if(result.html!==baseline)throw new Error(`${result.userAgent}: bot-visible /today HTML differs from Googlebot after dynamic timestamp normalization`);
}

for(const path of ["/llms.txt","/llms-full.txt","/ai.txt","/.well-known/agents.json","/.well-known/security.txt"]){
  const response=await fetch(origin+path,{headers:{"user-agent":"AafnaiPatroReleaseVerifier/1.0"}});
  if(!response.ok)throw new Error(`${path}: expected 2xx, got ${response.status}`);
}

const descriptor=await fetch(origin+"/mcp",{headers:{accept:"application/json"}});
if(!descriptor.ok)throw new Error(`/mcp descriptor returned ${descriptor.status}`);
const mcp=await descriptor.json();
for(const tool of ["get_today","convert_date","get_festival"]){
  if(!Array.isArray(mcp.tools)||!mcp.tools.some((item)=>typeof item==="string"?item===tool:item?.name===tool))throw new Error(`/mcp descriptor missing ${tool}`);
}

const discovery=await fetch(origin+"/mcp",{
  method:"POST",
  headers:{"content-type":"application/json","MCP-Protocol-Version":"2026-07-28","Mcp-Method":"server/discover"},
  body:JSON.stringify({jsonrpc:"2.0",id:"release-smoke",method:"server/discover",params:{}})
});
if(!discovery.ok)throw new Error(`MCP 2026 server/discover returned ${discovery.status}`);
const discoveryBody=await discovery.json();
if(discoveryBody?.result?.supportedVersions?.[0]!=="2026-07-28")throw new Error("MCP modern discovery did not advertise 2026-07-28");

console.log("Bot-perspective SEO/agent smoke passed for:",agents.join(", "));
for(const result of results)console.log(`- ${result.userAgent}: /today 200, source=${result.source}`);
console.log("Machine discovery and MCP descriptor/discovery are reachable.");
