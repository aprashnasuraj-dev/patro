// Deterministic grounding gate. A claim passes only if its quoted passage appears in the stored excerpts of the cited source.
// This is a fail-closed lexical check, NOT proof of semantic entailment; human review is still required.
const norm=s=>String(s).toLowerCase().replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\s+/g,' ').trim();
const grams=(s,n=8)=>{const w=norm(s).split(' ');const out=new Set();for(let i=0;i+n<=w.length;i++)out.add(w.slice(i,i+n).join(' '));return out;};
export function copiedShare(body,excerpts,n=8){const g=grams(body,n);if(!g.size)return 0;let hit=0;const ex=excerpts.map(norm).join(' ');for(const x of g)if(ex.includes(x))hit++;return hit/g.size;}
export function checkGrounding(draft,evidence,{maxCopy=0.15,minSources=5}={}){
 const problems=[];const byId=new Map(evidence.map(e=>[e.id,e]));
 if(!Array.isArray(draft.claims)||draft.claims.length<3)problems.push('Too few claims');
 for(const c of draft.claims||[]){
  const e=byId.get(c.source_id);
  if(!e){problems.push('Claim '+c.id+' cites unknown source');continue;}
  if(!c.passage||norm(c.passage).length<25){problems.push('Claim '+c.id+' lacks a passage');continue;}
  if(!e.excerpts.some(x=>norm(x).includes(norm(c.passage))))problems.push('Claim '+c.id+' passage not found in source');
  for(const num of String(c.text).match(/\d[\d,.]*/g)||[])if(!norm(c.passage).includes(norm(num)))problems.push('Claim '+c.id+' number '+num+' not in passage');
 }
 const used=new Set((draft.claims||[]).map(c=>c.source_id));if(used.size<minSources)problems.push('Fewer than '+minSources+' distinct sources actually used');
 const share=copiedShare(draft.body_md||'',evidence.flatMap(e=>e.excerpts));if(share>maxCopy)problems.push('Excess verbatim copying ('+Math.round(share*100)+'%)');
 return problems;
}
