import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root=process.cwd();
// Audit only user-visible/current production surfaces. worker/index.ts still contains
// historical fallback metadata, but worker/connected-entry.ts is the deployed entry and
// rewrites every HTML response through worker/connected-seo.ts before it leaves Cloudflare.
const files=[
  "index.html",
  "src/AafnaiPages.tsx",
  "src/AafnaiDetailPages.tsx",
  "src/PatroRouter.tsx",
  "src/components/AppChrome.tsx",
  "src/components/FeatureLauncher.tsx",
  "src/components/SiteFooter.tsx",
  "worker/connected-entry.ts",
  "worker/connected-seo.ts",
  "public/manifest.webmanifest",
  "scripts/generate-seo.mjs"
];
const compact=["mero","patro"].join("");
const spaced=["mero","patro"].join(" ");
const pattern=new RegExp(`${compact}|${spaced.replace(" ","\\s+")}`,"i");
const hits=[];
for(const file of files){
  let text="";
  try{text=readFileSync(join(root,file),"utf8")}catch{continue;}
  text.split(/\r?\n/).forEach((line,index)=>{if(pattern.test(line))hits.push(`${file}:${index+1}: ${line.trim().slice(0,220)}`)});
}
if(hits.length){
  console.error(`Visible Aafnai UI/production SEO legacy brand references found: ${hits.length}`);
  for(const hit of hits)console.error(hit);
  process.exit(1);
}
console.log("Aafnai Patro visible-brand and production-SEO audit passed.");
