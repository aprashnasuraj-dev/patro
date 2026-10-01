import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root=process.cwd();
const skip=new Set([".git","node_modules","dist",".wrangler","coverage"]);
const textExt=new Set([".ts",".tsx",".js",".mjs",".cjs",".json",".jsonc",".html",".css",".md",".txt",".xml",".yml",".yaml",".webmanifest",".py",".sql"]);
const legacyBrand=new RegExp("mero"+"\\s*"+"patro","gi");
const forbiddenAstroShell=/\/astro\/(?:index\.html|assets\/)/g;
const brandHits=[];
const shellHits=[];

async function walk(dir){
  for(const name of await readdir(dir)){
    if(skip.has(name))continue;
    const full=join(dir,name),info=await stat(full);
    if(info.isDirectory()){await walk(full);continue;}
    if(!textExt.has(extname(name))&&name!=="manifest.webmanifest")continue;
    let text;try{text=await readFile(full,"utf8")}catch{continue;}
    const rel=relative(root,full).replaceAll("\\","/");
    if(legacyBrand.test(text))brandHits.push(rel);
    legacyBrand.lastIndex=0;
    if(!rel.startsWith("docs/")&&!rel.startsWith("reference/")&&forbiddenAstroShell.test(text))shellHits.push(rel);
    forbiddenAstroShell.lastIndex=0;
  }
}
await walk(root);
if(brandHits.length)console.error("Legacy brand hits:\n"+brandHits.map(x=>" - "+x).join("\n"));
if(shellHits.length)console.error("Legacy astronomy-shell references in runtime source:\n"+shellHits.map(x=>" - "+x).join("\n"));
if(brandHits.length||shellHits.length)process.exit(1);
console.log("Aafnai audit passed: zero legacy-brand hits and zero runtime legacy astronomy-shell references.");
