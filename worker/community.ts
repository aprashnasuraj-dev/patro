import { crescentLikely, expectedMonthStart, hijriOf, HIJRI_MONTHS } from "../src/patro-tools/communities/hijri/calendar";
import { METHODS, NEPAL_CITIES, prayerTimes, qibla, type MethodId } from "../src/patro-tools/communities/hijri/prayer";

type Env = { DB?: any };

const SUITES=["lhosar","tharu","mithila","kirat","hijri"] as const;
const COMMUNITY_IDS=["nepal-sambat",...SUITES] as const;
const META:Record<string,{dev:string;en:string}>={
  lhosar:{dev:"ल्होसार",en:"Lhosar"},
  tharu:{dev:"थारु",en:"Tharu"},
  mithila:{dev:"मिथिला",en:"Mithila"},
  kirat:{dev:"किरात",en:"Kirat"},
  hijri:{dev:"हिजरी",en:"Hijri / Muslim"}
};
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const DAY=86_400_000;
const CACHE="public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";
const DAYCACHE="public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";

function json(body:any,status=200,cache=CACHE){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache,"x-patro-backend":"cloudflare-community"}});
}
function text(body:string,type:string,cache=DAYCACHE){
  return new Response(body,{headers:{"content-type":type,"cache-control":cache,"x-patro-backend":"cloudflare-community"}});
}
function validDate(value:string){
  if(!DATE.test(value))return false;
  const d=new Date(value+"T00:00:00Z");
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
function todayNepal(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function addDays(value:string,days:number){
  const d=new Date(value+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
function parse(row:any){
  if(!row)return null;
  const value=row.payload??row;
  if(typeof value==="string"){try{return JSON.parse(value)}catch{return null}}
  return value;
}
function badge(confidence:string){return confidence==="announced"||confidence==="confirmed"?"घोषित":confidence==="expected"?"सम्भावित":"गणना";}
function icsEsc(value:any){return String(value??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");}
function icsDate(value:string){return value.replaceAll("-","");}

async function queryPayloads(env:Env,sql:string,bindings:any[]=[]){
  if(!env.DB)return [];
  const result=await env.DB.prepare(sql).bind(...bindings).all();
  return (result.results||[]).map(parse).filter(Boolean);
}

async function festivals(env:Env,suite:string){
  const rows=await queryPayloads(env,
    "select payload from content_records where table_name='community_festivals' and json_extract(payload,'$.suite')=?1 order by record_key",
    [suite]);
  return new Map(rows.map((row:any)=>[row.id,row]));
}

function mergeCommunity(rows:any[],fm:Map<string,any>){
  return rows.map((row:any)=>{
    const festival=fm.get(row.festival_id)||{};
    const confidence=row.confidence||"computed";
    return {
      id:row.festival_id,
      dev:festival.dev||row.festival_id,
      roman:festival.roman||null,
      en:festival.en||null,
      region:row.region||null,
      main:row.main,
      start:row.start_ad,
      end:row.end_ad,
      confidence,
      badge:badge(confidence),
      holiday:festival.holiday||"none",
      summary:festival.summary||"",
      communities:festival.communities||[],
      places:festival.places||[],
      details:festival.details||[],
      status:festival.status||"review",
      review:festival.status==="review",
      review_label:festival.status==="review"?"समीक्षाधीन":null,
      sources:festival.sources||[],
      override_note:null
    };
  });
}

async function communityItems(env:Env,suite:string,url:URL){
  if(!SUITES.includes(suite as any))return json({ok:false,error:"unknown_suite"},404,"no-store");
  const yearRaw=url.searchParams.get("year");
  const from=url.searchParams.get("from")||todayNepal();
  const count=Math.min(50,Math.max(1,Number(url.searchParams.get("count")||10)));
  let rows:any[]=[];
  if(yearRaw){
    const year=Number(yearRaw);
    if(!Number.isInteger(year)||year<2020||year>2050)return json({ok:false,error:"invalid_year"},400,"no-store");
    rows=await queryPayloads(env,
      "select payload from content_records where table_name='community_dates' and json_extract(payload,'$.suite')=?1 and json_extract(payload,'$.year')=?2 order by json_extract(payload,'$.start_ad'),record_key",
      [suite,year]);
  }else{
    if(!validDate(from))return json({ok:false,error:"invalid_from"},400,"no-store");
    const to=addDays(from,370);
    rows=await queryPayloads(env,
      "select payload from content_records where table_name='community_dates' and json_extract(payload,'$.suite')=?1 and json_extract(payload,'$.start_ad')>=?2 and json_extract(payload,'$.start_ad')<=?3 order by json_extract(payload,'$.start_ad'),record_key limit 200",
      [suite,from,to]);
    rows=rows.filter((row:any)=>!row.region).slice(0,count);
  }
  if(!rows.length)return null;
  const fm=await festivals(env,suite);
  const items=mergeCommunity(rows,fm);
  return json({
    ok:true,
    suite:{id:suite,...META[suite]},
    items,
    review:items.filter((x:any)=>x.review).map((x:any)=>({id:x.id,dev:x.dev})),
    source:"Cloudflare D1 migrated community_dates/community_festivals; no official override rows existed at migration snapshot"
  });
}

async function listCommunities(env:Env){
  const suites:any[]=[{id:"nepal-sambat",dev:"नेपाल संवत्",en:"Nepal Sambat",next:null}];
  for(const suite of SUITES){
    const url=new URL("https://local/api?from="+todayNepal()+"&count=1");
    const response=await communityItems(env,suite,url);
    let next=null;
    if(response){try{next=(await response.clone().json()).items?.[0]||null}catch{}}
    suites.push({id:suite,...META[suite],next});
  }
  return json({ok:true,communitySuite:{dev:"समुदाय",en:"Community Suite"},suites});
}

async function communityIcs(env:Env,suite:string,url:URL){
  const year=Number(url.searchParams.get("year")||new Date().getUTCFullYear());
  const local=new URL("https://local/api?year="+year);
  const response=await communityItems(env,suite,local);
  if(!response)return null;
  if(!response.ok)return response;
  const payload=await response.json();
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mero Patro//Community Suite//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:"+icsEsc(payload.suite.dev+" · "+payload.suite.en),"REFRESH-INTERVAL;VALUE=DURATION:P7D"];
  for(const item of payload.items) lines.push("BEGIN:VEVENT","UID:"+item.id+"-"+item.start+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(item.start),"DTEND;VALUE=DATE:"+icsDate(addDays(item.end,1)),"SUMMARY:"+icsEsc(item.dev+" · "+item.en),"DESCRIPTION:"+icsEsc(item.badge+(item.review?" · समीक्षाधीन":"")+" · "+item.summary),"END:VEVENT");
  lines.push("END:VCALENDAR");
  return text(lines.join("\r\n")+"\r\n","text/calendar; charset=utf-8");
}

async function combinedIcs(env:Env,url:URL){
  const raw=url.searchParams.get("communities");
  const selected=(raw===null?[...COMMUNITY_IDS]:raw.split(",").filter(Boolean).filter(x=>COMMUNITY_IDS.includes(x as any))) as string[];
  const from=url.searchParams.get("from")||todayNepal();
  if(!validDate(from))return json({ok:false,error:"invalid_from"},400,"no-store");
  const to=addDays(from,550);
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mero Patro//My Communities//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:मेरो समुदाय · Mero Patro","REFRESH-INTERVAL;VALUE=DURATION:P1D"];
  for(const suite of selected.filter(x=>x!=="nepal-sambat")){
    const rows=await queryPayloads(env,
      "select payload from content_records where table_name='community_dates' and json_extract(payload,'$.suite')=?1 and json_extract(payload,'$.start_ad')>=?2 and json_extract(payload,'$.start_ad')<=?3 order by json_extract(payload,'$.start_ad'),record_key",
      [suite,from,to]);
    const fm=await festivals(env,suite);
    for(const item of mergeCommunity(rows.filter((row:any)=>!row.region),fm)){
      lines.push("BEGIN:VEVENT","UID:"+suite+"-"+item.id+"-"+item.start+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(item.start),"DTEND;VALUE=DATE:"+icsDate(addDays(item.end,1)),"SUMMARY:"+icsEsc(item.dev+" · "+item.en),"DESCRIPTION:"+icsEsc(item.badge+(item.review?" · समीक्षाधीन":"")),"END:VEVENT");
    }
  }
  if(selected.includes("nepal-sambat")){
    const dates=await queryPayloads(env,
      "select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.start_ad')>=?1 and json_extract(payload,'$.start_ad')<=?2 order by json_extract(payload,'$.start_ad'),record_key",
      [from,to]);
    const fs=await queryPayloads(env,"select payload from content_records where table_name='ns_festivals' order by record_key");
    const fm=new Map(fs.map((f:any)=>[f.id,f]));
    for(const row of dates){const f:any=fm.get(row.festival_id);if(!f)continue;lines.push("BEGIN:VEVENT","UID:ns-"+row.festival_id+"-"+row.start_ad+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(row.start_ad),"DTEND;VALUE=DATE:"+icsDate(addDays(row.end_ad,1)),"SUMMARY:"+icsEsc(f.dev+" · "+f.en),"DESCRIPTION:"+icsEsc(badge(row.confidence)+(f.status==="review"?" · समीक्षाधीन":"")),"END:VEVENT");}
  }
  lines.push("END:VCALENDAR");
  return text(lines.join("\r\n")+"\r\n","text/calendar; charset=utf-8");
}

async function nepalSambat(env:Env,url:URL){
  const ad=url.searchParams.get("ad")||todayNepal();
  if(!validDate(ad))return json({ok:false,error:"invalid_ad"},400,"no-store");
  const base=(await queryPayloads(env,"select payload from content_records where table_name='ns_days' and ad_date=?1 limit 1",[ad]))[0];
  if(!base)return null;
  const until=addDays(ad,60);
  const dates=await queryPayloads(env,
    "select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.start_ad')>=?1 and json_extract(payload,'$.start_ad')<=?2 order by json_extract(payload,'$.start_ad') limit 12",
    [ad,until]);
  const fs=await queryPayloads(env,"select payload from content_records where table_name='ns_festivals' order by record_key");
  const fm=new Map(fs.map((f:any)=>[f.id,f]));
  const upcoming=dates.map((row:any)=>{const f:any=fm.get(row.festival_id)||{};return{id:row.festival_id,dev:f.dev,roman:f.roman,en:f.en,start:row.start_ad,end:row.end_ad,confidence:row.confidence,badge:badge(row.confidence),declaredAnnually:!!f.declared_annually,status:f.status,review:f.status==="review",review_label:f.status==="review"?"समीक्षाधीन":null};});
  const year=base.ns_year;
  const next=(await queryPayloads(env,
    "select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.ns_year')=?1 and json_extract(payload,'$.festival_id')='mha-puja' limit 1",
    [Number(year)+1]))[0];
  return json({ok:true,ad,lunar:{year:base.ns_year,month_no:base.ns_month,paksha:base.ns_paksha,tithi_number:base.ns_tithi,adhika:base.ns_adhik,formatted:base.ns_label,formatted_ne:base.ns_label,formatted_newa:base.ns_label_newa},solar:{year:base.solar_year,month:base.solar_month,day:base.solar_day},nextNewYear:next?{nsYear:Number(year)+1,ad:next.start_ad,days:Math.round((Date.parse(next.start_ad)-Date.parse(ad))/DAY)}:null,upcoming,source:"Cloudflare D1 migrated Nepal Sambat tables"});
}

async function nsFestivals(env:Env,url:URL){
  const year=Number(url.searchParams.get("year"));
  if(!Number.isInteger(year)||year<1000||year>1300)return json({ok:false,error:"invalid_ns_year"},400,"no-store");
  const rows=await queryPayloads(env,"select payload from content_records where table_name='ns_festival_dates' and json_extract(payload,'$.ns_year')=?1 order by json_extract(payload,'$.start_ad'),record_key",[year]);
  const fs=await queryPayloads(env,"select payload from content_records where table_name='ns_festivals' order by record_key");
  const fm=new Map(fs.map((f:any)=>[f.id,f]));
  const data=rows.map((row:any)=>{const f:any=fm.get(row.festival_id)||{};return{id:row.festival_id,dev:f.dev,newa:f.newa||null,roman:f.roman,en:f.en,start:row.start_ad,end:row.end_ad,tradition:f.tradition,places:f.places||[],publicHoliday:f.public_holiday||"none",confidence:row.confidence,badge:badge(row.confidence),declaredAnnually:!!f.declared_annually,status:f.status,review:f.status==="review",review_label:f.status==="review"?"समीक्षाधीन":null};});
  if(!data.length)return null;
  return json({ok:true,year,festivals:data,review:data.filter((x:any)=>x.review).map((x:any)=>({id:x.id,dev:x.dev}))},200,DAYCACHE);
}

async function nsConvert(env:Env,url:URL){
  let ad=url.searchParams.get("ad");
  if(!ad&&url.searchParams.get("ns")){
    const match=url.searchParams.get("ns")!.match(/^(\d{3,4})-(\d{1,2})-(thwa|ga)-(\d{1,2})$/);
    if(!match)return json({ok:false,error:"invalid_ns_format"},400,"no-store");
    const adhik=url.searchParams.get("adhik")==="1";
    const rows=await queryPayloads(env,
      "select payload from content_records where table_name='ns_days' and json_extract(payload,'$.ns_year')=?1 and json_extract(payload,'$.ns_month')=?2 and json_extract(payload,'$.ns_paksha')=?3 and json_extract(payload,'$.ns_tithi')=?4 and json_extract(payload,'$.ns_adhik')=?5 order by ad_date limit 1",
      [Number(match[1]),Number(match[2]),match[3],Number(match[4]),adhik?1:0]);
    ad=rows[0]?.ad;
  }
  if(!ad&&url.searchParams.get("solar")){
    const match=url.searchParams.get("solar")!.match(/^(\d{3,4})-(\d{1,2})-(\d{1,2})$/);
    if(!match)return json({ok:false,error:"invalid_solar_format"},400,"no-store");
    const rows=await queryPayloads(env,
      "select payload from content_records where table_name='ns_days' and json_extract(payload,'$.solar_year')=?1 and json_extract(payload,'$.solar_month')=?2 and json_extract(payload,'$.solar_day')=?3 order by ad_date limit 1",
      [Number(match[1]),Number(match[2]),Number(match[3])]);
    ad=rows[0]?.ad;
  }
  if(!ad||!validDate(ad))return json({ok:false,error:"give_ad_ns_or_solar"},400,"no-store");
  return nepalSambat(env,new URL("https://local/api?ad="+encodeURIComponent(ad)));
}

async function nsIcs(env:Env,url:URL){
  const response=await nsFestivals(env,url);if(!response)return null;if(!response.ok)return response;
  const payload=await response.json();
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mero Patro//Nepal Sambat//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:नेपाल संवत् "+payload.year,"REFRESH-INTERVAL;VALUE=DURATION:P7D"];
  for(const item of payload.festivals)lines.push("BEGIN:VEVENT","UID:ns-"+item.id+"-"+item.start+"@meropatro","DTSTART;VALUE=DATE:"+icsDate(item.start),"DTEND;VALUE=DATE:"+icsDate(addDays(item.end,1)),"SUMMARY:"+icsEsc(item.dev+" · "+item.en),"DESCRIPTION:"+icsEsc(item.badge+(item.review?" · समीक्षाधीन":"")),"END:VEVENT");
  lines.push("END:VCALENDAR");
  return text(lines.join("\r\n")+"\r\n","text/calendar; charset=utf-8");
}

function location(lat:number,lon:number,name="Custom"){
  return {name,lat,lon,tz:"Asia/Kathmandu",height:0};
}
function clock(date:Date){return date.toLocaleTimeString("en-GB",{timeZone:"Asia/Kathmandu",hour:"2-digit",minute:"2-digit"});}

async function hijri(url:URL){
  const date=url.searchParams.get("date")||todayNepal();
  const lat=Number(url.searchParams.get("lat")||27.7172),lon=Number(url.searchParams.get("lon")||85.324);
  const method=(url.searchParams.get("method")||"karachi") as MethodId;
  const asr=(url.searchParams.get("asr")||"hanafi") as "hanafi"|"shafii";
  if(!validDate(date)||!Number.isFinite(lat)||lat<-60||lat>60||!Number.isFinite(lon)||lon<-180||lon>180||!(method in METHODS)||!["hanafi","shafii"].includes(asr))return json({ok:false,error:"invalid_query"},400,"no-store");
  const loc=location(lat,lon),h=hijriOf(date,loc),p=prayerTimes(date,loc,method,asr),cres=crescentLikely(date,loc),month=HIJRI_MONTHS[h.month-1];
  return json({ok:true,date,hijri:{...h,month_name:month},prayer:{fajr:clock(p.fajr),sunrise:clock(p.sunrise),dhuhr:clock(p.dhuhr),asr:clock(p.asr),maghrib:clock(p.maghrib),isha:clock(p.isha)},method:METHODS[method].label,asrSchool:asr,qibla:Math.round(qibla(lat,lon)*10)/10,crescent:{visible:cres.visible,ageHours:+cres.ageHours.toFixed(1),altitude:+cres.altitude.toFixed(1),elongation:+cres.elongation.toFixed(1)},badge:"सम्भावित",note:"Hijri month starts are astronomical expectations until Nepal's official moon-sighting announcement."});
}

async function ramadan(url:URL){
  const hy=Number(url.searchParams.get("hy")),city=Math.min(NEPAL_CITIES.length-1,Math.max(0,Number(url.searchParams.get("city")||0))),method=(url.searchParams.get("method")||"karachi") as MethodId;
  if(!Number.isInteger(hy)||hy<1300||hy>1700||!Number.isInteger(city)||!(method in METHODS))return json({ok:false,error:"invalid_query"},400,"no-store");
  const loc=NEPAL_CITIES[city],start=expectedMonthStart(hy,9,loc),end=expectedMonthStart(hy,10,loc),days:any[]=[];
  for(let date=start,i=1;date<end;date=addDays(date,1),i++){const p=prayerTimes(date,loc,method,"hanafi");days.push({roza:i,date,sehriEnds:clock(p.fajr),iftar:clock(p.maghrib)});}
  return json({ok:true,hijriYear:hy,city:loc.name,expectedStart:start,expectedEid:end,badge:"सम्भावित",days},200,DAYCACHE);
}

const ANIMALS:any={
  tamang:[["मुसा","Rat","🐀"],["गाई","Cow","🐄"],["बाघ","Tiger","🐅"],["खरायो","Rabbit","🐇"],["ड्रागन (बादल)","Dragon (Cloud)","🐉"],["सर्प","Snake","🐍"],["घोडा","Horse","🐎"],["भेडा","Sheep","🐑"],["बाँदर","Monkey","🐒"],["चरा","Bird","🐦"],["कुकुर","Dog","🐕"],["सुँगुर","Pig","🐖"]],
  tibetan:[["मुसा","Rat","🐀"],["गोरु","Ox","🐂"],["बाघ","Tiger","🐅"],["खरायो","Rabbit","🐇"],["ड्रागन","Dragon","🐉"],["सर्प","Snake","🐍"],["घोडा","Horse","🐎"],["भेडा","Sheep","🐑"],["बाँदर","Monkey","🐒"],["चरा","Bird","🐓"],["कुकुर","Dog","🐕"],["सुँगुर","Pig","🐖"]],
  gurung:[["मुसा","Mouse","🐁"],["गाई","Cow","🐄"],["बाघ","Tiger","🐅"],["बिरालो","Cat","🐈"],["गरुड","Eagle","🦅"],["सर्प","Serpent","🐍"],["घोडा","Horse","🐎"],["भेडा","Sheep","🐑"],["बाँदर","Monkey","🐒"],["चरा","Bird","🐦"],["कुकुर","Dog","🐕"],["मृग","Deer","🦌"]]
};
function animal(c:string,y:number){const i=((y-2020)%12+12)%12,[dev,en,emoji]=ANIMALS[c][i];return{index:i,dev,en,emoji};}
function element(y:number){const values:any=[["काठ","Wood","ཤིང"],["आगो","Fire","མེ"],["माटो","Earth","ས"],["धातु","Metal","ལྕགས"],["पानी","Water","ཆུ"]],s=((y-4)%10+10)%10,[dev,en,bo]=values[Math.floor(s/2)];return{dev,en,bo,gender:s%2===0?"male":"female",genderDev:s%2===0?"पुरुष":"स्त्री"};}
async function lho(env:Env,url:URL){
  const date=url.searchParams.get("date")||todayNepal();if(!validDate(date))return json({ok:false,error:"invalid_date"},400,"no-store");
  const y=Number(date.slice(0,4));
  const rows=await queryPayloads(env,
    "select payload from content_records where table_name='community_dates' and json_extract(payload,'$.suite')='lhosar' and json_extract(payload,'$.festival_id') in ('sonam-lhosar','tamu-lhosar','gyalpo-lhosar') and json_extract(payload,'$.year') between ?1 and ?2",
    [y-1,y+1]);
  const find=(id:string,yr:number)=>rows.find((r:any)=>r.festival_id===id&&r.year===yr)?.main;
  const sonam=find("sonam-lhosar",y)||y+"-02-01",gyalpo=find("gyalpo-lhosar",y)||y+"-02-15",tamu=find("tamu-lhosar",y)||y+"-12-30";
  const ty=date>=sonam?y:y-1,tib=date>=gyalpo?y:y-1,gy=date>=tamu?y+1:y;
  return json({ok:true,date,tamang:{...animal("tamang",ty),era:ty+836,cycleYear:ty},tibetan:{...animal("tibetan",tib),element:element(tib),era:tib+127,cycleYear:tib},gurung:{...animal("gurung",gy),cycleYear:gy},boundaries:{sonam,gyalpo,tamu},source:"Cloudflare D1 migrated Lhosar dates + arithmetic cycles"},200,DAYCACHE);
}

export async function communityResponse(request:Request,env:Env):Promise<Response|null>{
  if(!env.DB)return null;
  const url=new URL(request.url),path=url.pathname;
  try{
    if(path==="/api/v1/communities"&&request.method==="GET")return listCommunities(env);
    if(path==="/api/v1/communities/feed.ics"&&request.method==="GET")return combinedIcs(env,url);
    if(path==="/api/v1/communities/lho"&&request.method==="GET")return lho(env,url);
    const ics=path.match(/^\/api\/v1\/communities\/([^/]+)\/ics$/);
    if(ics&&request.method==="GET")return communityIcs(env,decodeURIComponent(ics[1]),url);
    const suite=path.match(/^\/api\/v1\/communities\/([^/]+)$/);
    if(suite&&request.method==="GET")return communityItems(env,decodeURIComponent(suite[1]),url);
    if(path==="/api/v1/hijri"&&request.method==="GET")return hijri(url);
    if(path==="/api/v1/hijri/ramadan"&&request.method==="GET")return ramadan(url);
    if(path==="/api/v1/nepal-sambat"&&request.method==="GET")return nepalSambat(env,url);
    if(path==="/api/v1/nepal-sambat/festivals"&&request.method==="GET")return nsFestivals(env,url);
    if(path==="/api/v1/nepal-sambat/convert"&&request.method==="GET")return nsConvert(env,url);
    if(path==="/api/v1/nepal-sambat/ics"&&request.method==="GET")return nsIcs(env,url);
    return null;
  }catch(error){
    return json({ok:false,error:"community_runtime_error",detail:String((error as Error)?.message||error)},503,"no-store");
  }
}
