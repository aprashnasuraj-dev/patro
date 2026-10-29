const VERSION="bali-calendar-pwa-v1";
const CACHE="bali-calendar-shell-v1";
const SHELL=[
  "/bali-calendar",
  "/bali-calendar/manifest.webmanifest",
  "/bali-calendar/pwa.js",
  "/bali-calendar/icon.svg"
];
async function putIfOk(cache,url){
  try{
    const response=await fetch(url,{cache:"reload",credentials:"same-origin"});
    if(response&&response.ok)await cache.put(url,response.clone());
    return Boolean(response&&response.ok);
  }catch{return false;}
}
async function warm(){
  const cache=await caches.open(CACHE);
  await Promise.allSettled(SHELL.map(url=>putIfOk(cache,url)));
}
self.addEventListener("install",event=>{
  event.waitUntil(warm().then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith("bali-calendar-")&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
  if(event.data?.type==="WARM_BALI_PWA")event.waitUntil(warm().then(()=>event.source?.postMessage({type:"BALI_PWA_READY",revision:VERSION})).catch(()=>event.source?.postMessage({type:"BALI_PWA_RETRY",revision:VERSION})));
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const isBaliNavigation=request.mode==="navigate"&&url.pathname.startsWith("/bali-calendar");
  const isBaliAsset=url.pathname==="/bali-calendar/manifest.webmanifest"||url.pathname==="/bali-calendar/pwa.js"||url.pathname==="/bali-calendar/icon.svg";
  if(!isBaliNavigation&&!isBaliAsset)return;
  if(isBaliNavigation){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const response=await fetch(request);
        if(response&&response.ok)await cache.put("/bali-calendar",response.clone());
        return response;
      }catch{
        return (await cache.match("/bali-calendar"))||Response.error();
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(request,{ignoreSearch:true});
    if(hit)return hit;
    const response=await fetch(request);
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  })());
});
