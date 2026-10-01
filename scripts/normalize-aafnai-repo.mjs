import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root=process.cwd();
const skip=new Set([".git","node_modules","dist",".wrangler","coverage"]);
const textExt=new Set([".ts",".tsx",".js",".mjs",".cjs",".json",".jsonc",".html",".css",".md",".txt",".xml",".yml",".yaml",".webmanifest",".py",".sql"]);
const brand=new RegExp("mero"+"\\s*"+"patro","gi");
const oldShell="/astro/"+"index.html";
const oldAssets="/astro/"+"assets/";
const changed=[];

function shouldNormalize(rel){
  return rel==="index.html" || rel==="vercel.json" || rel==="_routes.json" ||
    rel.startsWith("src/") || rel.startsWith("worker/") || rel.startsWith("public/") ||
    rel.startsWith("functions/") || rel.startsWith("scripts/") || rel.startsWith("tests/");
}

async function walk(dir){
  for(const name of await readdir(dir)){
    if(skip.has(name))continue;
    const full=join(dir,name),info=await stat(full);
    if(info.isDirectory()){await walk(full);continue;}
    if(!textExt.has(extname(name))&&name!=="manifest.webmanifest")continue;
    const rel=relative(root,full).replaceAll("\\","/");
    if(!shouldNormalize(rel))continue;
    let text;try{text=await readFile(full,"utf8")}catch{continue;}
    const next=text.replace(brand,"आफ्नै पात्रो").replaceAll(oldShell,"/index.html").replaceAll(oldAssets,"/assets/");
    if(next!==text){await writeFile(full,next,"utf8");changed.push(rel);}
  }
}
await walk(root);
console.log("Normalized files:",changed.length);
for(const file of changed)console.log(" -",file);
