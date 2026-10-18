// Evidence-first article writer: (1) argument skeleton with claims bound to passages, (2) per-section prose conditioned on those claims, (3) voice lint/fix.
import {checkGrounding} from './grounding.mjs';
import {lint,fix} from '../core/voice.mjs';
const FORMAT_HINT={'Deep-Dive Article':'a deep-dive explainer with a fresh, specific angle','Search-Gap Answer':'a precise answer page for a question search engines answer poorly, built on exact data','Quick Facts':'numbered facts','Myth-Buster':'a myth-buster with verdicts','Perspectives Roundup':'a fair comparison of viewpoints','Data Story':'a data story explaining what numbers show and do not show'};
export const VOICE='Voice: plain, specific, confident; vary sentence length; use concrete nouns and active verbs; at most one short paragraph per 300 words; avoid clichés like "delve", "tapestry", "in conclusion"; use contractions naturally; no more than a few em-dashes.';
export async function writeArticle({llm,meta,title,evidence,need,attempt=1}){
 const nSections=Math.max(3,Math.min(9,Math.round((meta.target_words||1500)/(attempt>1?500:420))));
 const evTxt=evidence.map(e=>'['+e.id+'] '+e.title+' ('+e.publisher+')\n'+e.excerpts.map(x=>'- '+x).join('\n')).join('\n\n');
 const sk=await llm.json('You plan an article as an argument skeleton. Return JSON {title,description,angle,sections:[{heading,purpose,claims:[{id,text,source_id,passage}]}]}. '+nSections+' sections. Each claim quotes a passage VERBATIM from the cited evidence source. Use at least '+need+' different sources overall. Offer a fresh, specific angle ('+(meta.angle||'')+'). No facts beyond the evidence. Format: '+(FORMAT_HINT[meta.format]||'explainer')+'.','Topic: '+title+'\nQuestion: '+(meta.question||title)+'\nEvidence:\n'+evTxt);
 const d=sk.value;const claims=(d.sections||[]).flatMap((s,i)=>(s.claims||[]).map(c=>({...c,id:'c'+(i+1)+'-'+c.id})));
 const problems=checkGrounding({claims,body_md:''},evidence,{minSources:need});
 const bad=new Set(problems.filter(p=>/Claim (\S+)/.test(p)).map(p=>p.match(/Claim (\S+)/)[1]));
 const ok=claims.filter(c=>!bad.has(c.id));
 const used=new Set(ok.map(c=>c.source_id));if(ok.length<Math.max(6,nSections*2)||used.size<need)throw Object.assign(Error('GROUNDING_FAILED: '+ok.length+' grounded claims, '+used.size+' sources (need '+need+')'),{code:'GROUNDING_FAILED'});
 const perWords=Math.round((meta.target_words||1500)*(attempt>1?0.7:1)/nSections);const parts=[];
 for(const [i,s] of d.sections.entries()){
  const sc=ok.filter(c=>c.id.startsWith('c'+(i+1)+'-'));if(!sc.length)continue;
  const r=await llm.json('Write ONE section of an article in Markdown, about '+perWords+' words, starting with "## '+s.heading+'". Use only the facts in the claims given; paraphrase, never copy passages. '+VOICE+' Return JSON {"markdown":"..."}.','Section purpose: '+s.purpose+'\nClaims:\n'+sc.map(c=>'- '+c.text+' (source '+c.source_id+')').join('\n'));
  parts.push(String(r.value.markdown||'').trim());
 }
 let body=parts.join('\n\n');const first=lint(body);if(first.length)body=fix(body);
 const faq=(await llm.json('From these claims, write 3 FAQ items as JSON {"faq":[{"question","answer"}]}. Only use these facts.','Claims:\n'+ok.map(c=>'- '+c.text).join('\n')).catch(()=>({value:{faq:[]}}))).value.faq||[];
 return {title:d.title||title,description:String(d.description||'').slice(0,158),body_md:body,claims:ok.map(c=>({id:c.id,text:c.text,source_id:c.source_id,passage:c.passage})),headings:d.sections.map(s=>s.heading),faq,voice_problems_after:lint(body)};
}
