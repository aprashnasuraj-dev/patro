import { useEffect } from "react";

type LabelMap=Map<string,string[]>;
type CalendarFeed={items?:unknown[];holidays?:unknown[]};

function dateOf(row:any){return String(row?.ad_date||row?.fact_date||row?.date||row?.start_ad||"").slice(0,10)}
function labelOf(row:any){return String(row?.name_ne||row?.title_ne||row?.dev||row?.name||row?.title||row?.name_en||row?.key||"चाडपर्व")}
async function fetchCalendarFeed(url:string):Promise<CalendarFeed>{
  try{
    const response=await fetch(url,{headers:{Accept:"application/json"}});
    if(!response.ok)return {};
    const value:unknown=await response.json();
    if(!value||typeof value!=="object")return {};
    const record=value as Record<string,unknown>;
    return {
      items:Array.isArray(record.items)?record.items:undefined,
      holidays:Array.isArray(record.holidays)?record.holidays:undefined
    };
  }catch{return {}}
}

export function CalendarHolidayOverlay(){
  useEffect(()=>{
    let stopped=false,timer=0;
    const years=new Map<number,Promise<LabelMap>>();

    function loadYear(year:number){
      let existing=years.get(year);if(existing)return existing;
      const promise=Promise.all([
        fetchCalendarFeed(`/api/v1/holidays?year=${year}`),
        fetchCalendarFeed(`/api/v1/festivals?year=${year}`)
      ]).then(([holidays,festivals])=>{
        const map:LabelMap=new Map();
        const add=(row:any)=>{const date=dateOf(row),label=labelOf(row);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!label)return;const list=map.get(date)||[];if(!list.includes(label))list.push(label);map.set(date,list)};
        for(const row of (holidays.items??holidays.holidays??[]))add(row);
        for(const row of (festivals.items??[]))add(row);
        return map;
      });
      years.set(year,promise);return promise;
    }

    async function decorate(){
      if(stopped)return;
      const cells=[...document.querySelectorAll<HTMLElement>('.calendar-day[aria-label]')];
      const dates=cells.map(cell=>String(cell.getAttribute("aria-label")||"").slice(0,10)).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value));
      const uniqueYears=[...new Set(dates.map(date=>Number(date.slice(0,4))))];
      const maps=new Map<number,LabelMap>();
      await Promise.all(uniqueYears.map(async year=>maps.set(year,await loadYear(year))));
      if(stopped)return;
      for(const cell of cells){
        const date=String(cell.getAttribute("aria-label")||"").slice(0,10);
        const labels=maps.get(Number(date.slice(0,4)))?.get(date)||[];
        let badge=cell.querySelector<HTMLElement>(".calendar-event-badge");
        if(!labels.length){badge?.remove();continue;}
        if(!badge){badge=document.createElement("span");badge.className="calendar-event-badge";cell.appendChild(badge);}
        badge.textContent=labels[0];badge.title=labels.join(" · ");badge.setAttribute("aria-label",labels.join(", "));
      }
    }

    function schedule(){clearTimeout(timer);timer=window.setTimeout(()=>void decorate(),70)}
    const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-label"]});
    addEventListener("patro:navigation",schedule);schedule();
    return()=>{stopped=true;clearTimeout(timer);observer.disconnect();removeEventListener("patro:navigation",schedule)};
  },[]);
  return null;
}
