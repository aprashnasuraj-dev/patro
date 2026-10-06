import * as Astronomy from "astronomy-engine";
import { adToBs, bsToAd } from "../packages/core/src";

type Period = "daily" | "weekly" | "monthly" | "yearly";
type System = "vedic" | "western";
type Calendar = "bs" | "gregorian";
type Language = "ne" | "en";

type SignMeta = { id:string; name_ne:string; name_en:string; symbol:string };
type Position = { longitude:number; sign:number; retrograde:boolean };
type PositionMap = Record<string, Position>;
type PeriodWindow = {
  kind: Period;
  calendar: "civil" | Calendar;
  timezone: "Asia/Kathmandu";
  start_date: string;
  end_date_exclusive: string;
  start_bs: string;
  last_date_bs: string;
  key: string;
  days: number;
};

type ExecutionCtx = { waitUntil(promise: Promise<unknown>): void };

const ENGINE_VERSION = "aafnai-rashifal-native-2";
const NPT = "+05:45";
const DAY_MS = 86_400_000;
const PUBLIC_PATHS = new Set(["/api/v1/rashifal/universal", "/api/rashifal/universal"]);
const META_PATHS = new Set(["/api/v1/rashifal/metadata", "/api/rashifal/metadata"]);
const PERSONAL_PATHS = new Set(["/api/v1/rashifal/personalized", "/api/rashifal/personalized"]);

const SIGNS: SignMeta[] = [
  {id:"aries",name_ne:"मेष",name_en:"Aries",symbol:"♈"},
  {id:"taurus",name_ne:"वृष",name_en:"Taurus",symbol:"♉"},
  {id:"gemini",name_ne:"मिथुन",name_en:"Gemini",symbol:"♊"},
  {id:"cancer",name_ne:"कर्कट",name_en:"Cancer",symbol:"♋"},
  {id:"leo",name_ne:"सिंह",name_en:"Leo",symbol:"♌"},
  {id:"virgo",name_ne:"कन्या",name_en:"Virgo",symbol:"♍"},
  {id:"libra",name_ne:"तुला",name_en:"Libra",symbol:"♎"},
  {id:"scorpio",name_ne:"वृश्चिक",name_en:"Scorpio",symbol:"♏"},
  {id:"sagittarius",name_ne:"धनु",name_en:"Sagittarius",symbol:"♐"},
  {id:"capricorn",name_ne:"मकर",name_en:"Capricorn",symbol:"♑"},
  {id:"aquarius",name_ne:"कुम्भ",name_en:"Aquarius",symbol:"♒"},
  {id:"pisces",name_ne:"मीन",name_en:"Pisces",symbol:"♓"},
];

const CLASSICAL = ["sun","moon","mars","mercury","jupiter","venus","saturn"] as const;
const BODY: Record<(typeof CLASSICAL)[number], any> = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mars: Astronomy.Body.Mars,
  mercury: Astronomy.Body.Mercury,
  jupiter: Astronomy.Body.Jupiter,
  venus: Astronomy.Body.Venus,
  saturn: Astronomy.Body.Saturn,
};
const DOMAIN_PLANETS: Record<string, (typeof CLASSICAL)[number][]> = {
  work:["sun","mercury","saturn"],
  resources:["jupiter","venus","mercury"],
  relationships:["venus","moon","jupiter"],
  wellbeing:["sun","moon","mars"],
  learning:["mercury","jupiter"],
};
const DOMAIN_HOUSES: Record<string, number[]> = {
  work:[6,10,11], resources:[2,8,11], relationships:[5,7,11], wellbeing:[1,4,6], learning:[3,5,9],
};
const VEDHA: Record<string, Record<number, number>> = {
  sun:{3:9,6:12,10:4,11:5},
  moon:{1:5,3:9,6:12,7:2,10:4,11:8},
  mars:{3:12,6:9,11:5},
  mercury:{2:5,4:3,6:9,8:1,10:8,11:12},
  jupiter:{2:12,5:4,7:3,9:10,11:8},
  venus:{1:8,2:7,3:1,4:10,5:9,8:5,9:11,11:6,12:3},
  saturn:{3:12,6:9,11:5},
};
const TARA_SCORES = [50,87.5,12.5,75,25,100,0,87.5,100];
const ASPECTS = [
  {name:"conjunction",angle:0,orb:3,score:50}, {name:"sextile",angle:60,orb:2,score:75},
  {name:"square",angle:90,orb:3,score:35}, {name:"trine",angle:120,orb:3,score:75},
  {name:"opposition",angle:180,orb:3,score:35},
];

