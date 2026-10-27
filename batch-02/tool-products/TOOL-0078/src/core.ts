// @ts-nocheck
import {csvParse,webURL} from '../_vendor/guards.js';
// Bounded offline functional graph: each source has at most one outgoing edge.
export function compute(x){
 const data=csvParse(x.csv,10000);if(data.length<2)throw Error('Provide source,target CSV rows.');
 const h=data[0].map(s=>s.trim().toLowerCase()),si=h.findIndex(s=>['source','from','old_url'].includes(s)),ti=h.findIndex(s=>['target','destination','to','new_url'].includes(s));
 if(si<0||ti<0)throw Error('CSV must contain source and target headers.');
 const edges=new Map(),duplicates=[];
 for(let i=1;i<data.length;i++){const row=data[i];if(row.length!==h.length)throw Error(`Invalid CSV field count on row ${i+1}.`);const from=webURL(row[si]),to=webURL(row[ti]);if(edges.has(from)){duplicates.push(from);continue;}edges.set(from,to);}
 // Cache makes overall status/hop computation linear in the number of redirect rules.
 const memo=new Map();for(const origin of edges.keys()){
  if(memo.has(origin))continue;
  const trace=[],seen=new Map();let at=origin;
  while(edges.has(at)&&!memo.has(at)&&!seen.has(at)){seen.set(at,trace.length);trace.push(at);at=edges.get(at);}
  if(seen.has(at)){
   const begin=seen.get(at),cycle=trace.length-begin;
   for(let i=begin;i<trace.length;i++)memo.set(trace[i],{loop:true,hops:cycle});
   for(let i=begin-1;i>=0;i--)memo.set(trace[i],{loop:true,hops:memo.get(edges.get(trace[i])).hops+1});
  }else{
   const final=memo.get(at)||{loop:false,hops:0};let next=final;
   for(let i=trace.length-1;i>=0;i--){next={loop:next.loop,hops:next.hops+1};memo.set(trace[i],next);}
  }
 }
 const records=[];for(const start of edges.keys()){
  const summary=memo.get(start),sample=[start],visited=new Set([start]);let cursor=start;
  for(let i=0;i<15&&edges.has(cursor);i++){cursor=edges.get(cursor);sample.push(cursor);if(visited.has(cursor))break;visited.add(cursor);}
  if(edges.has(cursor)&&!visited.has(edges.get(cursor)))sample.push('…');
  records.push({start,hops:summary.hops,status:summary.loop?'LOOP':summary.hops>1?'CHAIN':'DIRECT',path:sample.join(' → ')});
 }
 const loops=records.filter(r=>r.status==='LOOP').length,chains=records.filter(r=>r.status==='CHAIN').length;
 return {summary:`${chains} chains · ${loops} loop-affected sources across ${records.length} URLs`,metrics:[['Sources',records.length],['Chains',chains],['Loop-affected',loops]],rows:records.slice(0,300),visual:{type:'steps',label:'Example redirect trace',items:records.length?records[0].path.split(' → ').slice(0,7):[]},text:records.map(r=>`${r.status}\t${r.hops}\t${r.path}`).join('\n'),warnings:[...(duplicates.length?[`${duplicates.length} duplicate source mappings ignored; resolve ambiguity before deployment.`]:[]),'Long paths are abbreviated after 15 steps; hop counts include the complete trace to terminal or detected cycle.','Static mapping analysis only: real status codes, rewrites and response headers are not fetched.']};
}
