import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import process from "node:process";

const root=process.cwd();
const ignored=new Set([".git","node_modules","dist",".wrangler","coverage",".vite"]);
const binaryExt=new Set([".png",".jpg",".jpeg",".gif",".webp",".ico",".woff",".woff2",".ttf",".otf",".pdf",".zip",".gz",".mp3",".mp4",".webm",".sqlite",".db"]);
const compact=["mero","patro"].join("");
const spaced=["mero","patro"].join(" ");
const pattern=new RegExp(`${compact}|${spaced.replace(" ","\\s+")}`,"i");
const hits=[];

function visit(dir){
  for(const name of readdirSync(dir)){
    if(ignored.has(name))continue;
    const full=join(dir,name),info=statSync(full);
    if(info.isDirectory()){visit(full);continue;}
    if(binaryExt.has(extname(name).toLowerCase()))continue;
    let text;
    try{text=readFileSync(full,"utf8")}catch{continue;}
    if(text.includes("\u0000"))continue;
    const lines=text.split(/\r?\n/);
    lines.forEach((line,index)=>{if(pattern.test(line))hits.push(`${relative(root,full)}:${index+1}: ${line.trim().slice(0,220)}`)});
  }
}

visit(root);
if(hits.length){
  console.error(`Legacy brand references found: ${hits.length}`);
  for(const hit of hits)console.error(hit);
  process.exit(1);
}
console.log("Aafnai Patro brand audit passed: 0 legacy brand references.");
