// Route-aware approval gate. Same fail-closed spirit as v1 decide(), but sized to the article:
//  - source floor and word floor come from the route (no universal 8-source / 3-image rule)
//  - images optional; every claim still needs a verbatim passage in a stored source excerpt (grounding runs before this gate)
//  - ymyl routes stay held unless allowYmyl, and then carry the disclaimer
import {auditArticle} from '../core/quality.mjs';
import {lint} from '../core/voice.mjs';
import {similarity} from '../core/auto-approve.mjs';
const wc=s=>(String(s).match(/\b[\w'’-]+\b/g)||[]).length;
export function decideV2(article,{route,policy,allowYmyl=false,seen=[],maxSimilarity=0.3,now=()=>new Date()}){
 const why=[];
 const voiceProblems=lint(article.body_md||'');if(voiceProblems.length)why.push('VOICE_GATE_FAILED: '+voiceProblems.join('; '));
 if(route==='ymyl'&&!allowYmyl)why.push('HELD_YMYL');
 if(wc(article.body_md)<policy.min_words)why.push('TOO_SHORT: '+wc(article.body_md)+' < '+policy.min_words);
 const distinct=new Set(article.claims.map(c=>c.source_ids[0])).size;if(distinct<policy.min_sources)why.push('FEW_SOURCES: '+distinct+' < '+policy.min_sources);
 for(const s of seen)if(similarity(article.body_md,s.body)>maxSimilarity){why.push('NEAR_DUPLICATE of '+s.id);break;}
 if(why.length)return {ok:false,why};
 const a={...article,status:'approved',ai_assisted:true,quality_policy:{route,min_sources:policy.min_sources,require_media:false},
  disclaimer:route==='ymyl'?'This is general educational information, not professional advice.':undefined,
  sources:article.sources.map(s=>({...s,verified:true,verification:'automated-grounding'})),review:{mode:'automated',policy:'v2-grounding+route-gate',route,at:now().toISOString()}};
 const problems=auditArticle(a);return problems.length?{ok:false,why:problems}:{ok:true,article:a};
}
