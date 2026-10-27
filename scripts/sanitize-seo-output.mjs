import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const root=process.cwd();
const dist=resolve(root,"dist");
let clientToolFiles=new Set();
try{
 const catalog=JSON.parse(await readFile(resolve(root,"client-tools/tools.json"),"utf8"));
 clientToolFiles=new Set(catalog.map((tool)=>resolve(dist,...tool.slug.split("/").filter(Boolean),"index.html")));
}catch{}


async function htmlFiles(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
   const path=join(dir,entry.name);
   if(entry.isDirectory())out.push(...await htmlFiles(path));
   else if(entry.isFile()&&entry.name.endsWith(".html"))out.push(path);
 }
 return out;
}

function structuredData(html,allowClientFaq=false){
 return html.replace(/<script([^>]*\btype=["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi,(whole,attrs,payload)=>{
   try{
     const data=JSON.parse(payload);
     if(Array.isArray(data?.["@graph"])){
       data["@graph"]=data["@graph"].filter((node)=>node?.["@type"]!=="HowTo"&&(allowClientFaq||node?.["@type"]!=="FAQPage")).map((node)=>{
         if(node?.["@type"]==="WebPage")delete node.keywords;
         if(node?.["@type"]==="WebApplication")delete node.alternateName;
         return node;
       });
     }
     return `<script${attrs}>${JSON.stringify(data).replace(/</g,"\\u003c")}</script>`;
   }catch{return whole;}
 });
}

function cleanHtml(html,allowClientFaq=false){
 let out=html;
 out=out.replace(/<link\b[^>]*\bhreflang=["'][^"']+["'][^>]*>\s*/gi,"");
 out=out.replace(/<link\b[^>]*href=["']\/search-intents\.(?:json|txt)["'][^>]*>\s*/gi,"");
 out=out.replace(/<section\b[^>]*class=["'][^"']*seo-related-searches[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,"");
 out=out.replace(/<p><strong>सम्बन्धित नामहरू:<\/strong>[\s\S]*?<\/p>/gi,"");
 out=structuredData(out,allowClientFaq);
 return out;
}

const files=await htmlFiles(dist);
let changed=0;
for(const file of files){
 const before=await readFile(file,"utf8");
 const allowClientFaq=clientToolFiles.has(resolve(file));
 const after=cleanHtml(before,allowClientFaq);
 if(after!==before){await writeFile(file,after,"utf8");changed++;}
 if(/\bhreflang=/i.test(after))throw new Error(`Invalid same-URL hreflang survived: ${file}`);
 if(/seo-related-searches|सम्बन्धित नामहरू:|यो सुविधा यस्ता नामले पनि खोजिन्छ/i.test(after))throw new Error(`Visible search-only copy survived: ${file}`);
 if(/"@type"\s*:\s*"HowTo"/.test(after))throw new Error(`Deprecated Google HowTo rich-result schema survived: ${file}`);
 if(!allowClientFaq&&/"@type"\s*:\s*"FAQPage"/.test(after))throw new Error(`FAQ rich-result schema survived outside the explicit client-tool allowlist: ${file}`);
}
if(files.length<100)throw new Error(`SEO sanitizer saw unexpectedly few HTML files: ${files.length}`);

// Index <lastmod> values are real data-modification dates and are kept. Only volatile live pages
// (/fm, /tv) drop their per-URL lastmod, since a constantly-changing date carries no signal.
async function sanitizeSitemap(path){
 let xml;try{xml=await readFile(path,"utf8");}catch{return false;}
 let out=xml;
 if(basename(path)==="sitemap-pages.xml")out=out.replace(/(<loc>https:\/\/aafnaipatro\.com\/(?:fm|tv)<\/loc>)<lastmod>[^<]+<\/lastmod>/g,"$1");
 if(out!==xml)await writeFile(path,out,"utf8");
 return true;
}
for(const name of ["sitemap-pages.xml"]){
 await sanitizeSitemap(resolve(root,"public",name));
 await sanitizeSitemap(resolve(root,"dist",name));
}

console.log(`White-hat SEO output sanitized: ${files.length} HTML files checked; ${changed} normalized. Hreflang is withheld until distinct locale URLs exist; visible search-query blocks and HowTo markup are removed, while FAQPage schema is preserved only on the explicit 300 client-tool pages.`);
