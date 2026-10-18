// Compact writer: 2 LLM calls per article (v1 used 1 + sections + 1 = 5-11).
//   call 1: argument skeleton, every claim quotes a passage VERBATIM from a cited source (same deterministic grounding gate as v1)
//   call 2: the whole body + FAQ in one shot from the grounded claims only
import {checkGrounding} from '../research/grounding.mjs';
import {lint,fix} from '../core/voice.mjs';
import {VOICE} from '../research/writer.mjs';
export async function writeCompact({llm,meta,title,evidence,need,targetWords=900,minWords=400}){
 const nSections=Math.max(3,Math.min(5,Math.round(targetWords/260)));
 const evTxt=evidence.map(e=>'['+e.id+'] '+e.title+' ('+e.publisher+')\n'+e.excerpts.map(x=>'- '+x).join('\n')).join('\n\n');
 const question=String(meta.question||title).trim();
 const sk=await llm.json('You are an evidence-first science editor. Build an argument skeleton that answers the exact question, not a related topic. Return JSON {title,description,sections:[{heading,purpose,claims:[{id,text,source_id,passage}]}]}. Use exactly '+nSections+' focused sections. The first section must directly answer the question and explain the main mechanism. Every later section must explain a distinct cause, mechanism, evidence, uncertainty, or consequence relevant to that same question. Do not drift into country profiles, travel, culture, or general background unless it directly explains the answer. Use at least '+need+' distinct independently published sources overall. Each claim must quote a passage VERBATIM from its cited source. No facts beyond the evidence. Keep the article title exactly: \"'+title+'\".','Exact question: '+question+'\nRequired focus: answer WHY/HOW/WHAT the question asks in the first paragraph.\nEvidence:\n'+evTxt);
 const d=sk.value,secs=d.sections||[];
 const claims=secs.flatMap((s,i)=>(s.claims||[]).map(c=>({...c,id:'c'+(i+1)+'-'+c.id})));
 const problems=checkGrounding({claims,body_md:''},evidence,{minSources:need});
 const bad=new Set(problems.filter(p=>/Claim (\S+)/.test(p)).map(p=>p.match(/Claim (\S+)/)[1]));
 const ok=claims.filter(c=>!bad.has(c.id));const used=new Set(ok.map(c=>c.source_id));
 if(ok.length<Math.max(4,nSections*2-1)||used.size<need)throw Object.assign(new Error('GROUNDING_FAILED: '+ok.length+' grounded claims, '+used.size+' sources (need '+need+')'),{code:'GROUNDING_FAILED'});
 const plan=secs.map((s,i)=>'## '+s.heading+' ('+s.purpose+')\n'+ok.filter(c=>c.id.startsWith('c'+(i+1)+'-')).map(c=>'- '+c.text+' (source '+c.source_id+')').join('\n')).join('\n\n');
 const w=await llm.json('Write a complete, publication-quality answer to the exact reader question in Markdown, aiming for '+targetWords+' words and never fewer than '+minWords+' words. Use one \"## heading\" per planned section, in order. The opening paragraph must answer the question directly in plain language, then explain the mechanisms with evidence. Stay tightly on-question throughout. Do not replace the requested explanation with general geography, country summaries, travel writing, or generic background. Every paragraph must add a relevant, supported fact or explanation. Do not invent evidence or sources. Do not use em dashes. Avoid filler, repeated explanations, formulaic openings, and generic conclusions. '+VOICE+' Also write up to 3 useful FAQ items that answer the exact question or meaningful follow-ups. Return JSON {\"markdown\":\"...\",\"faq\":[{\"question\":\"\",\"answer\":\"\"}]}.' ,'Exact question: '+question+'\nRequired title: '+title+'\nFocused outline and source-grounded claims:\n'+plan);
 let body=String(w.value.markdown||'').trim();
 if(lint(body).length)body=fix(body);
 const voiceProblems=lint(body);
 if(voiceProblems.length)throw Object.assign(new Error('VOICE_GATE_FAILED: '+voiceProblems.join('; ')),{code:'VOICE_GATE_FAILED'});
 const faq=Array.isArray(w.value.faq)?w.value.faq.slice(0,3):[];
 const faqSeen=new Set();
 const cleanFaq=faq.filter(f=>{const k=String(f.question||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(!k||faqSeen.has(k))return false;faqSeen.add(k);return true;});
 const wordCount=(body.match(/\b[\w’'-]+\b/g)||[]).length;
 if(wordCount<minWords)throw Object.assign(new Error('ARTICLE_TOO_SHORT: '+wordCount+' < '+minWords+' required words'),{code:'ARTICLE_TOO_SHORT'});
 return {title,description:String(d.description||'').slice(0,158),body_md:body,word_count:wordCount,claims:ok.map(c=>({id:c.id,text:c.text,source_id:c.source_id,passage:c.passage})),headings:secs.map(s=>s.heading),faq:cleanFaq,voice_problems_after:voiceProblems,provider:w.provider};
}
