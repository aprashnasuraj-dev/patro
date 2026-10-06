import { getAllDays, getHolidays, nsText, tithiText } from "../lib/patro.mjs";

const slugify=(value)=>String(value||"").trim().toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"");

function idFestivalKey(value){
  const id=String(value?.id||"");
  const parts=id.split(":");
  return parts.length>=2?parts[1]:"";
}

function canonicalFestivalSlug(value,name){
  const explicit=value?.key||value?.slug||idFestivalKey(value)||value?.name_en||value?.title||name;
  let slug=slugify(explicit).replace(/-\d+$/,"");
  const hay=slugify([
    value?.key,value?.slug,idFestivalKey(value),value?.id,value?.name_en,value?.title,value?.title_en,value?.name_ne,value?.title_ne,name
  ].filter(Boolean).join(" "));

  // Stable public identities for observances whose DB labels vary by day/source/year.
  if(/(?:^|-)dashain(?:-|$)|dasain|vijaya-dashami|bijaya-dashami|bada-dashain|बडादश|विजया-दशमी/u.test(hay)) return "dashain";
  if(/gai-jatra|gaijatra|गाईजात्रा/u.test(hay)) return "gai-jatra";
  if(/(?:^|-)tihar(?:-|$)|deepawali|dipawali|yamapanchak|यमपञ्चक/u.test(hay)) return "tihar";
  if(/indra-jatra|indrajatra|इन्द्रजात्रा/u.test(hay)) return "indra-jatra";
  if(/krishna-janmashtami|janmashtami|जन्माष्टमी/u.test(hay)) return "krishna-janmashtami";
  if(/haritalika|(?:^|-)teej(?:-|$)|तीज/u.test(hay)) return "teej";
  if(/buddha-jayanti|बुद्ध-जयन्ती/u.test(hay)) return "buddha-jayanti";
  return slug||slugify(name);
}

function festivalAliases(value,name,canonical){
  const values=[
    value?.key,value?.slug,idFestivalKey(value),value?.name_en,value?.title,value?.title_en,value?.name_ne,value?.title_ne,name
  ].map(slugify).filter(Boolean);
  const out=new Set([canonical,...values]);
  if(canonical==="gai-jatra") out.add("gaijatra");
  if(canonical==="dashain") for(const alias of ["dasain","vijaya-dashami","bijaya-dashami","bada-dashain"]) out.add(alias);
  if(canonical==="tihar") for(const alias of ["deepawali","dipawali"]) out.add(alias);
  return [...out];
}

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
      const slug=canonicalFestivalSlug(value,name);
      if(!slug)continue;
      const list=map.get(ad)||[];
      list.push({
        name:String(name),
        nameEn:String(value?.name_en||value?.title||""),
        slug,
        aliases:festivalAliases(value,name,slug),
        effect:String(value?.effect||value?.status||""),
        source:String(value?.source_title||value?.source_url||""),
        sourceUrl:String(value?.source_url||""),
        verifiedAt:String(value?.verified_at||value?.updated_at||""),
        recordId:String(value?.id||value?.key||"")
      });
      map.set(ad,list);
    }
  }
  return map;
}

export { nsText, tithiText };
