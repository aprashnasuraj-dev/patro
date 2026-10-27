import{readFile,stat}from"node:fs/promises";import{resolve}from"node:path";
const tools=JSON.parse(await readFile("client-tools/tools.json","utf8"));
if(tools.length!==350)throw new Error("Expected 350 client tools");
for(const t of tools){
 if(!t.slug.startsWith("/tool/"))throw new Error("Non-direct tool route "+t.slug);
 const p=resolve("dist",...t.slug.split("/").filter(Boolean),"index.html");
 await stat(p);
 const h=await readFile(p,"utf8");
 if(!h.includes('id="ct-tool"')||!h.includes("/client-tools/loader.mjs"))throw new Error("Dead shell "+t.slug);
 if(!h.includes('<link rel="canonical" href="https://aafnaipatro.com'+t.slug+'">'))throw new Error("Canonical mismatch "+t.slug);
 if(h.includes("/advancetools/tool/")||h.includes("/advancetools/tools/"))throw new Error("Nested tool route leaked "+t.slug);
}
for(const engine of["image350","finance350","dev350"]){
 const group=tools.filter(t=>t.engine===engine);
 if(!group.length)throw new Error("No "+engine+" tools");
 for(const t of group){
  const h=await readFile(resolve("dist",...t.slug.split("/").filter(Boolean),"index.html"),"utf8");
  if(!h.includes(`"engine":"${engine}"`)||!h.includes(`"operation":"${t.operation}"`)||!h.includes("Frequently asked questions")||!h.includes("Privacy"))throw new Error("350 smoke failed "+t.slug);
 }
}
console.log("Client tools smoke PASS: every direct route emitted with live shell, canonical and engine config");
