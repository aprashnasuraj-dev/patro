"use strict";
const CACHE_PREFIX="aafnaipatro-nepalmap-offline-v1";

self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",(event)=>event.waitUntil(self.clients.claim()));

async function cacheUrls(urls){
  const cache=await caches.open(CACHE_PREFIX);
  const sameOrigin=urls.filter((u)=>{
    try { return new URL(u,self.location.origin).origin===self.location.origin; } catch { return false; }
  });
  const failed=[];
  for(const url of sameOrigin){
    try {
      const response=await fetch(url,{credentials:"same-origin"});
      if(!response.ok){failed.push(url+" ["+response.status+"]");continue;}
      await cache.put(url,response.clone());
    } catch { failed.push(url+" [network]"); }
  }
  if(failed.length) return {ok:false,error:"offline pack incomplete",failed};
  return {ok:true,cached:sameOrigin.length,failed:[]};
}
self.addEventListener("message",(event)=>{
  const m=event.data||{};
  if(m.type==="cache-pack"){
    const p=cacheUrls(m.urls||[]).catch((e)=>({ok:false,error:String(e),failed:[]}));
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
  if(url.origin!==self.location.origin||event.request.method!=="GET") return;
  event.respondWith(caches.open(CACHE_PREFIX).then(async(cache)=>{
    const shell = url.pathname === "/nepalmap" || url.pathname === "/nepalmap/";
    const packIndex = url.pathname === "/nepalmap/offline/index.json";
    if(packIndex){
      try {
        const fresh=await fetch(event.request,{cache:"no-store"});
        if(fresh.ok) await cache.put(event.request,fresh.clone());
        return fresh;
      } catch {
        const cachedIndex=await cache.match(event.request,{ignoreSearch:true});
        if(cachedIndex) return cachedIndex;
        return new Response("Offline pack index unavailable",{status:503,headers:{"content-type":"text/plain;charset=utf-8"}});
      }
    }
    const hit=await cache.match(event.request,{ignoreSearch:shell});
    if(hit) return hit;
    try {
      return await fetch(event.request);
    } catch {
      if(url.pathname.startsWith("/nepalmap/")||url.pathname.startsWith("/vendor/nepalmap/")||url.pathname.startsWith("/data/nepalmap/")){
        return new Response("Offline pack does not contain this resource",{status:503,headers:{"content-type":"text/plain;charset=utf-8"}});
      }
      throw new Error("network unavailable");
    }
  }));
});
