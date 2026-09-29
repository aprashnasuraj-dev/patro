import {transliterateRoman,foldRoman} from './roman.mjs';
const compareRows=(a,b)=>b.priority-a.priority||a.word.length-b.word.length||a.word.localeCompare(b.word,'ne');
function near(a,b) {
 if(Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,edits=0;
 while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}
 return edits+(i<a.length||j<b.length?1:0)<=1;
}
/** Sorted prefix index avoids allocating a JS Map/array for every word prefix. */
export class SuggestionEngine {
 constructor(rows) {
  this.literal=new Map();this.entries=[];this.editorial=[];
  for(const row of rows) {
   for(const key of new Set(row.keys)){const a=this.literal.get(key)||[];a.push(row);this.literal.set(key,a);}
   for(const key of new Set([row.word,...row.keys.map(foldRoman)])) {
    const entry=[key,row];this.entries.push(entry);if(row.priority>0)this.editorial.push(entry);
   }
  }
  this.entries.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:compareRows(a[1],b[1]));
  for(const a of this.literal.values())a.sort(compareRows);
 }
 lowerBound(key){let lo=0,hi=this.entries.length;while(lo<hi){const mid=(lo+hi)>>>1;if(this.entries[mid][0]<key)lo=mid+1;else hi=mid;}return lo;}
 suggest(query,limit=8) {
  if(typeof query!=='string'||!query||query.length>64)return [];
  limit=Math.max(1,Math.min(16,Math.floor(limit)||8));
  const roman=/^[A-Za-z~]+$/.test(query),key=roman?foldRoman(query):query.normalize('NFC');
  const out=[],seen=new Set();const add=(word,kind)=>{if(word&&!seen.has(word)){seen.add(word);out.push({word,kind});}};
  if(roman)for(const r of this.literal.get(query)||[])add(r.word,'exact');
  const start=this.lowerBound(key);let end=start;
  while(end<this.entries.length&&this.entries[end][0]===key){add(this.entries[end][1].word,'exact');end++;}
  if(roman)add(transliterateRoman(query),'phonetic');
  const candidates=this.editorial.filter(([k])=>k.startsWith(key)).map(([,r])=>r);
  for(let i=start;i<Math.min(this.entries.length,start+1024)&&this.entries[i][0].startsWith(key);i++)candidates.push(this.entries[i][1]);
  candidates.sort(compareRows);for(const r of candidates)add(r.word,'completion');
  if(out.length<limit&&key.length>=3){const first=this.lowerBound(key[0]);for(let i=first;i<Math.min(first+1500,this.entries.length)&&this.entries[i][0].startsWith(key[0]);i++){const[k,r]=this.entries[i];if(near(key,k))add(r.word,'near');if(out.length>=limit)break;}}
  return out.slice(0,limit);
 }
}
