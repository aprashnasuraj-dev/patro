export type FmEnv = { DB?: any };

const FM_PROV: Record<number,string> = {1:"koshi",2:"madhesh",3:"bagmati",4:"gandaki",5:"lumbini",6:"karnali",7:"sudurpashchim"};
const FM_PROV_NE: Record<number,string> = {1:"कोशी",2:"मधेश",3:"बागमती",4:"गण्डकी",5:"लुम्बिनी",6:"कर्णाली",7:"सुदूरपश्चिम"};
const NE_DIG = "०१२३४५६७८९";

function js(body: unknown, status=200, cache="public, max-age=300, s-maxage=900") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":cache,
      "x-content-type-options":"nosniff"
    }
  });
}

function norm(value: unknown) {
  return String(value ?? "")
    .replace(/[०-९]/g, (d) => String(NE_DIG.indexOf(d)))
    .normalize("NFC")
    .toLowerCase();
}

function parsePayload(row: any) {
  if (!row?.payload) return null;
  try { return typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; }
  catch { return null; }
}

async function table(env: FmEnv, name: string) {
  if (!env.DB) return null;
  try {
    const out = await env.DB.prepare(
      "select payload from content_records where table_name=?1 order by record_key asc"
    ).bind(name).all();
    return (out.results || []).map(parsePayload).filter(Boolean);
  } catch {
    return null;
  }
}

async function directory(env: FmEnv) {
  const [stations,districts] = await Promise.all([table(env,"fm_stations"),table(env,"np_districts")]);
  if (!stations || !districts) return null;
  const dm = new Map(districts.map((d:any)=>[d.id,d]));
  const items = stations.map((s:any)=>{
    const d:any = dm.get(s.district_id) || {};
    return {
      id:s.id,
      slug:s.slug,
      name_ne:s.name_ne,
      name_en:s.name_en,
      frequency:s.frequency_mhz == null ? null : String(s.frequency_mhz),
      district:s.district_id,
      district_ne:d.name_ne || s.district_id || "",
      district_en:d.name_en || s.district_id || "",
      province:FM_PROV[Number(d.province)] || "",
      province_ne:FM_PROV_NE[Number(d.province)] || "",
      municipality:s.city || d.hq_name_ne || "",
      languages:Array.isArray(s.languages) ? s.languages : [],
      website:s.website || null,
      facebook:s.facebook || null,
      logo_url:s.logo_url || null,
      type:s.stream_format || null,
      status:s.stream_status,
      playable:s.stream_status === "verified" && Boolean(s.stream_url),
      stream_evidence_url:s.stream_evidence_url || null,
      listing_source:s.listing_source || null,
      last_checked_at:s.last_checked_at || null,
      last_ok_at:s.last_ok_at || null,
      category:s.category || ""
    };
  });
  return { items, stations, districts };
}

function findStation(stations:any[], key:string) {
  return stations.find((s:any)=>String(s.slug)===key || String(s.id)===key) || null;
}

function publicStation(s:any) {
  return {
    slug:s.slug,
    name_ne:s.name_ne,
    name_en:s.name_en,
    frequency:s.frequency_mhz == null ? null : String(s.frequency_mhz),
    district:s.district_id,
    city:s.city,
    logo_url:s.logo_url,
    type:s.stream_format,
    stream:"/fm-v2-stream/" + encodeURIComponent(s.slug),
    rights:"verified_stream"
  };
}

