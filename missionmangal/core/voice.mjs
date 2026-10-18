// Deterministic voice rules: a unit-tested constraint system (not a detector-evasion trick). lint() reports; fix() applies safe mechanical repairs.
export const BLACKLIST=['delve into','in today\'s fast-paced world','it is important to note','it\'s important to note','in conclusion','tapestry','testament to','game-changer','unlock the power','navigate the complexities','in the realm of','ever-evolving','a rich tapestry','plays a crucial role','shed light on','paradigm shift','at the end of the day','when it comes to'];
const sentences=t=>t.replace(/\n+/g,' ').split(/(?<=[.!?])\s+/).filter(Boolean);
export function lint(body,{maxDashPer1000=6,maxColonPer1000=8}={}){
 const problems=[],low=body.toLowerCase(),words=(body.match(/\b[\w'’-]+\b/g)||[]).length||1;
 for(const p of BLACKLIST)if(low.includes(p))problems.push('blacklist: '+p);
 const dash=(body.match(/—/g)||[]).length;if(dash*1000/words>maxDashPer1000)problems.push('em-dash density '+dash);
 const colon=(body.match(/:/g)||[]).length;if(colon*1000/words>maxColonPer1000)problems.push('colon density '+colon);
 const s=sentences(body);let run=1;for(let i=1;i<s.length;i++){const a=s[i].split(/\s+/)[0].toLowerCase(),b=s[i-1].split(/\s+/)[0].toLowerCase();run=a===b?run+1:1;if(run>=3){problems.push('three consecutive sentences open with "'+a+'"');break;}}
 const avg=words/Math.max(1,s.length);if(avg>32)problems.push('sentences too long (avg '+Math.round(avg)+')');
 return problems;
}
const SWAPS=[[/\bdelve into\b/gi,'look at'],[/\bin today'?s fast-paced world,?\s*/gi,''],[/\bit'?s? important to note that\s*/gi,''],[/\bin conclusion,?\s*/gi,'Finally, '],[/\ba rich tapestry\b/gi,'a mix'],[/\btapestry\b/gi,'mix'],[/\btestament to\b/gi,'evidence of'],[/\bgame-changer\b/gi,'big change'],[/\bunlock the power of\b/gi,'use'],[/\bnavigate the complexities of\b/gi,'work through'],[/\bin the realm of\b/gi,'in'],[/\bever-evolving\b/gi,'changing'],[/\bplays a crucial role in\b/gi,'matters for'],[/\bshed light on\b/gi,'explain'],[/\bparadigm shift\b/gi,'change in thinking'],[/\bat the end of the day,?\s*/gi,''],[/\bwhen it comes to\b/gi,'for']];
export function fix(body,{maxDashPer1000=6}={}){
 let t=body;for(const [r,w] of SWAPS)t=t.replace(r,w);
 const words=(t.match(/\b[\w'’-]+\b/g)||[]).length||1;let allowed=Math.floor(words*maxDashPer1000/1000),seen=0;
 t=t.replace(/\s*—\s*/g,m=>(++seen>allowed?', ':m));
 return t.replace(/ ,/g,',').replace(/^\s*[a-z]/gm,c=>c.toUpperCase());
}
// Seeded layout variation: same article identity always yields the same page; different articles differ.
export function seedOf(id,slug){let h=2166136261;for(const c of id+'|'+slug){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;}
export function variantOf(seed){const pick=(a,n)=>a[(seed>>>n)%a.length];return {hue:seed%360,scale:pick([1,1.04,1.08,1.12],3),layout:pick(['a','b','c','d'],7),measure:pick(['62ch','66ch','70ch','74ch'],11),radius:pick([6,10,14,18],13),summary:pick(['top','top','after-intro'],17)};}
