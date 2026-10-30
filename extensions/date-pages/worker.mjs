// Matching HTML is served by Static Assets before this handler: no Worker execution.
// Misses retain the complete archive, date normalization, methods and error responses.
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/date/'))return new Response('Not Found',{status:404});
    // Preserve the live Atlas layer's public-date cache for long-tail misses.
    // Cookies/credentials and private or failed responses never enter the shared cache.
    const publicDate=['GET','HEAD'].includes(request.method)&&/^\/date\/\d{4}-\d{2}-\d{2}$/.test(url.pathname)&&!request.headers.has('cookie')&&!request.headers.has('authorization');
    url.searchParams.set('date_pages_cache','v1');
    const key=new Request(url,{method:'GET'}),cache=globalThis.caches?.default;
    const head=response=>request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
    if(publicDate&&cache){try{const hit=await cache.match(key);if(hit)return head(hit);}catch{}}
    const response=await env.ORIGIN.fetch(request);
    if(publicDate&&cache&&request.method==='GET'&&response.status===200&&!response.headers.has('set-cookie')&&!/private|no-store/i.test(response.headers.get('cache-control')||'')){
      // Fetch/service-binding response headers remain immutable after clone().
      const cached=new Response(response.clone().body,response);cached.headers.set('cache-control','public, max-age=240, s-maxage=240');
      const put=cache.put(key,cached).catch(()=>{});if(ctx)ctx.waitUntil(put);else await put;
    }
    return head(response);
  }
};
