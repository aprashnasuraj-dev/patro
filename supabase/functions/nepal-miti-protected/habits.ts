import { HABITS_CSS, HABITS_APP_JS } from "./habits-ui.ts";
import { habitCatalogue, habitLocaleFromUrl, habitT, type HabitLocale } from "./habits-i18n.ts";

export const HABIT_RULE_KINDS = ["tithi","weekday","bsDate","afterTithiWeekday"];

export function validateRule(rule) {
  if (!rule || typeof rule !== "object" || !HABIT_RULE_KINDS.includes(rule.kind)) throw new Error("invalid_rule");
  if (rule.kind === "tithi" || rule.kind === "afterTithiWeekday") {
    if (!Array.isArray(rule.tithiNumbers) || rule.tithiNumbers.length < 1 || rule.tithiNumbers.length > 2) throw new Error("invalid_tithi");
    const unique = [...new Set(rule.tithiNumbers)];
    if (unique.length !== rule.tithiNumbers.length || unique.some(n => !Number.isInteger(n) || n < 1 || n > 30)) throw new Error("invalid_tithi");
  }
  if (rule.kind === "weekday" || rule.kind === "afterTithiWeekday") {
    if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) throw new Error("invalid_weekday");
  }
  if (rule.kind === "bsDate") {
    if (!Number.isInteger(rule.month) || rule.month < 1 || rule.month > 12) throw new Error("invalid_bs_month");
    if (!Number.isInteger(rule.day) || rule.day < 1 || rule.day > 32) throw new Error("invalid_bs_day");
  }
  return rule;
}

function occurrence(day, basis, triggerBs = null, extra = {}) {
  return {bs:day.bs,ad:day.ad,weekday:day.weekday,tithi:day.tithi,tithiTransition:day.tithiTransition||null,basis,triggerBs,...extra};
}

function tithiTriggerOccurrences(inputDays, tithiNumbers) {
  const days=[...inputDays].sort((a,b)=>String(a.bs).localeCompare(String(b.bs))),out=[];
  for(let i=0;i<days.length;i++){
    const d=days[i];
    if(tithiNumbers.includes(d.tithi?.number))out.push(occurrence(d,"tithi"));
    const tr=d.tithiTransition,nextNumber=tr?.nextNumber;
    if(!tr||!Number.isInteger(nextNumber)||!tithiNumbers.includes(nextNumber))continue;
    const nextDay=days[i+1];
    if(nextDay?.tithi?.number===nextNumber)continue;
    const nextTithi={number:nextNumber,en:tr.next_en||"",ne:tr.next_ne||"",paksha:nextNumber<=15?"Shukla":"Krishna"};
    out.push(occurrence(d,"tithi-transition",null,{tithi:nextTithi,tithiTransition:null,tithiStartTime:tr.time||null}));
  }
  return out.sort((a,b)=>String(a.bs).localeCompare(String(b.bs)));
}

export function enumerateOccurrences(inputDays, inputRule) {
  const rule=validateRule(inputRule),days=[...inputDays].sort((a,b)=>String(a.bs).localeCompare(String(b.bs))),out=[];
  if(rule.kind==="tithi"){
    return tithiTriggerOccurrences(days,rule.tithiNumbers);
  }else if(rule.kind==="weekday"){
    for(const d of days)if(d.weekday===rule.weekday)out.push(occurrence(d,"weekday"));
  }else if(rule.kind==="bsDate"){
    for(const d of days)if(d.month===rule.month&&d.day===rule.day)out.push(occurrence(d,"bsDate"));
  }else if(rule.kind==="afterTithiWeekday"){
    const seen=new Set(),triggers=tithiTriggerOccurrences(days,rule.tithiNumbers),indexByBs=new Map(days.map((d,i)=>[d.bs,i]));
    for(const trigger of triggers){
      const start=indexByBs.get(trigger.bs);
      if(!Number.isInteger(start))continue;
      for(let j=start+1;j<days.length;j++){
        if(days[j].weekday!==rule.weekday)continue;
        if(!seen.has(days[j].bs)){
          seen.add(days[j].bs);
          out.push(occurrence(days[j],"afterTithiWeekday",trigger.bs,{
            triggerTithi:trigger.tithi,
            triggerTithiTransition:trigger.tithiTransition,
            triggerTithiStartTime:trigger.tithiStartTime||null
          }));
        }
        break;
      }
    }
  }
  return out;
}

