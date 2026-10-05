import { useEffect } from "react";
import { adToBs, bsToAd } from "../../packages/core/src";
import { BS_MONTHS, toNepaliDigits } from "../title";

type WeatherDay={date:string;icon:string;label?:string;temperature_max_c:number|null;temperature_min_c:number|null;precipitation_probability_max:number|null};
type CalendarDecoration={tithi:string;ns:string};

const FULL_NE_DAYS=["आइतबार","सोमबार","मंगलबार","बुधबार","बिहीबार","शुक्रबार","शनिबार"];
const NEPALI_DIGITS:Record<string,string>={"०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9"};

function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function englishLabel(ad:string){
  const date=new Date(ad+"T00:00:00Z");
  if(Number.isNaN(date.getTime()))return "";
  const day=date.getUTCDate();
  const month=new Intl.DateTimeFormat("en",{month:"short",timeZone:"UTC"}).format(date);
  return `${day}-${month}`;
}
function tithiText(row:any){
  const p=row?.archive_panchang||row?.panchang||{};
  const t=row?.tithi||p?.tithi||{};
  return String(t?.ne||t?.name_ne||t?.tithi_name_ne||p?.tithi_name_ne||"").trim();
}
function nsText(row:any){
  const value=row?.calendars?.nepal_sambat_detail||row?.calendars?.nepal_sambat||row?.nepal_sambat||row?.ns;
  if(!value)return "";
  if(typeof value==="string")return value.replace(/^नेपाल\s*संवत्\s*/i,"").trim();
  const formatted=String(value.formatted_ne||value.formatted||"").replace(/^नेपाल\s*संवत्\s*/i,"").trim();
  if(formatted)return formatted;
  const month=value.month?.dev||value.month?.ne||value.month_ne||value.month_name_ne||value.month?.roman||"";
  const day=value.day??value.tithi_day??value.date_day??value.tithi?.day;
  if(day!==undefined&&day!==null)return `${month?month+" ":""}${toNepaliDigits(day)}`.trim();
  const year=value.year??value.ns_year;
  return year?toNepaliDigits(year):"";
}
function rowDate(row:any){return String(row?.calendars?.gregorian_ad||row?.ad||row?.date||row?.query_date||"")}
function parseNumber(text:string){
  const normalized=text.replace(/[०-९]/g,(d)=>NEPALI_DIGITS[d]||d).replace(/[^0-9]/g,"");
  const value=Number(normalized);return Number.isInteger(value)?value:NaN;
}
function visibleBsCursor(){
  const route=location.pathname.match(/^\/calendar\/(\d{4})\/(\d{1,2})(?:\/|$)/);
  if(route)return{year:Number(route[1]),month:Number(route[2])};
  try{const bs=adToBs(todayNepal());return{year:bs.year,month:bs.month}}catch{return null}
}
function richCellDate(cell:Element){
  const explicit=cell.getAttribute("data-ad")||"";
  if(/^\d{4}-\d{2}-\d{2}$/.test(explicit))return explicit;
  const title=cell.querySelector<HTMLElement>(".rh-ad-date")?.getAttribute("title")||"";
  const match=title.match(/^AD\s+(\d{4}-\d{2}-\d{2})$/);
  if(match?.[1])return match[1];
  const bsNode=cell.querySelector<HTMLElement>(".pc-bs");
  const cursor=visibleBsCursor();
  const day=bsNode?parseNumber(bsNode.textContent||""):NaN;
  if(cursor&&day>=1&&day<=32){try{return bsToAd({year:cursor.year,month:cursor.month,day})}catch{return ""}}
  return "";
}
function legacyCellDate(cell:Element){
  const href=cell.getAttribute("href")||"";
  return href.startsWith("/date/")?href.slice("/date/".length):"";
}
function collectVisibleDates(){
  const dates=new Set<string>();
  document.querySelectorAll(".rh-grid .rh-cell").forEach(cell=>{const ad=richCellDate(cell);if(/^\d{4}-\d{2}-\d{2}$/.test(ad))dates.add(ad)});
  document.querySelectorAll('.ap-month-grid a.ap-day[href^="/date/"]').forEach(cell=>{const ad=legacyCellDate(cell);if(/^\d{4}-\d{2}-\d{2}$/.test(ad))dates.add(ad)});
  return [...dates].sort();
}

