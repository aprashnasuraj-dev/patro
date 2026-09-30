import { nextOccurrences, ruleFromDate, type Observance, type TithiRule } from "../src/patro-tools/tithi-events/engine";
import { KATHMANDU } from "../src/patro-tools/core/types";

export type PublicEnv={
  DB?:any;
  CACHE?:any;
  CALENDAR_COVERAGE_START?:string;
  CALENDAR_COVERAGE_END?:string;
  CALENDAR_SOURCE_VERSION?:string;
};

const CACHE="public, max-age=60, s-maxage=900, stale-while-revalidate=86400";
const LONG="public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const DAY=86_400_000;
const BS_MONTHS=["","baishakh","jestha","ashadh","shrawan","bhadra","ashwin","kartik","mangsir","poush","magh","falgun","chaitra"];
const TITHI_MONTHS=["chaitra","vaishakha","jyestha","ashadha","shravana","bhadrapada","ashwin","kartika","margashirsha","pausha","magha","falguna"];

function json(body:any,status=200,cache=CACHE,extra:Record<string,string>={}){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache,"x-content-type-options":"nosniff","x-patro-backend":"cloudflare-native",...extra}});
}
function validDate(v:any):v is string{
  if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const [y,m,d]=v.split("-").map(Number),x=new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;
}
function today(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function parse(row:any){
  if(!row)return null;const value=row.payload??row;
  if(typeof value==="string"){try{return JSON.parse(value)}catch{return null}}return value;
}
async function query(env:PublicEnv,sql:string,bindings:any[]=[]){
  if(!env.DB)return[];const out=await env.DB.prepare(sql).bind(...bindings).all();return(out.results||[]).map(parse).filter(Boolean);
}
async function calendarByAd(env:PublicEnv,date:string){
  if(!env.DB)return null;return parse(await env.DB.prepare("select payload from content_records where table_name='astronomy_calendar_map' and record_key=?1 limit 1").bind(date).first());
}
async function calendarByBs(env:PublicEnv,bs:string){
  const m=bs.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(!m||!env.DB)return null;
  return parse(await env.DB.prepare(
    "select payload from content_records where table_name='astronomy_calendar_map' and json_extract(payload,'$.bs.year')=?1 and json_extract(payload,'$.bs.month')=?2 and json_extract(payload,'$.bs.day')=?3 limit 1"
  ).bind(Number(m[1]),Number(m[2]),Number(m[3])).first());
}
async function holidays(env:PublicEnv,date?:string,year?:number){
  if(!env.DB)return[];
  let base:any[]=[];
  if(date)base=await query(env,"select payload from content_records where table_name='holidays' and ad_date=?1 order by record_key",[date]);
  else if(year)base=await query(env,"select payload from content_records where table_name='holidays' and ad_date>=?1 and ad_date<?2 order by ad_date,record_key",[year+"-01-01",(year+1)+"-01-01"]);
  else base=await query(env,"select payload from content_records where table_name='holidays' order by ad_date desc,record_key limit 200");
  let overlays:any[]=[];
  try{
    let q=date
      ? env.DB.prepare("select * from holiday_overrides where ad_date=?1 order by id").bind(date)
      : year
        ? env.DB.prepare("select * from holiday_overrides where ad_date>=?1 and ad_date<?2 order by ad_date,id").bind(year+"-01-01",(year+1)+"-01-01")
        : env.DB.prepare("select * from holiday_overrides order by ad_date desc,id limit 200");
    overlays=(await q.all()).results||[];
  }catch{}
  const byId=new Map(base.map((row:any)=>[String(row.id||row.ad_date+"|"+row.name_ne),row]));
  for(const row of overlays){
    const payload=typeof row.payload==="string"?(()=>{try{return JSON.parse(row.payload)}catch{return{}}})():row.payload||{};
    byId.set(String(row.id),{...payload,id:row.id,ad_date:row.ad_date,name_ne:row.name_ne,name_en:row.name_en,scope_type:row.scope_type,effect:row.effect,status:row.status,source_url:row.source_url,source_title:row.source_title,override:true,updated_at:row.updated_at});
  }
  return [...byId.values()].sort((a:any,b:any)=>String(a.ad_date||"").localeCompare(String(b.ad_date||"")));
}
async function facts(env:PublicEnv,kind:string,from?:string,to?:string){
  if(!env.DB)return[];
  if(from&&to)return query(env,"select payload from content_records where table_name='official_panchang_facts' and category=?1 and ad_date>=?2 and ad_date<=?3 order by ad_date,record_key",[kind,from,to]);
  return query(env,"select payload from content_records where table_name='official_panchang_facts' and category=?1 order by ad_date desc,record_key limit 300",[kind]);
}
function syncShape(calendar:any){
  return {ad:calendar.ad,bs:calendar.bs,nepal_sambat:calendar.ns,panchang:calendar.panchang,source:"Cloudflare D1 migrated astronomy archive"};
}
async function todayRoute(env:PublicEnv,url:URL){
  const date=url.searchParams.get("date")||today();if(!validDate(date))return json({ok:false,error:"invalid_date"},400);
  const cal=await calendarByAd(env,date);if(!cal)return json({ok:false,error:"date_outside_archive"},404);
  const hs=await holidays(env,date);return json({ok:true,date,...syncShape(cal),holidays:hs});
}
async function convertRoute(env:PublicEnv,url:URL){
  const ad=url.searchParams.get("ad"),bs=url.searchParams.get("bs");
  let cal:any=null;
  if(ad){if(!validDate(ad))return json({ok:false,error:"invalid_ad"},400);cal=await calendarByAd(env,ad);}
  else if(bs)cal=await calendarByBs(env,bs);
  else return json({ok:false,error:"provide_ad_or_bs"},400);
  if(!cal)return json({ok:false,error:"date_outside_archive"},404);
  return json({ok:true,...syncShape(cal)});
}
async function holidaysRoute(env:PublicEnv,url:URL){
  const date=url.searchParams.get("date")||undefined,year=url.searchParams.get("year");
  if(date&&!validDate(date))return json({ok:false,error:"invalid_date"},400);
  const y=year?Number(year):undefined;if(y!==undefined&&(!Number.isInteger(y)||y<1900||y>2100))return json({ok:false,error:"invalid_year"},400);
  const items=await holidays(env,date,y);return json({ok:true,date:date||null,year:y||null,count:items.length,holidays:items,items});
}
async function festivalsRoute(env:PublicEnv,url:URL){
  const year=Number(url.searchParams.get("year")||new Date().getUTCFullYear());
  if(!Number.isInteger(year)||year<1900||year>2100)return json({ok:false,error:"invalid_year"},400);
  const from=year+"-01-01",to=year+"-12-31";
  const [festivalFacts,holidayRows]=await Promise.all([facts(env,"festival",from,to),holidays(env,undefined,year)]);
  const seen=new Set<string>(),items:any[]=[];
  for(const row of [...festivalFacts,...holidayRows]){
    const key=String(row.key||row.id||row.ad_date+"|"+row.name_en);if(seen.has(key))continue;seen.add(key);items.push(row);
  }
  items.sort((a,b)=>String(a.fact_date||a.ad_date||"").localeCompare(String(b.fact_date||b.ad_date||"")));
  return json({ok:true,year,count:items.length,items},200,LONG);
}
async function panchangRoute(env:PublicEnv,url:URL){
  const date=url.searchParams.get("date")||today();if(!validDate(date))return json({ok:false,error:"invalid_date"},400);
  const cal=await calendarByAd(env,date);if(!cal)return json({ok:false,error:"date_outside_archive"},404);
  return json({ok:true,date,bs:cal.bs,nepal_sambat:cal.ns,panchang:cal.panchang,provenance:{source:"patro-archive",version:"migrated"}});
}
async function calendarMonth(env:PublicEnv,path:string,url:URL){
  const m=path.match(/^\/api\/v1\/calendar\/(\d{4})\/(\d{1,2})$/);if(!m)return null;
  const year=Number(m[1]),month=Number(m[2]),mode=url.searchParams.get("calendar")||((year>2050)?"bs":"ad");
  if(month<1||month>12)return json({ok:false,error:"invalid_month"},400);
  let rows:any[]=[];
  if(mode==="bs"){
    rows=await query(env,"select payload from content_records where table_name='astronomy_calendar_map' and json_extract(payload,'$.bs.year')=?1 and json_extract(payload,'$.bs.month')=?2 order by record_key",[year,month]);
  }else{
    const start=year+"-"+String(month).padStart(2,"0")+"-01",endMonth=month===12?1:month+1,endYear=month===12?year+1:year,end=endYear+"-"+String(endMonth).padStart(2,"0")+"-01";
    rows=await query(env,"select payload from content_records where table_name='astronomy_calendar_map' and record_key>=?1 and record_key<?2 order by record_key",[start,end]);
  }
  if(!rows.length)return json({ok:false,error:"month_outside_archive"},404);
  return json({ok:true,calendar:mode,year,month,count:rows.length,days:rows.map(syncShape)},200,LONG);
}
function parseTithiRule(url:URL):TithiRule{
  const monthRaw=(url.searchParams.get("month")||"").toLowerCase();
  const month=/^\d+$/.test(monthRaw)?Number(monthRaw):TITHI_MONTHS.indexOf(monthRaw);
  const paksha=(url.searchParams.get("paksha")||"shukla") as "shukla"|"krishna";
  const tithi=Number(url.searchParams.get("tithi")||"1");
  const obsRaw=(url.searchParams.get("rule")||url.searchParams.get("observance")||"udaya").replace("pradosha","pradosh") as Observance;
  const system=(url.searchParams.get("system")||"purnimanta") as "purnimanta"|"amanta";
  const adhikRaw=url.searchParams.get("adhikPolicy")||url.searchParams.get("adhik")||"nija_month";
  const adhik=adhikRaw==="both"?"both":adhikRaw==="adhik_month"||adhikRaw==="adhik"?"adhik":"nija";
  if(!Number.isInteger(month)||month<0||month>11||!["shukla","krishna"].includes(paksha)||!Number.isInteger(tithi)||tithi<1||tithi>15||!["udaya","madhyahna","aparahna","pradosh","nishitha"].includes(obsRaw)||!["purnimanta","amanta"].includes(system))throw new Error("invalid_tithi_rule");
  return {month,paksha,tithi,observance:obsRaw,system,adhik};
}
async function tithiNext(url:URL){
  let rule:TithiRule;try{rule=parseTithiRule(url)}catch{return json({ok:false,error:"invalid_tithi_rule"},400)}
  const from=url.searchParams.get("from")||today();if(!validDate(from))return json({ok:false,error:"invalid_from"},400);
  const count=Math.min(12,Math.max(1,Number(url.searchParams.get("count")||3)));
  const rows=nextOccurrences(rule,from,count,KATHMANDU);
  return json({ok:true,rule,from,count:rows.length,occurrences:rows.map(x=>({adDate:x.date,date:x.date,tithiStart:x.tithiStart.toISOString(),tithiEnd:x.tithiEnd.toISOString(),adhikMonth:x.adhikMonth,coverage:x.coverage,fallback:x.fallback}))});
}
async function tithiDerive(request:Request,url:URL){
  let body:any={};if(request.method==="POST"){try{body=await request.json()}catch{return json({ok:false,error:"invalid_json"},400)}}
  const date=String(body.date||url.searchParams.get("date")||"");if(!validDate(date))return json({ok:false,error:"invalid_date"},400);
  const observance=String(body.observance||url.searchParams.get("observance")||"udaya") as Observance;
  if(!["udaya","madhyahna","aparahna","pradosh","nishitha"].includes(observance))return json({ok:false,error:"invalid_observance"},400);
  const time=body.time||url.searchParams.get("time")||undefined,system=(body.system||url.searchParams.get("system")||"purnimanta") as "purnimanta"|"amanta";
  try{return json({ok:true,date,rule:ruleFromDate(date,{time,observance,loc:KATHMANDU,system})});}catch(e){return json({ok:false,error:String((e as Error).message||e)},400)}
}
async function latestMarket(env:PublicEnv,url:URL){
  const kind=url.searchParams.get("kind");
  const kinds=kind?[kind]:["forex","index"];const result:any={ok:true,as_of:null,items:[]};
  for(const k of kinds){
    if(!["forex","index"].includes(k))return json({ok:false,error:"unsupported_market_kind"},400);
    const rows=await query(env,"select payload from content_records where table_name='market_snapshots' and category=?1 order by ad_date desc,updated_at desc limit 300",[k]);
    const latest=new Map<string,any>();for(const row of rows){const key=String(row.asset||"");if(!key)continue;const p=latest.get(key);if(!p||String(row.as_of)>String(p.as_of))latest.set(key,row);}
    for(const row of latest.values())result.items.push(row);
  }
  result.as_of=result.items.reduce((m:string,x:any)=>String(x.as_of||"")>m?String(x.as_of):m,"");
  return json(result);
}

const SIGNS=["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
async function rashifalPublication(env:PublicEnv,url:URL){
  if(!env.DB)return null;
  const period=url.searchParams.get("period")||"daily",system=url.searchParams.get("system")||"vedic",calendar=url.searchParams.get("calendar")||"bs",date=url.searchParams.get("date")||today();
  const row=await env.DB.prepare("select payload from content_records where table_name='miti_rashifal_publications' and json_extract(payload,'$.period')=?1 and json_extract(payload,'$.system')=?2 and json_extract(payload,'$.calendar')=?3 and json_extract(payload,'$.period_window.start_date')<=?4 and json_extract(payload,'$.period_window.end_date_exclusive')>?4 order by updated_at desc limit 1").bind(period,system,calendar,date).first();
  return parse(row);
}
async function rashifalMetadata(env:PublicEnv,url:URL){
  const pub=await rashifalPublication(env,url);if(!pub)return json({ok:false,error:"rashifal_unavailable"},404);
  const payload=pub.payload||pub;
  return json({ok:true,schema_version:payload.schema_version||1,engine_version:payload.engine_version||null,period:payload.period,system:payload.system,calendar:payload.calendar,window:payload.window||payload.period_window,signs:SIGNS,source:"Cloudflare D1 migrated publication"},200,LONG);
}
async function rashifalPersonalized(request:Request,env:PublicEnv){
  let body:any;try{body=await request.json()}catch{return json({ok:false,error:"invalid_json"},400)}
  const sign=String(body?.sign||body?.rashi||"").toLowerCase();if(!SIGNS.includes(sign))return json({ok:false,error:"sign_required",signs:SIGNS},400);
  const u=new URL(request.url);for(const k of ["period","system","calendar","date"])if(body?.[k])u.searchParams.set(k,String(body[k]));
  const pub=await rashifalPublication(env,u);if(!pub)return json({ok:false,error:"rashifal_unavailable"},404);
  const payload=pub.payload||pub,reading=Array.isArray(payload.readings)?payload.readings.find((r:any)=>String(r?.sign?.id||r?.sign||"").toLowerCase()===sign):null;
  if(!reading)return json({ok:false,error:"sign_reading_unavailable"},404);
  return json({ok:true,sign,reading,period:payload.period,window:payload.window||payload.period_window,engine_version:payload.engine_version,schema_version:payload.schema_version,personalization:"published sign reading; birth data is not stored by this endpoint"});
}

const DICT_URL="https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/ne/index.dic";
const DICT_SHA="dfc130b2ccbaeee54a859bdc512c27107eb6efa6ae5167615a65df83377ba427";
const DICT_BLOB="c6f72034f0c96f2cdfc54c3d61eb07ccc97c18ac";
const EDITORIAL=["अक्षरहरू","कस्ती","क्षमता","गर्नुहोस्","छ","टाइपिङ","ठीकै","तपाईं","दशैं","नागरिकता","फाल्गुन","म","मंसिर","र","राशिफल","रिश्ता","शिक्षिका","सन्चै","साथीहरू","स्वीकृति","हजुर","हस्","हुन्छ","हुन्छु"];
let dictCache:Promise<string[]>|null=null;
function hex(bytes:Uint8Array){return[...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function dictionary(){
  if(dictCache)return dictCache;
  dictCache=(async()=>{
    const r=await fetch(DICT_URL,{headers:{"user-agent":"MeroPatroTyping/2.0"},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error("dictionary_source_"+r.status);
    const raw=await r.text(),digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)));if(hex(digest)!==DICT_SHA)throw new Error("dictionary_checksum_changed");
    const source=[...new Set(raw.split(/\r?\n/).map(line=>line.split("/")[0].trim().normalize("NFC")).filter(word=>/^[अ-हक़-य़][\u0900-\u0963]*$/u.test(word)&&word.length>=2&&!word.endsWith("्")))];
    const canonical=[...new Set(source.map(word=>word.replaceAll("अा","आ")))];return[...new Set([...canonical,...EDITORIAL])].sort();
  })().catch(e=>{dictCache=null;throw e});
  return dictCache;
}
async function typingLexicon(url:URL){
  try{
    const words=await dictionary(),format=url.searchParams.get("format")||"manifest";
    if(format==="words"||format==="txt")return new Response(words.join("\n")+"\n",{headers:{"content-type":"text/plain; charset=utf-8","cache-control":LONG,"x-lexicon-count":String(words.length),"x-patro-backend":"cloudflare-native"}});
    if(format!=="manifest")return json({ok:false,error:"unsupported_format",supported:["manifest","words"]},400);
    return json({ok:true,version:"1.0.0",count:words.length,unique_count:words.length,editorial_additions:EDITORIAL.length,source_blob:DICT_BLOB,source_sha256:DICT_SHA,source:"https://github.com/wooorm/dictionaries/tree/main/dictionaries/ne",source_license:"LGPL-2.1",words_endpoint:"?format=words",privacy:"Dictionary delivery only; typed text is never sent to this endpoint."},200,LONG);
  }catch(e){return json({ok:false,error:String((e as Error).message||e)},503,"no-store")}
}
const SAIT_ALIASES:Record<string,string[]>={
  vivah:["vivah","wedding","marriage","विवाह"],bratabandha:["bratabandha","bratbandha","upanayana","व्रतबन्ध"],griha_pravesh:["griha","house","home","गृह"],vehicle:["vehicle","sawari","सवारी"],business:["business","vyapar","व्यवसाय"],namakaran:["namakaran","nwaran","naming","नामकरण","न्वारन"]
};
async function officialSait(env:PublicEnv,url:URL){
  const kind=url.searchParams.get("kind")||"",from=url.searchParams.get("from")||"",to=url.searchParams.get("to")||"";
  if(!SAIT_ALIASES[kind]||!validDate(from)||!validDate(to)||from>to)return json({ok:false,error:"invalid_query"},400);
  const span=Math.floor((Date.parse(to)-Date.parse(from))/DAY)+1;if(span>93)return json({ok:false,error:"range_limit",max_days:93},400);
  const rows=await facts(env,"sait",from,to),aliases=SAIT_ALIASES[kind];
  const official=rows.filter((row:any)=>{const tz=String(row.value?.tz||"");if(tz&&tz!=="Asia/Kathmandu")return false;const hay=(String(row.key||"")+" "+String(row.value?.label_ne||"")+" "+String(row.value?.label_en||"")).toLowerCase();return aliases.some(x=>hay.includes(x.toLowerCase()));});
  return json({ok:true,kind,official});
}

const NOC_URL="https://noc.org.np/retailprice";
const NOC_SNAPSHOT={ok:true,source:"Nepal Oil Corporation",sourceUrl:NOC_URL,effectiveDate:"2083.04.17 (2026-08-02)",freshness:"official-snapshot",stale:true,note:"Showing the latest source-verified NOC regional snapshot when the live page cannot be parsed.",zones:[
 {depots:["Charali","Biratnagar","Mahendranagar (Dhanusa)","Birgunj","Amlekhjung","Bhalbari","Nepalgunj","Dhangadi"],petrol:197.5,diesel:197.5,kerosene:197.5,atfDutyFreeUsdPerKl:1222,atfDomesticNprPerL:249,lpgNprPerCylinder:2060},
 {depots:["Surkhet","Dang"],petrol:199,diesel:199,kerosene:199,atfDutyFreeUsdPerKl:1697,atfDomesticNprPerL:249,lpgNprPerCylinder:2060},
 {depots:["Kathmandu","Pokhara","Dipayal"],petrol:200,diesel:200,kerosene:200,atfDutyFreeUsdPerKl:1697,atfDomesticNprPerL:249,lpgNprPerCylinder:2060}
]};
let nocCache:{until:number,value:any}|null=null;
function normalizeHtml(html:string){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();}
function num(v:string|undefined){const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;}
function extract(block:string,re:RegExp){return num(re.exec(block)?.[1]);}
function parseNoc(html:string){
 const scope=normalizeHtml(html),starts=[...scope.matchAll(/\(([^()]*,[^()]*)\)\s*Petrol\s*\(MS\)/gi)],zones:any[]=[];
 for(let i=0;i<starts.length;i++){const start=starts[i].index||0,end=i+1<starts.length?(starts[i+1].index||start+2200):Math.min(scope.length,start+2200),block=scope.slice(start,end),petrol=extract(block,/Petrol\s*\(MS\)[^\d]{0,60}([\d.]+)/i),diesel=extract(block,/Diesel\s*\(HSD\)[^\d]{0,60}([\d.]+)/i),kerosene=extract(block,/Kerosene\s*\(SKO\)[^\d]{0,60}([\d.]+)/i);if(petrol==null||diesel==null||kerosene==null)continue;zones.push({depots:starts[i][1].split(",").map(x=>x.trim()).filter(Boolean),petrol,diesel,kerosene,atfDutyFreeUsdPerKl:extract(block,/Aviation Fuel Duty Free[^\d]{0,80}([\d.]+)/i),atfDomesticNprPerL:extract(block,/Aviation Turbine Fuel\s*\(Jet A-1\)[^\d]{0,80}([\d.]+)/i),lpgNprPerCylinder:extract(block,/LP Gas[^\d]{0,60}([\d.]+)/i)});}
 return zones;
}
async function fuel(){
 if(nocCache&&nocCache.until>Date.now())return json(nocCache.value);
 try{const r=await fetch(NOC_URL,{headers:{accept:"text/html","user-agent":"MeroPatroFuel/2.0"},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error("noc_http_"+r.status);const html=await r.text();const zones=parseNoc(html);if(!zones.length)throw new Error("noc_parse_empty");const value={ok:true,source:"Nepal Oil Corporation",sourceUrl:NOC_URL,fetchedAt:new Date().toISOString(),effectiveDate:null,freshness:"live",stale:false,zones};nocCache={until:Date.now()+600000,value};return json(value);}catch(e){const value={...NOC_SNAPSHOT,fetchedAt:new Date().toISOString(),note:NOC_SNAPSHOT.note+" ("+String((e as Error).message||e)+")"};nocCache={until:Date.now()+120000,value};return json(value);}
}

const MEDIA_HOSTS=new Set(["radio-broadcast.ekantipur.com","usa15.fastcast4u.com","stream.zenolive.com","streaming.softnep.net","stream.live.vc.bbcmedia.co.uk","ktvhdsg.ekantipur.com","202.166.207.67"]);
function allowedUrl(raw:string){let u:URL;try{u=new URL(raw)}catch{throw new Error("invalid_stream_url")}if(!["http:","https:"].includes(u.protocol)||!MEDIA_HOSTS.has(u.hostname)||u.username||u.password)throw new Error("stream_host_not_allowed");return u;}
function proxied(raw:string){return"/api/v1/media/proxy?url="+encodeURIComponent(raw);}
function rewriteManifest(text:string,base:URL){return text.split(/\r?\n/).map(line=>{const v=line.trim();if(!v||v.startsWith("#"))return line.replace(/URI="([^"]+)"/g,(_m,uri)=>'URI="'+proxied(allowedUrl(new URL(uri,base).toString()).toString())+'"');return proxied(allowedUrl(new URL(v,base).toString()).toString());}).join("\n");}
async function mediaProxy(request:Request,url:URL){
 let target:URL;try{target=allowedUrl(url.searchParams.get("url")||"")}catch(e){return json({ok:false,error:String((e as Error).message||e)},400)}
 const headers=new Headers(),range=request.headers.get("range");if(range&&/^bytes=\d*-\d*(?:,\d*-\d*)?$/i.test(range))headers.set("range",range);headers.set("accept",request.headers.get("accept")||"*/*");headers.set("user-agent","MeroPatroMediaProxy/2.0");
 let upstream:Response,final=target;
 for(let i=0;i<4;i++){upstream=await fetch(final,{headers,redirect:"manual",signal:AbortSignal.timeout(15000)});if(upstream.status>=300&&upstream.status<400&&upstream.headers.get("location")){if(i===3)return json({ok:false,error:"too_many_redirects"},502);try{final=allowedUrl(new URL(upstream.headers.get("location")!,final).toString());continue}catch{return json({ok:false,error:"redirect_host_not_allowed"},502)}}break;}
 if(!upstream!.ok&&upstream!.status!==206)return new Response("upstream_stream_error",{status:upstream!.status||502});
 const type=upstream!.headers.get("content-type")||"",manifest=type.includes("mpegurl")||final.pathname.toLowerCase().endsWith(".m3u8"),out=new Headers();out.set("cache-control",manifest?"public, max-age=5":"public, max-age=30");out.set("x-content-type-options","nosniff");for(const h of ["content-type","content-range","content-length","accept-ranges","icy-br","icy-name","icy-genre"]){const v=upstream!.headers.get(h);if(v)out.set(h,v);}
 if(manifest){const text=await upstream!.text();if(new TextEncoder().encode(text).byteLength>1_048_576)return json({ok:false,error:"manifest_too_large"},502);out.set("content-type","application/vnd.apple.mpegurl; charset=utf-8");out.delete("content-length");return new Response(rewriteManifest(text,final),{status:upstream!.status,headers:out});}
 return new Response(upstream!.body,{status:upstream!.status,headers:out});
}
async function doctor(env:PublicEnv){
 const required=["astronomy_calendar_map","tool_catalog","community_festivals","community_dates","ns_days","ns_festival_dates","official_panchang_facts","fm_stations","news_items","market_snapshots"],tables:any[]=[];
 if(!env.DB)return json({ok:false,status:"misconfigured",database:{ok:false,error:"d1_unavailable"}},503);
 for(const table of required){try{const row=await env.DB.prepare("select count(*) as c from content_records where table_name=?1").bind(table).first();tables.push({table,ok:Number(row?.c)>0,count:Number(row?.c||0)});}catch{tables.push({table,ok:false,count:0});}}
 const missing=tables.filter(x=>!x.ok);return json({ok:!missing.length,status:missing.length?"degraded":"healthy",canonical_function:"worker/index.ts",architecture:{static_ui:"Cloudflare Pages/Assets",dynamic_api:"Cloudflare Worker",database:"Cloudflare D1"},database:{ok:!missing.length,tables,missing:missing.map(x=>x.table)},checked_at:new Date().toISOString()},missing.length?503:200,"no-store");
}
function openapi(){
 return {openapi:"3.1.0",info:{title:"MeroPatro API",version:"2.0.0"},servers:[{url:"/"}],paths:{
  "/api/v1/today":{get:{}}, "/api/v1/convert":{get:{}}, "/api/v1/festivals":{get:{}}, "/api/v1/holidays":{get:{}},
  "/api/v1/panchang":{get:{}}, "/api/v1/tithi/derive":{get:{},post:{}}, "/api/v1/tithi/next":{get:{}},
  "/api/v1/calendar/{year}/{month}":{get:{}}, "/api/v1/rashifal/metadata":{get:{}}, "/api/v1/rashifal/personalized":{post:{}},
  "/api/v1/typing/lexicon":{get:{}}, "/api/v1/tools/official-sait":{get:{}}, "/api/v1/noc/fuel-prices":{get:{}}
 }};
}

export async function publicApiResponse(request:Request,env:PublicEnv):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;
 if(path==="/api/v1/today"&&request.method==="GET")return todayRoute(env,url);
 if(path==="/api/v1/convert"&&request.method==="GET")return convertRoute(env,url);
 if(path==="/api/v1/festivals"&&request.method==="GET")return festivalsRoute(env,url);
 if(path==="/api/v1/holidays"&&request.method==="GET")return holidaysRoute(env,url);
 if(path==="/api/v1/market/latest"&&request.method==="GET")return latestMarket(env,url);
 if(path==="/api/v1/openapi.json"&&request.method==="GET")return json(openapi(),200,LONG);
 if(path==="/api/v1/panchang"&&request.method==="GET")return panchangRoute(env,url);
 if(path==="/api/v1/tithi/derive"&&["GET","POST"].includes(request.method))return tithiDerive(request,url);
 if(path==="/api/v1/tithi/next"&&request.method==="GET")return tithiNext(url);
 if(/^\/api\/v1\/calendar\/\d{4}\/\d{1,2}$/.test(path)&&request.method==="GET")return calendarMonth(env,path,url);
 if(path==="/api/v1/rashifal/metadata"&&request.method==="GET")return rashifalMetadata(env,url);
 if(path==="/api/v1/rashifal/personalized"&&request.method==="POST")return rashifalPersonalized(request,env);
 if(path==="/api/v1/typing/lexicon"&&request.method==="GET")return typingLexicon(url);
 if(path==="/api/v1/tools/official-sait"&&request.method==="GET")return officialSait(env,url);
 if(path==="/api/v1/doctor"&&(request.method==="GET"||request.method==="HEAD"))return doctor(env);
 if(path==="/api/v1/noc/fuel-prices"&&request.method==="GET")return fuel();
 if(path==="/api/v1/media/proxy"&&(request.method==="GET"||request.method==="HEAD"))return mediaProxy(request,url);
 return null;
}
