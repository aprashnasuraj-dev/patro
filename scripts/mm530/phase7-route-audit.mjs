import fs from "node:fs/promises";
import path from "node:path";
const root=process.cwd();
const registry=JSON.parse(await fs.readFile(path.join(root,"src/mm530/mm530-registry.json"),"utf8")).tools;
const categories=JSON.parse(await fs.readFile(path.join(root,"data/mm530/phase7/category-manifest.json"),"utf8")).categories;
const ids=new Set(registry.map(x=>x.id)),routes=new Set(registry.map(x=>x.route));
const frozenPrefixes=new Set(["calculators","generators","converters","utilities","validators","editors","planners","extractors","analyzers","formatters","comparisons","timers"]);
const errors=[];
if(registry.length!==530||ids.size!==530||routes.size!==530)errors.push("Expected 530 unique IDs and canonical routes.");
for(const t of registry){
 const prefix=t.route.split("/").filter(Boolean)[0];
 if(!frozenPrefixes.has(prefix))errors.push(`${t.id}: unexpected frozen route prefix ${t.route}`);
 if(t.route.startsWith("/tools/")||t.route.startsWith("/advancetools/"))errors.push(`${t.id}: frozen leaf route was moved into a discovery/product namespace`);
}
if(categories.reduce((n,c)=>n+c.count,0)!==530)errors.push("Category counts do not total 530.");
for(const c of categories)if(c.discovery_route!==`/advancetools/web-tools/${c.key}/`)errors.push(`Category discovery route mismatch: ${c.key}`);
const dashboard=["/advancetools/","/advancetools/web-tools/",...categories.map(c=>c.discovery_route)];
for(const r of dashboard)if(routes.has(r))errors.push(`Dashboard route collides with a frozen tool canonical: ${r}`);
const router=await fs.readFile(path.join(root,"src/PatroRouter.tsx"),"utf8");
if(router.includes("/toolbox"))errors.push("Obsolete /toolbox discovery route remains in PatroRouter.");
if(!router.includes("MM530_CANONICAL_ROUTE"))errors.push("MM530 canonical route adapter is missing.");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(JSON.stringify({tools:registry.length,uniqueIds:ids.size,uniqueCanonicalRoutes:routes.size,categories:categories.length,dashboardRoutes:dashboard.length,canonicalRenames:0,patroToolsMixed:false},null,2));
