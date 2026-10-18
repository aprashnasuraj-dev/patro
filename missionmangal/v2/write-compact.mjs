// Compact writer: 2 LLM calls per article (v1 used 1 + sections + 1 = 5-11).
//   call 1: argument skeleton, every claim quotes a passage VERBATIM from a cited source (same deterministic grounding gate as v1)
//   call 2: the whole body + FAQ in one shot from the grounded claims only
import {checkGrounding} from '../research/grounding.mjs';
import {lint,fix} from '../core/voice.mjs';
import {VOICE} from '../research/writer.mjs';
export async function writeCompact({llm,meta,title,evidence,need,targetWords=900}){
 const nSections=Math.max(3,Math.min(5,Math.round(targetWords/260)));
 const evTxt=evidence.map(e=>'['+e.id+'] '+e.title+' ('+e.publisher+')\n'+e.excerpts.map(x=>'- '+x).join('\n')).join('\n\n');
 const sk=await llm.json('You plan an article as an argument skeleton. Return JSON {title,description,sections:[{heading,purpose,claims:[{id,text,source_id,passage}]}]}. '+nSections+' sections, 2-4 claims each. Each claim quotes a passage VERBATIM from the cited evidence source. Use at least '+need+' different sources overall. Answer the question directly and completely. No facts beyond the evidence.','Topic: '+title+'\nQuestion: '+(meta.question||title)+'\nEvidence:\n'+evTxt);
 const d=sk.value,secs=d.sections||[];
 const claims=secs.flatMap((s,i)=>(s.claims||[]).map(c=>({...c,id:'c'+(i+1)+'-'+c.id})));
 const problems=checkGrounding({claims,body_md:''},evidence,{minSources:need});
 const bad=new Set(problems.filter(p=>/Claim (\S+)/.test(p)).map(p=>p.match(/Claim (\S+)/)[1]));
 const ok=claims.filter(c=>!bad.has(c.id));const used=new Set(ok.map(c=>c.source_id));
 if(ok.length<Math.max(4,nSections*2-1)||used.size<need)throw Object.assign(new Error('GROUNDING_FAILED: '+ok.length+' grounded claims, '+used.size+' sources (need '+need+')'),{code:'GROUNDING_FAILED'});
 const plan=secs.map((s,i)=>'## '+s.heading+' ('+s.purpose+')\n'+ok.filter(c=>c.id.startsWith('c'+(i+1)+'-')).map(c=>'- '+c.text+' (source '+c.source_id+')').join('\n')).join('\n\n');
 const w=await llm.json('Write the full article in Markdown, about '+targetWords+' words, one "## heading" per planned section, in order. Answer the exact reader question early. Make every section specific to this subject, with varied sentence length and paragraph rhythm. Do not use em dashes. Avoid formulaic openings, filler, repeated explanations, generic conclusions, and FAQ items that merely restate headings. Use only facts in the claims; paraphrase, never copy passages. '+VOICE+' Also write up to 3 useful FAQ items using only these facts. Return JSON {"markdown":"...","faq":[{"question":"","answer":""}]}.','Question: '+(meta.question||title)+'\nPlan and claims:\n'+plan);
 let body=String(w.value.markdown||'').trim();
 if(lint(body).length)body=fix(body);
 const voiceProblems=lint(body);
 if(voiceProblems.length)throw Object.assign(new Error('VOICE_GATE_FAILED: '+voiceProblems.join('; ')),{code:'VOICE_GATE_FAILED'});
 const faq=Array.isArray(w.value.faq)?w.value.faq.slice(0,3):[];
 const faqSeen=new Set();
 const cleanFaq=faq.filter(f=>{const k=String(f.question||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(!k||faqSeen.has(k))return false;faqSeen.add(k);return true;});
 return {title:d.title||title,description:String(d.description||'').slice(0,158),body_md:body,claims:ok.map(c=>({id:c.id,text:c.text,source_id:c.source_id,passage:c.passage})),headings:secs.map(s=>s.heading),faq:cleanFaq,voice_problems_after:voiceProblems,provider:w.provider};
}
