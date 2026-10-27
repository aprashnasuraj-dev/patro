import {assertTextLimit} from '../_vendor/limits';
function cps(s:string){return Array.from(s).map(c=>c.codePointAt(0)!)}
function hex(cp:number){return'U+'+cp.toString(16).toUpperCase().padStart(cp<=0xffff?4:6,'0')}
function utf16(s:string){const out=[];for(let i=0;i<s.length;i++)out.push('0x'+s.charCodeAt(i).toString(16).toUpperCase().padStart(4,'0'));return out}
function emojiLike(s:string){try{return /\p{Extended_Pictographic}/u.test(s)||/\p{Regional_Indicator}/u.test(s)}catch{return false}}
export function inspect(text:string){assertTextLimit(text,500000);const Seg=(Intl as any).Segmenter;const clusters:string[]=[];if(Seg){for(const x of new Seg(undefined,{granularity:'grapheme'}).segment(text))clusters.push(x.segment)}else clusters.push(...Array.from(text));if(clusters.length>50000)throw new Error('Too many grapheme clusters.');const enc=new TextEncoder();return clusters.map((cluster,i)=>({index:i+1,cluster,codepoints:cps(cluster).map(hex),utf16:utf16(cluster),utf8:[...enc.encode(cluster)],emoji:emojiLike(cluster)}))}
