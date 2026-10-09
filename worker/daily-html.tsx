import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TodayHero } from "../src/components/TodayHero";
import { JsonLd } from "../src/components/seo/JsonLd";
import { formatDate, neDigits } from "../src/nepaliDate";
import { BS_MONTHS } from "../src/title";
import { type CalendarArchiveEnv } from "./calendar-archive";
import { nativeRashifalResponse } from "./rashifal-native";
import { htmlAssetResponse } from "./connected-entry";
import { rewriteConnectedSeo } from "./connected-seo";
import { withAdminConsole } from "./admin-console";

type Env=Record<string,unknown>&CalendarArchiveEnv&{ASSETS?:{fetch(request:Request):Promise<Response>};PUBLIC_SITE_URL?:string};
type Ctx={waitUntil(promise:Promise<unknown>):void};
import { nepalDayBoundary } from "./nepal-day";
const esc=(value:unknown)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const safeJson=(value:unknown)=>JSON.stringify(value).replace(/</g,"\\u003c");
import { serverToday } from "./server-today";
async function rawDailyHtml(request:Request,env:Env,ctx:Ctx){
 if(!env.ASSETS)return new Response("Static assets unavailable",{status:503});
 const u=new URL(request.url),path=u.pathname.replace(/\/+$/,"")||"/",boundary=nepalDayBoundary();
 // Cache unconfigured HTML only; admin config is applied after this lookup.
 const key=new URL(u);key.pathname="/__patro/daily-html-v1";key.search=new URLSearchParams({path,date:boundary.date,sign:""}).toString();
 if(typeof caches!=="undefined"&&(caches as any).default){const hit=await(caches as any).default.match(new Request(key));if(hit){const h=new Headers(hit.headers);h.set("cache-control",`public, max-age=0, s-maxage=${boundary.seconds}`);return new Response(hit.body,{status:hit.status,headers:h});}}

 const headers=new Headers(request.headers);headers.delete("if-none-match");headers.delete("if-modified-since");
 let response=await htmlAssetResponse(new Request(request,{headers}),env as any,path!=="/rashifal"?"/index.html":"/rashifal/index.html",true);if(!response)return new Response("Static page unavailable",{status:503});
 let body="",data:any=null,schema:any;
 if(path!=="/rashifal"){
  data=await serverToday(request,env,boundary.date);if(!data)return new Response(response.body,{status:response.status,headers:{...Object.fromEntries(response.headers),"cache-control":"no-store"}});
  const bs=data.view.bs;body=renderToStaticMarkup(createElement(TodayHero,{language:"ne",date:boundary.date,bsLabel:`${neDigits(bs.day)} ${BS_MONTHS[bs.month-1]} ${neDigits(bs.year)}`,adLabel:formatDate(boundary.date,"ne",{weekday:"long"}),ns:data.view.ns,panchang:data.view.panchang,events:data.events.map((e:any)=>({name:e.name_ne||e.name_en}))}));
  schema={"@context":"https://schema.org","@type":"WebPage",name:`${bs.day} ${BS_MONTHS[bs.month-1]} ${bs.year} · आजको नेपाली मिति`,dateModified:boundary.date,inLanguage:"ne",url:u.origin+"/",mainEntity:{"@type":"Question",name:"आज कति गते?",acceptedAnswer:{"@type":"Answer",text:`वि.सं. ${bs.year}-${bs.month}-${bs.day}; ई.सं. ${boundary.date}; ${data.view.tithi}; ${data.view.ns}; सूर्योदय ${data.view.sunrise}; सूर्यास्त ${data.view.sunset}; ${data.events.map((e:any)=>e.name_ne||e.name_en).join(" · ")||"आज सूचीबद्ध पर्व वा बिदा छैन।"}`}}};
 }else{
  const apiUrl=new URL(u);apiUrl.pathname="/api/v1/rashifal/universal";apiUrl.search=new URLSearchParams({date:boundary.date,period:"daily",system:"vedic",calendar:"bs",}).toString();
  const publication=await nativeRashifalResponse(new Request(apiUrl),ctx);const readings=(await publication?.json() as any)?.readings||[];
  body=`<section class="ap-rashi-grid" data-daily-rashifal="${boundary.date}"><h2>आजको राशिफल · ${boundary.date}</h2>${readings.map((r:any)=>`<article class="ap-rashi-card" id="rashi-${esc(r.sign.id)}"><h3>${esc(r.sign.name_ne)} · ${esc(r.sign.name_en)}</h3><p>${esc(r.summary_ne)}</p><p>${esc(r.narrative?.ne?.note||"")}</p></article>`).join("")}<p>ज्योतिषीय व्याख्या परम्परागत/सम्पादकीय हो; वैज्ञानिक भविष्यवाणी होइन। <a href="/methodology">पद्धति र स्रोत</a></p></section>`;
  schema={"@context":"https://schema.org","@type":"CollectionPage",name:"आजको राशिफल",dateModified:boundary.date,hasPart:readings.map((r:any)=>({"@type":"Article",headline:r.sign.name_ne,articleBody:r.summary_ne,datePublished:boundary.date}))};
 }
 // @ts-ignore HTMLRewriter is provided by Cloudflare Workers.
 const rewrite=new HTMLRewriter().on(path!=="/rashifal"?".ap-prerender-hero":"#root",{element(el:any){if(path!=="/rashifal")el.replace(body,{html:true});else el.append(body,{html:true});}}).on("head",{element(el:any){el.append(renderToStaticMarkup(createElement(JsonLd,{id:"daily-server-schema",data:schema}))+(data?`<script id="patro-today-data" type="application/json">${safeJson({date:data.date,view:data.view,events:data.events})}</script>`:""),{html:true});}});
 response=rewrite.transform(response);response=await rewriteConnectedSeo(request,response,env);
 const outHeaders=new Headers(response.headers);outHeaders.delete("etag");outHeaders.delete("last-modified");outHeaders.set("cache-control",`public, max-age=0, s-maxage=${boundary.seconds}`);outHeaders.set("x-patro-day",boundary.date);
 const out=new Response(response.body,{status:200,headers:outHeaders});
 if(typeof caches!=="undefined"&&(caches as any).default)ctx.waitUntil((caches as any).default.put(new Request(key),out.clone()).catch(()=>{}));
 return out;
}
const dailyWorker=withAdminConsole({fetch:rawDailyHtml});
export async function dailyHtmlResponse(request:Request,env:Env,ctx:Ctx){const path=new URL(request.url).pathname.replace(/\/+$/,"")||"/";if(!["GET","HEAD"].includes(request.method)||!['/','/today','/rashifal'].includes(path))return null;const response=await dailyWorker.fetch(new Request(request,{method:"GET"}),env as any,ctx);return request.method==="HEAD"?new Response(null,{status:response.status,headers:response.headers}):response;}
