/* Scoped to /astro/nepali-tools/ only. Does not replace Patro's root worker. */
const CACHE='patro-nepali-tools-v1.1.0';
const ROOT=new URL('./',self.location.href).href;
const LEXICON='https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/typing-lexicon?format=words';
const FILES=['index.html','styles.css','app.mjs','worker.mjs','core/roman.mjs','core/converter.mjs','core/suggestions.mjs','core/aliases.mjs','licenses/DICTIONARY-NOTICE.txt'];
self.addEventListener('install',e=>e.waitUntil(
 caches.open(CACHE).then(async c=>{
  await c.addAll(FILES.map(p=>ROOT+p));
  try{await c.add(new Request(LEXICON,{mode:'cors'}));}catch{/* Online typing still works; user can retry offline install. */}
 }).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('patro-nepali-tools-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET')return;
 const isLocal=url.href.startsWith(ROOT);
 const isLexicon=url.origin==='https://pxlsmxbpgdfzjzuqtict.supabase.co'&&url.pathname==='/functions/v1/typing-lexicon'&&url.searchParams.get('format')==='words';
 if(!isLocal&&!isLexicon)return;
 e.respondWith(caches.open(CACHE).then(async c=>{
  const hit=await c.match(e.request,{ignoreVary:true});
  if(hit)return hit;
  try{
   const response=await fetch(e.request);
   if(response.ok)await c.put(e.request,response.clone());
   return response;
  }catch{
   return e.request.mode==='navigate'?(await c.match(ROOT+'index.html'))||Response.error():Response.error();
  }
 }));
});
