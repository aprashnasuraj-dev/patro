import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const root=process.cwd();
const dist=resolve(root,"dist");

async function htmlFiles(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
   const path=join(dir,entry.name);
   if(entry.isDirectory())out.push(...await htmlFiles(path));
   else if(entry.isFile()&&entry.name.endsWith(".html"))out.push(path);
 }
 return out;
}

function structuredData(html){
 return html.replace(/<script([^>]*\btype=["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi,(whole,attrs,payload)=>{
   try{
     const data=JSON.parse(payload);
     if(Array.isArray(data?.["@graph"])){
       data["@graph"]=data["@graph"].filter((node)=>node?.["@type"]!=="FAQPage"&&node?.["@type"]!=="HowTo").map((node)=>{
         if(node?.["@type"]==="WebPage")delete node.keywords;
         if(node?.["@type"]==="WebApplication")delete node.alternateName;
         return node;
       });
     }
     return `<script${attrs}>${JSON.stringify(data).replace(/</g,"\\u003c")}</script>`;
   }catch{return whole;}
 });
}

function cleanHtml(html){
 let out=html;
 out=out.replace(/<link\b[^>]*\bhreflang=["'][^"']+["'][^>]*>\s*/gi,"");
 out=out.replace(/<link\b[^>]*href=["']\/search-intents\.(?:json|txt)["'][^>]*>\s*/gi,"");
 out=out.replace(/<section\b[^>]*class=["'][^"']*seo-related-searches[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,"");
 out=out.replace(/<p><strong>सम्बन्धित नामहरू:<\/strong>[\s\S]*?<\/p>/gi,"");
 out=structuredData(out);
 return out;
}

const files=await htmlFiles(dist);
let changed=0;
for(const file of files){
 const before=await readFile(file,"utf8");
 const after=cleanHtml(before);
 if(after!==before){await writeFile(file,after,"utf8");changed++;}
 if(/\bhreflang=/i.test(after))throw new Error(`Invalid same-URL hreflang survived: ${file}`);
 if(/seo-related-searches|सम्बन्धित नामहरू:|यो सुविधा यस्ता नामले पनि खोजिन्छ/i.test(after))throw new Error(`Visible search-only copy survived: ${file}`);
 if(/"@type"\s*:\s*"(?:FAQPage|HowTo)"/.test(after))throw new Error(`Deprecated Google rich-result schema survived: ${file}`);
}
if(files.length<100)throw new Error(`SEO sanitizer saw unexpectedly few HTML files: ${files.length}`);

async function sanitizeSitemap(path){
 let xml;try{xml=await readFile(path,"utf8");}catch{return false;}
 let out=xml;
 if(basename(path)==="sitemap.xml")out=out.replace(/(<sitemap><loc>[^<]+<\/loc>)<lastmod>[^<]+<\/lastmod>(<\/sitemap>)/g,"$1$2");
 if(basename(path)==="sitemap-pages.xml")out=out.replace(/(<loc>https:\/\/aafnaipatro\.com\/(?:fm|tv)<\/loc>)<lastmod>[^<]+<\/lastmod>/g,"$1");
 if(out!==xml)await writeFile(path,out,"utf8");
 return true;
}
for(const name of ["sitemap.xml","sitemap-pages.xml"]){
 await sanitizeSitemap(resolve(root,"public",name));
 await sanitizeSitemap(resolve(root,"dist",name));
}

console.log(`White-hat SEO output sanitized: ${files.length} HTML files checked; ${changed} normalized. Hreflang is withheld until distinct locale URLs exist; visible search-query blocks and deprecated FAQ/HowTo markup are removed.`);
