const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function replaceMap(text,map){const keys=Object.keys(map).sort((a,b)=>b.length-a.length);return keys.length?text.replace(new RegExp(keys.map(escape).join('|'),'g'),s=>map[s]):text;}
function phase(rules,input){let out='',mid=input,start=true,steps=0;const cap=Math.max(1000,input.length*100);while(mid.length){if(++steps>cap)throw Error('Conversion rule limit exceeded. Split the input into smaller sections.');let found=false;for(const rule of rules){if(rule.matchOnStart==null||start){const m=mid.match(rule.p);if(m){found=true;const right=mid.length-m[0].length;mid=mid.replace(rule.p,rule.s);const next=mid.length-right;if(rule.revisit==null){out+=mid.substring(0,next);mid=mid.substring(next);}}}}if(!found){out+=mid[0];mid=mid.substring(1);}start=false;}return out;}
export {replaceMap};
export function transliterate(text,rules){for(const p of rules)text=phase(p,text);return text;}
export function validate(text){if(typeof text!=='string'||text.length>100000)throw Error('Paste at most 100,000 characters.');}
