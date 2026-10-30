const HTML_HEADERS={
  "content-type":"text/html; charset=utf-8",
  "x-content-type-options":"nosniff",
  "referrer-policy":"strict-origin-when-cross-origin",
  "permissions-policy":"camera=(), microphone=(), geolocation=()"
};
function clean(path){return path.replace(/\/+$/,"")||"/"}
function safeSlug(value){return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)}
function typeFor(key){
  if(key.endsWith(".json"))return "application/json; charset=utf-8";
  if(key.endsWith(".xml"))return "application/xml; charset=utf-8";
  if(key.endsWith(".svg"))return "image/svg+xml";
  if(key.endsWith(".js"))return "text/javascript; charset=utf-8";
  if(key.endsWith(".css"))return "text/css; charset=utf-8";
  if(key.endsWith(".html"))return "text/html; charset=utf-8";
  return "application/octet-stream";
}
async function r2(env,key,request,{immutable=false,html=false}={}){
  const cache=caches.default;
  const cacheKey=new Request(request.url,{method:"GET"});
  if(request.method==="GET"){
    const hit=await cache.match(cacheKey);
    if(hit)return hit;
  }
  const object=await env.LIBRARY.get(key);
  if(!object)return new Response("Not found",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=60"}});
  const headers=new Headers(object.httpMetadata||{});
  headers.set("content-type",html?"text/html; charset=utf-8":(headers.get("content-type")||typeFor(key)));
  headers.set("cache-control",immutable?"public, max-age=31536000, immutable":"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  headers.set("etag",object.httpEtag);
  if(html)for(const [k,v] of Object.entries(HTML_HEADERS))headers.set(k,v);
  const response=new Response(request.method==="HEAD"?null:object.body,{headers});
  if(request.method==="GET")ctxWait(cache.put(cacheKey,response.clone()));
  return response;
}
let waiters=[];
function ctxWait(p){waiters.push(Promise.resolve(p).catch(()=>{}))}
export default {
  async fetch(request,env,ctx){
    waiters=[];
    if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405,headers:{allow:"GET, HEAD"}});
    const url=new URL(request.url),path=clean(url.pathname);

    if(path==="/library"||path==="/library/")return await r2(env,"phase1/library.html",request,{html:true});
    if(path==="/library-index.json")return await r2(env,"phase1/catalog.json",request);
    if(path==="/sitemap-library.xml")return await r2(env,"phase1/sitemap.xml",request);

    let m=path.match(/^\/article\/([a-z0-9-]+)$/);
    if(m&&safeSlug(m[1]))return await r2(env,"phase1/article/"+m[1]+".html",request,{html:true});

    m=path.match(/^\/research\/([a-z0-9-]+)$/);
    if(m&&safeSlug(m[1]))return await r2(env,"phase1/research/"+m[1]+".html",request,{html:true});

    m=path.match(/^\/blogs\/([a-z0-9-]+)$/);
    if(m&&safeSlug(m[1])){
      url.pathname="/article/"+m[1];
      return Response.redirect(url.toString(),301);
    }

    m=path.match(/^\/library-media\/(.+)$/);
    if(m){
      const key=m[1];
      if(key.includes("..")||key.startsWith("/"))return new Response("Bad path",{status:400});
      return await r2(env,"phase1/"+key,request,{immutable:true});
    }

    return new Response("Aafnai Library route not found",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  }
};