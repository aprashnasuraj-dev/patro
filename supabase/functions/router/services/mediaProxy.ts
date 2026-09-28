const ALLOWED_HOSTS = new Set([
  "radio-broadcast.ekantipur.com",
  "usa15.fastcast4u.com",
  "stream.zenolive.com",
  "streaming.softnep.net",
  "stream.live.vc.bbcmedia.co.uk",
  "ktvhdsg.ekantipur.com",
  "202.166.207.67"
]);

function allowedUrl(raw: string) {
  let url: URL;
  try { url=new URL(raw); } catch { throw new Error("invalid_stream_url"); }
  if (url.protocol!=="http:" && url.protocol!=="https:") throw new Error("unsupported_stream_protocol");
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error("stream_host_not_allowed");
  if (url.username || url.password) throw new Error("credentials_not_allowed");
  return url;
}

function proxied(raw: string) {
  return "/api/v1/media/proxy?url="+encodeURIComponent(raw);
}

function rewriteManifest(text: string, base: URL) {
  return text.split(/\r?\n/).map((line)=>{
    const value=line.trim();
    if(!value || value.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g,(_match,uri:string)=>{
        const target=new URL(uri,base);
        return 'URI="'+proxied(target.toString())+'"';
      });
    }
    const target=new URL(value,base);
    return proxied(target.toString());
  }).join("\n");
}

export async function proxyMedia(request: Request, raw: string) {
  const target=allowedUrl(raw);
  const headers=new Headers();
  const range=request.headers.get("range"); if(range)headers.set("range",range);
  headers.set("accept",request.headers.get("accept") || "*/*");
  headers.set("user-agent","NepaliPatroMediaProxy/1.0");
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
  let upstream:Response;
  try {
    upstream=await fetch(target,{headers,redirect:"follow",signal:controller.signal});
  } finally { clearTimeout(timer); }
  const finalUrl=allowedUrl(upstream.url || target.toString());
  if(!upstream.ok && upstream.status!==206) return new Response("upstream_stream_error",{status:upstream.status || 502});
  const contentType=upstream.headers.get("content-type") || "";
  const manifest=contentType.includes("mpegurl") || finalUrl.pathname.toLowerCase().endsWith(".m3u8");
  const outHeaders=new Headers();
  outHeaders.set("cache-control",manifest?"public, max-age=5":"public, max-age=30");
  outHeaders.set("x-content-type-options","nosniff");
  outHeaders.set("accept-ranges",upstream.headers.get("accept-ranges") || "bytes");
  for(const name of ["content-type","content-range","content-length","icy-br","icy-name","icy-genre"]){
    const value=upstream.headers.get(name); if(value)outHeaders.set(name,value);
  }
  if(manifest){
    const text=await upstream.text();
    outHeaders.set("content-type","application/vnd.apple.mpegurl; charset=utf-8");
    outHeaders.delete("content-length");
    return new Response(rewriteManifest(text,finalUrl),{status:upstream.status,headers:outHeaders});
  }
  return new Response(upstream.body,{status:upstream.status,headers:outHeaders});
}
