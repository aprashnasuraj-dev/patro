import { adToBs, bsToAd, bsDateMetadata, BS_VALIDATED_THROUGH_YEAR } from "../packages/core/src/bsDate";
import { isIndexableBsYear } from "./seo-window";

const MONTHS = ["baisakh", "jestha", "ashadh", "shrawan", "bhadra", "ashwin", "kartik", "mangsir", "poush", "magh", "falgun", "chaitra"];
const NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
const ALIASES: Record<string, string> = { baishakh:"baisakh", jeth:"jestha", asar:"ashadh", sawan:"shrawan", saun:"shrawan", bhadau:"bhadra", asoj:"ashwin", ashoj:"ashwin", kattik:"kartik", paush:"poush", push:"poush", phagun:"falgun", chait:"chaitra" };
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const notFound = () => new Response("Invalid or unsupported conversion date", {status:404,headers:{"x-robots-tag":"noindex, follow","cache-control":"public, max-age=300"}});
export async function conversionPageResponse(request: Request, env: { PUBLIC_SITE_URL?: string }): Promise<Response | null> {
  const u = new URL(request.url), path = u.pathname;
  if (!path.startsWith("/bs-to-ad/") && !path.startsWith("/ad-to-bs/")) return null;
  if (!["GET","HEAD"].includes(request.method)) return new Response("Method not allowed",{status:405});
  const direction = path.startsWith("/bs-to-ad/") ? "bs-to-ad" : "ad-to-bs";
  let bs: {year:number;month:number;day:number}, ad: string;
  try {
    if(direction === "bs-to-ad") {
      const m=path.match(/^\/bs-to-ad\/(\d{4})-([a-z]+|\d{1,2})-(\d{1,2})\/?$/i); if(!m)return notFound();
      const token=m[2].toLowerCase(); const month=/^\d+$/.test(token)?Number(token):MONTHS.indexOf(ALIASES[token]||token)+1;
      bs={year:Number(m[1]),month,day:Number(m[3])}; ad=bsToAd(bs);
    } else {
      const m=path.match(/^\/ad-to-bs\/(\d{4})-(\d{1,2})-(\d{1,2})\/?$/); if(!m)return notFound();
      ad=`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; bs=adToBs(ad);
    }
  } catch { return notFound(); }
  const canonicalPath=direction==="bs-to-ad"?`/bs-to-ad/${bs.year}-${MONTHS[bs.month-1]}-${bs.day}`:`/ad-to-bs/${ad}`;
  if(path!==canonicalPath || u.search) {u.pathname=canonicalPath;u.search="";return Response.redirect(u.toString(),301);}
  const validated=bs.year<=BS_VALIDATED_THROUGH_YEAR;
  const index=validated&&isIndexableBsYear(bs.year);
  const site=(env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/$/,"");
  const canonical=site+canonicalPath, bsLabel=`${bs.year} ${NE[bs.month-1]} ${bs.day}`;
  const title=direction==="bs-to-ad"?`${bsLabel} BS to AD — ${ad}`:`${ad} AD to BS — ${bsLabel}`;
  const weekday=new Intl.DateTimeFormat("ne-NP",{timeZone:"UTC",weekday:"long"}).format(new Date(ad+"T00:00:00Z"));
  const reverse=direction==="bs-to-ad"?`/ad-to-bs/${ad}`:`/bs-to-ad/${bs.year}-${MONTHS[bs.month-1]}-${bs.day}`;
  const schema={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:title,url:canonical,inLanguage:["ne","en"],description:`${bsLabel} वि.सं. = ${ad} ई.सं. (${weekday})।`},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"मिति रूपान्तरण",item:site+"/convert"},{"@type":"ListItem",position:2,name:title,item:canonical}]}]};
  const html=`<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | आफ्नै पात्रो</title><meta name="description" content="${esc(`${bsLabel} वि.सं. = ${ad} ई.सं. (${weekday})। सिधा मिति रूपान्तरण, स्रोत र पात्रो लिंक।`)}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="${index?"index, follow":"noindex, follow"}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{font:18px/1.7 system-ui;margin:0;background:#f5f7f4;color:#172019}main{max-width:800px;margin:40px auto;padding:24px;background:white;border-radius:18px}a{color:#176f3b}td,th{padding:12px;text-align:left}table{width:100%;border-collapse:collapse}tr{border-bottom:1px solid #ddd}</style></head><body><main><nav><a href="/">आफ्नै पात्रो</a> · <a href="/convert">मिति रूपान्तरण</a></nav><h1>${esc(title)}</h1><p><strong>${esc(bsLabel)} वि.सं. = <time datetime="${ad}">${ad}</time> ई.सं.</strong></p><table><tr><th>नेपाली मिति</th><td>${esc(bsLabel)}</td></tr><tr><th lang="en">Gregorian date</th><td>${ad}</td></tr><tr><th>बार</th><td>${weekday}</td></tr></table><p>${validated?"रूपान्तरण आफ्नै पात्रोको जाँच गरिएको महिना तालिकामा आधारित छ।":"यो भविष्यको मिति अस्थायी खुला तालिकामा आधारित छ; आधिकारिक पात्रोसँग जाँच गर्नुहोस्।"}</p><p lang="en">${esc(bsDateMetadata(bs).source)}</p><p><a href="${reverse}">उल्टो रूपान्तरण</a> · <a href="/date/${ad}">यस दिनको तिथि र चाडपर्व</a> · <a href="/calendar/${bs.year}/${String(bs.month).padStart(2,"0")}">महिनाको पात्रो</a></p><p>अर्को मिति चाहिन्छ? <a href="/convert">अफलाइन चल्ने AD/BS converter खोल्नुहोस्।</a></p></main></body></html>`;
  return new Response(request.method==="HEAD"?null:html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=3600, s-maxage=86400","x-robots-tag":index?"index, follow":"noindex, follow","x-patro-backend":"validated-conversion-table"}});
}
