
import { ASSETS } from "./assets.ts";

const TYPES: Record<string,string> = {
  "html":"text/html; charset=utf-8",
  "mjs":"application/javascript; charset=utf-8",
  "css":"text/css; charset=utf-8",
  "txt":"text/plain; charset=utf-8",
};
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self' blob:; img-src 'self' data:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
const __edgeHandler = ((request)=>{
  if(request.method!=="GET" && request.method!=="HEAD") return new Response("Method Not Allowed",{status:405});
  const url=new URL(request.url);
  const marker="/nepali-typing-live";
  let rel=url.pathname.slice(url.pathname.indexOf(marker)+marker.length).replace(/^\/+|\/+$/g,"");
  if(!rel) rel="index.html";
  const body=(ASSETS as Record<string,string>)[rel];
  if(body===undefined) return new Response("Not Found",{status:404});
  const ext=rel.split(".").pop()||"txt";
  const headers=new Headers({
    "content-type":TYPES[ext]||"text/plain; charset=utf-8",
    "cache-control": rel==="index.html" ? "public, max-age=60, s-maxage=300" : "public, max-age=3600, s-maxage=86400, immutable",
    "x-content-type-options":"nosniff",
    "content-security-policy":CSP
  });
  return new Response(request.method==="HEAD"?null:body,{status:200,headers});
});

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    void env;
    void ctx;
    return await __edgeHandler(request);
  },
};
