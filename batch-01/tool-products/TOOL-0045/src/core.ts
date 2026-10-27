import {limit} from './guards.js';
function one(s){
 const bots=/(?:googlebot|bingbot|duckduckbot|yandexbot|baiduspider|crawler|spider|bot|slurp)/i.test(s);
 const fam=[[/EdgA?\/([\d.]+)/,'Edge'],[/OPR\/([\d.]+)/,'Opera'],[/SamsungBrowser\/([\d.]+)/,'Samsung Internet'],[/FxiOS\/([\d.]+)/,'Firefox iOS'],[/Firefox\/([\d.]+)/,'Firefox'],[/CriOS\/([\d.]+)/,'Chrome iOS'],[/Chrome\/([\d.]+)/,'Chrome'],[/Version\/([\d.]+).*Safari/,'Safari']].find(([re])=>re.test(s));
 const m=fam?s.match(fam[0]):null;
 const os=/Windows NT/.test(s)?'Windows':/Android/.test(s)?'Android':/(iPhone|iPad|iPod)/.test(s)?'iOS/iPadOS':/Mac OS X/.test(s)?'macOS':/Linux/.test(s)?'Linux':'Unknown';
 const device=/(iPhone|Android.*Mobile|Mobile)/.test(s)?'Mobile':/(iPad|Tablet)/.test(s)?'Tablet':'Desktop/unknown';
 return {browser:fam?fam[1]:'Unknown',version:m?m[1]:'Unknown',os,device,botIndicator:bots?'Possible bot':'Not identified',trust:'Unverified client claim'};
}
export function compute(x){const lines=limit(x.uas,80000).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!lines.length||lines.length>200)throw Error('Supply 1–200 User-Agent lines.');if(lines.some(s=>s.length>1024||/[\x00-\x08\x0E-\x1F]/.test(s)))throw Error('Invalid or oversized User-Agent line.');const rows=lines.map((ua,i)=>({line:i+1,ua:ua.slice(0,120),...one(ua)}));return {text:JSON.stringify(rows,null,2),summary:`Parsed ${rows.length} claimed User-Agent strings`,warnings:['UA strings are forgeable and can be reduced; this is a heuristic, not a device identity detector.'],items:rows.slice(0,20).map(r=>({label:`#${r.line} ${r.browser}`,value:`${r.version} • ${r.os} • ${r.device} • ${r.botIndicator}`}))};}
