import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const calendarDir = resolve(root, "migration/data/public/astronomy_calendar_map");
const holidaysPath = resolve(root, "migration/data/public/holidays.json");
const factsPath = resolve(root, "migration/data/public/official_panchang_facts.json");

const CITY_TZ = {
  kathmandu:"Asia/Kathmandu", pokhara:"Asia/Kathmandu", biratnagar:"Asia/Kathmandu", butwal:"Asia/Kathmandu",
  "new-york":"America/New_York", toronto:"America/Toronto", london:"Europe/London", sydney:"Australia/Sydney",
  melbourne:"Australia/Melbourne", tokyo:"Asia/Tokyo", seoul:"Asia/Seoul", doha:"Asia/Qatar", dubai:"Asia/Dubai",
  riyadh:"Asia/Riyadh", "kuala-lumpur":"Asia/Kuala_Lumpur", "kuwait-city":"Asia/Kuwait"
};

let cache;
function value(row){return row?.payload && typeof row.payload === "object" ? row.payload : row;}
function normalizeBs(input){
  if(typeof input === "string"){
    const m=input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(!m)return null;
    return {year:Number(m[1]),month:Number(m[2]),day:Number(m[3])};
  }
  if(input && typeof input === "object") return {year:Number(input.year),month:Number(input.month),day:Number(input.day)};
  return null;
}
function bsKey(y,m,d){return `${Number(y)}-${String(Number(m)).padStart(2,"0")}-${String(Number(d)).padStart(2,"0")}`;}
function dateOnly(x){const s=String(x||"").slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;}
function normalizeSlug(x){return String(x||"").trim().toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"");}
function tithiText(panchang){
  const t=panchang?.tithi;if(typeof t==="string")return t;
  return String(t?.ne||t?.name_ne||t?.tithi_name_ne||panchang?.tithi_name_ne||panchang?.tithi_ne||"").trim();
}
function nsText(ns){
  if(!ns)return "";if(typeof ns==="string")return ns;
  return String(ns.formatted_ne||ns.formatted||[ns.year,ns.month?.dev||ns.month?.roman,ns.day||ns.tithi_name_ne].filter(Boolean).join(" ")).trim();
}

async function load(){
  if(cache)return cache;
  const names=(await readdir(calendarDir)).filter(n=>n.endsWith(".json")).sort();
  const rows=[];
  for(const name of names){
    const doc=JSON.parse(await readFile(resolve(calendarDir,name),"utf8"));
    if(doc.table!=="astronomy_calendar_map"||!Array.isArray(doc.rows))continue;
    for(const row of doc.rows){
      const v=value(row),ad=dateOnly(v?.ad||row?.ad_date),bs=v?.bs;
      if(!ad||!bs?.year||!bs?.month||!bs?.day)continue;
      rows.push({ad,bs,ns:v?.ns||null,panchang:v?.panchang||null,source:v?.source||row?.source||null,verified_at:v?.verified_at||row?.verified_at||null});
    }
  }
  rows.sort((a,b)=>a.ad.localeCompare(b.ad));
  const byAd=new Map(rows.map(r=>[r.ad,r]));
  const byBs=new Map(rows.map(r=>[bsKey(r.bs.year,r.bs.month,r.bs.day),r]));
  const holidayDoc=JSON.parse(await readFile(holidaysPath,"utf8"));
  const holidays=(holidayDoc.rows||[]).map(value).filter(Boolean);
  const factsDoc=JSON.parse(await readFile(factsPath,"utf8"));
  const facts=(factsDoc.rows||[]).map(value).filter(Boolean);
  cache={rows,byAd,byBs,holidays,facts};
  return cache;
}

export async function getAllDays(){return [...(await load()).rows];}
export async function getDay(bsY,bsM,bsD){return (await load()).byBs.get(bsKey(bsY,bsM,bsD))||null;}
export async function getDayByAd(adIso){const ad=dateOnly(adIso);return ad?(await load()).byAd.get(ad)||null:null;}
export async function getMonth(bsY,bsM){return (await load()).rows.filter(r=>Number(r.bs.year)===Number(bsY)&&Number(r.bs.month)===Number(bsM));}
export async function getYear(bsY){return (await load()).rows.filter(r=>Number(r.bs.year)===Number(bsY));}

