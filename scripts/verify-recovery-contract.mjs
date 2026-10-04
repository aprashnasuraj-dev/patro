#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const fail=(m)=>{console.error("FAIL:",m);process.exitCode=1};
const ok=(m)=>console.log("OK:",m);

const required=[
 "package.json","wrangler.jsonc","src/PatroRouter.tsx","src/AafnaiPages.tsx",
 "src/patro-tools-integration/PatroToolsShell.tsx","worker/connected-entry.ts",
 "public/robots.txt","public/manifest.webmanifest"
];
for(const f of required) exists(f)?ok(f):fail(`missing ${f}`);

if(exists("package.json")){
 const pkg=JSON.parse(read("package.json"));
 const s=pkg.scripts||{};
 ["build","release:verify","deploy:cloudflare","cloudflare:validate"].forEach(k=>s[k]?ok(`script ${k}`):fail(`missing npm script ${k}`));
 if(JSON.stringify(pkg).toLowerCase().includes("vercel")) console.warn("WARN: package.json contains Vercel reference; review whether it is legacy-only.");
}

const tools=["astro","nepali-typing","preeti-converter","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","units","words","incometax","landconverter","nepaliqr","fuelprice","tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"];
if(exists("scripts/seo-config.mjs")){
 const seo=read("scripts/seo-config.mjs");
 for(const t of tools) seo.includes(`/tools/${t}`)?ok(`tool ${t}`):fail(`SEO inventory missing ${t}`);
}
if(exists("src/PatroRouter.tsx")){
 const r=read("src/PatroRouter.tsx");
 ["/time-machine","/on-this-day","/fm","/tv","/samachar","/tools/astro","/me"].forEach(x=>r.includes(x)?ok(`route ${x}`):fail(`router missing ${x}`));
 ["lhosar","tharu","mithila","kirat","hijri"].forEach(x=>r.includes(x)?ok(`community ${x}`):fail(`router missing community ${x}`));
 if(r.includes("compat/page")) fail("legacy compat iframe route detected");
}
if(exists("wrangler.jsonc")){
 const w=read("wrangler.jsonc");
 /binding["']?\s*:\s*["']DB["']/.test(w)||w.includes('"binding": "DB"')?ok("D1 DB binding"):console.warn("WARN: verify D1 DB binding manually");
}
console.log("\nExpected canonical public tool count:",tools.length);
if(process.exitCode) process.exit(process.exitCode);
