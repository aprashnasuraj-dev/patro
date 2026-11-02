
const __PATRO_GA_ID="G-KWLDWTSK14";
const __PATRO_GA_HASH="'sha256-tcnd4K/edH7A3LzDRjFjIfm3GTH8JtfJOBjNzuzjydg='";
const __PATRO_GA_HTML='<!-- Google tag (gtag.js) -->\n<script data-patro-google-tag async src="https://www.googletagmanager.com/gtag/js?id=G-KWLDWTSK14"></script>\n<script data-patro-google-tag>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag(\'js\', new Date());\n\n  gtag(\'config\', \'G-KWLDWTSK14\');\n</script>';
const __PatroNativeResponse=Response;
function __patroCsp(policy){
 if(!policy)return policy;
 const directives=new Map(policy.split(";").map(p=>p.trim().split(/\s+/)).filter(([n])=>n).map(([n,...v])=>[n.toLowerCase(),v]));
 const allow=(name,sources,fallback="default-src")=>{const values=[...(directives.get(name)||directives.get(fallback)||[])].filter(v=>v!=="'none'");directives.set(name,[...new Set([...values,...sources])]);};
 for(const name of ["script-src",...(directives.has("script-src-elem")?["script-src-elem"]:[])]){
   const values=directives.get(name)||directives.get("script-src")||directives.get("default-src")||[];
   const needsHash=!values.includes("'unsafe-inline'")||values.some(v=>/^'(sha\d+-|nonce-)/.test(v));
   allow(name,["https://www.googletagmanager.com",...(needsHash?[__PATRO_GA_HASH]:[])],name==="script-src"?"default-src":"script-src");
 }
 allow("connect-src",["'self'","https://www.googletagmanager.com","https://*.google-analytics.com","https://*.analytics.google.com"]);
 allow("img-src",["https://*.google-analytics.com","https://www.googletagmanager.com"]);
 return [...directives].map(([n,v])=>n+" "+v.join(" ")).join("; ");
}
function __patroDecorate(response){
 if(!response||!(response.headers.get("content-type")||"").toLowerCase().includes("text/html")||!globalThis.HTMLRewriter)return response;
 const headers=new Headers(response.headers),csp=headers.get("content-security-policy");if(csp)headers.set("content-security-policy",__patroCsp(csp));headers.delete("content-length");headers.delete("etag");
 const clean=new __PatroNativeResponse(response.body,{status:response.status,statusText:response.statusText,headers});
 return new HTMLRewriter().on("head",{element(el){el.prepend(__PATRO_GA_HTML,{html:true});}}).on("script[data-patro-google-tag]",{element(el){el.remove();}}).on("meta[http-equiv]",{element(el){if((el.getAttribute("http-equiv")||"").toLowerCase()==="content-security-policy"){const p=el.getAttribute("content")||"";el.setAttribute("content",__patroCsp(p));}}}).transform(clean);
}
function __patroResponse(body,init){return __patroDecorate(new __PatroNativeResponse(body,init));}

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.mjs
var HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};
function clean(path) {
  return path.replace(/\/+$/, "") || "/";
}
__name(clean, "clean");
function safeSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
__name(safeSlug, "safeSlug");
function typeFor(key) {
  if (key.endsWith(".json")) return "application/json; charset=utf-8";
  if (key.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (key.endsWith(".svg")) return "image/svg+xml";
  if (key.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (key.endsWith(".css")) return "text/css; charset=utf-8";
  if (key.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}
__name(typeFor, "typeFor");
async function r2(env, key, request, ctx, { immutable = false, html = false } = {}) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  if (request.method === "GET") {
    const hit = await cache.match(cacheKey);
    if (hit) return __patroDecorate(hit);
  }
  const object = await env.LIBRARY.get(key);
  if (!object) return __patroResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=60" } });
  const headers = new Headers(object.httpMetadata || {});
  headers.set("content-type", html ? "text/html; charset=utf-8" : headers.get("content-type") || typeFor(key));
  headers.set("cache-control", immutable ? "public, max-age=31536000, immutable" : "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  headers.set("etag", object.httpEtag);
  if (html) for (const [k, v] of Object.entries(HTML_HEADERS)) headers.set(k, v);
  const response = __patroResponse(request.method === "HEAD" ? null : object.body, { headers });
  if (request.method === "GET") ctx.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {
  }));
  return response;
}
__name(r2, "r2");
var worker_default = {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") return __patroResponse("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    const url = new URL(request.url), path = clean(url.pathname);
    if (path === "/library" || path === "/library/") return await r2(env, "phase1/library.html", request, ctx, { html: true });
    if (path === "/library-index.json") return await r2(env, "phase1/catalog.json", request, ctx);
    if (path === "/sitemap-library.xml") return await r2(env, "phase1/sitemap.xml", request, ctx);
    let m = path.match(/^\/article\/([a-z0-9-]+)$/);
    if (m && safeSlug(m[1])) return await r2(env, "phase1/article/" + m[1] + ".html", request, ctx, { html: true });
    m = path.match(/^\/research\/([a-z0-9-]+)$/);
    if (m && safeSlug(m[1])) return await r2(env, "phase1/research/" + m[1] + ".html", request, ctx, { html: true });
    m = path.match(/^\/blogs\/([a-z0-9-]+)$/);
    if (m && safeSlug(m[1])) {
      url.pathname = "/article/" + m[1];
      return Response.redirect(url.toString(), 301);
    }
    m = path.match(/^\/library-media\/(.+)$/);
    if (m) {
      const key = m[1];
      if (key.includes("..") || key.startsWith("/")) return __patroResponse("Bad path", { status: 400 });
      return await r2(env, "phase1/" + key, request, ctx, { immutable: true });
    }
    return __patroResponse("Aafnai Library route not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
