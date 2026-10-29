type Env = {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  DB?: any;
  NEPAL_API_ENABLED?: string;
  NEPAL_CORRECTIONS_ENABLED?: string;
  NEPAL_EMERGENCY_ENABLED?: string;
  BIPAD_API_BASE?: string;
};

const API = "/api/nepal/v1";
const CATEGORIES = new Set(["worship","peak","lake","sight","waterfall","park","airport","village","school","health","bank","stay","services"]);
const REASONS = new Set(["wrong_name","wrong_location","wrong_category","wrong_admin","closed_or_removed","duplicate","missing_detail","other"]);
const ATTRIBUTION = "© OpenStreetMap contributors, ODbL 1.0";

function json(data: unknown, status = 200, cache = "public, max-age=300, s-maxage=3600", extra?: Record<string,string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":cache,
      "x-content-type-options":"nosniff",
      "access-control-allow-origin":"*",
      ...(extra || {}),
    },
  });
}

async function asset(env: Env, request: Request, path: string): Promise<Response> {
  if (!env.ASSETS) return new Response("Assets unavailable",{status:503});
  const url = new URL(request.url); url.pathname = path; url.search = "";
  return env.ASSETS.fetch(new Request(url.toString(),{method:"GET"}));
}
async function assetJson(env: Env, request: Request, path: string): Promise<any | null> {
  const r=await asset(env,request,path);
  if(!r.ok) return null;
  try{return await r.json();}catch{return null;}
}
function objectFromRow(fields:string[],row:any[]):Record<string,unknown>{
  return Object.fromEntries(fields.map((f,i)=>[f,row[i]]));
}
async function prefix(id:string):Promise<string>{
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(id));
  return Array.from(new Uint8Array(b).slice(0,1),x=>x.toString(16).padStart(2,"0")).join("");
}
async function findPlace(env:Env,request:Request,id:string):Promise<{category:string,index:number,place:Record<string,unknown>}|null>{
  const p=await prefix(id);
  const bucket=await assetJson(env,request,`/data/nepalmap/v1/index/${p}.json`);
  const loc=bucket&&bucket[id];
  if(!loc||!CATEGORIES.has(loc[0])||!Number.isInteger(loc[1])) return null;
  const layer=await assetJson(env,request,`/data/nepalmap/v1/${loc[0]}.json`);
  if(!layer||!Array.isArray(layer.rows)||!layer.rows[loc[1]]) return null;
  return {category:loc[0],index:loc[1],place:objectFromRow(layer.fields,layer.rows[loc[1]])};
}

async function places(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  const rawCats=(url.searchParams.get("category")||"worship,peak,lake,village").split(",").map(x=>x.trim()).filter(x=>CATEGORIES.has(x)).slice(0,4);
  if(!rawCats.length) return json({error:"invalid_category"},400,"no-store");
  const q=(url.searchParams.get("q")||"").trim().toLocaleLowerCase().slice(0,80);
  const districtSlug=(url.searchParams.get("district")||"").trim().slice(0,80);
  const limit=Math.max(1,Math.min(100,Number(url.searchParams.get("limit")||25)||25));
  let did:number|null=null;
  if(districtSlug){
    const admin=await assetJson(env,request,"/data/nepalmap/v1/admin.json");
    const d=admin?.districts?.find((x:any)=>x.slug===districtSlug);
    if(!d) return json({error:"unknown_district"},400,"no-store");
    did=d.id;
  }
  const out:any[]=[];
  for(const cat of rawCats){
    const layer=await assetJson(env,request,`/data/nepalmap/v1/${cat}.json`);
    if(!layer) continue;
    const idx=Object.fromEntries(layer.fields.map((f:string,i:number)=>[f,i]));
    for(let i=0;i<layer.rows.length&&out.length<limit;i++){
      const row=layer.rows[i];
      if(did!=null&&row[idx.district_id]!==did) continue;
      const hay=(String(row[idx.name]||"")+" "+String(row[idx.name_ne]||"")+" "+String(row[idx.sub]||"")).toLocaleLowerCase();
      if(q&&!hay.includes(q)) continue;
      out.push({category:cat,...objectFromRow(layer.fields,row)});
    }
    if(out.length>=limit) break;
  }
  return json({data:out,count:out.length,limit,attribution:ATTRIBUTION,license:"https://opendatacommons.org/licenses/odbl/1-0/"});
}

