import {adToBs} from "../packages/core/src";
import {BS_MONTHS,toNepaliDigits} from "./title";
import {formatDate} from "./nepaliDate";
const MONTHS_EN=["Baisakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
/** Compare civil dates, not elapsed local hours, so midnight and DST cannot skew days. */
export function festivalTiming(iso:string,today:string,language:"ne"|"en") {
 const days=Math.round((Date.parse(iso+"T00:00:00Z")-Date.parse(today+"T00:00:00Z"))/86400000);
 const relative=days===0?(language==="ne"?"आज":"Today"):days===1?(language==="ne"?"भोलि":"Tomorrow"):language==="ne"?`${toNepaliDigits(days)} दिनमा`:`In ${days} days`;
 try {const bs=adToBs(iso);return `${(language==="ne"?BS_MONTHS:MONTHS_EN)[bs.month-1]} ${language==="ne"?toNepaliDigits(bs.day):bs.day} · ${relative}`;}
 catch {return `${formatDate(iso,language,{weekday:"long"})} · ${relative}`;}
}
