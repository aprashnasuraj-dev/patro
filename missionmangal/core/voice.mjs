// Deterministic editorial checks. These rules improve clarity and consistency; they are not an AI-detector evasion system.
export const BLACKLIST=['delve into','in today\'s fast-paced world','it is important to note','it\'s important to note','in conclusion','tapestry','testament to','game-changer','unlock the power','navigate the complexities','in the realm of','ever-evolving','a rich tapestry','plays a crucial role','shed light on','paradigm shift','at the end of the day','when it comes to'];
const sentences=t=>String(t||'').replace(/\n+/g,' ').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
const fingerprint=s=>s.toLowerCase().replace(/<[^>]*>/g,' ').replace(/[*_`#\[\]()]/g,' ').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
export function lint(body,{maxColonPer1000=8}={}){
 const text=String(body||''),problems=[],low=text.toLowerCase(),words=(text.match(/\b[\w'’-]+\b/g)||[]).length||1;
 for(const p of BLACKLIST)if(low.includes(p))problems.push('blacklist: '+p);
 const dash=(text.match(/—/g)||[]).length;if(dash)problems.push('em dash prohibited ('+dash+')');
 const colon=(text.match(/:/g)||[]).length;if(colon*1000/words>maxColonPer1000)problems.push('colon density '+colon);
 const ss=sentences(text),seen=new Set();let repeated=0;
 for(const s of ss){const f=fingerprint(s);if(f.split(' ').length>=7){if(seen.has(f))repeated++;else seen.add(f);}}
 if(repeated)problems.push('repeated sentence(s): '+repeated);
 let run=1;for(let i=1;i<ss.length;i++){const a=fingerprint(ss[i]).split(' ')[0],b=fingerprint(ss[i-1]).split(' ')[0];run=a===b?run+1:1;if(run>=3){problems.push('three consecutive sentences open with "'+a+'"');break;}}
 const avg=words/Math.max(1,ss.length);if(avg>32)problems.push('sentences too long (avg '+Math.round(avg)+')');
 return problems;
}
const SWAPS=[[/\bdelve into\b/gi,'look at'],[/\bin today'?s fast-paced world,?\s*/gi,''],[/\bit'?s? important to note that\s*/gi,''],[/\bin conclusion,?\s*/gi,'To sum up, '],[/\ba rich tapestry\b/gi,'a mix'],[/\btapestry\b/gi,'mix'],[/\btestament to\b/gi,'evidence of'],[/\bgame-changer\b/gi,'major change'],[/\bunlock the power of\b/gi,'use'],[/\bnavigate the complexities of\b/gi,'work through'],[/\bin the realm of\b/gi,'in'],[/\bever-evolving\b/gi,'changing'],[/\bplays a crucial role in\b/gi,'matters for'],[/\bshed light on\b/gi,'explain'],[/\bparadigm shift\b/gi,'change in thinking'],[/\bat the end of the day,?\s*/gi,''],[/\bwhen it comes to\b/gi,'for']];
export function fix(body){
 let t=String(body||'');for(const [r,w] of SWAPS)t=t.replace(r,w);
 // Em dashes are never allowed in published copy. Use punctuation that does not change the claim.
 t=t.replace(/\s*—\s*/g,', ').replace(/ ,/g,',').replace(/,{2,}/g,',');
 const kept=new Set();
 t=sentences(t).filter(s=>{const f=fingerprint(s);if(f.split(' ').length<7)return true;if(kept.has(f))return false;kept.add(f);return true;}).join(' ');
 return t.replace(/^\s*[a-z]/gm,c=>c.toUpperCase()).replace(/\s+([,.!?;:])/g,'$1');
}
export function seedOf(id,slug){let h=2166136261;for(const c of id+'|'+slug){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;}
export function variantOf(seed){const pick=(a,n)=>a[(seed>>>n)%a.length];return {hue:seed%360,scale:pick([1,1.04,1.08,1.12],3),layout:pick(['a','b','c','d'],7),measure:pick(['62ch','66ch','70ch','74ch'],11),radius:pick([6,10,14,18],13),summary:pick(['top','top','after-intro'],17)};}