const COPY = {
  ne: {
    labels:{work:"काम",resources:"स्रोत र खर्च",relationships:"सम्बन्ध",wellbeing:"दैनिक सन्तुलन",learning:"सिकाइ"},
    period:{
      daily:"आजका चार समयबिन्दुको ग्रहगत संकेतबाट तयार गरिएको सामान्य चिन्तन हो।",
      weekly:"आइतबारदेखि शनिबारसम्मका ग्रहगत संकेतको औसतबाट यो साप्ताहिक चिन्तन तयार गरिएको हो।",
      monthly:"चयन गरिएको महिनाभरिका दैनिक ग्रहगत नमुनाको औसतबाट यो मासिक चिन्तन तयार गरिएको हो।",
      yearly:"चयन गरिएको वर्षका नियमित ग्रहगत नमुनालाई समेटेर यो वार्षिक दिशासूचक तयार गरिएको हो।",
    },
    domains:{
      work:{supportive:["एउटा प्राथमिक कामलाई स्पष्ट तयारीसहित अघि बढाउनुहोस्। सहयोग चाहिने ठाउँमा ठोस अनुरोध राख्नु उपयोगी हुन्छ।","कामको प्रगति देखिने गरी टिपोट गर्नुहोस्। निर्णय चाहिने बिन्दुलाई छोटो र स्पष्ट बनाउनुहोस्।"],balanced:["बाँकी काम र उपलब्ध समय मिलाएर सानो तर पूरा हुने लक्ष्य रोज्नुहोस्।","कामको गति स्थिर राख्नुहोस् र सहमति भएका कुरा छोटो लिखित टिपोटमा राख्नुहोस्।"],reflective:["कामलाई साना चरणमा बाँड्नुहोस्। दबाबमा ठूलो वाचा गर्नुभन्दा समय र स्रोत फेरि जाँच्नुहोस्।","ढिलाइका लागि केही खाली समय राख्नुहोस् र प्रतिक्रिया दिनुअघि अपेक्षा स्पष्ट गर्नुहोस्।"]},
      resources:{supportive:["आम्दानी, खर्च र बाँकी दायित्व एकै ठाउँमा हेर्नुहोस्। सानो बचत बानीलाई निरन्तरता दिन सकिन्छ।","रोकिएका हिसाब मिलाउनुहोस् र अवसरको सर्त पढेर मात्रै निर्णय गर्नुहोस्।"],balanced:["खर्चको सीमा तय गरेर आवश्यक र वैकल्पिक कुरा छुट्याउनुहोस्।","साझा खर्च वा लेनदेनमा रकम र समय स्पष्ट राख्नुहोस्।"],reflective:["हतारको खरिद अघि केही समय पर्खेर आवश्यकता जाँच्नुहोस्।","आर्थिक वाचा स्वीकार्नुअघि बजेट, शुल्क र सर्त फेरि जाँच्नुहोस्।"]},
      relationships:{supportive:["कसैको कुरा बीचमा नरोकी सुन्ने समय निकाल्नुहोस्। ठोस प्रशंसा सम्बन्ध बलियो बनाउँछ।","साझा योजनामा दुवै पक्षको अपेक्षा सोध्नुहोस् र सानो सहयोगलाई स्थान दिनुहोस्।"],balanced:["आफ्नो आवश्यकता सरल भाषामा भन्नुहोस्; मौनतालाई अर्थ लगाउनुभन्दा सोधेर बुझ्नुहोस्।","असहमति भए व्यक्तिभन्दा विषयमा केन्द्रित भएर कुरा गर्नुहोस्।"],reflective:["संवेदनशील कुराकानीका लागि शान्त समय रोज्नुहोस् र अनुमानलाई तथ्य नठान्नुहोस्।","मतभेद चर्किए केही समय लिएर समाधान गर्नुपर्ने विषयमा फर्कनुहोस्।"]},
      wellbeing:{supportive:["आराम, पानी र सहज हिँडडुलको समय राख्नुहोस्। ऊर्जा राम्रो हुँदा पनि विश्राम छोड्नु हुँदैन।","सुत्ने र उठ्ने समय नियमित राख्दै आफ्नो क्षमताअनुसार कामको गति मिलाउनुहोस्।"],balanced:["थकान र शरीरका संकेतलाई ध्यान दिनुहोस्; कामबीच छोटो विश्राम राख्नुहोस्।","गतिविधि र आरामको सन्तुलन हेर्नुहोस्। स्वास्थ्य चिन्ता भए योग्य स्वास्थ्यकर्मीको सल्लाह लिनुहोस्।"],reflective:["व्यस्तता घटाएर आवश्यक काम पहिले गर्नुहोस्। असहजतालाई राशिफलसँग जोडेर बेवास्ता नगर्नुहोस्।","आफ्नो सीमालाई सम्मान गर्दै दिनको गति मिलाउनुहोस्; निरन्तर समस्या भए स्वास्थ्यकर्मीसँग कुरा गर्नुहोस्।"]},
      learning:{supportive:["जानेको कुरा आफ्नै शब्दमा लेखेर वा अरूलाई बुझाएर अभ्यास गर्नुहोस्।","बाँकी प्रश्नको सूची बनाउनुहोस् र प्रतिक्रिया लिएर आफ्नो बुझाइ जाँच्नुहोस्।"],balanced:["एउटा विषय छानेर छोटो तर नियमित अभ्यास गर्नुहोस्।","पुरानो नोट दोहोर्‍याएर स्पष्ट नभएको कुरा अलग टिप्नुहोस्।"],reflective:["अलमल भए आधारभूत चरणबाट दोहोर्‍याउनुहोस् र निरन्तरतामा ध्यान दिनुहोस्।","एकै पटक धेरै विषय समात्नुभन्दा एउटा जिज्ञासाबाट सुरु गर्नुहोस्।"]},
    },
    note:"यो परम्परागत ज्योतिषीय नियमबाट बनेको सम्पादकीय संकेत हो। अङ्कहरू घटना हुने सम्भावना वा वैज्ञानिक भविष्यवाणी होइनन्।",
  },
  en: {
    labels:{work:"Work",resources:"Resources",relationships:"Relationships",wellbeing:"Daily balance",learning:"Learning"},
    period:{
      daily:"This reflection uses four calculated transit samples across the Nepal civil day.",
      weekly:"This weekly reflection combines transit samples from Sunday through Saturday.",
      monthly:"This monthly reflection combines daily transit samples across the selected month.",
      yearly:"This yearly guide combines regular transit samples across the selected year.",
    },
    domains:{
      work:{supportive:["Advance one priority with clear preparation. Make a specific request where support is needed.","Make progress visible with a short update and state the decision you need."],balanced:["Check unfinished tasks and available time before taking on more. Choose a small, finishable goal.","Keep a steady pace and record key agreements so expectations stay clear."],reflective:["Break work into smaller stages. Recheck time and resources before making a large promise under pressure.","Allow a buffer for delays and clarify expectations before reacting." ]},
      resources:{supportive:["Review income, spending and obligations together. Keep a small savings habit consistent.","Reconcile outstanding records and read the terms before judging an opportunity."],balanced:["Set a spending limit and separate needs from optional purchases.","Clarify amounts and dates for shared expenses or transactions."],reflective:["Pause before an impulsive purchase and reassess the need.","Check the budget, fees and conditions before accepting a financial commitment."]},
      relationships:{supportive:["Make time to listen without interrupting. Specific appreciation can strengthen connection.","Ask about both sides’ expectations for a shared plan and leave room for small acts of help."],balanced:["Express your needs plainly; ask what someone means instead of interpreting silence.","Keep disagreements focused on the issue rather than the person."],reflective:["Choose a calm moment for a sensitive conversation and separate assumptions from observed facts.","If tension rises, pause and return to the issue that needs a solution."]},
      wellbeing:{supportive:["Make room for rest, water and comfortable movement. Preserve recovery time even on energetic days.","Keep sleep and waking times steady while matching your pace to your actual capacity."],balanced:["Notice fatigue and body signals; include short breaks in your routine.","Review the balance of activity and rest. Discuss health concerns with a qualified clinician."],reflective:["Reduce overload and focus on essentials. Do not dismiss symptoms because of a horoscope.","Respect your limits and seek professional care for persistent concerns."]},
      learning:{supportive:["Explain an idea in your own words or connect it to a small experiment.","List unresolved questions and seek feedback that tests your understanding."],balanced:["Choose one subject for brief, regular practice.","Review existing notes before adding more material and record what remains unclear."],reflective:["Return to the basics when a topic feels confusing and focus on consistent practice.","Start with one question instead of many topics; treat mistakes as revision signals."]},
    },
    note:"This is an editorial reflection generated from traditional astrology rules. Scores are not event probabilities or scientifically validated predictions.",
  },
} as const;

