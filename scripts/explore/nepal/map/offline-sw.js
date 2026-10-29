"use strict";
const CACHE_PREFIX="aafnaipatro-nepalmap-offline-v1";

self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",(event)=>event.waitUntil(self.clients.claim()));

async function cacheUrls(urls){
  const cache=await caches.open(CACHE_PREFIX);
  const sameOrigin=urls.filter((u)=>{
    try { return new URL(u,self.location.origin).origin===self.location.origin; } catch { return false; }
  });
  for(const url of sameOrigin){
    try {
      const response=await fetch(url,{credentials:"same-origin"});
      if(response.ok) await cache.put(url,response.clone());
    } catch {}
  }
}
self.addEventListener("message",(event)=>{
  const m=event.data||{};
  if(m.type==="cache-pack"){
    const p=cacheUrls(m.urls||[]).then(()=>({ok:true})).catch((e)=>({ok:false,error:String(e)}));
    event.waitUntil(p);
    if(event.ports&&event.ports[0]) p.then((x)=>event.ports[0].postMessage(x));
  }
  if(m.type==="delete-pack"){
    const p=caches.open(CACHE_PREFIX).then(async(cache)=>{
      for(const url of m.urls||[]) await cache.delete(url);
      return {ok:true};
    });
    event.waitUntil(p);
    if(event.ports&&event.ports[0]) p.then((x)=>event.ports[0].postMessage(x));
  }
});
self.addEventListener("fetch",(event)=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith("/nepalmap/")) return;
  if(event.request.method!=="GET") return;
  event.respondWith(caches.open(CACHE_PREFIX).then(async(cache)=>{
    const hit=await cache.match(event.request,{ignoreSearch:false});
    if(hit) return hit;
    try {
      const response=await fetch(event.request);
      return response;
    } catch {
      return new Response("Offline pack does not contain this resource",{status:503,headers:{"content-type":"text/plain;charset=utf-8"}});
    }
  }));
});
