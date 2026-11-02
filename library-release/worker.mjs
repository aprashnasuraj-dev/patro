import { publicDiscoveryResponse, addCatalogueLink } from "./discovery.mjs";
import { GOOGLE_TAG_HTML, googleTagCsp } from "../shared/google-tag.ts";

const HTML_HEADERS={
  "content-type":"text/html; charset=utf-8",
  "x-content-type-options":"nosniff",
  "referrer-policy":"strict-origin-when-cross-origin",
  "permissions-policy":"camera=(), microphone=(), geolocation=()"
};
function googleTagged(response){
  if(!response||!(response.headers.get("content-type")||"").toLowerCase().includes("text/html")||!globalThis.HTMLRewriter)return response;
  const headers=new Headers(response.headers);
  const csp=headers.get("content-security-policy");
  if(csp)headers.set("content-security-policy",googleTagCsp(csp));
  headers.delete("content-length");
  headers.delete("etag");
  const html=new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  return new HTMLRewriter()
    .on("head",{element(el){el.prepend(GOOGLE_TAG_HTML,{html:true});}})
    .on("script[data-patro-google-tag]",{element(el){el.remove();}})
    .on("meta[http-equiv]",{element(el){
      if((el.getAttribute("http-equiv")||"").toLowerCase()==="content-security-policy"){
        el.setAttribute("content",googleTagCsp(el.getAttribute("content")||""));
      }
    }})
    .transform(html);
}
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
async function r2(env,key,request,ctx,{immutable=false,html=false}={}){
  const cache=caches.default;
  const cacheKey=new Request(request.url,{method:"GET"});
  if(request.method==="GET"){
    const hit=await cache.match(cacheKey);
    if(hit)return html?googleTagged(hit):hit;
  }
  const object=await env.LIBRARY.get(key);
  if(!object)return new Response("Not found",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=60"}});
  const headers=new Headers(object.httpMetadata||{});
  headers.set("content-type",html?"text/html; charset=utf-8":(headers.get("content-type")||typeFor(key)));
  headers.set("cache-control",immutable?"public, max-age=31536000, immutable":"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  headers.set("etag",object.httpEtag);
  if(html)for(const [k,v] of Object.entries(HTML_HEADERS))headers.set(k,v);
  const raw=new Response(request.method==="HEAD"?null:object.body,{headers});
  const response=html?googleTagged(raw):raw;
  if(request.method==="GET")ctx.waitUntil(cache.put(cacheKey,response.clone()).catch(()=>{}));
  return response;
}
export default {
  async fetch(request,env,ctx){
    if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405,headers:{allow:"GET, HEAD"}});
    const discovery=await publicDiscoveryResponse(request,env,ctx);
    if(discovery)return googleTagged(discovery);
    const url=new URL(request.url),path=clean(url.pathname);

    if(path==="/library"||path==="/library/")return addCatalogueLink(await r2(env,"phase1/library.html",request,ctx,{html:true}));
    if(path==="/library-index.json")return await r2(env,"phase1/catalog.json",request,ctx);
    if(path==="/sitemap-library.xml")return await r2(env,"phase1/sitemap.xml",request,ctx);

    let m=path.match(/^\/article\/([a-z0-9-]+)$/);
    if(m&&safeSlug(m[1]))return await r2(env,"phase1/article/"+m[1]+".html",request,ctx,{html:true});

    m=path.match(/^\/research\/([a-z0-9-]+)$/);
    if(m&&safeSlug(m[1]))return await r2(env,"phase1/research/"+m[1]+".html",request,ctx,{html:true});

    m=path.match(/^\/blogs\/([a-z0-9-]+)$/);
    if(m&&safeSlug(m[1])){
      url.pathname="/article/"+m[1];
      return Response.redirect(url.toString(),301);
    }

    m=path.match(/^\/library-media\/(.+)$/);
    if(m){
      const key=m[1];
      if(key.includes("..")||key.startsWith("/"))return new Response("Bad path",{status:400});
      return await r2(env,"phase1/"+key,request,ctx,{immutable:true});
    }

    return new Response("Aafnai Library route not found",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  }
};