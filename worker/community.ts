import { crescentLikely, expectedMonthStart, hijriOf, HIJRI_MONTHS } from "../src/patro-tools/communities/hijri/calendar";
import { METHODS, NEPAL_CITIES, prayerTimes, qibla, type MethodId } from "../src/patro-tools/communities/hijri/prayer";

type Env = { DB?: any };
const DAY=86_400_000;
const SUITES=["lhosar","tharu","mithila","kirat","hijri"] as const;
type SuiteId=(typeof SUITES)[number];
const COMMUNITY_IDS=["nepal-sambat",...SUITES] as const;
const META:Record<SuiteId,{dev:string;en:string}>={
  lhosar:{dev:"ल्होसार",en:"Lhosar"},
  tharu:{dev:"थारु",en:"Tharu"},
  mithila:{dev:"मिथिला",en:"Mithila"},
  kirat:{dev:"किरात",en:"Kirat"},
  hijri:{dev:"हिजरी",en:"Hijri / Muslim"}
};
const CACHE="public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";
const DAYCACHE="public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";

function json(body:unknown,status=200,cache=CACHE,extra:Record<string,string>={}){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache,...extra}});
}
function bad(error:string,detail?:unknown){return json({ok:false,error,...(detail?{detail}:{})},400,"no-store")}
function validDate(d:string|null|undefined):d is string{
  if(!d||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
  const [y,m,x]=d.split("-").map(Number),t=new Date(Date.UTC(y,m-1,x));
  return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===x;
}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function add(d:string,n:number){return new Date(Date.parse(d+"T00:00:00Z")+n*DAY).toISOString().slice(0,10)}
function badge(c:string){return c==="announced"||c==="confirmed"?"घोषित":c==="expected"?"सम्भावित":"गणना"}
function icsEsc(s:unknown){return String(s??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n")}
function icsDate(s:string){return s.replaceAll("-","")}
function parse(row:any){if(!row?.payload)return null;try{return typeof row.payload==="string"?JSON.parse(row.payload):row.payload}catch{return null}}
async function rows(env:Env,sql:string,binds:any[]=[]){
  if(!env.DB)throw new Error("d1_unavailable");
  let q=env.DB.prepare(sql); if(binds.length)q=q.bind(...binds);
  const out=await q.all(); return (out.results||[]).map(parse).filter(Boolean);
}
async function one(env:Env,sql:string,binds:any[]=[]){
  if(!env.DB)return null;
  let q=env.DB.prepare(sql); if(binds.length)q=q.bind(...binds);
  const row=await q.first(); return parse(row);
}
async function festivalMap(env:Env,suite:SuiteId){
  const data=await rows(env,"select payload from content_records where table_name='community_festivals' and json_extract(payload,'$.suite')=?1 order by record_key",[suite]);
  return new Map(data.map((r:any)=>[r.id,r]));
}
async function overrides(env:Env,suite:SuiteId,years:number[]){
  if(!env.DB||!years.length)return [] as any[];
  try{
    const marks=years.map((_,i)=>"?"+(i+2)).join(",");
    let q=env.DB.prepare("select suite,festival_id,year,start_ad,end_ad,note from community_overrides where suite=?1 and year in ("+marks+")");
    q=q.bind(suite,...years);
    return (await q.all()).results||[];
  }catch{return [] as any[]}
}
function mergeCommunity(data:any[],fm:Map<string,any>,os:any[]){
  const om=new Map(os.map(o=>[o.festival_id+"|"+o.year,o]));
  return data.map(r=>{
    const f=fm.get(r.festival_id),o=!r.region?om.get(r.festival_id+"|"+r.year):undefined,c=o?"announced":r.confidence;
    return {id:r.festival_id,dev:f?.dev||r.festival_id,roman:f?.roman||null,en:f?.en||null,region:r.region||null,
      main:o?.start_ad||r.main,start:o?.start_ad||r.start_ad,end:o?.end_ad||o?.start_ad||r.end_ad,
      confidence:c,badge:badge(c),holiday:f?.holiday||"none",summary:f?.summary||"",communities:f?.communities||[],
      places:f?.places||[],details:f?.details||[],status:f?.status||"review",review:f?.status==="review",
      review_label:f?.status==="review"?"समीक्षाधीन":null,sources:f?.sources||[],override_note:o?.note||null};
  });
}
async function communityData(env:Env,suite:SuiteId,sp:URLSearchParams){
  const yearRaw=sp.get("year"),fromRaw=sp.get("from"),countRaw=sp.get("count");
  const count=countRaw==null?10:Number(countRaw);
  if(!Number.isInteger(count)||count<1||count>50)return {error:bad("invalid_query")};
  const fm=await festivalMap(env,suite);
  let data:any[]=[];
  if(yearRaw!=null){
    const year=Number(yearRaw);
    if(!Number.isInteger(year)||year<2020||year>2050)return {error:bad("invalid_query")};
    data=await rows(env,
      "select payload from content_records where table_name='community_dates' and year=?1 and json_extract(payload,'$.suite')=?2 order by json_extract(payload,'$.start_ad'),record_key",
      [year,suite]);
  }else{
    const from=fromRaw||today(); if(!validDate(from))return {error:bad("invalid_query")};
    const to=add(from,370);
    data=await rows(env,
      "select payload from content_records where table_name='community_dates' and json_extract(payload,'$.suite')=?1 and json_extract(payload,'$.start_ad')>=?2 and json_extract(payload,'$.start_ad')<=?3 order by json_extract(payload,'$.start_ad'),record_key limit ?4",
      [suite,from,to,Math.max(count*4,30)]);
    data=data.filter((x:any)=>!x.region).slice(0,count);
  }
  const os=await overrides(env,suite,[...new Set(data.map((x:any)=>Number(x.year)).filter(Number.isFinite))]);
  return {fm,items:mergeCommunity(data,fm,os)};
}
export async function communityItems(env:Env,suite:string,sp:URLSearchParams){
  if(!SUITES.includes(suite as SuiteId))return json({ok:false,error:"unknown_suite"},404,"no-store");
  try{
    const result=await communityData(env,suite as SuiteId,sp); if(result.error)return result.error;
    const items=result.items||[];
    return json({ok:true,suite:{id:suite,...META[suite as SuiteId]},items,
      review:items.filter((x:any)=>x.review).map((x:any)=>({id:x.id,dev:x.dev})),
      source:"Cloudflare D1 migrated engine-generated community calendar; optional D1 overrides layered at request time"});
  }catch(e){return json({ok:false,error:"community_data_unavailable",detail:String((e as Error).message||e)},503,"no-store")}
}
export async function listCommunities(env:Env){
  const out:any[]=[];
  for(const s of SUITES){
    const result=await communityData(env,s,new URLSearchParams({from:today(),count:"1"}));
    out.push({id:s,...META[s],next:result.items?.[0]||null});
  }
  return json({ok:true,communitySuite:{dev:"समुदाय",en:"Community Suite"},
    suites:[{id:"nepal-sambat",dev:"नेपाल संवत्",en:"Nepal Sambat"},...out],
    aggregate:{id:"samudaya-chakra",dev:"समुदाय चक्र",en:"Samudaya Chakra",route:"/samudaya/chakra"},
    frontend_experiences:7});
}
export async function communityIcs(env:Env,suite:string,sp:URLSearchParams){
  const year=Number(sp.get("year")||new Date().getUTCFullYear());
  if(!Number.isInteger(year)||year<2020||year>2050)return bad("invalid_year");
  if(!SUITES.includes(suite as SuiteId))return json({ok:false,error:"unknown_suite"},404,"no-store");
  const result=await communityData(env,suite as SuiteId,new URLSearchParams({year:String(year)})); if(result.error)return result.error;
  const items=result.items||[],m=META[suite as SuiteId],lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aafnai Patro//Community Suite//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:"+icsEsc(m.dev+" · "+m.en),"REFRESH-INTERVAL;VALUE=DURATION:P7D"];
  for(const x of items)lines.push("BEGIN:VEVENT","UID:"+x.id+"-"+x.start+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(x.start),"DTEND;VALUE=DATE:"+icsDate(add(x.end,1)),"SUMMARY:"+icsEsc(x.dev+" · "+x.en),"DESCRIPTION:"+icsEsc(x.badge+(x.review?" · समीक्षाधीन":"")+" · "+x.summary),"END:VEVENT");
  lines.push("END:VCALENDAR"); return new Response(lines.join("\r\n")+"\r\n",{headers:{"content-type":"text/calendar; charset=utf-8","cache-control":DAYCACHE}});
}
async function nsFestivalMap(env:Env){
  const data=await rows(env,"select payload from content_records where table_name='ns_festivals' order by record_key");
  return new Map(data.map((r:any)=>[r.id,r]));
}
async function nsOverrides(env:Env,years:number[]){
  if(!env.DB||!years.length)return [] as any[];
  try{
    const marks=years.map((_,i)=>"?"+(i+1)).join(",");
    let q=env.DB.prepare("select festival_id,ns_year,start_ad,end_ad,confidence,note,updated_at from ns_festival_overrides where ns_year in ("+marks+")");
    q=q.bind(...years);
    return (await q.all()).results||[];
  }catch{return [] as any[]}
}
function mergeNsDates(data:any[],os:any[]){
  const map=new Map(os.map((o:any)=>[String(o.festival_id)+"|"+String(o.ns_year),o]));
  return data.map((row:any)=>{
    const o=map.get(String(row.festival_id)+"|"+String(row.ns_year));
    return o?{...row,start_ad:o.start_ad,end_ad:o.end_ad,confidence:o.confidence||"confirmed",override_note:o.note||null,override:true}:row;
  });
}
export async function combinedCommunityIcs(env:Env,request:Request){
  const u=new URL(request.url),raw=u.searchParams.get("communities");
  let ids=(raw||"").split(",").filter(Boolean).filter(x=>(COMMUNITY_IDS as readonly string[]).includes(x));
  if(raw===null&&!ids.length)ids=[...COMMUNITY_IDS];
  const from=u.searchParams.get("from")||today(); if(!validDate(from))return bad("invalid_from");
  const to=add(from,550),lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aafnai Patro//My Communities//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:मेरो समुदाय · Aafnai Patro","REFRESH-INTERVAL;VALUE=DURATION:P1D"];
  for(const id of ids.filter(x=>x!=="nepal-sambat")){
    const s=id as SuiteId,fm=await festivalMap(env,s);
    let data=await rows(env,"select payload from content_records where table_name='community_dates' and json_extract(payload,'$.suite')=?1 and json_extract(payload,'$.region') is null and json_extract(payload,'$.start_ad')>=?2 and json_extract(payload,'$.start_ad')<=?3 order by json_extract(payload,'$.start_ad')",[s,from,to]);
    const os=await overrides(env,s,[...new Set(data.map((x:any)=>Number(x.year)))]);
    for(const x of mergeCommunity(data,fm,os))lines.push("BEGIN:VEVENT","UID:"+s+"-"+x.id+"-"+x.start+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(x.start),"DTEND;VALUE=DATE:"+icsDate(add(x.end,1)),"SUMMARY:"+icsEsc(x.dev+" · "+x.en),"DESCRIPTION:"+icsEsc(x.badge+(x.review?" · समीक्षाधीन":"")),"END:VEVENT");
  }
  if(ids.includes("nepal-sambat")){
    const fm=await nsFestivalMap(env),data=await rows(env,"select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.start_ad')>=?1 and json_extract(payload,'$.start_ad')<=?2 order by json_extract(payload,'$.start_ad')",[from,to]);
    for(const r of data){const f:any=fm.get(r.festival_id);if(f)lines.push("BEGIN:VEVENT","UID:ns-"+r.festival_id+"-"+r.start_ad+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(r.start_ad),"DTEND;VALUE=DATE:"+icsDate(add(r.end_ad,1)),"SUMMARY:"+icsEsc(f.dev+" · "+f.en),"DESCRIPTION:"+icsEsc(badge(r.confidence)+(f.status==="review"?" · समीक्षाधीन":"")),"END:VEVENT")}
  }
  lines.push("END:VCALENDAR");return new Response(lines.join("\r\n")+"\r\n",{headers:{"content-type":"text/calendar; charset=utf-8","cache-control":DAYCACHE}});
}
const AN:any={
 tamang:[["मुसा","Rat","🐀"],["गाई","Cow","🐄"],["बाघ","Tiger","🐅"],["खरायो","Rabbit","🐇"],["ड्रागन (बादल)","Dragon (Cloud)","🐉"],["सर्प","Snake","🐍"],["घोडा","Horse","🐎"],["भेडा","Sheep","🐑"],["बाँदर","Monkey","🐒"],["चरा","Bird","🐦"],["कुकुर","Dog","🐕"],["सुँगुर","Pig","🐖"]],
 tibetan:[["मुसा","Rat","🐀"],["गोरु","Ox","🐂"],["बाघ","Tiger","🐅"],["खरायो","Rabbit","🐇"],["ड्रागन","Dragon","🐉"],["सर्प","Snake","🐍"],["घोडा","Horse","🐎"],["भेडा","Sheep","🐑"],["बाँदर","Monkey","🐒"],["चरा","Bird","🐓"],["कुकुर","Dog","🐕"],["सुँगुर","Pig","🐖"]],
 gurung:[["मुसा","Mouse","🐁"],["गाई","Cow","🐄"],["बाघ","Tiger","🐅"],["बिरालो","Cat","🐈"],["गरुड","Eagle","🦅"],["सर्प","Serpent","🐍"],["घोडा","Horse","🐎"],["भेडा","Sheep","🐑"],["बाँदर","Monkey","🐒"],["चरा","Bird","🐦"],["कुकुर","Dog","🐕"],["मृग","Deer","🦌"]]
};
function animal(c:string,y:number){const i=((y-2020)%12+12)%12,[dev,en,emoji]=AN[c][i];return{index:i,dev,en,emoji}}
function element(y:number){const E:any=[["काठ","Wood","ཤིང"],["आगो","Fire","མེ"],["माटो","Earth","ས"],["धातु","Metal","ལྕགས"],["पानी","Water","ཆུ"]],s=((y-4)%10+10)%10,[dev,en,bo]=E[Math.floor(s/2)];return{dev,en,bo,gender:s%2===0?"male":"female",genderDev:s%2===0?"पुरुष":"स्त्री"}}
export async function lho(env:Env,sp:URLSearchParams){
  const d=sp.get("date")||today();if(!validDate(d))return bad("invalid_date");const y=Number(d.slice(0,4));
  const data=await rows(env,"select payload from content_records where table_name='community_dates' and json_extract(payload,'$.suite')='lhosar' and json_extract(payload,'$.festival_id') in ('sonam-lhosar','tamu-lhosar','gyalpo-lhosar') and year>=?1 and year<=?2 and json_extract(payload,'$.region') is null",[y-1,y+1]);
  const find=(id:string,yr:number)=>data.find((r:any)=>r.festival_id===id&&r.year===yr)?.main;
  const sonam=find("sonam-lhosar",y)||y+"-02-01",gyalpo=find("gyalpo-lhosar",y)||y+"-02-15",tamu=find("tamu-lhosar",y)||y+"-12-30";
  const ty=d>=sonam?y:y-1,tib=d>=gyalpo?y:y-1,gy=d>=tamu?y+1:y;
  return json({ok:true,date:d,tamang:{...animal("tamang",ty),era:ty+836,cycleYear:ty},tibetan:{...animal("tibetan",tib),element:element(tib),era:tib+127,cycleYear:tib},gurung:{...animal("gurung",gy),cycleYear:gy},boundaries:{sonam,gyalpo,tamu},source:"Cloudflare D1 engine-generated Lhosar dates + arithmetic cycles"},200,DAYCACHE);
}
export async function hijri(sp:URLSearchParams){
  const d=sp.get("date")||today();if(!validDate(d))return bad("invalid_date");
  const lat=sp.get("lat")==null?27.7172:Number(sp.get("lat")),lon=sp.get("lon")==null?85.324:Number(sp.get("lon"));
  const method=(sp.get("method")||"karachi") as MethodId,asr=(sp.get("asr")||"hanafi") as "hanafi"|"shafii";
  if(!Number.isFinite(lat)||lat<-60||lat>60||!Number.isFinite(lon)||lon<-180||lon>180||!(method in METHODS)||!["hanafi","shafii"].includes(asr))return bad("invalid_query");
  const loc={lat,lon,tz:"Asia/Kathmandu",height:0},h=hijriOf(d,loc),p=prayerTimes(d,loc,method,asr),cv=crescentLikely(d,loc),mn=HIJRI_MONTHS[h.month-1];
  const t=(x:Date)=>x.toLocaleTimeString("en-GB",{timeZone:"Asia/Kathmandu",hour:"2-digit",minute:"2-digit"});
  return json({ok:true,date:d,hijri:{...h,month_name:mn},prayer:{fajr:t(p.fajr),sunrise:t(p.sunrise),dhuhr:t(p.dhuhr),asr:t(p.asr),maghrib:t(p.maghrib),isha:t(p.isha)},method:METHODS[method].label,asrSchool:asr,qibla:Math.round(qibla(lat,lon)*10)/10,crescent:{visible:cv.visible,ageHours:+cv.ageHours.toFixed(1),altitude:+cv.altitude.toFixed(1),elongation:+cv.elongation.toFixed(1)},badge:"सम्भावित",note:"Hijri month starts are astronomical expectations until Nepal's official moon-sighting announcement."});
}
export async function ramadan(sp:URLSearchParams){
  const hy=Number(sp.get("hy")),city=Number(sp.get("city")||0),method=(sp.get("method")||"karachi") as MethodId;
  if(!Number.isInteger(hy)||hy<1300||hy>1700||!Number.isInteger(city)||city<0||city>=NEPAL_CITIES.length||!(method in METHODS))return bad("invalid_query");
  const loc=NEPAL_CITIES[city],start=expectedMonthStart(hy,9,loc),end=expectedMonthStart(hy,10,loc),days:any[]=[];
  const t=(x:Date)=>x.toLocaleTimeString("en-GB",{timeZone:"Asia/Kathmandu",hour:"2-digit",minute:"2-digit"});
  for(let d=start,i=1;d<end;d=add(d,1),i++){const p=prayerTimes(d,loc,method,"hanafi");days.push({roza:i,date:d,sehriEnds:t(p.fajr),iftar:t(p.maghrib)})}
  return json({ok:true,hijriYear:hy,city:loc.name,expectedStart:start,expectedEid:end,badge:"सम्भावित",days},200,DAYCACHE);
}
export async function nepalSambat(env:Env,sp:URLSearchParams){
  const ad=sp.get("ad")||today();if(!validDate(ad))return bad("invalid_ad");
  const [archive,base]=await Promise.all([
    one(env,"select payload from content_records where table_name='astronomy_calendar_map' and record_key=?1 limit 1",[ad]),
    one(env,"select payload from content_records where table_name='ns_days' and record_key=?1 limit 1",[ad])
  ]);
  const n=archive?.payload?.ns||archive?.ns,day=base;if(!n&&!day)return json({ok:false,error:"date_outside_coverage"},422,"no-store");
  const year=Number(n?.year||day?.ns_year),until=add(ad,60),[dates,fm,os]=await Promise.all([
    rows(env,"select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.start_ad')>=?1 and json_extract(payload,'$.start_ad')<=?2 order by json_extract(payload,'$.start_ad') limit 12",[ad,until]),
    nsFestivalMap(env),
    nsOverrides(env,[year,year+1])
  ]);
  const mergedDates=mergeNsDates(dates,os).filter((r:any)=>String(r.start_ad)>=ad&&String(r.start_ad)<=until).sort((a:any,b:any)=>String(a.start_ad).localeCompare(String(b.start_ad))).slice(0,12);
  const upcoming=mergedDates.map((r:any)=>{const f:any=fm.get(r.festival_id);return{id:r.festival_id,dev:f?.dev,roman:f?.roman,en:f?.en,start:r.start_ad,end:r.end_ad,confidence:r.confidence,badge:badge(r.confidence),declaredAnnually:!!f?.declared_annually,status:f?.status,review:f?.status==="review",review_label:f?.status==="review"?"समीक्षाधीन":null,override:!!r.override,override_note:r.override_note||null}});
  const nyRaw=await one(env,"select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.ns_year')=?1 and json_extract(payload,'$.festival_id')='mha-puja' limit 1",[year+1]);
  const ny=mergeNsDates(nyRaw?[nyRaw]:[],os).find((r:any)=>r.festival_id==="mha-puja"&&Number(r.ns_year)===year+1)||nyRaw,next=ny?.start_ad||null;
  return json({ok:true,ad,lunar:n||{year:day.ns_year,month_no:day.ns_month,paksha:day.ns_paksha,tithi_number:day.ns_tithi,adhika:day.ns_adhik,formatted:day.ns_label,formatted_newa:day.ns_label_newa},solar:day?{year:day.solar_year,month:day.solar_month,day:day.solar_day}:null,nextNewYear:next?{nsYear:year+1,ad:next,days:Math.round((Date.parse(next)-Date.parse(ad))/DAY)}:null,upcoming,source:"Cloudflare D1 astronomy archive + Nepal Sambat tables"});
}
export async function nsFestivals(env:Env,sp:URLSearchParams){
  const year=Number(sp.get("year"));if(!Number.isInteger(year)||year<1000||year>1300)return bad("invalid_ns_year");
  const [raw,fm,os]=await Promise.all([
    rows(env,"select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.ns_year')=?1 order by json_extract(payload,'$.start_ad')",[year]),
    nsFestivalMap(env),nsOverrides(env,[year])
  ]);
  const data=mergeNsDates(raw,os);
  const festivals=data.map((r:any)=>{const f:any=fm.get(r.festival_id);return{id:r.festival_id,dev:f?.dev,newa:f?.newa||null,roman:f?.roman,en:f?.en,start:r.start_ad,end:r.end_ad,tradition:f?.tradition,places:f?.places||[],publicHoliday:f?.public_holiday||"none",confidence:r.confidence,badge:badge(r.confidence),declaredAnnually:!!f?.declared_annually,status:f?.status,review:f?.status==="review",review_label:f?.status==="review"?"समीक्षाधीन":null,override:!!r.override,override_note:r.override_note||null}});
  return json({ok:true,year,festivals,review:festivals.filter((x:any)=>x.review).map((x:any)=>({id:x.id,dev:x.dev}))},200,DAYCACHE);
}
export async function nsConvert(env:Env,sp:URLSearchParams){
  let ad=sp.get("ad");
  if(!ad&&sp.get("ns")){
    const m=sp.get("ns")!.match(/^(\d{3,4})-(\d{1,2})-(thwa|ga)-(\d{1,2})$/);if(!m)return bad("invalid_ns_format");
    const adhik=sp.get("adhik")==="1"?1:0;
    const r=await one(env,"select payload from content_records where table_name='ns_days' and json_extract(payload,'$.ns_year')=?1 and json_extract(payload,'$.ns_month')=?2 and json_extract(payload,'$.ns_paksha')=?3 and json_extract(payload,'$.ns_tithi')=?4 and json_extract(payload,'$.ns_adhik')=?5 order by record_key limit 1",[Number(m[1]),Number(m[2]),m[3],Number(m[4]),adhik]);ad=r?.ad;
  }
  if(!ad&&sp.get("solar")){
    const m=sp.get("solar")!.match(/^(\d{3,4})-(\d{1,2})-(\d{1,2})$/);if(!m)return bad("invalid_solar_format");
    const r=await one(env,"select payload from content_records where table_name='ns_days' and json_extract(payload,'$.solar_year')=?1 and json_extract(payload,'$.solar_month')=?2 and json_extract(payload,'$.solar_day')=?3 limit 1",[Number(m[1]),Number(m[2]),Number(m[3])]);ad=r?.ad;
  }
  if(!ad||!validDate(ad))return bad("give_ad_ns_or_solar");
  return nepalSambat(env,new URLSearchParams({ad}));
}
export async function nsIcs(env:Env,sp:URLSearchParams){
  const year=Number(sp.get("year"));if(!Number.isInteger(year)||year<1000||year>1300)return bad("invalid_ns_year");
  const r=await nsFestivals(env,new URLSearchParams({year:String(year)}));if(r.status!==200)return r;const p:any=await r.json();
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aafnai Patro//Nepal Sambat//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:नेपाल संवत् "+year,"REFRESH-INTERVAL;VALUE=DURATION:P7D"];
  for(const x of p.festivals)lines.push("BEGIN:VEVENT","UID:ns-"+x.id+"-"+x.start+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(x.start),"DTEND;VALUE=DATE:"+icsDate(add(x.end,1)),"SUMMARY:"+icsEsc(x.dev+" · "+x.en),"DESCRIPTION:"+icsEsc(x.badge+(x.review?" · समीक्षाधीन":"")),"END:VEVENT");
  lines.push("END:VCALENDAR");return new Response(lines.join("\r\n")+"\r\n",{headers:{"content-type":"text/calendar; charset=utf-8","cache-control":DAYCACHE}});
}


export async function communityResponse(request:Request,env:Env):Promise<Response|null>{
  if(!env.DB)return null;
  const url=new URL(request.url),path=url.pathname;
  if(request.method!=="GET")return null;
  if(path==="/api/v1/communities")return listCommunities(env);
  if(path==="/api/v1/communities/feed.ics")return combinedCommunityIcs(env,request);
  if(path==="/api/v1/communities/lho")return lho(env,url.searchParams);
  const ics=path.match(/^\/api\/v1\/communities\/([^/]+)\/ics$/);
  if(ics)return communityIcs(env,decodeURIComponent(ics[1]),url.searchParams);
  const suite=path.match(/^\/api\/v1\/communities\/([^/]+)$/);
  if(suite)return communityItems(env,decodeURIComponent(suite[1]),url.searchParams);
  if(path==="/api/v1/hijri")return hijri(url.searchParams);
  if(path==="/api/v1/hijri/ramadan")return ramadan(url.searchParams);
  if(path==="/api/v1/nepal-sambat")return nepalSambat(env,url.searchParams);
  if(path==="/api/v1/nepal-sambat/festivals")return nsFestivals(env,url.searchParams);
  if(path==="/api/v1/nepal-sambat/convert")return nsConvert(env,url.searchParams);
  if(path==="/api/v1/nepal-sambat/ics")return nsIcs(env,url.searchParams);
  return null;
}