function pad(n:number){ return String(n).padStart(2,"0"); }
function normalizeDeg(value:number){ return ((value % 360) + 360) % 360; }
function signedDelta(a:number,b:number){ let d=normalizeDeg(a-b); if(d>180)d-=360; return d; }
function clampScore(value:number){ return Math.max(0,Math.min(100,Math.round(value*10)/10)); }
function addDays(iso:string,n:number){ const d=new Date(iso+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function daysBetween(a:string,b:string){ return Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/DAY_MS); }
function validDate(value:string|null|undefined){
  if(!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split("-").map(Number), x=new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;
}
function todayNepal(){ return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }
function bsText(ad:string){ const bs=adToBs(ad); return `${bs.year}-${pad(bs.month)}-${pad(bs.day)}`; }
function fnv(text:string){ let h=2166136261; for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }
function band(score:number){ return score>=65?"supportive":score<40?"reflective":"balanced"; }
function house(anchor:number, transit:number){ return ((transit-anchor)%12+12)%12+1; }
function signIndex(longitude:number){ return Math.floor(normalizeDeg(longitude)/30)%12; }
function nakshatraIndex(longitude:number){ return Math.floor(normalizeDeg(longitude)/(360/27))%27; }

function periodWindow(day:string, period:Period, calendar:Calendar):PeriodWindow{
  let start=day,end=addDays(day,1),mode:"civil"|Calendar="civil";
  if(period==="weekly"){
    const weekday=new Date(day+"T00:00:00Z").getUTCDay();
    start=addDays(day,-weekday); end=addDays(start,7);
  }else if(period==="monthly"){
    mode=calendar;
    if(calendar==="gregorian"){
      const [y,m]=day.split("-").map(Number); start=`${y}-${pad(m)}-01`;
      const ny=m===12?y+1:y,nm=m===12?1:m+1; end=`${ny}-${pad(nm)}-01`;
    }else{
      const bs=adToBs(day); start=bsToAd({year:bs.year,month:bs.month,day:1});
      const ny=bs.month===12?bs.year+1:bs.year,nm=bs.month===12?1:bs.month+1; end=bsToAd({year:ny,month:nm,day:1});
    }
  }else if(period==="yearly"){
    mode=calendar;
    if(calendar==="gregorian"){
      const y=Number(day.slice(0,4)); start=`${y}-01-01`; end=`${y+1}-01-01`;
    }else{
      const bs=adToBs(day); start=bsToAd({year:bs.year,month:1,day:1}); end=bsToAd({year:bs.year+1,month:1,day:1});
    }
  }
  return {kind:period,calendar:mode,timezone:"Asia/Kathmandu",start_date:start,end_date_exclusive:end,start_bs:bsText(start),last_date_bs:bsText(addDays(end,-1)),key:`${period}:${mode}:${start}`,days:daysBetween(start,end)};
}

function sampleDates(window:PeriodWindow){
  const out:Date[]=[];
  const add=(date:string,hour:number)=>out.push(new Date(`${date}T${pad(hour)}:00:00${NPT}`));
  if(window.kind==="daily") [3,9,15,21].forEach(h=>add(window.start_date,h));
  else if(window.kind==="weekly") for(let i=0;i<window.days;i++) [9,21].forEach(h=>add(addDays(window.start_date,i),h));
  else if(window.kind==="monthly") for(let i=0;i<window.days;i++) add(addDays(window.start_date,i),12);
  else {
    const count=24;
    for(let i=0;i<count;i++){
      const offset=Math.min(window.days-1,Math.floor((i+0.5)*window.days/count));
      add(addDays(window.start_date,offset),12);
    }
  }
  return out;
}

function tropicalSnapshot(date:Date):PositionMap{
  const out:PositionMap={};
  for(const planet of CLASSICAL){
    const now=Astronomy.Ecliptic(Astronomy.GeoVector(BODY[planet],date,true)).elon;
    const laterDate=new Date(date.getTime()+DAY_MS);
    const later=Astronomy.Ecliptic(Astronomy.GeoVector(BODY[planet],laterDate,true)).elon;
    out[planet]={longitude:normalizeDeg(now),sign:signIndex(now),retrograde:signedDelta(later,now)<0};
  }
  const T=(date.getTime()-Date.UTC(2000,0,1,12))/(DAY_MS*36525);
  const node=normalizeDeg(125.04452-1934.136261*T+0.0020708*T*T+(T*T*T)/450000);
  out.rahu={longitude:node,sign:signIndex(node),retrograde:true};
  const ketu=normalizeDeg(node+180); out.ketu={longitude:ketu,sign:signIndex(ketu),retrograde:true};
  return out;
}
function lahiriAyanamsha(date:Date){
  const years=(date.getTime()-Date.UTC(2000,0,1,12))/(DAY_MS*365.2425);
  return 23.85675+0.0139688*years;
}
function siderealSnapshot(date:Date){
  const tropical=tropicalSnapshot(date), aya=lahiriAyanamsha(date), out:PositionMap={};
  for(const [planet,p] of Object.entries(tropical)){
    const longitude=normalizeDeg(p.longitude-aya); out[planet]={longitude,sign:signIndex(longitude),retrograde:p.retrograde};
  }
  return out;
}

function exempt(a:string,b:string){ return a===b || (a==="sun"&&b==="saturn") || (a==="saturn"&&b==="sun") || (a==="moon"&&b==="mercury") || (a==="mercury"&&b==="moon"); }
function chandraScore(anchor:number, moonSign:number){ const h=house(anchor,moonSign); return {house:h,score:[1,3,6,7,10,11].includes(h)?100:[4,8,12].includes(h)?0:50}; }
function taraScore(natalStar:number, transitStar:number){ const count=((transitStar-natalStar)%27+27)%27+1,index=(count-1)%9; return {count,index:index+1,score:TARA_SCORES[index]}; }
function gocharScores(anchor:number,pos:PositionMap){
  const houses:Record<string,number>={}; for(const planet of CLASSICAL) houses[planet]=house(anchor,pos[planet].sign);
  const out:Record<string,number>={};
  for(const planet of CLASSICAL){
    const map=VEDHA[planet], h=houses[planet], block=map?.[h];
    if(block){
      const blockers=CLASSICAL.filter(other=>houses[other]===block&&!exempt(planet,other)); out[planet]=blockers.length?50:100;
    }else{
      const reverse=Object.entries(map||{}).filter(([,bad])=>bad===h).map(([good])=>Number(good));
      const blockers=CLASSICAL.filter(other=>reverse.includes(houses[other])&&!exempt(planet,other)); out[planet]=blockers.length?50:25;
    }
  }
  return out;
}
function vedicScores(pos:PositionMap,anchor:number,natalMoonLongitude?:number){
  const ch=chandraScore(anchor,pos.moon.sign), go=gocharScores(anchor,pos), tara=natalMoonLongitude==null?null:taraScore(nakshatraIndex(natalMoonLongitude),nakshatraIndex(pos.moon.longitude));
  const domains:Record<string,number>={};
  for(const [domain,planets] of Object.entries(DOMAIN_PLANETS)){
    const g=planets.reduce((sum,p)=>sum+go[p],0)/planets.length;
    domains[domain]=clampScore(tara?g*0.5+ch.score*0.25+tara.score*0.25:g*0.65+ch.score*0.35);
  }
  return {domains,overall:clampScore(Object.values(domains).reduce((a,b)=>a+b,0)/5),layers:{chandra:ch,tara,gochar:go}};
}
function angularDistance(a:number,b:number){ return Math.abs(signedDelta(a,b)); }
function westernAspectScore(pos:PositionMap,natal:PositionMap,planets:string[]){
  const scores:number[]=[];
  for(const p of planets){
    for(const q of ["sun","moon"]){
      const distance=angularDistance(pos[p].longitude,natal[q].longitude);
      for(const aspect of ASPECTS){ const orb=Math.abs(distance-aspect.angle); if(orb<=aspect.orb)scores.push(aspect.score); }
    }
  }
  return scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:50;
}
function westernScores(pos:PositionMap,anchor:number,natal?:PositionMap){
  const domains:Record<string,number>={};
  for(const [domain,planets] of Object.entries(DOMAIN_PLANETS)){
    const houseScore=planets.reduce((sum,p)=>sum+(DOMAIN_HOUSES[domain].includes(house(anchor,pos[p].sign))?70:50),0)/planets.length;
    domains[domain]=clampScore(natal?houseScore*0.55+westernAspectScore(pos,natal,planets)*0.45:houseScore);
  }
  return {domains,overall:clampScore(Object.values(domains).reduce((a,b)=>a+b,0)/5),layers:{method:natal?"transit-to-natal-sun-moon":"solar-whole-sign-editorial"}};
}

function aggregate(samples:any[]){
  const domains:Record<string,number>={};
  for(const domain of Object.keys(DOMAIN_PLANETS)) domains[domain]=clampScore(samples.reduce((sum,x)=>sum+x.domains[domain],0)/samples.length);
  return {domains,overall:clampScore(Object.values(domains).reduce((a,b)=>a+b,0)/5)};
}
function buildNarrative(scores:{domains:Record<string,number>;overall:number},key:string,window:PeriodWindow){
  const output:any={};
  for(const lang of ["ne","en"] as Language[]){
    const labels=COPY[lang].labels as Record<string,string>;
    const sections=Object.entries(scores.domains).map(([domain,score])=>{
      const b=band(score), choices=(COPY[lang].domains as any)[domain][b] as string[], choice=choices[fnv(`${key}:${lang}:${domain}`)%choices.length];
      return {domain,title:labels[domain],text:choice,band:b,score};
    });
    const strongest=Object.entries(scores.domains).sort((a,b)=>b[1]-a[1])[0][0], careful=Object.entries(scores.domains).sort((a,b)=>a[1]-b[1])[0][0];
    const summary=lang==="ne"
      ? `${COPY.ne.period[window.kind]} यस अवधिमा ${labels[strongest]} तर्फ ध्यान दिन र ${labels[careful]} मा वास्तविक अवस्था हेरेर गति मिलाउन सक्नुहुन्छ।`
      : `${COPY.en.period[window.kind]} Consider giving attention to ${labels[strongest]}, while adjusting your pace in ${labels[careful]} to your actual circumstances.`;
    output[lang]={summary,sections,note:COPY[lang].note};
  }
  return output;
}
function timelineFrom(entries:{date:string;metrics:any}[]){
  const grouped=new Map<string,any[]>();
  for(const entry of entries){const list=grouped.get(entry.date)||[];list.push(entry.metrics);grouped.set(entry.date,list);}
  return [...grouped.entries()].map(([date,rows])=>({date,overall:clampScore(rows.reduce((s,r)=>s+r.overall,0)/rows.length),domains:Object.fromEntries(Object.keys(DOMAIN_PLANETS).map(domain=>[domain,clampScore(rows.reduce((s,r)=>s+r.domains[domain],0)/rows.length)]))}));
}
function positionForSystem(date:Date,system:System){ return system==="vedic"?siderealSnapshot(date):tropicalSnapshot(date); }
function birthInput(body:any){
  const birth=body?.birth&&typeof body.birth==="object"?body.birth:body;
  const localDate=String(birth?.local_date||body?.birth_date||"");
  const localTime=String(birth?.local_time||body?.birth_time||"").trim();
  if(!validDate(localDate)) throw new Error("invalid_birth_date");
  if(localTime&&!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(localTime)) throw new Error("invalid_birth_time");
  const time=localTime||"12:00:00", normalized=time.length===5?time+":00":time;
  const instant=new Date(`${localDate}T${normalized}${NPT}`);
  if(Number.isNaN(instant.getTime())) throw new Error("invalid_birth_time");
  return {localDate,localTime:localTime||null,instant,precision:localTime?"birth-date-time-nepal":"birth-date-only-noon-anchor"};
}
function queryParams(url:URL){
  const period=(url.searchParams.get("period")||"daily") as Period, system=(url.searchParams.get("system")||"vedic") as System, calendar=(url.searchParams.get("calendar")||"bs") as Calendar;
  const date=url.searchParams.get("date")||todayNepal(), sign=url.searchParams.get("sign")||"";
  if(!["daily","weekly","monthly","yearly"].includes(period))throw new Error("invalid_period");
  if(!["vedic","western"].includes(system))throw new Error("invalid_system");
  if(!["bs","gregorian"].includes(calendar))throw new Error("invalid_calendar");
  if(!validDate(date))throw new Error("invalid_date");
  if(sign&&!SIGNS.some(x=>x.id===sign))throw new Error("invalid_sign");
  return {period,system,calendar,date,sign};
}
function stablePublishedAt(window:PeriodWindow){ return `${window.start_date}T00:00:00${NPT}`; }

function readingFor(sign:SignMeta,signIdx:number,system:System,window:PeriodWindow,instants:Date[],snapshots:PositionMap[],personal?:{natal:PositionMap;anchor:number;precision:string}){
  const points=instants.map((instant,index)=>{
    const pos=snapshots[index], metrics=system==="vedic"?vedicScores(pos,personal?.anchor??signIdx,personal?.natal?.moon?.longitude):westernScores(pos,personal?.anchor??signIdx,personal?.natal);
    return {date:new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(instant),metrics};
  });
  const totals=aggregate(points.map(x=>x.metrics));
  const identity=`${ENGINE_VERSION}:${system}:${window.key}:${sign.id}:${personal?.precision||"universal"}`;
  const narrative=buildNarrative(totals,identity,window);
  return {
    id:personal?null:`rf-${fnv(identity).toString(16).padStart(8,"0")}`,
    engine_version:ENGINE_VERSION,
    mode:personal?"personalized":"universal",
    system,
    sign,
    window,
    scores:{overall:totals.overall,domains:totals.domains,meaning:"editorial_index_not_probability"},
    timeline:timelineFrom(points),
    narrative,
    summary_ne:narrative.ne.summary,
    summary_en:narrative.en.summary,
    method:{
      astronomy:"astronomy-engine geocentric true-ecliptic-of-date",
      ayanamsha:system==="vedic"?"Lahiri linear approximation v1":null,
      rahu:system==="vedic"?"mean":null,
      houses:"whole-sign",
      anchor:system==="vedic"?(personal?"natal_moon_sign":"selected_moon_sign"):(personal?"natal_sun_sign":"selected_sun_sign"),
      sampling:window.kind==="daily"?"4 samples/day":window.kind==="weekly"?"2 samples/day":window.kind==="monthly"?"1 sample/day":"24 evenly spaced samples/year",
      sample_count:instants.length,
      birth_precision:personal?.precision||null,
      source_bundle_logic:"Nepal Miti Rashifal v1 period/rule/narrative model adapted to native Cloudflare runtime",
    },
  };
}

function cacheSeconds(period:Period){ return period==="daily"?86400:period==="weekly"?604800:period==="monthly"?2678400:31536000; }
function json(body:any,status=200,cache="no-store",extra:Record<string,string>={}){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache,"x-content-type-options":"nosniff",...extra}});
}
function broadcastCacheRequest(request:Request,window:PeriodWindow,system:System,calendar:Calendar,sign:string){
  const u=new URL(request.url); u.pathname="/__patro/rashifal-broadcast"; u.search="";
  u.searchParams.set("key",`${ENGINE_VERSION}:${system}:${calendar}:${window.key}:${sign||"all"}`);
  return new Request(u.toString(),{method:"GET"});
}

