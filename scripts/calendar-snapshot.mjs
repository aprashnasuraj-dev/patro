import { getAllDays, getHolidays, nsText, tithiText } from "../lib/patro.mjs";

export async function loadCalendarSnapshot(){return getAllDays();}

export async function loadHolidayMap(){
  const rows=await getAllDays();
  const years=[...new Set(rows.map(r=>Number(r.bs?.year)).filter(Boolean))];
  const map=new Map();
  for(const year of years){
    for(const value of await getHolidays(year)){
      const ad=String(value?.ad_date||value?.date||"").slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(ad))continue;
      const name=value?.name_ne||value?.title_ne||value?.name_en||value?.title||"";
      if(!name)continue;
      const list=map.get(ad)||[];
      list.push({
        name:String(name),
        nameEn:String(value?.name_en||value?.title||""),
        effect:String(value?.effect||value?.status||""),
        source:String(value?.source_title||value?.source_url||""),
        verifiedAt:String(value?.verified_at||value?.updated_at||"")
      });
      map.set(ad,list);
    }
  }
  return map;
}

export { nsText, tithiText };
