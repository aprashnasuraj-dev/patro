import { Body, Ecliptic, GeoVector, SiderealTime } from "astronomy-engine";

export interface BirthInput {
  name: string;
  date: string;
  time: string;
  lat: number;
  lng: number;
  location: string;
}
export interface PlanetPosition {
  key: string;
  name: string;
  longitude: number;
  tropicalLongitude: number;
  signIndex: number;
  sign: string;
  degreeInSign: number;
  house: number;
}
export interface DashaPeriod { lord:string; start:Date; end:Date; years:number; }
export interface ManglikResult {
  fromLagna: number;
  fromMoon: number;
  affectedHouses: number[];
  severity: "None" | "Mild" | "Moderate" | "Strong";
  explanation: string;
}
export interface ChartResult {
  input: BirthInput;
  instant: Date;
  ayanamsa: number;
  ascendant: number;
  ascSignIndex: number;
  planets: PlanetPosition[];
  moonNakshatraIndex: number;
  moonNakshatra: string;
  moonPada: number;
  dashas: DashaPeriod[];
  manglik: ManglikResult;
  methodology: string[];
}
export interface GunaItem { key:string; label:string; score:number; max:number; detail:string; }
export interface GunaResult { total:number; max:number; items:GunaItem[]; profileA:ChartResult; profileB:ChartResult; }

export const SIGNS=["Mesha · Aries","Vrishabha · Taurus","Mithuna · Gemini","Karka · Cancer","Simha · Leo","Kanya · Virgo","Tula · Libra","Vrischika · Scorpio","Dhanu · Sagittarius","Makara · Capricorn","Kumbha · Aquarius","Meena · Pisces"];
export const NAKSHATRAS=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const DASHA_LORDS=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DASHA_YEARS=[7,20,6,10,7,18,16,19,17];

const BODY_ROWS:[string,string,Body][]=[
  ["sun","Sun",Body.Sun],["moon","Moon",Body.Moon],["mars","Mars",Body.Mars],["mercury","Mercury",Body.Mercury],
  ["jupiter","Jupiter",Body.Jupiter],["venus","Venus",Body.Venus],["saturn","Saturn",Body.Saturn]
];

const norm=(x:number)=>((x%360)+360)%360;
const rad=(x:number)=>x*Math.PI/180;
const deg=(x:number)=>x*180/Math.PI;
function addYears(date:Date,years:number){return new Date(date.getTime()+years*365.2422*86400000);}
function localNepalInstant(date:string,time:string){
  const [y,m,d]=date.split("-").map(Number),[hh,mm]=time.split(":").map(Number);
  return new Date(Date.UTC(y,m-1,d,hh,mm)-345*60000);
}
function julianDay(date:Date){return date.getTime()/86400000+2440587.5;}
function ayanamsaLahiri(date:Date){
  const years=(julianDay(date)-2451545.0)/365.2422;
  return 23.85675 + years*0.013968878;
}
function geoLongitude(body:Body,date:Date){
  return norm(Ecliptic(GeoVector(body,date,true)).elon);
}
function ascendantLongitude(date:Date,lat:number,lng:number){
  const theta=rad(norm(SiderealTime(date)*15+lng));
  const t=(julianDay(date)-2451545)/36525;
  const epsilon=rad(23.43929111-0.013004167*t-0.000000164*t*t+0.000000504*t*t*t);
  const phi=rad(lat);
  return norm(deg(Math.atan2(Math.cos(theta),-(Math.sin(theta)*Math.cos(epsilon)+Math.tan(phi)*Math.sin(epsilon)))));
}
function meanRahu(date:Date){
  const d=julianDay(date)-2451545.0;
  return norm(125.04455501-0.05295376276*d);
}
function houseFor(longitude:number,ascSign:number){
  const sign=Math.floor(norm(longitude)/30);
  return ((sign-ascSign+12)%12)+1;
}
function dashaSequence(moonLongitude:number,birth:Date){
  const span=360/27, nak=Math.floor(norm(moonLongitude)/span), frac=(norm(moonLongitude)%span)/span;
  const startLord=nak%9, balance=(1-frac)*DASHA_YEARS[startLord];
  const periods:DashaPeriod[]=[]; let cursor=new Date(birth), idx=startLord;
  for(let i=0;i<10;i++){
    const years=i===0?balance:DASHA_YEARS[idx];
    const end=addYears(cursor,years);
    periods.push({lord:DASHA_LORDS[idx],start:new Date(cursor),end,years});
    cursor=end;idx=(idx+1)%9;
  }
  return periods;
}
function manglik(planets:PlanetPosition[],ascSign:number):ManglikResult{
  const mars=planets.find((p)=>p.key==="mars");
  const moon=planets.find((p)=>p.key==="moon");
  if(!mars||!moon)return{fromLagna:0,fromMoon:0,affectedHouses:[],severity:"None",explanation:"Mars or Moon position unavailable."};
  const lagnaHouse=houseFor(mars.longitude,ascSign), moonHouse=houseFor(mars.longitude,moon.signIndex);
  const doshaHouses=new Set([1,2,4,7,8,12]);
  const hits=[lagnaHouse,moonHouse].filter((h)=>doshaHouses.has(h));
  const severity:ManglikResult["severity"]=hits.length===0?"None":hits.length===1?"Moderate":"Strong";
  const explanation=hits.length
    ? "Mars falls in traditional Kuja-dosha houses from "+(hits.length===2?"both Lagna and Moon":"one reference point")+"."
    : "Mars does not fall in the commonly tested 1/2/4/7/8/12 houses from Lagna or Moon.";
  return {fromLagna:lagnaHouse,fromMoon:moonHouse,affectedHouses:hits,severity,explanation};
}