async function relay(request: Request, station:any) {
  if (request.method !== "GET" && request.method !== "HEAD") return js({error:"method_not_allowed"},405,"no-store");
  if (station.stream_status !== "verified" || !station.stream_url) return js({error:"unverified_stream"},403,"no-store");

  let target: URL;
  try { target = new URL(String(station.stream_url)); }
  catch { return js({error:"invalid_stream_url"},502,"no-store"); }
  if (!["http:","https:"].includes(target.protocol)) return js({error:"invalid_stream_protocol"},502,"no-store");

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),12_000);
  try {
    const upstream = await fetch(target, {
      method:request.method,
      headers:{
        "user-agent":"Nepal-Miti-FM/2.1 Cloudflare",
        "icy-metadata":"0",
        "accept":request.headers.get("accept") || "audio/mpeg,audio/aac,application/ogg,*/*",
        ...(request.headers.get("range") ? {"range":request.headers.get("range")!} : {})
      },
      redirect:"follow",
      signal:controller.signal
    });
    if ((!upstream.ok && upstream.status !== 206) || (request.method !== "HEAD" && !upstream.body)) {
      return js({error:"station_unavailable",status:upstream.status},502,"no-store");
    }
    const type = upstream.headers.get("content-type") || (station.stream_format === "aac" ? "audio/aac" : "audio/mpeg");
    if (!/audio|aac|ogg|octet-stream/i.test(type)) {
      try { await upstream.body?.cancel(); } catch {}
      return js({error:"invalid_stream_type"},502,"no-store");
    }
    const headers = new Headers({
      "content-type":type,
      "cache-control":"no-store",
      "x-content-type-options":"nosniff",
      "content-disposition":"inline",
      "access-control-allow-origin":"*"
    });
    for (const k of ["content-length","content-range","accept-ranges","icy-br","icy-name","icy-genre"]) {
      const v=upstream.headers.get(k); if(v) headers.set(k,v);
    }
    return new Response(request.method === "HEAD" ? null : upstream.body,{status:upstream.status,headers});
  } catch (error) {
    return js({error:(error as any)?.name === "AbortError" ? "station_timeout" : "station_unavailable"},502,"no-store");
  } finally {
    clearTimeout(timer);
  }
}

export async function fmResponse(request: Request, env: FmEnv): Promise<Response|null> {
  if (!env.DB) return null;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/fm/v2/stations" || path === "/api/fm/stations") {
    const d = await directory(env);
    if (!d) return js({error:"directory_unavailable"},503,"no-store");
    const q=norm(url.searchParams.get("q")||"");
    const province=url.searchParams.get("province")||"";
    const district=url.searchParams.get("district")||"";
    const language=url.searchParams.get("language")||"";
    const streamOnly=path === "/api/fm/stations" || url.searchParams.get("stream")==="verified";
    let items=d.items.filter((s:any)=>
      (!province || s.province===province) &&
      (!district || s.district===district) &&
      (!language || s.languages.includes(language)) &&
      (!streamOnly || s.playable)
    );
    if(q) items=items.filter((s:any)=>norm([
      s.name_ne,s.name_en,s.frequency,s.district_ne,s.district_en,s.municipality,s.category
    ].join(" ")).includes(q));
    items.sort((a:any,b:any)=>(Number(b.playable)-Number(a.playable)) || String(a.name_ne).localeCompare(String(b.name_ne),"ne"));
    const langs=[...new Set(d.items.flatMap((x:any)=>x.languages||[]))].sort((a,b)=>String(a).localeCompare(String(b),"ne"));
    return js({
      ok:true,
      total:items.length,
      catalog_total:d.items.length,
      verified_total:d.items.filter((x:any)=>x.playable).length,
      covered_districts:new Set(d.items.map((x:any)=>x.district).filter(Boolean)).size,
      languages:langs,
      rights_gate:true,
      items
    });
  }

  if (path.startsWith("/api/fm/v2/play/") || path.startsWith("/api/fm/play/")) {
    const key=decodeURIComponent(path.split("/").pop()||"");
    const d=await directory(env);
    if(!d) return js({error:"directory_unavailable"},503,"no-store");
    const s=findStation(d.stations,key);
    if(!s) return js({error:"not_found"},404,"no-store");
    if(s.stream_status!=="verified" || !s.stream_url) return js({error:"station_temporarily_unavailable",website:s.website||null},503,"no-store");
    return js({ok:true,station:publicStation(s),notice:"रेडियो स्ट्रिमको उपलब्धता सम्बन्धित रेडियो स्टेसनमा निर्भर हुन्छ।"});
  }

  if (path.startsWith("/fm-v2-stream/") || path.startsWith("/fm-stream/")) {
    let key=decodeURIComponent(path.split("/").pop()||"").replace(/\.mp3$/i,"");
    const d=await directory(env);
    if(!d) return js({error:"directory_unavailable"},503,"no-store");
    const s=findStation(d.stations,key);
    if(!s) return js({error:"not_found"},404,"no-store");
    return relay(request,s);
  }

  return null;
}
