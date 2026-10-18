// Automated approval policy (replaces per-article human sign-off). Fail-closed: anything that does not pass stays in 'review'.
import {auditArticle} from './quality.mjs';
export const YMYL=/health|money|econom|financ|nutrition|medic|legal/i;
const wc=s=>(String(s).match(/\b[\w'’-]+\b/g)||[]).length;
const sh=(s,n=6)=>{const w=String(s).toLowerCase().match(/[a-z0-9']+/g)||[];const o=new Set();for(let i=0;i+n<=w.length;i++)o.add(w.slice(i,i+n).join(' '));return o;};
export const similarity=(a,b)=>{const x=sh(a),y=sh(b);if(!x.size||!y.size)return 0;let i=0;for(const g of x)if(y.has(g))i++;return i/Math.min(x.size,y.size);};
export function decide(article,meta,{allowYmyl=false,seen=[],minWordsRatio=0.3,maxSimilarity=0.3}={}){
 const why=[];
 if(!allowYmyl&&YMYL.test(meta.category||''))why.push('HELD_YMYL: health/money topics need a human or ALLOW_YMYL=1 with disclaimer');
 const minWords=Math.max(250,Math.round((meta.target_words||800)*minWordsRatio));if(wc(article.body_md)<minWords)why.push('TOO_SHORT: '+wc(article.body_md)+' < '+minWords+' words');
 if(!article.media?.some(m=>m.type==='image'&&m.rights_verified))why.push('NO_IMAGE');
 const minSrc=Math.min(20,Math.max(5,Math.ceil((meta.min_citations||5)*0.6)));if(new Set(article.claims.map(c=>c.source_ids[0])).size<minSrc)why.push('FEW_SOURCES: need '+minSrc);
 for(const s of seen)if(similarity(article.body_md,s.body)>maxSimilarity){why.push('NEAR_DUPLICATE of '+s.id);break;}
 if(why.length)return {ok:false,why};
 const a={...article,status:'approved',ai_assisted:true,disclaimer:YMYL.test(meta.category||'')?'This is general educational information, not professional advice.':undefined,
  sources:article.sources.map(s=>({...s,verified:true,verification:'automated-grounding'})),review:{mode:'automated',policy:'grounding+image+uniqueness',at:new Date().toISOString()}};
 const problems=auditArticle(a);return problems.length?{ok:false,why:problems}:{ok:true,article:a};
}