async function universal(request:Request,ctx?:ExecutionCtx){
  const url=new URL(request.url), p=queryParams(url), window=periodWindow(p.date,p.period,p.calendar), cacheKey=broadcastCacheRequest(request,window,p.system,p.calendar,p.sign);
  if(typeof caches!=="undefined"){
    try{const hit=await (caches as any).default.match(cacheKey);if(hit){const h=new Headers(hit.headers);h.set("x-rashifal-cache","broadcast");return new Response(hit.body,{status:hit.status,headers:h});}}catch{}
  }
  const instants=sampleDates(window), snapshots=instants.map(date=>positionForSystem(date,p.system));
  let readings=SIGNS.map((sign,index)=>readingFor(sign,index,p.system,window,instants,snapshots));
  if(p.sign)readings=readings.filter(x=>x.sign.id===p.sign);
  const response=json({
    schema_version:"2.0",engine_version:ENGINE_VERSION,mode:"universal",system:p.system,calendar:p.calendar,window,readings,
    generated_at:stablePublishedAt(window),published_at:stablePublishedAt(window),
    publication_strategy:"deterministic-period-keyed-edge-broadcast",broadcast_key:`${p.system}:${p.calendar}:${window.key}`,
    privacy:{birth_data_received:false,storage:"none"},
  },200,`public, max-age=60, s-maxage=${cacheSeconds(p.period)}, stale-while-revalidate=${cacheSeconds(p.period)}`,{"x-patro-backend":"cloudflare-native-rashifal","x-rashifal-broadcast-key":window.key});
  if(typeof caches!=="undefined"){
    const put=async()=>{try{await (caches as any).default.put(cacheKey,response.clone());}catch{}};
    if(ctx)ctx.waitUntil(put());else await put();
  }
  return response;
}