export function habitsCoreBrowserSource() {
  return [
    "export const HABIT_RULE_KINDS="+JSON.stringify(HABIT_RULE_KINDS)+";",
    "export "+validateRule.toString(),
    occurrence.toString(),
    tithiTriggerOccurrences.toString(),
    "export "+enumerateOccurrences.toString()
  ].join("\n");
}

function htmlEscape(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g,c=>(({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"} as Record<string,string>)[c]||c));
}
function weekdayOptions(locale: HabitLocale): string {
  let out="";for(let i=0;i<7;i++)out+='<option value="'+i+'">'+htmlEscape(habitT(locale,"weekday."+i))+'</option>';return out;
}
export type HabitsDeps={minYear:number;maxYear:number;defaultYear:number;engineVersion:string;getYearData:(year:number)=>unknown};

function habitsHtml(locale: HabitLocale,deps:HabitsDeps): string {
  const t=(key:string,vars:Record<string,string|number>={})=>habitT(locale,key,vars),neHref="/habits?lang=ne",enHref="/habits?lang=en";
  return '<!doctype html><html lang="'+locale+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#176f3b"><title>'+htmlEscape(t("title"))+' | '+htmlEscape(t("brand"))+'</title><link rel="stylesheet" href="/habits.css?v=2"></head><body>'+
    '<header class="top"><div class="wrap nav"><div class="brand"><span class="mark">प</span>'+htmlEscape(t("brand"))+'</div><div class="lang" aria-label="'+htmlEscape(t("language"))+'"><a href="'+neHref+'" lang="ne">'+htmlEscape(t("lang.ne"))+'</a><a href="'+enHref+'" lang="en">'+htmlEscape(t("lang.en"))+'</a></div></div></header>'+
    '<main class="wrap"><a href="/">'+htmlEscape(t("backCalendar"))+'</a><section class="hero"><h1>'+htmlEscape(t("title"))+'</h1><p>'+htmlEscape(t("subtitle"))+'</p><p class="privacy">'+htmlEscape(t("privacy"))+'</p><p class="privacy">'+htmlEscape(t("offline"))+'</p></section>'+
    '<div class="grid"><section class="card"><h2>'+htmlEscape(t("createTitle"))+'</h2><form id="habitForm"><div class="field"><label for="habitName">'+htmlEscape(t("habitName"))+'</label><input id="habitName" maxlength="80" autocomplete="off" placeholder="'+htmlEscape(t("habitNamePlaceholder"))+'"></div>'+
    '<div class="field"><label for="ruleType">'+htmlEscape(t("recurrence"))+'</label><select id="ruleType"><option value="tithi">'+htmlEscape(t("rule.tithi"))+'</option><option value="weekday">'+htmlEscape(t("rule.weekday"))+'</option><option value="bsDate">'+htmlEscape(t("rule.bsDate"))+'</option><option value="afterTithiWeekday">'+htmlEscape(t("rule.afterTithiWeekday"))+'</option></select></div>'+
    '<div id="fieldTithi" class="field rule-fields"><label for="tithiSelect">'+htmlEscape(t("tithi"))+'</label><select id="tithiSelect"><option>'+htmlEscape(t("dataPending"))+'</option></select></div>'+
    '<div id="fieldWeekday" class="field rule-fields" hidden><label for="weekdaySelect">'+htmlEscape(t("weekday"))+'</label><select id="weekdaySelect">'+weekdayOptions(locale)+'</select></div>'+
    '<div id="fieldBsDate" class="form-grid rule-fields" hidden><div class="field"><label for="bsMonth">'+htmlEscape(t("bsMonth"))+'</label><select id="bsMonth"></select></div><div class="field"><label for="bsDay">'+htmlEscape(t("bsDay"))+'</label><input id="bsDay" inputmode="numeric" value="1"></div></div>'+
    '<div id="fieldAfter" class="form-grid rule-fields" hidden><div class="field"><label for="afterTithiSelect">'+htmlEscape(t("afterTithi"))+'</label><select id="afterTithiSelect"></select></div><div class="field"><label for="afterWeekdaySelect">'+htmlEscape(t("afterWeekday"))+'</label><select id="afterWeekdaySelect">'+weekdayOptions(locale)+'</select></div></div>'+
    '<div class="actions"><button class="btn primary" type="submit">'+htmlEscape(t("save"))+'</button></div><div id="status" class="status" role="status" aria-live="polite"></div></form></section>'+
    '<aside class="card"><h2>'+htmlEscape(t("selectedYear"))+' <span id="yearLabel"></span></h2><div class="year-row"><div><label for="viewYear">'+htmlEscape(t("viewYear"))+'</label><input id="viewYear" inputmode="numeric" value="'+deps.defaultYear+'"></div><button id="loadYear" type="button" class="btn">'+htmlEscape(t("loadYear"))+'</button></div><p>'+htmlEscape(t("coverage",{min:deps.minYear,max:deps.maxYear}))+'</p><p class="offline" id="connection"></p><div class="method-box"><h2>'+htmlEscape(t("methodTitle"))+'</h2><p>'+htmlEscape(t("localOnlyProof"))+'</p><p id="methodSource"></p></div></aside></div>'+
    '<section class="section card"><div class="section-head"><h2>'+htmlEscape(t("habitsTitle"))+'</h2></div><div id="habitList" class="list"></div></section><section class="section card"><div class="section-head"><h2>'+htmlEscape(t("upcomingTitle"))+'</h2></div><div id="upcomingList" class="list"></div></section><section class="section card"><div class="section-head"><h2>'+htmlEscape(t("historyTitle"))+'</h2></div><div id="historyList" class="list"></div></section>'+
    '<noscript><div class="noscript">'+htmlEscape(t("noJavaScript"))+'</div></noscript><div class="footer">'+htmlEscape(t("privacy"))+'</div></main><script type="module" src="/habits.js?v=2&lang='+locale+'"></script></body></html>';
}

export async function handleHabitsRequest(request:Request,path:string,url:URL,deps:HabitsDeps):Promise<Response|null>{
  const headers=(type:string,cache="no-store")=>({"content-type":type,"cache-control":cache});
  if(path==="/habits"){const locale=habitLocaleFromUrl(url);return new Response(habitsHtml(locale,deps),{status:200,headers:headers("text/html; charset=utf-8")})}
  if(path==="/habits.css")return new Response(HABITS_CSS,{status:200,headers:headers("text/css; charset=utf-8","public, max-age=3600")});
  if(path==="/habits.js"){const locale=habitLocaleFromUrl(url),bootstrap={config:{locale,minYear:deps.minYear,maxYear:deps.maxYear,defaultYear:deps.defaultYear},catalog:habitCatalogue(locale)},body=HABITS_APP_JS.replace("__HABIT_BOOTSTRAP__",JSON.stringify(bootstrap).replace(/</g,"\\u003c"));return new Response(body,{status:200,headers:headers("application/javascript; charset=utf-8","public, max-age=3600")})}
  if(path==="/habits-core.js")return new Response(habitsCoreBrowserSource(),{status:200,headers:headers("application/javascript; charset=utf-8","public, max-age=3600")});
  if(path==="/api/habits/year"){if(request.method!=="GET")return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:headers("application/json; charset=utf-8")});const year=Number(url.searchParams.get("bs"));if(!Number.isInteger(year)||year<deps.minYear||year>deps.maxYear)return new Response(JSON.stringify({error:"year_out_of_coverage"}),{status:400,headers:headers("application/json; charset=utf-8")});return new Response(JSON.stringify(deps.getYearData(year)),{status:200,headers:headers("application/json; charset=utf-8","public, max-age=86400, stale-while-revalidate=604800")})}
  return null;
}

export const HABITS_TEST_SOURCE_VERSION="v1.4.1";
