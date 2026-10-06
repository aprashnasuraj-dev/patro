import { NAKSHATRAS } from "./constants.js";

const SIGN_LORDS=[4,5,3,1,0,3,5,4,6,6,7,7];
const FRIENDS={0:[1,4,6],1:[0,3],2:[3,5],3:[0,1,5],4:[0,1,6],5:[2,3,6],6:[0,4,5],7:[3,5,6]};
const VARNA=[3,0,2,1,3,0,2,1,3,0,2,1];
const VASHYA=[0,1,2,3,0,2,1,3,0,1,2,3];
const GANA=[0,1,2,1,0,1,0,2,2,1,0,1,1,2,0,2,0,2,2,1,1,0,2,2,1,0,1];
const YONI=[0,1,2,3,4,5,6,6,7,8,9,9,10,11,12,13,13,12,7,4,5,8,3,11,10,2,1];
const NADI=[0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2];
const SIGN_NAMES_NE=["मेष","वृष","मिथुन","कर्कट","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"];

function normalizeName(value){
  return String(value||"").normalize("NFC").trim().replace(/\s+/g," ");
}
function signDistance(a,b){return ((b-a+12)%12)+1;}
function item(key,label,score,max,detail){
  return {key,label,score:Number(score.toFixed(2)),max,detail};
}
function scoreProfiles(a,b){
  const varna=VARNA[a.signIndex]===VARNA[b.signIndex]?1:VARNA[a.signIndex]>=VARNA[b.signIndex]?1:.5;
  const vashya=VASHYA[a.signIndex]===VASHYA[b.signIndex]?2:1;
  const taraA=((b.nakshatraIndex-a.nakshatraIndex+27)%27+1)%9;
  const taraB=((a.nakshatraIndex-b.nakshatraIndex+27)%27+1)%9;
  const taraBad=(x)=>[3,5,7].includes(x===0?9:x);
  const tara=(taraBad(taraA)?0:1.5)+(taraBad(taraB)?0:1.5);
  const yoni=YONI[a.nakshatraIndex]===YONI[b.nakshatraIndex]?4:Math.abs(YONI[a.nakshatraIndex]-YONI[b.nakshatraIndex])<=2?3:2;
  const lordA=SIGN_LORDS[a.signIndex],lordB=SIGN_LORDS[b.signIndex];
  const maitri=lordA===lordB?5:(FRIENDS[lordA]?.includes(lordB)&&FRIENDS[lordB]?.includes(lordA))?5:(FRIENDS[lordA]?.includes(lordB)||FRIENDS[lordB]?.includes(lordA))?3:1;
  const gana=GANA[a.nakshatraIndex]===GANA[b.nakshatraIndex]?6:(GANA[a.nakshatraIndex]===0||GANA[b.nakshatraIndex]===0)?5:1;
  const d1=signDistance(a.signIndex,b.signIndex),d2=signDistance(b.signIndex,a.signIndex);
  const badBhakoot=[[2,12],[5,9],[6,8]].some(([x,y])=>(d1===x&&d2===y)||(d1===y&&d2===x));
  const bhakoot=badBhakoot?0:7;
  const nadi=NADI[a.nakshatraIndex]===NADI[b.nakshatraIndex]?0:8;
  const items=[
    item("varna","वर्ण · Varna",varna,1,"चन्द्र राशिबाट परम्परागत वर्ण सामञ्जस्य।"),
    item("vashya","वश्य · Vashya",vashya,2,"राशिगत आकर्षण/प्रभावको परम्परागत सूचक।"),
    item("tara","तारा · Tara",tara,3,"जन्म नक्षत्रबीचको नवतारा दूरी।"),
    item("yoni","योनि · Yoni",yoni,4,"नक्षत्रको प्रतीकात्मक योनि सामञ्जस्य।"),
    item("maitri","ग्रह मैत्री · Graha Maitri",maitri,5,"चन्द्र राशिका स्वामी ग्रहबीचको मैत्री।"),
    item("gana","गण · Gana",gana,6,"देव/मनुष्य/राक्षस नक्षत्र-स्वभाव मिलान।"),
    item("bhakoot","भकूट · Bhakoot",bhakoot,7,"चन्द्र राशिबीचको परम्परागत दूरी।"),
    item("nadi","नाडी · Nadi",nadi,8,"तीन नाडी समूहको परम्परागत मिलान।")
  ];
  return {items,total:Number(items.reduce((sum,x)=>sum+x.score,0).toFixed(2)),max:36};
}

export function profileFromName(name){
  const normalized=normalizeName(name);
  if(!normalized) throw new Error("name_required");
  const first=normalized.split(" ")[0];
  const candidates=[];
  NAKSHATRAS.forEach((nak,nakshatraIndex)=>{
    (nak.syl||[]).forEach((syllable,index)=>{
      if(first.startsWith(syllable)) candidates.push({nakshatraIndex,pada:index+1,syllable});
    });
  });
  candidates.sort((a,b)=>b.syllable.length-a.syllable.length);
  const hit=candidates[0];
  if(!hit) throw new Error("name_syllable_not_mapped");
  const span=360/27;
  const moonLongitude=hit.nakshatraIndex*span+(hit.pada-.5)*(span/4);
  const signIndex=Math.floor(moonLongitude/30);
  const nak=NAKSHATRAS[hit.nakshatraIndex];
  return {
    name:normalized,
    syllable:hit.syllable,
    nakshatraIndex:hit.nakshatraIndex,
    nakshatraEn:nak.en,
    nakshatraNe:nak.ne,
    pada:hit.pada,
    moonLongitude,
    signIndex,
    signNe:SIGN_NAMES_NE[signIndex]
  };
}

export function calculateNameGuna(nameA,nameB){
  const profileA=profileFromName(nameA);
  const profileB=profileFromName(nameB);
  const scored=scoreProfiles(profileA,profileB);
  const verdict=scored.total>=28?"उत्तम मिलान":scored.total>=24?"राम्रो मिलान":scored.total>=18?"मध्यम मिलान":"कम मिलान";
  return {...scored,profileA,profileB,verdict,mode:"name"};
}

export function nameSyllableFromNakshatra(nakshatraIndex,pada){
  const nak=NAKSHATRAS[Number(nakshatraIndex)];
  const syllable=nak?.syl?.[Math.max(0,Math.min(3,Number(pada)-1))];
  return syllable||"";
}