export function calculateChart(input:BirthInput):ChartResult{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new Error("Birth date must be YYYY-MM-DD.");
  if(!/^\d{2}:\d{2}$/.test(input.time))throw new Error("Birth time must be HH:MM.");
  if(!Number.isFinite(input.lat)||Math.abs(input.lat)>66.5)throw new Error("Latitude must be between -66.5° and 66.5° for this whole-sign chart implementation.");
  if(!Number.isFinite(input.lng)||Math.abs(input.lng)>180)throw new Error("Longitude is invalid.");
  const instant=localNepalInstant(input.date,input.time), ayanamsa=ayanamsaLahiri(instant);
  const ascTropical=ascendantLongitude(instant,input.lat,input.lng),ascendant=norm(ascTropical-ayanamsa),ascSignIndex=Math.floor(ascendant/30);
  const planets:PlanetPosition[]=BODY_ROWS.map(([key,name,body])=>{
    const tropical=geoLongitude(body,instant),longitude=norm(tropical-ayanamsa),signIndex=Math.floor(longitude/30);
    return{key,name,longitude,tropicalLongitude:tropical,signIndex,sign:SIGNS[signIndex],degreeInSign:longitude%30,house:houseFor(longitude,ascSignIndex)};
  });
  const rahuTropical=meanRahu(instant),rahu=norm(rahuTropical-ayanamsa),ketu=norm(rahu+180);
  const nodes:[string,string,number,number][]=[["rahu","Rahu",rahu,rahuTropical],["ketu","Ketu",ketu,norm(rahuTropical+180)]];
  for(const [key,name,longitude,tropical] of nodes){
    const signIndex=Math.floor(longitude/30);planets.push({key,name,longitude,tropicalLongitude:tropical,signIndex,sign:SIGNS[signIndex],degreeInSign:longitude%30,house:houseFor(longitude,ascSignIndex)});
  }
  const moon=planets.find((p)=>p.key==="moon");
  if(!moon)throw new Error("Moon position unavailable.");
  const span=360/27,moonNakshatraIndex=Math.floor(moon.longitude/span),within=(moon.longitude%span)/span;
  const result:ChartResult={input,instant,ayanamsa,ascendant,ascSignIndex,planets,moonNakshatraIndex,moonNakshatra:NAKSHATRAS[moonNakshatraIndex],moonPada:Math.min(4,Math.floor(within*4)+1),dashas:dashaSequence(moon.longitude,instant),manglik:{fromLagna:0,fromMoon:0,affectedHouses:[],severity:"None",explanation:""},methodology:[
    "Planet vectors: Astronomy Engine geocentric apparent vectors converted to ecliptic longitude of date.",
    "Sidereal frame: Lahiri-style ayanamsa approximation anchored near J2000; suitable for consumer guidance, not certified ephemeris work.",
    "Houses: whole-sign houses from the computed ascendant.",
    "Rahu/Ketu: mean lunar node; Ketu is 180° opposite.",
    "Dasha/Guna/Manglik layers are traditional interpretive systems, not astronomical measurements."
  ]};
  result.manglik=manglik(planets,ascSignIndex);return result;
}

