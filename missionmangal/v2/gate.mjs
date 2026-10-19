// Route-aware approval gate. Same fail-closed spirit as v1 decide(), but sized to the article:
//  - source floor and word floor come from the route (no universal 8-source / 3-image rule)
//  - images optional; every claim still needs a verbatim passage in a stored source excerpt (grounding runs before this gate)
//  - ymyl routes stay held unless allowYmyl, and then carry the disclaimer
import {auditArticle} from '../core/quality.mjs';
import {similarity} from '../core/auto-approve.mjs';
const wc=s=>(String(s).match(/\b[\w'’-]+\b/g)||[]).length;
export function decideV2(article,{route,policy,allowYmyl=false,seen=[],maxSimilarity=0.3,now=()=>new Date()}){
 const why=[];
 if(route==='ymyl'&&!allowYmyl)why.push('HELD_YMYL');
 if(wc(article.body_md)<policy.min_words)why.push('TOO_SHORT: '+wc(article.body_md)+' < '+policy.min_words);
 const distinct=new Set(article.claims.flatMap(c=>c.source_ids||[])).size;
 const candidateFloor=Math.max(1,Math.min(policy.min_sources,policy.candidate_sources||policy.min_sources));
 const isCandidate=distinct<policy.min_sources&&distinct>=candidateFloor;
 if(distinct<policy.min_sources&&!isCandidate)why.push('FEW_SOURCES: '+distinct+' < '+policy.min_sources);
 for(const s of seen)if(similarity(article.body_md,s.body)>maxSimilarity){why.push('NEAR_DUPLICATE of '+s.id);break;}
 if(why.length)return {ok:false,why};
 if(isCandidate){
  // Candidate is grounded draft material, never an approval. Do not assert source verification or pass the publish gate.
  const ids=new Set((article.sources||[]).map(s=>s.id));
  const mapped=(article.claims||[]).length>0&&(article.claims||[]).every(c=>Array.isArray(c.source_ids)&&c.source_ids.length&&c.source_ids.every(id=>ids.has(id))&&typeof c.passage==='string'&&c.passage.trim().length>=20);
  if(!mapped)return {ok:false,why:['CANDIDATE_GROUNDING_INCOMPLETE']};
  return {ok:false,candidate:true,why:['RELEASE_CANDIDATE: '+distinct+' source(s); needs full research and editorial review']};
 }
 const a={...article,status:'approved',ai_assisted:true,quality_policy:{route,min_sources:policy.min_sources,require_media:false},
  disclaimer:route==='ymyl'?'This is general educational information, not professional advice.':undefined,
  sources:article.sources.map(s=>({...s,verified:true,verification:'automated-grounding'})),review:{mode:'automated',policy:'v2-grounding+route-gate',route,at:now().toISOString()}};
 const problems=auditArticle(a);return problems.length?{ok:false,why:problems}:{ok:true,article:a};
}