function decorateHomepageDate(){
  const path=location.pathname.replace(/\/+$/,"")||"/";
  if(path!=="/"&&path!=="/today")return;
  const ad=todayNepal();
  try{
    const bs=adToBs(ad);
    const label=`${toNepaliDigits(bs.day)} ${BS_MONTHS[bs.month-1]} ${toNepaliDigits(bs.year)}`;
    document.querySelectorAll<HTMLElement>(".rh-hero h1,.rh-today h1,.ap-today-card h1").forEach(node=>{if(node.textContent!==label)node.textContent=label});
    document.querySelectorAll<HTMLElement>(".ap-home .ap-inline-error").forEach(node=>{node.hidden=true});
  }catch{}
  const weekday=FULL_NE_DAYS[new Date(ad+"T00:00:00Z").getUTCDay()];
  document.querySelectorAll<HTMLElement>(".rh-hero .rh-kicker,.rh-today>.rh-kicker").forEach(kicker=>{const label=`आज · ${weekday}`;if(kicker.textContent!==label)kicker.textContent=label});
}

function weatherTitle(forecast:WeatherDay){
  const max=forecast.temperature_max_c==null?"":`${Math.round(forecast.temperature_max_c)}°C`;
  const min=forecast.temperature_min_c==null?"":`${Math.round(forecast.temperature_min_c)}°C`;
  const rain=forecast.precipitation_probability_max==null?"":`${Math.round(forecast.precipitation_probability_max)}% वर्षा`;
  return [forecast.label||"काठमाडौं मौसम",max&&min?`${min}–${max}`:max||min,rain,"Open-Meteo"].filter(Boolean).join(" · ");
}

function decorate(weather:Map<string,WeatherDay>,calendar:Map<string,CalendarDecoration>){
  decorateHomepageDate();

  for(const cell of document.querySelectorAll<HTMLElement>(".rh-grid .rh-cell")){
    const ad=richCellDate(cell);if(!ad)continue;
    cell.dataset.ad=ad;
    const info=calendar.get(ad);
    const adNode=cell.querySelector<HTMLElement>(".rh-ad-date");
    if(adNode){const label=englishLabel(ad);if(adNode.textContent!==label)adNode.textContent=label;adNode.setAttribute("aria-label",`English date ${label}`)}
    const nsNode=cell.querySelector<HTMLElement>(".rh-ns-date");
    if(nsNode){const label=info?.ns?`नेसं ${info.ns}`:"";if(nsNode.textContent!==label)nsNode.textContent=label;nsNode.toggleAttribute("hidden",!label)}
    const tithiNode=cell.querySelector<HTMLElement>("em");
    if(tithiNode){const label=info?.tithi||"";if(tithiNode.textContent!==label)tithiNode.textContent=label;tithiNode.classList.toggle("is-pending",!label)}

    const pcTithi=cell.querySelector<HTMLElement>(".pc-tithi");
    if(pcTithi&&info?.tithi&&pcTithi.textContent!==info.tithi)pcTithi.textContent=info.tithi;
    const pcNs=cell.querySelector<HTMLElement>(".pc-ns");
    if(pcNs&&info?.ns&&(!pcNs.textContent||pcNs.textContent.trim()==="—"))pcNs.textContent=info.ns;

    let icon=cell.querySelector<HTMLElement>(".pc-weather");
    const forecast=weather.get(ad);
    if(!forecast){icon?.remove();continue}
    if(!icon){icon=document.createElement("span");icon.className="pc-weather";icon.setAttribute("aria-hidden","true");const top=cell.querySelector<HTMLElement>(".pc-top");if(top)top.insertBefore(icon,top.querySelector(".pc-ad"));else cell.prepend(icon)}
    icon.textContent=forecast.icon;icon.title=weatherTitle(forecast);
    cell.setAttribute("data-weather",forecast.icon);
  }

  for(const cell of document.querySelectorAll<HTMLAnchorElement>('.ap-month-grid a.ap-day[href^="/date/"]')){
    const ad=legacyCellDate(cell);if(!/^\d{4}-\d{2}-\d{2}$/.test(ad))continue;
    const info=calendar.get(ad);
    const adNode=cell.querySelector<HTMLElement>(".ap-adday");
    if(adNode){const label=englishLabel(ad);if(adNode.textContent!==label)adNode.textContent=label;adNode.setAttribute("aria-label",`English date ${label}`)}
    const tithi=cell.querySelector<HTMLElement>(".ap-tithi");
    if(tithi&&info?.tithi&&tithi.textContent!==info.tithi)tithi.textContent=info.tithi;
    let ns=cell.querySelector<HTMLElement>(".ap-nsdate");
    if(info?.ns&&!ns){ns=document.createElement("span");ns.className="ap-nsdate";tithi?.insertAdjacentElement("afterend",ns);if(!tithi)cell.append(ns)}
    if(ns){ns.textContent=info?.ns?`नेसं ${info.ns}`:"";ns.hidden=!info?.ns}

    const old=cell.querySelector(".ap-weather");old?.remove();
    const forecast=weather.get(ad);if(!forecast)continue;
    const line=document.createElement("span");line.className="ap-weather";
    const max=forecast.temperature_max_c==null?"":`${Math.round(forecast.temperature_max_c)}°`;
    const rain=forecast.precipitation_probability_max==null?"":`${Math.round(forecast.precipitation_probability_max)}%`;
    line.textContent=[forecast.icon,max,rain?`💧${rain}`:""].filter(Boolean).join(" ");
    line.title=weatherTitle(forecast);
    if(tithi)tithi.insertAdjacentElement("afterend",line);else cell.append(line);
  }
}

