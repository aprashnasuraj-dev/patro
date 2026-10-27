import {requireText} from '../_vendor/guards.js';
function v4(s){const p=s.split('.');if(p.length!==4||p.some(x=>!/^(0|[1-9]\d{0,2})$/.test(x)||Number(x)>255))throw Error('Invalid embedded IPv4 address.');return [(Number(p[0])<<8)|Number(p[1]),(Number(p[2])<<8)|Number(p[3])];}
export function parse(ip){let s=requireText(ip,80).toLowerCase();if(s.includes('%')||s.includes('/'))throw Error('Zone IDs and CIDR suffixes are not supported.');if(s.includes('.')){const pos=s.lastIndexOf(':');if(pos===-1)throw Error('Malformed embedded IPv4.');const tail=v4(s.slice(pos+1));s=s.slice(0,pos+1)+tail.map(n=>n.toString(16)).join(':');}
 if(/[^0-9a-f:]/.test(s)||s.split('::').length>2)throw Error('Invalid IPv6 notation.');const has=s.includes('::'),halves=has?s.split('::'):[s];
 const toWords=t=>t?t.split(':').map(v=>{if(!/^[0-9a-f]{1,4}$/.test(v))throw Error('Invalid IPv6 group.');return parseInt(v,16);}):[];
 const left=toWords(halves[0]),right=has?toWords(halves[1]):[];const missing=8-left.length-right.length;
 if((has&&missing<1)||(!has&&missing!==0))throw Error('IPv6 address has an incorrect number of groups.');return [...left,...Array(missing).fill(0),...right];}
export function compress(words){let start=-1,best=0;for(let i=0;i<8;){if(words[i]!==0){i++;continue;}let j=i;while(j<8&&words[j]===0)j++;if(j-i>best&&j-i>=2){start=i;best=j-i;}i=j;}
 const hex=words.map(w=>w.toString(16));if(start===-1)return hex.join(':');const a=hex.slice(0,start).join(':'),b=hex.slice(start+best).join(':');return a+'::'+b;}
export function compute(x){const groups=parse(x.ip),expanded=groups.map(v=>v.toString(16).padStart(4,'0')).join(':'),canonical=compress(groups);return {summary:canonical,text:JSON.stringify({canonical,expanded,hexGroups:groups.map(v=>v.toString(16).padStart(4,'0')),bits:128},null,2),warnings:['Zone IDs, CIDR notation and DNS hostnames are not supported.']};}