async function correction(request:Request,env:Env):Promise<Response>{
  if(env.NEPAL_CORRECTIONS_ENABLED!=="1") return json({error:"corrections_disabled"},503,"no-store",{"access-control-allow-origin":"null"});
  const origin=request.headers.get("origin");
  const here=new URL(request.url).origin;
  if(origin&&origin!==here) return json({error:"same_origin_required"},403,"no-store",{"access-control-allow-origin":"null"});
  if(!env.DB) return json({error:"storage_unavailable"},503,"no-store",{"access-control-allow-origin":"null"});
  const len=Number(request.headers.get("content-length")||0);
  if(len>4096) return json({error:"payload_too_large"},413,"no-store",{"access-control-allow-origin":"null"});
  let body:any;try{body=await request.json();}catch{return json({error:"invalid_json"},400,"no-store",{"access-control-allow-origin":"null"});}
  if(body?.website) return json({accepted:true},202,"no-store",{"access-control-allow-origin":"null"});
  const sourceId=String(body?.source_id||"");
  const placeId=body?.place_id?String(body.place_id):null;
  const reason=String(body?.reason||"");
  const detail=String(body?.detail||"").trim().slice(0,500);
  const pagePath=String(body?.page_path||"").slice(0,200);
  if(!/^[nwr]\d+$/.test(sourceId)||!REASONS.has(reason)|| (placeId&&!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(placeId)) || (pagePath&&!pagePath.startsWith("/nepalmap"))) {
    return json({error:"invalid_correction"},400,"no-store",{"access-control-allow-origin":"null"});
  }
  const exists=await findPlace(env,request,placeId||sourceId);
  if(!exists||String(exists.place.source_id)!==sourceId) return json({error:"unknown_place"},400,"no-store",{"access-control-allow-origin":"null"});
  const now=Math.floor(Date.now()/1000),windowStart=now-3600;
  const recent=await env.DB.prepare("SELECT COUNT(*) AS n FROM nepal_map_corrections WHERE source_id=? AND created_at>=?").bind(sourceId,windowStart).first();
  if(Number(recent?.n||0)>=3) return json({error:"too_many_reports_for_place"},429,"no-store",{"access-control-allow-origin":"null","retry-after":"3600"});
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO nepal_map_corrections(id,source_id,place_id,reason,detail,page_path,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'reported',?,?)")
    .bind(id,sourceId,placeId,reason,detail,pagePath,now,now).run();
  return json({accepted:true,id,status:"reported",source_id:sourceId},202,"no-store",{"access-control-allow-origin":"null"});
}

async function correctionStatus(request:Request,env:Env,id:string):Promise<Response>{
  if(!env.DB||!/^[0-9a-f-]{36}$/i.test(id)) return json({error:"not_found"},404,"no-store",{"access-control-allow-origin":"null"});
  const row=await env.DB.prepare("SELECT id,source_id,place_id,status,created_at,updated_at FROM nepal_map_corrections WHERE id=?").bind(id).first();
  return row?json(row,200,"no-store",{"access-control-allow-origin":"null"}):json({error:"not_found"},404,"no-store",{"access-control-allow-origin":"null"});
}