export function CalendarCellEnhancer(){
  useEffect(()=>{
    let stopped=false;
    let calendarRange="";
    let refreshTimer=0;
    const weather=new Map<string,WeatherDay>();
    const calendar=new Map<string,CalendarDecoration>();

    const fetchCalendar=async()=>{
      if(stopped)return;
      const dates=collectVisibleDates();if(!dates.length)return;
      const start=dates[0],end=dates[dates.length-1];
      const span=Math.floor((Date.parse(end+"T00:00:00Z")-Date.parse(start+"T00:00:00Z"))/86400000)+1;
      if(span<1||span>62)return;
      const key=`${start}|${end}`;if(key===calendarRange)return;calendarRange=key;
      try{
        const response=await fetch(`/api/v1/sync?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,{headers:{accept:"application/json"},cache:"no-store"});
        if(!response.ok)throw new Error("calendar_unavailable");
        const body=await response.json();
        for(const row of (Array.isArray(body?.days)?body.days:[])){
          const ad=rowDate(row);if(!/^\d{4}-\d{2}-\d{2}$/.test(ad))continue;
          calendar.set(ad,{tithi:tithiText(row),ns:nsText(row)});
        }
        decorate(weather,calendar);
      }catch{calendarRange=""}
    };

    const run=()=>{
      if(stopped)return;
      decorate(weather,calendar);
      window.clearTimeout(refreshTimer);
      refreshTimer=window.setTimeout(()=>{void fetchCalendar()},80);
    };
    const observer=new MutationObserver(run);
    observer.observe(document.body,{subtree:true,childList:true});
    run();

    fetch("/api/v1/weather/daily?days=16",{headers:{accept:"application/json"}})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(body=>{for(const item of (Array.isArray(body?.days)?body.days:[])){if(item?.date)weather.set(String(item.date),item)}run()})
      .catch(()=>undefined);

    return()=>{stopped=true;window.clearTimeout(refreshTimer);observer.disconnect()};
  },[]);
  return null;
}
