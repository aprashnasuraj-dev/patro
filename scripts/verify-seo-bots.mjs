const origin=(process.env.SEO_VERIFY_ORIGIN||"https://aafnaipatro.com").replace(/\/+$/,"");
const agents=["Googlebot","OAI-SearchBot","PerplexityBot","Claude-SearchBot"];
const failures=[];
const extract=(html,re)=>html.match(re)?.[1]?.trim()||"";

for(const ua of agents){
  const response=await fetch(origin+"/today",{headers:{"user-agent":ua,"accept":"text/html"},redirect:"manual"});
  const text=await response.text();
  const h1=extract(text,/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g,"").trim();
  const canonical=extract(text,/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)||extract(text,/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if(response.status!==200)failures.push(`${ua}: /today status ${response.status}`);
  if(!h1)failures.push(`${ua}: /today missing server-visible H1`);
  if(canonical!==origin+"/today")failures.push(`${ua}: /today canonical ${canonical||"missing"}`);
  if(!/(नेपाली|Nepali|Bikram|BS)/i.test(text))failures.push(`${ua}: /today missing calendar answer text`);
  if(/id=["']root["']\s*>\s*<\/div>/i.test(text))failures.push(`${ua}: received empty SPA shell`);
  console.log(`${ua}: ${response.status} | H1=${JSON.stringify(h1.slice(0,120))} | canonical=${canonical}`);
}

for(const path of ["/robots.txt","/llms.txt","/llms-full.txt","/ai.txt","/.well-known/agents.json","/.well-known/security.txt"]){
  const r=await fetch(origin+path,{headers:{"user-agent":"OAI-SearchBot"}});
  if(r.status!==200)failures.push(`${path}: status ${r.status}`);
}

const mcp=await fetch(origin+"/mcp",{headers:{accept:"application/json"}});
if(mcp.status!==200)failures.push(`/mcp: GET status ${mcp.status}`);
else{
  const body=await mcp.json().catch(()=>null);
  if(!body||!Array.isArray(body.tools)||!body.tools.some((x)=>String(x.name||x)==="get_today"))failures.push("/mcp: get_today discovery missing");
}

if(failures.length){for(const failure of failures)console.error("FAIL",failure);process.exit(1);}
console.log(`Bot-perspective verification passed for ${origin}.`);
