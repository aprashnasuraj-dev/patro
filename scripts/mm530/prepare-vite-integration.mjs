import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const registry=JSON.parse(await fs.readFile(path.join(root,"src/mm530/mm530-registry.json"),"utf8")).tools;
const outRoot=path.join(root,"public/_mm530");

async function exists(p){try{await fs.access(p);return true}catch{return false}}
async function copyTree(src,dst){
  if(!await exists(src))return;
  const st=await fs.stat(src);
  if(st.isDirectory()){await fs.mkdir(dst,{recursive:true});for(const name of await fs.readdir(src))await copyTree(path.join(src,name),path.join(dst,name));return}
  if(/\.(?:ts|tsx)$/.test(src)||/[/\\](?:tests|research)[/\\]/.test(src)||/[/\\]tool\.json$/.test(src)||/[/\\]page\.html$/.test(src))return;
  await fs.mkdir(path.dirname(dst),{recursive:true});await fs.copyFile(src,dst);
}
async function copyRuntime(srcRel,dstRel){
  const src=path.join(root,srcRel),dst=path.join(root,"public",dstRel);if(!await exists(src))return;
  await fs.mkdir(path.dirname(dst),{recursive:true});const st=await fs.stat(src);if(st.isDirectory())await fs.cp(src,dst,{recursive:true});else await fs.copyFile(src,dst);
}
await fs.rm(outRoot,{recursive:true,force:true});await fs.mkdir(outRoot,{recursive:true});
await Promise.all([
  copyRuntime("node_modules/pdfjs-dist/legacy/build/pdf.mjs","vendor/pdfjs/pdf.mjs"),
  copyRuntime("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs","vendor/pdfjs/pdf.worker.mjs"),
  copyRuntime("node_modules/pdf-lib/dist/pdf-lib.esm.min.js","vendor/pdf-lib/pdf-lib.esm.min.js"),
  copyRuntime("node_modules/fonteditor-core/woff2/woff2.wasm","assets/vendor/fonteditor-core/woff2.wasm"),
  copyRuntime("node_modules/sql.js/dist/sql-wasm.wasm","assets/vendor/sqljs/sql-wasm.wasm"),
  copyRuntime("node_modules/@ffmpeg/core/dist/esm","assets/vendor/ffmpeg"),
  copyRuntime("node_modules/mathjax","vendor/mathjax")
]);
const sheetWrapper=path.join(root,"public/assets/vendor/sheetjs/xlsx-0.20.3/xlsx.mjs");
await fs.mkdir(path.dirname(sheetWrapper),{recursive:true});
await fs.writeFile(sheetWrapper,`await import('/_mm530/TOOL-0370/src/vendor/xlsx.bundle.js');const x=globalThis.XLSX;if(!x?.read||!x?.write||!x?.utils)throw new Error('Vendored SheetJS runtime unavailable');export const read=x.read;export const write=x.write;export const utils=x.utils;export default x;\n`);

const failures=[];
for(const tool of registry){
  const srcDir=path.join(root,tool.sourceDir),dst=path.join(outRoot,tool.id),entry=path.join(srcDir,"src/ui.ts"),page=path.join(srcDir,"page.html");
  try{
    if(!await exists(entry)||!await exists(page))throw new Error("missing src/ui.ts or page.html");
    await fs.mkdir(dst,{recursive:true});await copyTree(srcDir,dst);
    await build({entryPoints:[entry],bundle:true,format:"esm",platform:"browser",target:"es2022",outfile:path.join(dst,"tool.js"),logLevel:"silent",conditions:["browser","module","import"]});
    let html=await fs.readFile(page,"utf8");
    html=html.replace(/<script\b[^>]*type=["']module["'][^>]*src=["'][^"']*ui\.ts["'][^>]*><\/script>/i,'<script type="module" src="./tool.js"></script>');
    html=html.replace(/<script\b[^>]*src=["'][^"']*ui\.ts["'][^>]*><\/script>/i,'<script type="module" src="./tool.js"></script>');
    if(await exists(path.join(dst,"tool.css"))&&!html.includes("./tool.css"))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="./tool.css"></head>');
    await fs.writeFile(path.join(dst,"page.html"),html);
  }catch(error){failures.push({id:tool.id,error:error instanceof Error?error.message:String(error)})}
}
await fs.writeFile(path.join(outRoot,"manifest.json"),JSON.stringify({schemaVersion:1,tools:registry.length,generatedAt:new Date().toISOString(),failures},null,2));
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1}else console.log(`MM530 prepared: ${registry.length}/${registry.length} route bundles`);
