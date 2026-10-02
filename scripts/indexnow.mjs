import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getTodayNepal } from "../lib/patro.mjs";

const root=process.cwd();
const key="ec3997cfe5c249f1af7885fa9f4d790d";
const origin=(process.env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");
const host=new URL(origin).host;
const endpoint=process.env.INDEXNOW_ENDPOINT||"https://api.indexnow.org/indexnow";
const manifest=JSON.parse(await readFile(resolve(root,"public/seo-manifest.json"),"utf8"));
const today=await getTodayNepal();
const year=Number(today?.bs?.year||manifest.current_bs_year);
const month=Number(today?.bs?.month||1);

const routes=new Set([
  "/", "/today", "/methodology", "/corrections", "/convert", "/tools", "/tools/bstoad", "/tools/adtobs", "/tools/astro", "/tools/sait",
  "/rashifal", `/calendar/${year}`, `/calendar/${year}/${String(month).padStart(2,"0")}`,
  today?.ad?`/date/${today.ad}`:null
].filter(Boolean));

if(process.env.INDEXNOW_SCOPE==="all"){
  const names=manifest.sitemap_files||[];
  for(const name of names){
    const xml=await readFile(resolve(root,"public",name),"utf8");
    for(const match of xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)){
      const url=new URL(match[1]);if(url.host===host)routes.add(url.pathname+url.search);
    }
  }
}
const urlList=[...routes].map(path=>new URL(path,origin).toString()).slice(0,10000);
const body={host,key,keyLocation:`${origin}/${key}.txt`,urlList};

if(process.env.INDEXNOW_DRY_RUN==="1"){
  console.log(JSON.stringify({endpoint,count:urlList.length,body},null,2));
  process.exit(0);
}
const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json; charset=utf-8"},body:JSON.stringify(body)});
const text=await response.text();
console.log(`IndexNow ${response.status}: submitted ${urlList.length} URLs to ${endpoint}${text?` | ${text.slice(0,300)}`:""}`);
if(![200,202].includes(response.status)&&process.env.INDEXNOW_STRICT==="1")process.exit(1);
