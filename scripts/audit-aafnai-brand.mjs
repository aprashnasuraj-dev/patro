import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root=process.cwd();
// Audit current production-visible sources and every generator that emits crawlable HTML.
// Historical migration/runtime internals may still retain archival identifiers, but no public
// Aafnai Patro HTML or discovery asset may emit the retired product brand.
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
  "scripts/generate-seo.mjs",
  "scripts/prerender-seo.mjs",
  "scripts/prerender-days-seo.mjs",
  "scripts/enrich-calendar-month-seo.mjs",
  "scripts/emit-community-suites.mjs"
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
