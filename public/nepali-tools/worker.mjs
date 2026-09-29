import {SuggestionEngine} from './core/suggestions.mjs';
import {romanize} from './core/roman.mjs';
import {CURATED_ALIASES} from './core/aliases.mjs';
import {convert} from './core/converter.mjs';

const LEXICON_URL='https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/typing-lexicon?format=words';
let engine;

function buildRows(words) {
 const aliasByWord=new Map();
 for(const [key,word] of Object.entries(CURATED_ALIASES)) {
  const list=aliasByWord.get(word)||[];
  list.push(key);
  aliasByWord.set(word,list);
 }
 return words.map(word=>({
  word,
  keys:[...new Set([romanize(word),...(aliasByWord.get(word)||[])].filter(Boolean))],
  priority:aliasByWord.has(word)?100:0
 }));
}

const ready=fetch(LEXICON_URL,{headers:{accept:'text/plain'}})
 .then(r=>{if(!r.ok)throw Error('Dictionary download failed ('+r.status+')');return r.text();})
 .then(text=>{
   const words=text.split(/\r?\n/).map(x=>x.trim().normalize('NFC')).filter(Boolean);
   if(words.length!==34571||new Set(words).size!==34571)throw Error('Dictionary validation failed');
   engine=new SuggestionEngine(buildRows(words));
   return words.length;
 });

ready.then(count=>postMessage({type:'ready',count})).catch(e=>postMessage({type:'load-error',error:e.message}));
self.onmessage=async({data:m})=>{
 try {
  if(!m||!Number.isSafeInteger(m.id))throw Error('Invalid request');
  if(m.type==='suggest'){await ready;postMessage({id:m.id,type:m.type,query:m.query,items:engine.suggest(m.query)});}
  else if(m.type==='convert')postMessage({id:m.id,type:m.type,...convert(m.text,m.direction)});
  else throw Error('Unknown request');
 }catch(e){postMessage({id:m?.id,type:'error',error:e instanceof Error?e.message:'Worker request failed'});}
};