const signLords=[4,5,3,1,0,3,5,4,6,6,7,7];
const FRIENDS:Record<number,number[]>={0:[1,4,6],1:[0,3],2:[3,5],3:[0,1,5],4:[0,1,6],5:[2,3,6],6:[0,4,5],7:[3,5,6]};
const VARNA=[3,0,2,1,3,0,2,1,3,0,2,1];
const VASHYA=[0,1,2,3,0,2,1,3,0,1,2,3];
const GANA=[0,1,2,1,0,1,0,2,2,1,0,1,1,2,0,2,0,2,2,1,1,0,2,2,1,0,1];
const YONI=[0,1,2,3,4,5,6,6,7,8,9,9,10,11,12,13,13,12,7,4,5,8,3,11,10,2,1];
const NADI=[0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2];
function moonOf(chart:ChartResult){const moon=chart.planets.find((p)=>p.key==="moon");if(!moon)throw new Error("Moon unavailable.");return moon;}
function signDistance(a:number,b:number){return ((b-a+12)%12)+1;}
function gunaItem(key:string,label:string,score:number,max:number,detail:string):GunaItem{return{key,label,score:Number(score.toFixed(2)),max,detail};}

export function calculateGuna(profileA:ChartResult,profileB:ChartResult):GunaResult{
  const a=moonOf(profileA),b=moonOf(profileB),na=profileA.moonNakshatraIndex,nb=profileB.moonNakshatraIndex;
  const varna=VARNA[a.signIndex]===VARNA[b.signIndex]?1:VARNA[a.signIndex]>=VARNA[b.signIndex]?1:.5;
  const vashya=VASHYA[a.signIndex]===VASHYA[b.signIndex]?2:1;
  const taraA=((nb-na+27)%27+1)%9,taraB=((na-nb+27)%27+1)%9;
  const taraBad=(x:number)=>[3,5,7].includes(x===0?9:x);
  const tara=(taraBad(taraA)?0:1.5)+(taraBad(taraB)?0:1.5);
  const yoni=YONI[na]===YONI[nb]?4:Math.abs(YONI[na]-YONI[nb])<=2?3:2;
  const lordA=signLords[a.signIndex],lordB=signLords[b.signIndex];
  const maitri=lordA===lordB?5:(FRIENDS[lordA]?.includes(lordB)&&FRIENDS[lordB]?.includes(lordA))?5:(FRIENDS[lordA]?.includes(lordB)||FRIENDS[lordB]?.includes(lordA))?3:1;
  const gana=GANA[na]===GANA[nb]?6:(GANA[na]===0||GANA[nb]===0)?5:1;
  const d1=signDistance(a.signIndex,b.signIndex),d2=signDistance(b.signIndex,a.signIndex),badBhakoot=[[2,12],[5,9],[6,8]].some(([x,y])=>(d1===x&&d2===y)||(d1===y&&d2===x));
  const bhakoot=badBhakoot?0:7,nadi=NADI[na]===NADI[nb]?0:8;
  const items=[
    gunaItem("varna","Varna · वर्ण",varna,1,"Traditional spiritual/temperament class from Moon signs."),
    gunaItem("vashya","Vashya · वश्य",vashya,2,"Moon-sign control/affinity category."),
    gunaItem("tara","Tara · तारा",tara,3,"Birth-star distance in the ninefold Tara cycle."),
    gunaItem("yoni","Yoni · योनि",yoni,4,"Nakshatra symbolic-animal compatibility."),
    gunaItem("maitri","Graha Maitri · मैत्री",maitri,5,"Relationship of Moon-sign planetary lords."),
    gunaItem("gana","Gana · गण",gana,6,"Deva/Manushya/Rakshasa nakshatra temperament grouping."),
    gunaItem("bhakoot","Bhakoot · भकूट",bhakoot,7,"Moon-sign distance; 2/12, 5/9 and 6/8 combinations are treated as conflicts."),
    gunaItem("nadi","Nadi · नाडी",nadi,8,"Threefold nakshatra Nadi grouping.")
  ];
  return{total:Number(items.reduce((s,x)=>s+x.score,0).toFixed(2)),max:36,items,profileA,profileB};
}
