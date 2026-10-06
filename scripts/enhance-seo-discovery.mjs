import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=process.cwd();
const read=(path)=>readFile(resolve(root,path),"utf8");
const intents=JSON.parse(await read("public/search-intents.json"));
if(!(intents.query_count>=3000))throw new Error(`AI discovery augmentation requires >=3000 intents; got ${intents.query_count}`);

const START="# BEGIN AAFNAI SEARCH INTENTS";
const END="# END AAFNAI SEARCH INTENTS";
function replaceBlock(text,body){
 const block=`${START}\n${body.trim()}\n${END}`;
 const pattern=new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`,"m");
 return (pattern.test(text)?text.replace(pattern,block):`${text.trimEnd()}\n\n${block}\n`);
}

const llmsPath="public/llms.txt";
let llms=await read(llmsPath);
llms=replaceBlock(llms,[
 "## Search and AI query coverage",
 `- ${intents.query_count.toLocaleString("en-US")} Nepali, English and Romanized query variants map to useful canonical Aafnai Patro pages.`,
 "- The map does not create doorway pages; aliases resolve to the existing calendar, date, tool, community and diaspora pages.",
 "- Query map: https://aafnaipatro.com/search-intents.txt",
 "- Structured map: https://aafnaipatro.com/search-intents.json",
 "- Machine summary: https://aafnaipatro.com/.well-known/search-intents.json"
].join("\n"));

const fullPath="public/llms-full.txt";
let full=await read(fullPath);
const corpus=[
 "# Search and conversational intent aliases",
 `# ${intents.query_count} query variants; each line resolves to a canonical public page.`,
 ...intents.intents.map((row)=>`${row.query} -> https://aafnaipatro.com${row.route==="/"?"/":row.route}`)
].join("\n");
full=replaceBlock(full,corpus);

const aiPath="public/ai.txt";
let ai=await read(aiPath);
ai=replaceBlock(ai,[
 `Search-intent coverage: ${intents.query_count}`,
 "Search intent text map: https://aafnaipatro.com/search-intents.txt",
 "Search intent JSON map: https://aafnaipatro.com/search-intents.json",
 "Use the mapped canonical page as the citation target; do not cite the query map itself when a normal public page answers the question."
].join("\n"));

const agentsPath="public/.well-known/agents.json";
const agents=JSON.parse(await read(agentsPath));
agents.search_intents={
 count:intents.query_count,
 canonical_pages:intents.canonical_page_count,
 text:"https://aafnaipatro.com/search-intents.txt",
 json:"https://aafnaipatro.com/search-intents.json",
 well_known:"https://aafnaipatro.com/.well-known/search-intents.json"
};

const manifestPath="public/seo-manifest.json";
const manifest=JSON.parse(await read(manifestPath));
manifest.schema_version=Math.max(Number(manifest.schema_version||0),4);
manifest.search_intent_count=intents.query_count;
manifest.search_intent_target=intents.target_minimum;
manifest.search_intent_route_count=intents.canonical_page_count;
manifest.minimum_tool_intents=intents.minimum_tool_intents;
manifest.search_intents_json="https://aafnaipatro.com/search-intents.json";
manifest.search_intents_txt="https://aafnaipatro.com/search-intents.txt";
manifest.search_strategy="Thousands of user-query variants resolve to useful canonical pages; no thin doorway pages are created.";

await Promise.all([
 writeFile(resolve(root,llmsPath),llms,"utf8"),
 writeFile(resolve(root,fullPath),full,"utf8"),
 writeFile(resolve(root,aiPath),ai,"utf8"),
 writeFile(resolve(root,agentsPath),JSON.stringify(agents,null,2)+"\n","utf8"),
 writeFile(resolve(root,manifestPath),JSON.stringify(manifest,null,2)+"\n","utf8")
]);

console.log(`AI/search discovery augmented with ${intents.query_count} canonical query mappings.`);

// Build the canonical entity graph from the same validated registries and calendar sources,
// reconcile source-backed tool identities without publishing aliases/private tools, then fail
// the build on identity/canonical/private-route regressions before Vite copies public/ into dist/.
await import("./generate-publication-graph.mjs");
await import("./reconcile-tool-identities.mjs");
await import("./validate-publication-graph.mjs");
