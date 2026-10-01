import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root=process.cwd();
const files=[
  "index.html",
  "src/AafnaiPages.tsx",
  "src/AafnaiDetailPages.tsx",
  "src/PatroRouter.tsx",
  "src/components/AppChrome.tsx",
  "src/components/SiteFooter.tsx",
  "public/manifest.webmanifest"
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
  console.error(`Visible Aafnai UI legacy brand references found: ${hits.length}`);
  for(const hit of hits)console.error(hit);
  process.exit(1);
}
console.log("Aafnai Patro visible-brand audit passed.");
