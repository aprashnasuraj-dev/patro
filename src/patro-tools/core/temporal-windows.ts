export type TemporalWindow = {
  key: string;
  name_ne: string;
  name_en: string;
  start_utc: string;
  end_utc: string;
  favorable?: boolean;
};

const DAY_CHOGHADIYA: Record<number, string[]> = {
  0:["उद्वेग","चल","लाभ","अमृत","काल","शुभ","रोग","उद्वेग"],
  1:["अमृत","काल","शुभ","रोग","उद्वेग","चल","लाभ","अमृत"],
  2:["रोग","उद्वेग","चल","लाभ","अमृत","काल","शुभ","रोग"],
  3:["लाभ","अमृत","काल","शुभ","रोग","उद्वेग","चल","लाभ"],
  4:["शुभ","रोग","उद्वेग","चल","लाभ","अमृत","काल","शुभ"],
  5:["चल","लाभ","अमृत","काल","शुभ","रोग","उद्वेग","चल"],
  6:["काल","शुभ","रोग","उद्वेग","चल","लाभ","अमृत","काल"]
};
const NIGHT_CHOGHADIYA: Record<number, string[]> = {
  0:["शुभ","अमृत","चल","रोग","काल","लाभ","उद्वेग","शुभ"],
  1:["चल","रोग","काल","लाभ","उद्वेग","शुभ","अमृत","चल"],
  2:["काल","लाभ","उद्वेग","शुभ","अमृत","चल","रोग","काल"],
  3:["लाभ","उद्वेग","शुभ","अमृत","चल","रोग","काल","लाभ"],
  4:["अमृत","चल","रोग","काल","लाभ","उद्वेग","शुभ","अमृत"],
  5:["उद्वेग","शुभ","अमृत","चल","रोग","काल","लाभ","उद्वेग"],
  6:["रोग","काल","लाभ","उद्वेग","शुभ","अमृत","चल","रोग"]
};
const GOOD = new Set(["चल","लाभ","अमृत","शुभ"]);
const CHOGHADIYA_EN: Record<string,string> = { "उद्वेग":"Udveg", "चल":"Char", "लाभ":"Labh", "अमृत":"Amrit", "काल":"Kaal", "शुभ":"Shubh", "रोग":"Rog" };
const PLANETARY_ORDER = ["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"];
const WEEKDAY_LORD = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
const RAHU_EIGHTH = [8,2,7,5,6,4,3];
const YAMAGANDA_EIGHTH = [5,4,3,2,1,7,6];
const GULIKA_EIGHTH = [7,6,5,4,3,2,1];

function validInstant(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function split(start: Date, end: Date, count: number, nameAt: (index: number) => {key:string;name_ne:string;name_en:string;favorable?:boolean}): TemporalWindow[] {
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return [];
  return Array.from({length:count},(_,index)=>{
    const name=nameAt(index);
    return { ...name, start_utc:new Date(start.getTime()+duration*index/count).toISOString(), end_utc:new Date(start.getTime()+duration*(index+1)/count).toISOString() };
  });
}

/** Split the real sunrise-to-sunset and sunset-to-next-sunrise spans separately. */
export function choghadiyaWindows(weekday:number,sunrise:string|null,sunset:string|null,nextSunrise:string|null) {
  const day=validInstant(sunrise), dusk=validInstant(sunset), next=validInstant(nextSunrise), dow=((weekday%7)+7)%7;
  if(!day||!dusk||!next||dusk<=day||next<=dusk) return {day:[],night:[]};
  return {
    day:split(day,dusk,8,i=>{const name=DAY_CHOGHADIYA[dow][i];return {key:"day-"+i,name_ne:name,name_en:CHOGHADIYA_EN[name],favorable:GOOD.has(name)}}),
    night:split(dusk,next,8,i=>{const name=NIGHT_CHOGHADIYA[dow][i];return {key:"night-"+i,name_ne:name,name_en:CHOGHADIYA_EN[name],favorable:GOOD.has(name)}})
  };
}

/** Source-plan weekday mapping; segments are counted 1..8 from local sunrise. */
export function inauspiciousDayWindows(weekday:number,sunrise:string|null,sunset:string|null) {
  const start=validInstant(sunrise),end=validInstant(sunset),dow=((weekday%7)+7)%7;
  if(!start||!end||end<=start) return [];
  const mappings=[["rahu","राहुकाल","Rahu Kaal",RAHU_EIGHTH],["yamaganda","यमगण्ड","Yamaganda",YAMAGANDA_EIGHTH],["gulika","गुलिक काल","Gulika Kaal",GULIKA_EIGHTH]] as const;
  const duration=end.getTime()-start.getTime();
  return mappings.map(([key,name_ne,name_en,table])=>{
    const eighth=table[dow],a=new Date(start.getTime()+duration*(eighth-1)/8),b=new Date(start.getTime()+duration*eighth/8);
    return {key,name_ne,name_en,eighth,start_utc:a.toISOString(),end_utc:b.toISOString()};
  });
}

/** Planetary hours follow the weekday lord and Chaldean order across day and night. */
export function horaWindows(weekday:number,sunrise:string|null,sunset:string|null,nextSunrise:string|null) {
  const start=validInstant(sunrise),dusk=validInstant(sunset),next=validInstant(nextSunrise),dow=((weekday%7)+7)%7;
  if(!start||!dusk||!next||dusk<=start||next<=dusk) return {day:[],night:[]};
  const first=PLANETARY_ORDER.indexOf(WEEKDAY_LORD[dow]);
  const labels=Array.from({length:24},(_,i)=>{const planet=PLANETARY_ORDER[(first+i)%7];return {key:"hora-"+(i+1),name_ne:({Sun:"सूर्य",Moon:"चन्द्र",Mars:"मङ्गल",Mercury:"बुध",Jupiter:"बृहस्पति",Venus:"शुक्र",Saturn:"शनि"} as Record<string,string>)[planet],name_en:planet};});
  return {day:split(start,dusk,12,i=>labels[i]),night:split(dusk,next,12,i=>labels[i+12])};
}