async function personalized(request:Request){
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const type=request.headers.get("content-type")||""; if(!type.includes("application/json"))return json({error:"json_required"},400);
  const length=Number(request.headers.get("content-length")||0); if(length>8192)return json({error:"request_too_large",max_bytes:8192},413);
  const raw=await request.text(); if(new TextEncoder().encode(raw).byteLength>8192)return json({error:"request_too_large",max_bytes:8192},413);
  let body:any; try{body=JSON.parse(raw);}catch{return json({error:"invalid_json"},400);}
  if(body?.consent!==true)return json({error:"consent_required"},422);
  try{
    const period=(body.period||"daily") as Period, system=(body.system||"vedic") as System, calendar=(body.calendar||"bs") as Calendar, date=String(body.date||todayNepal());
    if(!["daily","weekly","monthly","yearly"].includes(period)||!["vedic","western"].includes(system)||!["bs","gregorian"].includes(calendar)||!validDate(date))throw new Error("invalid_personal_request");
    const birth=birthInput(body), natal=positionForSystem(birth.instant,system), anchor=system==="vedic"?natal.moon.sign:natal.sun.sign, window=periodWindow(date,period,calendar), instants=sampleDates(window), snapshots=instants.map(t=>positionForSystem(t,system)), sign=SIGNS[anchor];
    const reading=readingFor(sign,anchor,system,window,instants,snapshots,{natal,anchor,precision:birth.precision});
    return json({schema_version:"2.0",engine_version:ENGINE_VERSION,mode:"personalized",system,calendar,window,reading,readings:[reading],generated_at:new Date().toISOString(),privacy:{stored:false,cache:"no-store",birth_payload_echoed:false},birth_profile:{anchor_sign:sign,precision:birth.precision,note_ne:birth.localTime?"जन्ममिति र नेपाल समय प्रयोग गरिएको छ।":"जन्मसमय नदिएकाले दिउँसो १२ बजे नेपाल समयलाई अस्थायी एङ्कर मानिएको छ; ठीक चन्द्र राशि चाहिँ जन्मसमयसहित जन्मपत्रो प्रयोग गर्नुहोस्।",note_en:birth.localTime?"Birth date and Nepal local time were used.":"No birth time was supplied, so noon Nepal time is used as a temporary anchor; use the birth-chart feature with a time for an exact Moon-sign context."}},200,"private, no-store, max-age=0",{"x-patro-backend":"cloudflare-native-rashifal","referrer-policy":"no-referrer"});
  }catch(error){return json({error:String((error as Error)?.message||"invalid_personal_request")},422);}
}

export async function nativeRashifalResponse(request:Request,ctx?:ExecutionCtx):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(META_PATHS.has(path)&&request.method==="GET"){
    return json({schema_version:"2.0",engine_version:ENGINE_VERSION,timezone:"Asia/Kathmandu",periods:["daily","weekly","monthly","yearly"],systems:["vedic","western"],calendars:["bs","gregorian"],signs:SIGNS,weekly_start:"Sunday",vedic_defaults:{ayanamsha:"Lahiri",rahu:"mean",houses:"whole-sign"},publication_strategy:"deterministic-period-keyed-edge-broadcast",storage:{publications:"Cache API only",personalized:"none"},privacy:{personalized:"POST + no-store; birth inputs are not persisted"}},200,"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",{"x-patro-backend":"cloudflare-native-rashifal"});
  }
  if(PUBLIC_PATHS.has(path)&&request.method==="GET")return universal(request,ctx);
  if(PERSONAL_PATHS.has(path))return personalized(request);
  return null;
}