const BIPAD_ENDPOINTS:Record<string,string>={
  incident:"incident",alert:"alert",earthquake:"earthquake",fire:"fire",
  openspace:"openspace-detail",rain:"rain",river:"river"
};
async function emergency(request:Request,env:Env):Promise<Response>{
  if(env.NEPAL_EMERGENCY_ENABLED!=="1") return json({error:"emergency_overlay_disabled"},503,"no-store");
  const url=new URL(request.url),kind=(url.searchParams.get("kind")||"incident").toLowerCase();
  const endpoint=BIPAD_ENDPOINTS[kind];
  if(!endpoint) return json({error:"invalid_emergency_kind",allowed:Object.keys(BIPAD_ENDPOINTS)},400,"no-store");
  const rawBase=env.BIPAD_API_BASE||"https://bipadportal.gov.np/api/v1";
  let base:URL;
  try{base=new URL(rawBase);}catch{return json({error:"invalid_bipad_base"},503,"no-store");}
  if(base.protocol!=="https:"||!["bipadportal.gov.np","bipad.gov.np"].includes(base.hostname)) return json({error:"unapproved_bipad_host"},503,"no-store");
  const target=new URL(base.toString().replace(/\/$/,"")+"/"+endpoint+"/");
  const limit=Math.max(1,Math.min(100,Number(url.searchParams.get("limit")||50)||50));
  target.searchParams.set("limit",String(limit));
  const ordering=url.searchParams.get("ordering");
  if(ordering&&/^-?[a-z_]{1,40}$/i.test(ordering)) target.searchParams.set("ordering",ordering);
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const upstream=await fetch(target.toString(),{headers:{accept:"application/json"},signal:ctrl.signal});
    if(!upstream.ok) return json({error:"bipad_upstream",status:upstream.status,kind},502,"no-store");
    const data=await upstream.json();
    return json({kind,source:"BIPAD Portal",source_url:target.toString(),fetched_at:new Date().toISOString(),data},200,"public, max-age=120, s-maxage=300");
  }catch(error){
    return json({error:"bipad_unavailable",kind,message:error instanceof Error?error.message:String(error)},502,"no-store");
  }finally{clearTimeout(timer);}
}

export async function nepalApiResponse(request:Request,env:Env):Promise<Response|null>{
  const url=new URL(request.url);
  if(!url.pathname.startsWith(API)) return null;
  if(env.NEPAL_API_ENABLED!=="1") return json({error:"nepal_api_disabled"},503,"no-store");
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,HEAD,POST,OPTIONS","access-control-allow-headers":"content-type","access-control-max-age":"86400"}});
  if(url.pathname===API||url.pathname===API+"/") return json({name:"AafnaiPatro Nepal Map API",version:"v1",attribution:ATTRIBUTION,endpoints:["/manifest","/admin","/places","/place/{id}","/emergency","/corrections"]});
  if((request.method==="GET"||request.method==="HEAD")&&url.pathname===API+"/emergency") return emergency(request,env);
  if((request.method==="GET"||request.method==="HEAD")&&url.pathname===API+"/manifest"){
    const data=await assetJson(env,request,"/data/nepalmap/v1/manifest.json");return data?json(data):json({error:"not_found"},404);
  }
  if((request.method==="GET"||request.method==="HEAD")&&url.pathname===API+"/admin"){
    const data=await assetJson(env,request,"/data/nepalmap/v1/admin.json");return data?json({...data,attribution:ATTRIBUTION}):json({error:"not_found"},404);
  }
  if((request.method==="GET"||request.method==="HEAD")&&url.pathname===API+"/places") return places(request,env);
  const pm=url.pathname.match(/^\/api\/nepal\/v1\/place\/([^/]+)$/);
  if((request.method==="GET"||request.method==="HEAD")&&pm){
    const found=await findPlace(env,request,decodeURIComponent(pm[1]));
    return found?json({...found,attribution:ATTRIBUTION,license:"https://opendatacommons.org/licenses/odbl/1-0/"}):json({error:"not_found"},404);
  }
  if(request.method==="POST"&&url.pathname===API+"/corrections") return correction(request,env);
  const cm=url.pathname.match(/^\/api\/nepal\/v1\/corrections\/([0-9a-f-]+)$/i);
  if(request.method==="GET"&&cm) return correctionStatus(request,env,cm[1]);
  return json({error:"not_found"},404,"no-store");
}
