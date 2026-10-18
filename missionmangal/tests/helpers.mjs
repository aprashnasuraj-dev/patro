export const SENT=n=>'Surface wetting number '+n+' occurs when a liquid spreads across a solid surface because adhesion exceeds cohesion.';
const words=(seed,n)=>Array.from({length:n},(_,i)=>'term'+((i*7+seed)%211)).join(' ');
// Mock LLM that understands the writer's three call types. opts.badPassage(n) => true makes call n's skeleton ungrounded.
export function smartLlm({sections=4,badOnCall=()=>false,sameBody=false}={}){let call=0;
 return {available:()=>true,async json(system){
  if(/argument skeleton/.test(system)){call++;const bad=badOnCall(call);return {provider:'mock',model:'m',value:{title:'Why surfaces get wet',description:'A sourced look at wetting.',angle:'a',sections:Array.from({length:sections},(_,i)=>({heading:'Section '+(i+1),purpose:'p',claims:[0,1].map(k=>{const n=((i*2+k)%5)+1;return {id:'x'+k,text:'Liquids wet surfaces when adhesion exceeds cohesion',source_id:'s'+n,passage:bad?'Invented passage that no source contains anywhere at all.':SENT(n)};})}))}};}
  if(/ONE section/.test(system)){const h=(system.match(/## ([^"]+)"/)||[])[1]||'S';return {provider:'mock',model:'m',value:{markdown:'## '+h+'\n\n'+words(sameBody?0:call*13,130)}};}
  return {provider:'mock',model:'m',value:{faq:[{question:'Why?',answer:'Because adhesion exceeds cohesion.'}]}};}};}
