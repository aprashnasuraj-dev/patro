import { moonSidereal } from "../patro-tools/core/astro";

export type RashifalTone="good"|"mid"|"bad";

export type Rashi={
  index:number;
  slug:string;
  ne:string;
  en:string;
  symbol:string;
};

export type GocharReading={
  date:string;
  moonRashi:number;
  house:number;
  tone:RashifalTone;
  ne:string;
  en:string;
};

export type PeriodSummary={
  days:GocharReading[];
  counts:Record<RashifalTone,number>;
};

export const RASHIS:Rashi[]=[
  {index:0,slug:"mesh",ne:"मेष",en:"Aries",symbol:"♈"},
  {index:1,slug:"vrishabha",ne:"वृष",en:"Taurus",symbol:"♉"},
  {index:2,slug:"mithun",ne:"मिथुन",en:"Gemini",symbol:"♊"},
  {index:3,slug:"kark",ne:"कर्क",en:"Cancer",symbol:"♋"},
  {index:4,slug:"singha",ne:"सिंह",en:"Leo",symbol:"♌"},
  {index:5,slug:"kanya",ne:"कन्या",en:"Virgo",symbol:"♍"},
  {index:6,slug:"tula",ne:"तुला",en:"Libra",symbol:"♎"},
  {index:7,slug:"vrishchik",ne:"वृश्चिक",en:"Scorpio",symbol:"♏"},
  {index:8,slug:"dhanu",ne:"धनु",en:"Sagittarius",symbol:"♐"},
  {index:9,slug:"makar",ne:"मकर",en:"Capricorn",symbol:"♑"},
  {index:10,slug:"kumbha",ne:"कुम्भ",en:"Aquarius",symbol:"♒"},
  {index:11,slug:"meen",ne:"मीन",en:"Pisces",symbol:"♓"}
];

/**
 * Traditional Moon-gochar interpretations from the original Aafnai Patro
 * portable build. Keep these phrases deterministic: the app must never invent
 * horoscope copy at runtime.
 */
export const GOCHAR:{tone:RashifalTone;ne:string;en:string}[]=[
  {tone:"good",ne:"मन प्रसन्न, स्वास्थ्य राम्रो",en:"Cheerful mind, good health"},
  {tone:"mid",ne:"खर्च बढ्न सक्छ, बोलीमा ध्यान",en:"Expenses may rise; mind your words"},
  {tone:"good",ne:"साहस, भेटघाट र सफलता",en:"Courage, contacts and success"},
  {tone:"bad",ne:"मानसिक चिन्ता, यात्रामा सावधानी",en:"Worries; take care travelling"},
  {tone:"mid",ne:"योजनामा ढिलाइ, धैर्य राख्नुहोस्",en:"Plans may slow; be patient"},
  {tone:"good",ne:"प्रतिस्पर्धा र रोगमाथि विजय",en:"Win over rivals and illness"},
  {tone:"good",ne:"साथी र सम्बन्धमा सुख",en:"Happy relationships"},
  {tone:"bad",ne:"स्वास्थ्य र विवादमा सावधानी",en:"Care with health and disputes"},
  {tone:"mid",ne:"भाग्य मध्यम, धार्मिक काम शुभ",en:"Average luck; good for worship"},
  {tone:"good",ne:"काम र पदमा प्रगति",en:"Progress at work"},
  {tone:"good",ne:"आम्दानी र लाभ",en:"Gains and income"},
  {tone:"bad",ne:"खर्च र थकान",en:"Expenses and fatigue"}
];

export const TONE_LABEL:Record<RashifalTone,{ne:string;en:string}>={
  good:{ne:"अनुकूल",en:"Favourable"},
  mid:{ne:"सामान्य",en:"Mixed"},
  bad:{ne:"सतर्क",en:"Careful"}
};

const DAY=86_400_000;

export function todayNepal(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}

export function addIsoDays(iso:string,amount:number){
  const [year,month,day]=iso.split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day)+amount*DAY).toISOString().slice(0,10);
}

function nepaliNoon(iso:string){
  const [year,month,day]=iso.split("-").map(Number);
  if(!year||!month||!day)throw new RangeError("Invalid ISO date");
  // 12:00 in Nepal is 06:15 UTC. Midday avoids a midnight boundary making a
  // day's Moon sign depend on the viewer's browser timezone.
  return new Date(Date.UTC(year,month-1,day,6,15));
}

export function moonRashiForDate(iso:string){
  const longitude=moonSidereal(nepaliNoon(iso));
  return Math.floor(((longitude%360)+360)%360/30)%12;
}

export function readingForRashi(rashiIndex:number,iso:string):GocharReading{
  if(!Number.isInteger(rashiIndex)||rashiIndex<0||rashiIndex>11)throw new RangeError("Invalid rashi index");
  const moonRashi=moonRashiForDate(iso);
  const offset=(moonRashi-rashiIndex+12)%12;
  const source=GOCHAR[offset];
  return {date:iso,moonRashi,house:offset+1,tone:source.tone,ne:source.ne,en:source.en};
}

export function periodForRashi(rashiIndex:number,fromIso:string,length:number):PeriodSummary{
  if(!Number.isInteger(length)||length<1||length>62)throw new RangeError("Invalid period length");
  const days=Array.from({length},(_,index)=>readingForRashi(rashiIndex,addIsoDays(fromIso,index)));
  const counts:Record<RashifalTone,number>={good:0,mid:0,bad:0};
  for(const day of days)counts[day.tone]++;
  return {days,counts};
}

export function rashiBySlug(slug:string|null|undefined){
  return RASHIS.find(item=>item.slug===slug)||null;
}