export async function getFestivals(bsY){
  const {facts,byAd}=await load();
  return facts.filter(f=>String(f.kind||f.category||"").toLowerCase()==="festival").filter(f=>{
    const explicit=Number(f?.value?.bsYear||f?.bsYear||0);if(explicit)return explicit===Number(bsY);
    const row=byAd.get(dateOnly(f.fact_date||f.ad_date)||"");return Number(row?.bs?.year)===Number(bsY);
  });
}
export async function getFestival(slug,bsY){
  const key=normalizeSlug(slug);if(!key)return null;
  return (await getFestivals(bsY)).find(f=>{
    const values=[f.key,f.slug,f.name_en,f.title,f.name_ne,f.title_ne].map(normalizeSlug).filter(Boolean);
    return values.includes(key)||values.some(v=>v.includes(key));
  })||null;
}
export async function getSait(type,bsY){
  const {facts,byAd}=await load();const needle=normalizeSlug(type);
  return facts.filter(f=>{
    const kind=String(f.kind||f.category||"").toLowerCase(),key=normalizeSlug(f.key||f.type||f.sait_type||f.name_en||f.name_ne);
    if(!(kind.includes("sait")||kind.includes("muhurat")||(!needle||key.includes(needle))))return false;
    const explicit=Number(f?.value?.bsYear||f?.bsYear||0);if(explicit)return explicit===Number(bsY);
    const row=byAd.get(dateOnly(f.fact_date||f.ad_date)||"");return Number(row?.bs?.year)===Number(bsY);
  });
}
export async function getHolidays(bsY){
  const {holidays,byAd}=await load();
  return holidays.filter(h=>{const row=byAd.get(dateOnly(h.ad_date||h.date)||"");return Number(row?.bs?.year)===Number(bsY);});
}
export async function convertBsToAd(bs){const x=normalizeBs(bs);if(!x)return null;const row=await getDay(x.year,x.month,x.day);return row?.ad||null;}
export async function convertAdToBs(ad){const row=await getDayByAd(ad);return row?.bs||null;}
export async function getTodayNepal(){
  const ad=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return getDayByAd(ad);
}
export async function getTithiAt(city,date){
  const key=String(city||"").toLowerCase().replace(/\s+/g,"-");const timeZone=CITY_TZ[key];
  if(!timeZone)throw new Error(`Unsupported city: ${city}`);
  const raw=String(date||"");const year=Number(raw.slice(0,4));
  const row=/^\d{4}-\d{2}-\d{2}$/.test(raw)&&year>=1800&&year<=2037
    ? await getDayByAd(raw)
    : (()=>{const bs=normalizeBs(raw);return bs?getDay(bs.year,bs.month,bs.day):null;})();
  const resolved=await row;if(!resolved)return null;
  const transition=resolved.panchang?.tithi_transition||resolved.panchang?.tithiTransition||null;
  let transitionLocal=null;
  const iso=transition?.at||transition?.iso||transition?.timestamp||null;
  if(iso && !Number.isNaN(Date.parse(iso))){transitionLocal=new Intl.DateTimeFormat("en-GB",{timeZone,dateStyle:"full",timeStyle:"long"}).format(new Date(iso));}
  return {city:key,timeZone,ad:resolved.ad,bs:resolved.bs,tithi:tithiText(resolved.panchang),nepalSambat:nsText(resolved.ns),transition,transitionLocal,boundaryBasis:"Archive panchang is authoritative; local conversion is applied only when an absolute transition timestamp exists."};
}

export async function getDatasetInventory(){
  const {rows,holidays,facts}=await load();
  const sample=rows[0]||{};
  return {
    calendarRows:rows.length,firstAd:rows[0]?.ad||null,lastAd:rows.at(-1)?.ad||null,
    firstBs:rows[0]?.bs||null,lastBs:rows.at(-1)?.bs||null,holidayRows:holidays.length,panchangFactRows:facts.length,
    fields:{calendar:Object.keys(sample),bs:Object.keys(sample.bs||{}),panchang:Object.keys(sample.panchang||{}),holiday:Object.keys(holidays[0]||{}),panchangFact:Object.keys(facts[0]||{})},
    cities:Object.keys(CITY_TZ)
  };
}

export { CITY_TZ, tithiText, nsText };
