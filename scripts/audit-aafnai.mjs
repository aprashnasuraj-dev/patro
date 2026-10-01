import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root=process.cwd();
const skip=new Set([".git","node_modules","dist",".wrangler","coverage"]);
const textExt=new Set([".ts",".tsx",".js",".mjs",".cjs",".json",".jsonc",".html",".css",".md",".txt",".xml",".yml",".yaml",".webmanifest",".py",".sql"]);
const legacyBrand=new RegExp("mero"+"\\s*"+"patro","gi");
const forbiddenAstroShell=/\/astro\/(?:index\.html|assets\/)/g;
const brandHits=[];
const shellHits=[];

function isDeployableRuntime(rel){
  return rel==="index.html" || rel==="vercel.json" || rel==="_routes.json" ||
    rel.startsWith("src/") || rel.startsWith("worker/") || rel.startsWith("public/") ||
    rel.startsWith("functions/") || rel.startsWith("scripts/");
}

async function walk(dir){
  for(const name of await readdir(dir)){
    if(skip.has(name))continue;
    const full=join(dir,name),info=await stat(full);
    if(info.isDirectory()){await walk(full);continue;}
    if(!textExt.has(extname(name))&&name!=="manifest.webmanifest")continue;
    const rel=relative(root,full).replaceAll("\\","/");
    if(!isDeployableRuntime(rel))continue;
    let text;try{text=await readFile(full,"utf8")}catch{continue;}
    if(legacyBrand.test(text))brandHits.push(rel);
    legacyBrand.lastIndex=0;
    if(forbiddenAstroShell.test(text))shellHits.push(rel);
    forbiddenAstroShell.lastIndex=0;
  }
}
await walk(root);
if(brandHits.length)console.error("Legacy brand hits in deployable runtime:\n"+brandHits.map(x=>" - "+x).join("\n"));
if(shellHits.length)console.error("Legacy astronomy-shell references in deployable runtime:\n"+shellHits.map(x=>" - "+x).join("\n"));
if(brandHits.length||shellHits.length)process.exit(1);
console.log("Aafnai audit passed: deployable runtime has zero legacy-brand hits and zero legacy astronomy-shell references.");
