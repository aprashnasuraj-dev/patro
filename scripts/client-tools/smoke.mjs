import{readFile,stat}from"node:fs/promises";import{resolve}from"node:path";import{loadClientTools}from"./catalog.mjs";
const tools=await loadClientTools();
if(tools.length!==550)throw new Error("Expected 550 client tools");
for(const t of tools){
 if(!t.slug.startsWith("/tool/"))throw new Error("Non-direct tool route "+t.slug);
 const p=resolve("dist",...t.slug.split("/").filter(Boolean),"index.html");
 await stat(p);
 const h=await readFile(p,"utf8");
 if(!h.includes('id="ct-tool"')||!h.includes("/client-tools/loader.mjs"))throw new Error("Dead shell "+t.slug);
 if(!h.includes('<link rel="canonical" href="https://aafnaipatro.com'+t.slug+'">'))throw new Error("Canonical mismatch "+t.slug);
 if(h.includes("/advancetools/tool/")||h.includes("/advancetools/tools/"))throw new Error("Nested tool route leaked "+t.slug);
}
for(const engine of["image350","finance350","dev350","audit200"]){
 const group=tools.filter(t=>t.engine===engine);
 if(!group.length)throw new Error("No "+engine+" tools");
 for(const t of group){
  const h=await readFile(resolve("dist",...t.slug.split("/").filter(Boolean),"index.html"),"utf8");
  if(!h.includes(`"engine":"${engine}"`)||!h.includes(`"operation":"${t.operation}"`)||!h.includes("Frequently asked questions")||!h.includes("Privacy"))throw new Error("350 smoke failed "+t.slug);
 }
}
if(tools.filter(t=>String(t.source_id||"").startsWith("AUDIT-")).length!==200)throw new Error("Audit200 smoke inventory mismatch");console.log("Client tools smoke PASS: 550 direct routes emitted; audit200 inventory 200/200");
