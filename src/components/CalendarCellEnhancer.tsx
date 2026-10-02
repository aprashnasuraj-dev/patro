import { useEffect } from "react";

type WeatherDay={date:string;icon:string;temperature_max_c:number|null;temperature_min_c:number|null;precipitation_probability_max:number|null};

function englishLabel(ad:string){
  const date=new Date(ad+"T00:00:00Z");
  if(Number.isNaN(date.getTime()))return "";
  const day=date.getUTCDate();
  const month=new Intl.DateTimeFormat("en",{month:"short",timeZone:"UTC"}).format(date);
  return `${day}-${month}`;
}

function decorate(weather:Map<string,WeatherDay>){
  for(const cell of document.querySelectorAll<HTMLAnchorElement>('.ap-month-grid a.ap-day[href^="/date/"]')){
    const ad=cell.getAttribute("href")?.slice("/date/".length)||"";
    if(!/^\d{4}-\d{2}-\d{2}$/.test(ad))continue;
    const adNode=cell.querySelector<HTMLElement>(".ap-adday");
    if(adNode){adNode.textContent=englishLabel(ad);adNode.setAttribute("aria-label",`English date ${englishLabel(ad)}`)}
    const old=cell.querySelector(".ap-weather");old?.remove();
    const forecast=weather.get(ad);if(!forecast)continue;
    const line=document.createElement("span");line.className="ap-weather";
    const max=forecast.temperature_max_c==null?"":`${Math.round(forecast.temperature_max_c)}°`;
    const rain=forecast.precipitation_probability_max==null?"":`${Math.round(forecast.precipitation_probability_max)}%`;
    line.textContent=[forecast.icon,max,rain?`💧${rain}`:""].filter(Boolean).join(" ");
    line.title=`Kathmandu forecast · ${max||"temperature unavailable"}${rain?` · precipitation ${rain}`:""} · Open-Meteo`;
    const tithi=cell.querySelector(".ap-tithi");
    if(tithi)tithi.insertAdjacentElement("afterend",line);else cell.append(line);
  }
}

export function CalendarCellEnhancer(){
  useEffect(()=>{
    let stopped=false;const weather=new Map<string,WeatherDay>();
    const run=()=>{if(!stopped)decorate(weather)};
    const observer=new MutationObserver(run);
    observer.observe(document.body,{subtree:true,childList:true});
    run();
    fetch("/api/v1/weather/daily?days=16",{headers:{accept:"application/json"}})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(body=>{for(const item of (Array.isArray(body?.days)?body.days:[])){if(item?.date)weather.set(String(item.date),item)}run()})
      .catch(()=>undefined);
    return()=>{stopped=true;observer.disconnect()};
  },[]);
  return null;
}
