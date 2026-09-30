import { createClient } from "npm:@supabase/supabase-js@2";

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const HTML_HEADERS={"content-type":"text/html; charset=utf-8","cache-control":"no-store"};
const ICS_HEADERS={"content-type":"text/calendar; charset=utf-8","cache-control":"public, max-age=300, s-maxage=1800"};
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));
const j=(data:unknown,status=200,extra:Record<string,string>={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}});
const te=new TextEncoder();

function env(name:string){return Deno.env.get(name)||"";}
function admin(){const url=env("SUPABASE_URL")||"https://pxlsmxbpgdfzjzuqtict.supabase.co";const key=env("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(env("SUPABASE_SECRET_KEYS")||"{}").default||"";return key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;}
function userDb(req:Request){const url=env("SUPABASE_URL")||"https://pxlsmxbpgdfzjzuqtict.supabase.co";const key=env("SUPABASE_ANON_KEY")||env("SUPABASE_PUBLISHABLE_KEY")||"";const auth=req.headers.get("authorization")||"";return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:auth?{Authorization:auth}:{}}});}
async function currentUser(req:Request){const db=userDb(req);const {data}=await db.auth.getUser();return {db,user:data.user||null};}
async function sha256Hex(s:string){const b=new Uint8Array(await crypto.subtle.digest("SHA-256",te.encode(s)));return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");}
function b64u(b:Uint8Array){let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
function fromB64u(s:string){const pad=s.length%4?"=".repeat(4-s.length%4):"";const bin=atob(s.replace(/-/g,"+").replace(/_/g,"/")+pad),o=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)o[i]=bin.charCodeAt(i);return o;}
async function runtimeSecret(name:string){const db=admin();if(!db)return null;const {data,error}=await db.rpc("nm_runtime_secret",{secret_name:name});return error?null:(data||null);}
async function storeRuntimeSecret(name:string,value:string){const db=admin();if(!db)throw Error("admin_unavailable");const {error}=await db.rpc("nm_store_runtime_secret",{secret_name:name,secret_value:value});if(error)throw error;}
async function vapidKeys(){let pub=await runtimeSecret("nm_vapid_public"),priv=await runtimeSecret("nm_vapid_private");if(pub&&priv)return {publicKey:String(pub),privateKey:String(priv)};const kp=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]) as CryptoKeyPair;const jwk=await crypto.subtle.exportKey("jwk",kp.privateKey);const raw=new Uint8Array(await crypto.subtle.exportKey("raw",kp.publicKey));pub=b64u(raw);priv=String(jwk.d||"");await storeRuntimeSecret("nm_vapid_public",String(pub));await storeRuntimeSecret("nm_vapid_private",String(priv));return {publicKey:String(pub),privateKey:String(priv)};}

async function holidayStatus(u:URL){const ad=(u.searchParams.get("ad")||"").slice(0,10),audience=(u.searchParams.get("audience")||"government").slice(0,80),district=(u.searchParams.get("district")||"kathmandu").toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,40),bsYear=Number(u.searchParams.get("bsYear")||0);if(!/^\d{4}-\d{2}-\d{2}$/.test(ad))return j({error:"invalid_date"},400);const db=admin();if(!db)return j({error:"backend_not_configured"},503);const [{data:rows,error},{data:weekly},{data:coverage}]=await Promise.all([db.from("holidays").select("id,ad_date,bs_date,name_ne,name_en,scope_type,scope_codes,audiences,effect,status,scope_verified,source_url,source_title,notice_date").eq("ad_date",ad).eq("status","announced"),db.from("weekly_off_rules").select("*").eq("audience",audience).lte("effective_from",ad),bsYear?db.from("holiday_coverage").select("*").eq("bs_year",bsYear).eq("audience",audience):Promise.resolve({data:[]} as any)]);if(error)return j({error:"holiday_lookup_failed"},500);const applicable=(rows||[]).filter((h:any)=>{if(!(h.audiences||[]).includes(audience))return false;if(h.scope_type==="national")return true;if(h.scope_type==="valley")return ["kathmandu","lalitpur","bhaktapur"].includes(district);return (h.scope_codes||[]).includes(district)});const day=new Date(ad+"T00:00:00Z").getUTCDay(),weeklyHit=(weekly||[]).find((w:any)=>(!w.effective_to||w.effective_to>=ad)&&(w.weekdays||[]).includes(day)),covered=!!coverage?.length,uncertain=applicable.some((h:any)=>!h.scope_verified),closed=applicable.some((h:any)=>h.effect==="closed"),partial=applicable.some((h:any)=>h.effect==="partial"),state=closed?"closed":partial?"partial":weeklyHit?"weekly_off":covered?"open":"unknown";return j({ad,audience,district,bsYear:bsYear||null,state,covered,scopeVerified:!uncertain,holidays:applicable,weeklyOff:weeklyHit||null});}
async function holidaysApi(u:URL){const db=admin();if(!db)return j({error:"backend_not_configured"},503);const year=Number(u.searchParams.get("bsYear")||0),ad=u.searchParams.get("ad")||"";let q=db.from("holidays").select("id,ad_date,bs_date,name_ne,name_en,scope_type,scope_codes,audiences,effect,status,scope_verified,source_url,source_title,notice_date").eq("status","announced").order("ad_date");if(ad)q=q.eq("ad_date",ad);if(year)q=q.like("bs_date",`${year}-%`);const {data,error}=await q.limit(500);return error?j({error:"holiday_lookup_failed"},500):j({items:data||[],year:year||null,ad:ad||null});}
async function saits(u:URL){const db=admin();if(!db)return j({error:"backend_not_configured"},503);const from=(u.searchParams.get("from")||new Date().toISOString().slice(0,10)).slice(0,10),limit=Math.min(100,Math.max(1,Number(u.searchParams.get("limit")||50)));const {data,error}=await db.from("official_panchang_facts").select("fact_date,key,value,location_key,source_url,source_title,verified_at").eq("kind","sait").gte("fact_date",from).order("fact_date").limit(limit);return error?j({error:"sait_lookup_failed"},500):j({from,items:data||[]});}
async function marketLatest(){
  const db=admin();if(!db)return j({error:"backend_not_configured"},503);
  async function read(){
    return db.from("market_snapshots")
      .select("provider,asset,as_of,kind,value,buy,sell,unit,per,fetched_at,source_url,change,percent_change,source_label,source_updated_at")
      .order("as_of",{ascending:false}).order("fetched_at",{ascending:false}).limit(700)
  }
  let {data,error}=await read();
  const latestNrb=(data||[]).find((x:any)=>x.provider==="nrb_forex");
  const latestNepse=(data||[]).find((x:any)=>x.provider==="nepse_index");
  const nowMs=Date.now(),nrbAge=latestNrb?nowMs-Date.parse(latestNrb.fetched_at||""):Infinity,nepseAge=latestNepse?nowMs-Date.parse(latestNepse.fetched_at||""):Infinity;
  if(error)return j({error:"market_lookup_failed"},500);
  // Server-side refresh only. NRB is daily-ish; NEPSE gets a tighter cache while users are active.
  if(!latestNrb||!latestNepse||!Number.isFinite(nrbAge)||nrbAge>6*3600000||!Number.isFinite(nepseAge)||nepseAge>15*60000){
    try{await refreshMarket();const again=await read();data=again.data;error=again.error}catch{}
  }
  if(error)return j({error:"market_lookup_failed"},500);
  const seen=new Set<string>(),items:any[]=[];
  for(const x of data||[]){const k=x.provider+"|"+x.asset;if(!seen.has(k)){seen.add(k);items.push(x)}}
  const now=Date.now(),nowDate=new Date(),today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(nowDate);
  const nptParts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kathmandu",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(nowDate).map((p:any)=>[p.type,p.value]));
  const nptMinutes=Number(nptParts.hour||0)*60+Number(nptParts.minute||0),marketDay=["Sun","Mon","Tue","Wed","Thu"].includes(String(nptParts.weekday||"")),marketOpen=marketDay&&nptMinutes>=11*60&&nptMinutes<=15*60+15;
  const enriched=items.map((x:any)=>{
    const fetched=Date.parse(x.fetched_at||""),ageMinutes=Number.isFinite(fetched)?Math.max(0,Math.round((now-fetched)/60000)):null;
    const daysOld=/^\d{4}-\d{2}-\d{2}$/.test(String(x.as_of||""))?Math.round((Date.parse(today+"T00:00:00Z")-Date.parse(String(x.as_of)+"T00:00:00Z"))/86400000):null;
    let freshness="fresh";
    if(x.provider==="nepse_index"){
      if(daysOld!==null&&daysOld>4)freshness="stale";
      else if(marketOpen&&ageMinutes!==null&&ageMinutes>60)freshness="stale";
      else if(String(x.as_of)!==today)freshness="latest_trading_session";
      else if(marketOpen&&ageMinutes!==null&&ageMinutes>20)freshness="cached";
      else if(!marketOpen)freshness="latest_trading_session";
    }else{
      if(daysOld!==null&&daysOld>3)freshness="stale";
      else if(String(x.as_of)!==today)freshness="latest_published";
      else if(ageMinutes!==null&&ageMinutes>720)freshness="cached";
    }
    return {...x,age_minutes:ageMinutes,days_old:daysOld,freshness,stale:freshness==="stale"};
  });
  return j({
    items:enriched,
    providers:{
      nrb_forex:{enabled:true,source:"Nepal Rastra Bank official Forex API",cached:true},
      nepse_index:{enabled:true,source:"NEPSE public page with MIT public-mirror fallback",cached:true}
    },
    server_time:new Date().toISOString(),
    browser_contacts_third_party:false
  });
}
async function refreshMarket(){
  const db=admin();if(!db)return {ok:false,error:"backend_not_configured"};
  const now=new Date(),today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  const reports:any[]=[];
  try{
    const from=new Date(Date.parse(today+"T00:00:00Z")-7*86400000).toISOString().slice(0,10);
    const url="https://www.nrb.org.np/api/forex/v1/rates?page=1&per_page=100&from="+from+"&to="+today;
    const r=await fetch(url,{headers:{accept:"application/json","user-agent":"Nepal-Miti/market-cache/1.0"}});
    if(!r.ok)throw new Error("nrb_http_"+r.status);
    const x=await r.json(),payload=(x?.data?.payload||[]).filter((p:any)=>/^\d{4}-\d{2}-\d{2}$/.test(p?.date)&&Array.isArray(p?.rates)).sort((a:any,b:any)=>b.date.localeCompare(a.date))[0];
    if(!payload)throw new Error("nrb_empty");
    const sourceUpdated=payload.modified_on||payload.published_on||null,rows:any[]=[];
    for(const rate of payload.rates){
      const iso=String(rate.currency?.iso3||rate.currency?.ISO3||"").toUpperCase(),per=Number(rate.currency?.unit||1),buy=rate.buy==null?null:Number(String(rate.buy).replace(/,/g,"")),sell=rate.sell==null?null:Number(String(rate.sell).replace(/,/g,""));
      if(!/^[A-Z]{3}$/.test(iso)||(!Number.isFinite(buy)&&!Number.isFinite(sell))||!(per>0))continue;
      rows.push({provider:"nrb_forex",asset:iso,as_of:payload.date,kind:"forex",value:Number.isFinite(sell)?sell:buy,buy:Number.isFinite(buy)?buy:null,sell:Number.isFinite(sell)?sell:null,unit:iso,per,fetched_at:now.toISOString(),source_url:"https://www.nrb.org.np/forex/",source_label:"Nepal Rastra Bank",source_updated_at:sourceUpdated,change:null,percent_change:null});
    }
    const {error}=await db.from("market_snapshots").upsert(rows,{onConflict:"provider,asset,as_of"});
    if(error)throw new Error(error.message);
    reports.push({provider:"nrb_forex",ok:true,asOf:payload.date,rows:rows.length});
  }catch(e){reports.push({provider:"nrb_forex",ok:false,error:String(e?.message||e)})}

  try{
    let nepse:any=null;
    const officialUrl="https://www.nepalstock.com.np/live.jsp";
    try{
      const r=await fetch(officialUrl,{headers:{accept:"text/html","user-agent":"Nepal-Miti/market-cache/1.0"}});
      if(r.ok){
        const raw=await r.text();
        const plain=raw.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ");
        const row=plain.match(/NEPSE Index\s+([\d,]+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)%/i);
        if(row){
          let asOf=today;
          const dm=plain.match(/NEPSE Index\s+([A-Z][a-z]{2})\s+(\d{1,2})\s*\|/);
          if(dm){
            const mm={Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12"}[dm[1]];
            if(mm)asOf=String(now.getUTCFullYear())+"-"+mm+"-"+String(+dm[2]).padStart(2,"0");
          }
          nepse={value:Number(row[1].replace(/,/g,"")),change:Number(row[2]),percent:Number(row[3]),asOf,sourceUrl:officialUrl,sourceLabel:"Nepal Stock Exchange (official public page)",sourceUpdatedAt:now.toISOString()};
        }
      }
    }catch{}
    if(!nepse){
      const mirrorUrl="https://raw.githubusercontent.com/Shubhamnpk/yonepse/main/data/market/indices.json";
      const r=await fetch(mirrorUrl,{headers:{accept:"application/json","user-agent":"Nepal-Miti/market-cache/1.0"}});
      if(!r.ok)throw new Error("nepse_mirror_http_"+r.status);
      const arr=await r.json(),row=Array.isArray(arr)?arr.find((x:any)=>/nepse/i.test(String(x?.index||""))):null;
      if(!row)throw new Error("nepse_mirror_empty");
      const gen=String(row.generatedTime||"");
      const current=Number(row.currentValue??row.close),chg=Number(row.change),pct=Number(row.perChange);
      if(!Number.isFinite(current)||!Number.isFinite(chg)||!Number.isFinite(pct))throw new Error("nepse_mirror_invalid");
      let sourceUpdatedAt:null|string=null;
      if(gen){const ms=Date.parse(gen+(gen.match(/[zZ]|[+-]\d\d:\d\d$/)?"":"+05:45"));if(Number.isFinite(ms))sourceUpdatedAt=new Date(ms).toISOString()}
      nepse={value:current,change:chg,percent:pct,asOf:/^\d{4}-\d{2}-\d{2}/.test(gen)?gen.slice(0,10):today,sourceUrl:"https://shubhamnpk.github.io/yonepse/pages/docs.html",sourceLabel:"YoNEPSE public mirror (MIT; NEPSE-sourced)",sourceUpdatedAt};
    }
    const row={provider:"nepse_index",asset:"NEPSE",as_of:nepse.asOf,kind:"index",value:nepse.value,buy:null,sell:null,unit:"points",per:1,fetched_at:now.toISOString(),source_url:nepse.sourceUrl,change:nepse.change,percent_change:nepse.percent,source_label:nepse.sourceLabel,source_updated_at:nepse.sourceUpdatedAt};
    const {error}=await db.from("market_snapshots").upsert(row,{onConflict:"provider,asset,as_of"});
    if(error)throw new Error(error.message);
    reports.push({provider:"nepse_index",ok:true,asOf:nepse.asOf,value:nepse.value,change:nepse.change,percent:nepse.percent,source:nepse.sourceLabel});
  }catch(e){reports.push({provider:"nepse_index",ok:false,error:String(e?.message||e)})}
  return {ok:reports.some(x=>x.ok),providers:reports,fetchedAt:now.toISOString()};
}

async function cronAuthorized(req:Request){const sec=await runtimeSecret("nm_cron_secret");if(!sec)return false;const auth=req.headers.get("authorization")||"";return auth===`Bearer ${sec}`;}

async function pushSubscribe(req:Request){const db=admin();if(!db)return j({error:"backend_not_configured"},503);const b=await req.json().catch(()=>null);if(!b||!/^[-0-9a-f]{36}$/i.test(String(b.device_id||""))||String(b.device_secret||"").length<16||!/^https:\/\//.test(String(b.subscription?.endpoint||""))||!b.subscription?.keys?.p256dh||!b.subscription?.keys?.auth)return j({error:"invalid_body"},400);const hash=await sha256Hex(String(b.device_secret));const {data:existing}=await db.from("push_subscriptions").select("device_secret_hash").eq("device_id",b.device_id).maybeSingle();if(existing&&existing.device_secret_hash!==hash)return j({error:"forbidden"},403);let user_id=null;try{const u=await currentUser(req);user_id=u.user?.id||null}catch{}const {error}=await db.from("push_subscriptions").upsert({device_id:b.device_id,device_secret_hash:hash,user_id,endpoint:b.subscription.endpoint,keys:{p256dh:b.subscription.keys.p256dh,auth:b.subscription.keys.auth},user_agent_family:String(b.user_agent_family||"other").slice(0,32),timezone:String(b.timezone||"Asia/Kathmandu").slice(0,64),quiet_hours:b.quiet_hours||null},{onConflict:"device_id"});return error?j({error:"save_failed"},500):j({ok:true});}
async function pushDelete(req:Request){const db=admin();if(!db)return j({error:"backend_not_configured"},503);const b=await req.json().catch(()=>null);if(!b)return j({error:"invalid_body"},400);const hash=await sha256Hex(String(b.device_secret||"")),{data}=await db.from("push_subscriptions").select("device_secret_hash").eq("device_id",b.device_id).maybeSingle();if(!data||data.device_secret_hash!==hash)return j({ok:true});await db.from("push_subscriptions").delete().eq("device_id",b.device_id);return j({ok:true,deleted:true});}
async function pushJobs(req:Request){const db=admin();if(!db)return j({error:"backend_not_configured"},503);const b=await req.json().catch(()=>null);if(!b)return j({error:"invalid_body"},400);const hash=await sha256Hex(String(b.device_secret||"")),{data}=await db.from("push_subscriptions").select("device_secret_hash").eq("device_id",b.device_id).maybeSingle();if(!data||data.device_secret_hash!==hash)return j({error:"forbidden"},403);const cats=new Set(["due_date","expiry","family_date","tithi_event","fasting","festival_prep","family_shared"]);const creates=Array.isArray(b.create)?b.create.slice(0,200):[],cancel=Array.isArray(b.cancel)?b.cancel.slice(0,200):[],reschedule=Array.isArray(b.reschedule)?b.reschedule.slice(0,200):[];for(const x of creates){if(!cats.has(x.category)||!/^[A-Za-z0-9_-]{16,64}$/.test(String(x.job_ref||""))||!Number.isFinite(Date.parse(x.fire_at_utc)))return j({error:"invalid_job"},400);}if(cancel.length)await db.from("notification_jobs").delete().eq("device_id",b.device_id).in("job_ref",cancel);for(const x of reschedule)if(/^[A-Za-z0-9_-]{16,64}$/.test(String(x.job_ref||""))&&Number.isFinite(Date.parse(x.fire_at_utc)))await db.from("notification_jobs").update({fire_at_utc:x.fire_at_utc,status:"pending",attempts:0,next_attempt_at:null}).eq("device_id",b.device_id).eq("job_ref",x.job_ref);if(creates.length){const {error}=await db.from("notification_jobs").upsert(creates.map((x:any)=>({device_id:b.device_id,job_ref:x.job_ref,fire_at_utc:x.fire_at_utc,category:x.category})),{onConflict:"device_id,job_ref"});if(error)return j({error:"save_jobs_failed"},500);}return j({ok:true,created:creates.length,cancelled:cancel.length,rescheduled:reschedule.length});}

async function hmac(key:Uint8Array,data:Uint8Array){const k=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",k,data));}
function concat(...a:Uint8Array[]){const n=a.reduce((s,x)=>s+x.length,0),o=new Uint8Array(n);let p=0;for(const x of a){o.set(x,p);p+=x.length}return o;}
async function encryptPayload(plain:Uint8Array,sub:any){const ua=fromB64u(sub.keys.p256dh),auth=fromB64u(sub.keys.auth);const sender=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]) as CryptoKeyPair,sp=new Uint8Array(await crypto.subtle.exportKey("raw",sender.publicKey)),uak=await crypto.subtle.importKey("raw",ua,{name:"ECDH",namedCurve:"P-256"},false,[]),shared=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:uak},sender.privateKey,256)),prkKey=await hmac(auth,shared),ikm=await hmac(prkKey,concat(te.encode("WebPush: info\0"),ua,sp,new Uint8Array([1]))),salt=crypto.getRandomValues(new Uint8Array(16)),prk=await hmac(salt,ikm),cek=(await hmac(prk,concat(te.encode("Content-Encoding: aes128gcm\0"),new Uint8Array([1])))).slice(0,16),nonce=(await hmac(prk,concat(te.encode("Content-Encoding: nonce\0"),new Uint8Array([1])))).slice(0,12),aes=await crypto.subtle.importKey("raw",cek,{name:"AES-GCM"},false,["encrypt"]),ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,tagLength:128},aes,concat(plain,new Uint8Array([2])))),head=new Uint8Array(21+sp.length);head.set(salt,0);new DataView(head.buffer).setUint32(16,4096,false);head[20]=sp.length;head.set(sp,21);return concat(head,ct);}
async function vapidAuth(endpoint:string,subject:string,keys:any){const aud=new URL(endpoint).origin,header=b64u(te.encode(JSON.stringify({typ:"JWT",alg:"ES256"}))),claims=b64u(te.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+43200,sub:subject}))),pub=fromB64u(keys.publicKey),jwk={kty:"EC",crv:"P-256",d:keys.privateKey,x:b64u(pub.slice(1,33)),y:b64u(pub.slice(33,65)),ext:false},key=await crypto.subtle.importKey("jwk",jwk,{name:"ECDSA",namedCurve:"P-256"},false,["sign"]),sig=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,te.encode(header+"."+claims)));return `vapid t=${header}.${claims}.${b64u(sig)}, k=${keys.publicKey}`;}
async function sendPush(sub:any,payload:any,keys:any){const body=await encryptPayload(te.encode(JSON.stringify(payload)),sub),subject=String(await runtimeSecret("nm_vapid_subject")||"https://patro-blush.vercel.app");return fetch(sub.endpoint,{method:"POST",headers:{Authorization:await vapidAuth(sub.endpoint,subject,keys),"Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream",TTL:"21600",Urgency:"normal"},body});}
async function dispatchPush(){const db=admin();if(!db)return {ok:false,error:"backend_not_configured"};const keys=await vapidKeys(),now=new Date().toISOString(),{data:jobs,error}=await db.from("notification_jobs").select("*").eq("status","pending").lte("fire_at_utc",now).or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`).order("fire_at_utc").limit(200);if(error)return {ok:false,error:error.message};const report={sent:0,retried:0,failed:0,gone:0,skipped:0};for(const job of jobs||[]){const {data:sub}=await db.from("push_subscriptions").select("*").eq("device_id",job.device_id).maybeSingle();if(!sub){await db.from("notification_jobs").update({status:"failed",attempts:job.attempts+1}).eq("id",job.id);report.skipped++;continue}try{const r=await sendPush({endpoint:sub.endpoint,keys:sub.keys},{v:1,job_ref:job.job_ref,category:job.category},keys),attempts=job.attempts+1;if(r.ok){await db.from("notification_jobs").update({status:"sent",attempts}).eq("id",job.id);await db.from("push_subscriptions").update({last_success_at:now}).eq("device_id",job.device_id);report.sent++;}else if(r.status===404||r.status===410){await db.from("push_subscriptions").delete().eq("device_id",job.device_id);report.gone++;}else if((r.status===429||r.status>=500)&&attempts<5){await db.from("notification_jobs").update({attempts,next_attempt_at:new Date(Date.now()+Math.min(21600,60*2**(attempts-1))*1000).toISOString()}).eq("id",job.id);report.retried++;}else{await db.from("notification_jobs").update({status:"failed",attempts}).eq("id",job.id);report.failed++;}}catch{const attempts=job.attempts+1;if(attempts<5){await db.from("notification_jobs").update({attempts,next_attempt_at:new Date(Date.now()+Math.min(21600,60*2**(attempts-1))*1000).toISOString()}).eq("id",job.id);report.retried++;}else{await db.from("notification_jobs").update({status:"failed",attempts}).eq("id",job.id);report.failed++;}}}return {ok:true,...report};}

async function familyApi(req:Request,path:string){const {db,user}=await currentUser(req);if(!user)return j({error:"authentication_required"},401);if(path==="/api/family/state"&&req.method==="GET"){const {data:memberships,error}=await db.from("family_members").select("family_id,role,display_name,timezone,families(id,name,created_at)").eq("user_id",user.id);if(error)return j({error:error.message},400);const ids=(memberships||[]).map((x:any)=>x.family_id);let events:any[]=[];if(ids.length){const r=await db.from("shared_events").select("*").in("family_id",ids).order("updated_at",{ascending:false});events=r.data||[]}return j({user:{id:user.id,email:user.email},memberships:memberships||[],events});}
if(path==="/api/family/create"&&req.method==="POST"){const b=await req.json().catch(()=>({})),{data,error}=await db.rpc("create_family",{p_name:String(b.name||"मेरो परिवार").slice(0,80),p_display_name:String(b.display_name||"").slice(0,60)||null,p_timezone:String(b.timezone||"Asia/Kathmandu").slice(0,64)});return error?j({error:error.message},400):j({ok:true,family_id:data});}
if(path==="/api/family/invite"&&req.method==="POST"){const b=await req.json().catch(()=>({})),fid=String(b.family_id||""),role=b.role==="editor"?"editor":"viewer",raw=b64u(crypto.getRandomValues(new Uint8Array(24))),hash=await sha256Hex(raw),expires=new Date(Date.now()+Math.min(30,Math.max(1,Number(b.days||7)))*86400000).toISOString();const {error}=await db.from("family_invites").insert({family_id:fid,token_hash:hash,role,expires_at:expires,max_uses:Math.min(50,Math.max(1,Number(b.max_uses||5))),created_by:user.id});return error?j({error:error.message},400):j({ok:true,token:raw,url:`/family/join?token=${raw}`,expires_at:expires});}
if(path==="/api/family/join"&&req.method==="POST"){const b=await req.json().catch(()=>({})),hash=await sha256Hex(String(b.token||""));const {data,error}=await db.rpc("accept_family_invite",{p_token_hash:hash,p_display_name:String(b.display_name||"").slice(0,60)||null,p_timezone:String(b.timezone||"Asia/Kathmandu").slice(0,64)});return error?j({error:error.message},400):j({ok:true,family_id:data});}
if(path==="/api/family/event"&&req.method==="POST"){const b=await req.json().catch(()=>({}));const row={family_id:b.family_id,kind:b.kind||"custom",anchor:b.anchor||{},rule:b.rule||"udaya",adhik_policy:b.adhik_policy||"nija_month",location_policy:b.location_policy||"kathmandu_panchang",title_ne:String(b.title_ne||"").slice(0,120)||null,title_en:String(b.title_en||"").slice(0,120)||null,notes:String(b.notes||"").slice(0,2000)||null,reminder_offsets:Array.isArray(b.reminder_offsets)?b.reminder_offsets:[7,1],created_by:user.id,updated_by:user.id};const {data,error}=await db.from("shared_events").insert(row).select().single();return error?j({error:error.message},400):j({ok:true,event:data});}
return null;}

async function myData(req:Request){const {db,user}=await currentUser(req);if(!user)return j({error:"authentication_required"},401);if(req.method==="GET"){const {data,error}=await db.rpc("my_data_export");return error?j({error:error.message},400):j(data);}if(req.method==="DELETE"){const {error}=await db.rpc("my_data_delete");return error?j({error:error.message},400):j({ok:true,deleted:true});}return j({error:"method_not_allowed"},405);}

function icsEscape(s:unknown){return String(s??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");}
function ics(items:any[]){const a=["BEGIN:VCALENDAR","VERSION:2.0","CALSCALE:GREGORIAN","PRODID:-//Nepal Miti//Calendar//NE"];for(const x of items)a.push("BEGIN:VEVENT","UID:"+icsEscape(x.uid),"DTSTART;VALUE=DATE:"+String(x.date).replace(/-/g,""),"SUMMARY:"+icsEscape(x.title),...(x.url?["URL:"+x.url]:[]),"END:VEVENT");a.push("END:VCALENDAR");return a.join("\r\n")+"\r\n";}
async function holidayIcs(u:URL){const db=admin();if(!db)return new Response("",{status:503});const y=Number(u.searchParams.get("bsYear")||2083),{data}=await db.from("holidays").select("id,ad_date,name_ne,source_url").eq("status","announced").like("bs_date",`${y}-%`).order("ad_date");return new Response(ics((data||[]).map((x:any)=>({uid:`holiday-${x.id}@nepalmiti`,date:x.ad_date,title:x.name_ne,url:x.source_url}))),{headers:ICS_HEADERS});}
async function personalIcs(token:string){const db=admin();if(!db)return new Response("",{status:503});const hash=await sha256Hex(token),{data:t}=await db.from("personal_ics_tokens").select("user_id").eq("token_hash",hash).maybeSingle();if(!t)return new Response("Not found",{status:404});const {data:events}=await db.from("shared_events").select("id,kind,anchor,title_ne,title_en").eq("created_by",t.user_id).limit(1000);const items=[];for(const e of events||[]){const d=e.anchor?.adDate||e.anchor?.ad_date||e.anchor?.date;if(/^\d{4}-\d{2}-\d{2}$/.test(String(d||"")))items.push({uid:`personal-${e.id}@nepalmiti`,date:d,title:e.title_ne||e.title_en||e.kind});}return new Response(ics(items),{headers:{...ICS_HEADERS,"cache-control":"private, max-age=60"}});}
async function icsToken(req:Request){const {db,user}=await currentUser(req);if(!user)return j({error:"authentication_required"},401);if(req.method==="POST"){const raw=b64u(crypto.getRandomValues(new Uint8Array(24))),hash=await sha256Hex(raw);await db.from("personal_ics_tokens").delete().eq("user_id",user.id);const {error}=await db.from("personal_ics_tokens").insert({user_id:user.id,token_hash:hash});return error?j({error:error.message},400):j({ok:true,token:raw,url:`/ical/u/${raw}`});}if(req.method==="DELETE"){await db.from("personal_ics_tokens").delete().eq("user_id",user.id);return j({ok:true});}return j({error:"method_not_allowed"},405);}

function openApi(){return {openapi:"3.1.0",info:{title:"Nepal Miti Public API",version:"1.0.0",description:"BS/AD, Panchang, tithi recurrence, festivals, holidays and market data. Public factual responses preserve trust/provenance fields."},servers:[{url:"https://patro-blush.vercel.app"}],paths:{"/api/v1/today":{get:{summary:"Today's Nepal Miti snapshot"}},"/api/v1/convert":{get:{summary:"Convert BS and AD"}},"/api/v1/calendar/{bsYear}/{bsMonth}":{get:{summary:"BS month"}},"/api/v1/panchang":{get:{summary:"Daily Panchang"}},"/api/v1/tithi/next":{get:{summary:"Next lunar-tithi occurrences"}},"/api/v1/festivals":{get:{summary:"Festival list"}},"/api/v1/holidays":{get:{summary:"Source-linked holiday list"}},"/api/v1/market/latest":{get:{summary:"Cached official market snapshots"}}}};}

const CSS=`:root{--g:#176f3b;--ink:#17231b;--muted:#68756c;--line:#dce6df;--soft:#f4f8f5;--warn:#95620b;--red:#a53232}*{box-sizing:border-box}body{margin:0;background:#f6f8f6;color:var(--ink);font-family:Inter,"Noto Sans Devanagari",system-ui,sans-serif}.wrap{width:min(1120px,calc(100% - 24px));margin:auto}.top{position:sticky;top:0;background:#ffffffed;border-bottom:1px solid var(--line);backdrop-filter:blur(12px);z-index:10}.nav{min-height:64px;display:flex;align-items:center;gap:12px;justify-content:space-between}.brand{font-weight:900}.brand small{display:block;color:var(--muted);font-weight:600}.tabs{display:flex;gap:6px;overflow:auto;padding:8px 0}.tabs a{white-space:nowrap;text-decoration:none;color:var(--ink);border:1px solid var(--line);background:#fff;padding:8px 10px;border-radius:10px;font-size:13px}.tabs a.active{background:var(--g);border-color:var(--g);color:#fff}main{padding:22px 0 70px}.hero{background:linear-gradient(135deg,#0d5c31,#22854a);color:#fff;border-radius:22px;padding:20px;display:flex;gap:20px;align-items:flex-end;justify-content:space-between}.hero h1{margin:3px 0;font-size:clamp(30px,5vw,52px)}.hero p{margin:4px 0;max-width:760px;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.card{background:#fff;border:1px solid var(--line);border-radius:17px;padding:16px;box-shadow:0 8px 25px #163c2410}.card h2,.card h3{margin:0 0 8px}.muted{color:var(--muted);font-size:12px;line-height:1.5}.notice{border:1px dashed #bad2c1;background:#f7fbf8;border-radius:12px;padding:10px;line-height:1.5;font-size:12px}.warn{border-color:#ddc68e;background:#fffaf0;color:#6d4d0b}.form{display:grid;grid-template-columns:1fr 1fr;gap:9px}.full{grid-column:1/-1}input,select,textarea,button{font:inherit}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:9px;background:#fff}.go,.ghost{border:0;border-radius:10px;padding:9px 12px;cursor:pointer;font-weight:800}.go{background:var(--g);color:#fff}.ghost{border:1px solid var(--line);background:#fff;color:var(--ink)}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.list{display:grid;gap:7px;margin-top:8px}.item{border:1px solid var(--line);border-radius:11px;padding:9px}.item b{display:block}.item small{color:var(--muted)}.state{font-size:22px;font-weight:900}.state.open{color:var(--g)}.state.closed{color:var(--red)}.state.unknown{color:var(--warn)}.clock-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.clock{background:var(--soft);border-radius:11px;padding:10px}.clock b{display:block;font-size:18px}.canvas-wrap{background:#eef2ef;border-radius:13px;padding:10px;overflow:auto}canvas{max-width:100%;height:auto;background:#fff;border-radius:9px;display:block}.footer{margin-top:20px;text-align:center;color:var(--muted);font-size:11px}.ok{color:var(--g);font-weight:800}.danger{color:var(--red);font-weight:800}code{background:#eef3ef;padding:2px 5px;border-radius:5px}.api{font-family:ui-monospace,monospace;font-size:12px}.hidden{display:none!important}@media(max-width:780px){.grid,.form{grid-template-columns:1fr}.full{grid-column:1}.hero{align-items:flex-start;flex-direction:column}.clock-grid{grid-template-columns:1fr}.nav{align-items:flex-start;flex-direction:column;padding-top:8px}.tabs{width:100%}}`;

const COMMON=`const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),BASE=location.hostname.endsWith('supabase.co')?(location.pathname.match(/\\/functions\\/v1\\/[^/]+/)||[''])[0]:'',api=async(p,o={})=>{const h={'content-type':'application/json',...(o.headers||{})};try{const s=JSON.parse(localStorage.getItem('nepalmiti.session.v1')||'null');if(s?.access_token)h.authorization='Bearer '+s.access_token}catch{}const r=await fetch(BASE+p,{...o,headers:h}),x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||x.message||('HTTP '+r.status));return x},npt=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day},uuid=()=>crypto.randomUUID(),rand=()=>{const a=crypto.getRandomValues(new Uint8Array(24));let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')};`;

const SCRIPTS:Record<string,string>={
"aaja":`${COMMON}(async()=>{const d=npt();q('#date').value=d;async function load(){const x=await api('/api/date?ad='+q('#date').value),h=await api('/api/bundle/holiday-status?ad='+q('#date').value+'&bsYear='+x.bs.year+'&audience='+encodeURIComponent(q('#aud').value)+'&district='+encodeURIComponent(q('#district').value));const t={closed:'बन्द',partial:'आंशिक',weekly_off:'साप्ताहिक बिदा',open:'खुला',unknown:'पुष्टि अपुग'}[h.state]||h.state;q('#out').innerHTML='<div class="state '+(h.state==='open'?'open':h.state==='unknown'?'unknown':'closed')+'>'+esc(t)+'</div><p>'+esc(x.bs.key)+' · '+esc(x.weekday.ne)+' · '+esc(x.panchang.tithi.ne)+'</p>'+(h.holidays?.length?'<div class=list>'+h.holidays.map(z=>'<div class=item><b>'+esc(z.name_ne||z.name_en)+'</b><small>'+esc(z.scope_type)+' · '+(z.scope_verified?'scope verified':'scope needs verification')+'</small><br><a href="'+esc(z.source_url)+'" target=_blank rel=noreferrer>स्रोत</a></div>').join('')+'</div>':'<p class=muted>'+(h.covered?'मिल्ने सार्वजनिक बिदा भेटिएन।':'पूर्ण coverage पुष्टि नभएकाले “खुला” अनुमान गरिएको छैन।')+'</p>')};q('#go').onclick=load;q('#aud').onchange=load;q('#district').onchange=load;await load()})().catch(e=>q('#out').textContent=e.message);`,
"tithi":`${COMMON}
const KEY='nepalmiti.bundle.tithi.v2';
const MONTHS=[['chaitra','चैत्र'],['vaisakha','वैशाख'],['jyeshtha','ज्येष्ठ'],['ashadha','आषाढ'],['shravana','श्रावण'],['bhadrapada','भाद्रपद'],['ashvina','आश्विन'],['kartika','कार्तिक'],['margashirsha','मार्गशीर्ष'],['pausha','पौष'],['magha','माघ'],['phalguna','फाल्गुण']];
const KINDS={shraddha:'वार्षिक श्राद्ध',tithi_birthday:'तिथि जन्मोत्सव',custom:'अन्य तिथि'};
const RULES={udaya:'उदय तिथि',aparahna:'अपराह्न',madhyahna:'मध्याह्न',sayahna:'सायाह्न',pradosha:'प्रदोष',nishitha:'निशीथ',arunodaya:'अरुणोदय',official_only:'आधिकारिक पात्रो मात्र'};
const DEF={shraddha:'aparahna',tithi_birthday:'udaya',custom:'udaya'};
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const write=x=>localStorage.setItem(KEY,JSON.stringify(x));
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const prep=(date)=>[
 {id:uuid(),title:'पुरोहित/पण्डितसँग मिति पुष्टि',due:addDays(date,-30),done:false},
 {id:uuid(),title:'परिवारलाई जानकारी',due:addDays(date,-15),done:false},
 {id:uuid(),title:'यात्रा/बिदा योजना',due:addDays(date,-15),done:false},
 {id:uuid(),title:'पूजा सामग्री सूची',due:addDays(date,-7),done:false},
 {id:uuid(),title:'भोजन/प्रसाद योजना',due:addDays(date,-7),done:false},
 {id:uuid(),title:'आवश्यक सामग्री खरिद',due:addDays(date,-3),done:false},
 {id:uuid(),title:'पुरोहितलाई अन्तिम सम्झना',due:addDays(date,-1),done:false},
 {id:uuid(),title:'अन्तिम तयारी जाँच',due:addDays(date,-1),done:false}
];
q('#month').innerHTML=MONTHS.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('');
q('#kind').onchange=()=>{q('#rule').value=DEF[q('#kind').value]||'udaya'};
q('#mode').onchange=()=>{q('#directBox').classList.toggle('hidden',q('#mode').value!=='direct');q('#dateBox').classList.toggle('hidden',q('#mode').value!=='fromDate')};
q('#cal').onchange=()=>{q('#dateHint').textContent=q('#cal').value==='bs'?'वि.सं. YYYY-MM-DD':'ई.सं. YYYY-MM-DD'};
q('#date').value=npt();
async function derive(){
  q('#derived').textContent='गणना हुँदैछ…';
  try{
    let ad=q('#date').value;
    if(q('#cal').value==='bs'){
      const cv=await api('/api/v1/convert?bs='+encodeURIComponent(ad));
      ad=cv.ad;
    }
    const z=await api('/api/v1/tithi/derive?ad='+encodeURIComponent(ad));
    q('#month').value=String(z.anchor.month||'').toLowerCase();
    q('#paksha').value=z.anchor.paksha;
    q('#tithiNo').value=z.anchor.tithi;
    q('#system').value=z.anchor.monthSystem||'amanta';
    q('#derived').innerHTML='<b>'+esc(z.label_ne)+'</b><br><small>'+esc(z.bs?.key||'')+' · '+esc(z.ad||ad)+'</small>';
    q('#mode').value='direct';q('#mode').onchange();
  }catch(e){q('#derived').textContent='निकाल्न सकिएन: '+e.message}
}
q('#derive').onclick=derive;
async function loadNext(x,i){
  const el=q('#occ-'+i); if(!el)return;
  el.textContent='आउँदा मिति गणना हुँदैछ…';
  try{
    const url='/api/v1/tithi/next?month='+encodeURIComponent(x.month)+'&paksha='+encodeURIComponent(x.paksha)+'&tithi='+encodeURIComponent(x.tithi)+'&rule='+encodeURIComponent(x.rule)+'&system='+encodeURIComponent(x.system||'purnimanta')+'&adhikPolicy='+encodeURIComponent(x.adhikPolicy||'nija_month')+'&from='+encodeURIComponent(npt())+'&count=3';
    const z=await api(url);
    const items=z.items||z.occurrences||[];
    if(!items.length){el.innerHTML='<span class=muted>Coverage भित्र अर्को occurrence भेटिएन।</span>';return}
    el.innerHTML=items.map(o=>'<div class=item style="margin-top:6px"><b>'+esc(o.bsDate?.key||'')+' · '+esc(o.adDate||'')+'</b><small>'+esc(o.explanation?.ne||'')+'</small><span class="'+(o.status==='ambiguous'?'danger':'ok')+'">'+esc(o.status||'computed')+'</span></div>').join('');
    if(x.kind==='shraddha'&&(!x.checklist||!x.checklist.length)&&items[0]?.adDate){
      const a=read(),p=a.find(y=>y.id===x.id);if(p){p.checklist=prep(items[0].adDate);write(a);render()}
    }
  }catch(e){el.innerHTML='<span class=danger>गणना असफल: '+esc(e.message)+'</span>'}
}
function render(){
  const a=read();
  q('#saved').innerHTML=a.length?a.map((x,i)=>{
    const done=(x.checklist||[]).filter(t=>t.done).length,total=(x.checklist||[]).length;
    const checklist=total?'<details><summary>श्राद्ध तयारी '+done+'/'+total+'</summary><div class=list>'+(x.checklist||[]).map(t=>'<label class=item><input type=checkbox data-task="'+esc(t.id)+'" data-event="'+esc(x.id)+'" '+(t.done?'checked':'')+'> '+esc(t.title)+'<small> · '+esc(t.due)+'</small></label>').join('')+'</div></details>':'';
    return '<div class=item><div class=row><div style="flex:1"><b>'+esc(x.title)+'</b><small>'+esc(KINDS[x.kind]||x.kind)+' · '+esc(x.month)+' '+esc(x.paksha)+' '+esc(x.tithi)+' · '+esc(RULES[x.rule]||x.rule)+' · '+esc(x.adhikPolicy||'nija_month')+'</small></div><button class=ghost data-del="'+esc(x.id)+'">हटाउनुहोस्</button></div><div id="occ-'+i+'" class=muted></div>'+checklist+'</div>';
  }).join(''):'<p class=muted>अहिलेसम्म तिथि सम्झना छैन।</p>';
  a.forEach((x,i)=>loadNext(x,i));
}
q('#save').onclick=async()=>{
  const kind=q('#kind').value;
  const a=read();
  const item={id:uuid(),title:q('#title').value.trim()||KINDS[kind],kind,month:q('#month').value,paksha:q('#paksha').value,tithi:+q('#tithiNo').value,system:q('#system').value,rule:q('#rule').value,adhikPolicy:q('#adhik').value,locationPolicy:q('#location').value,createdAt:new Date().toISOString(),source:q('#source').value||'direct'};
  a.push(item);write(a);q('#title').value='';q('#status').textContent='सुरक्षित भयो। अर्को तीन occurrence गणना हुँदैछ…';render()
};
q('#saved').onclick=e=>{
  const del=e.target.closest('[data-del]');
  if(del){write(read().filter(x=>x.id!==del.dataset.del));render();return}
  const ck=e.target.closest('[data-task]');
  if(ck){const a=read(),ev=a.find(x=>x.id===ck.dataset.event),t=ev?.checklist?.find(x=>x.id===ck.dataset.task);if(t){t.done=ck.checked;write(a);render()}}
};
q('#kind').onchange();q('#mode').onchange();render();
`,
"diaspora":`${COMMON}
const CITY=[['Tokyo','Asia/Tokyo'],['Sydney','Australia/Sydney'],['London','Europe/London'],['New York','America/New_York'],['Toronto','America/Toronto'],['Dubai','Asia/Dubai'],['Doha','Asia/Qatar'],['Seoul','Asia/Seoul'],['Delhi','Asia/Kolkata'],['Kathmandu','Asia/Kathmandu']];
const KEY='nepalmiti.bundle.diaspora.tz.v2';
const valid=tz=>{try{new Intl.DateTimeFormat('en',{timeZone:tz}).format();return true}catch{return false}};
const fmt=(d,tz,full=false)=>new Intl.DateTimeFormat('ne-NP',{timeZone:tz,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',...(full?{year:'numeric'}:{})}).format(d);
const parts=(d,tz)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
const minOf=(d,tz)=>{const p=parts(d,tz);return +p.hour*60+(+p.minute)};
const inRange=(m,s,e)=>{const a=s.split(':').map(Number),b=e.split(':').map(Number),x=a[0]*60+a[1],y=b[0]*60+b[1];return x<=y?(m>=x&&m<=y):(m>=x||m<=y)};
let tz=localStorage.getItem(KEY)||Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Kathmandu';if(!valid(tz))tz='Asia/Kathmandu';
q('#city').innerHTML=CITY.map((x,i)=>'<option value="'+x[1]+'">'+x[0]+' · '+x[1]+'</option>').join('')+'<option value="__custom">अन्य IANA timezone…</option>';
q('#customTz').value=tz;
if(CITY.some(x=>x[1]===tz))q('#city').value=tz;else q('#city').value='__custom';
function setTz(v){if(!valid(v)){q('#tzStatus').textContent='Timezone मान्य छैन। उदाहरण: America/Chicago';return}tz=v;localStorage.setItem(KEY,tz);q('#customTz').value=tz;q('#tzStatus').textContent='';draw()}
q('#city').onchange=()=>{if(q('#city').value!=='__custom')setTz(q('#city').value)};
q('#customTz').onchange=()=>setTz(q('#customTz').value.trim());
function callWindows(){
  const now=new Date(),third=q('#third').value.trim(),zones=[{label:'म',tz,start:q('#myStart').value,end:q('#myEnd').value},{label:'घर',tz:'Asia/Kathmandu',start:q('#homeStart').value,end:q('#homeEnd').value}];
  if(third&&valid(third))zones.push({label:'तेस्रो',tz:third,start:'07:00',end:'22:00'});
  const out=[];let last=0;
  for(let i=0;i<4*48&&out.length<4;i++){
    const d=new Date(now.getTime()+i*1800000);
    if(zones.every(z=>inRange(minOf(d,z.tz),z.start,z.end))&&d.getTime()-last>=90*60000){out.push(d);last=d.getTime()}
  }
  return out;
}
async function festivals(){
  try{
    const today=await api('/api/v1/today'),year=today.bs?.year||2083,key=today.bs?.key||'',f=await api('/api/v1/festivals?year='+year),cand=(f.events||[]).filter(x=>x.bs&&x.bs>=key&&(x.ne||x.en)).slice(0,8),out=[];
    for(const x of cand){try{const cv=await api('/api/v1/convert?bs='+encodeURIComponent(x.bs));out.push({...x,ad:cv.ad})}catch{}}
    const now=Date.now();
    q('#festivals').innerHTML=out.length?out.map(x=>{const t=Date.parse(x.ad+'T00:00:00+05:45'),days=Math.max(0,Math.ceil((t-now)/86400000));return '<div class=item><b>'+esc(x.ne||x.en)+'</b><small>'+esc(x.bs)+' · '+esc(x.ad)+' · '+days+' दिन बाँकी · '+esc(x.verification_status||'')+'</small></div>'}).join(''):'<p class=muted>आउँदा verified पर्व भेटिएन।</p>';
  }catch(e){q('#festivals').innerHTML='<p class=danger>पर्व लोड भएन: '+esc(e.message)+'</p>'}
}
async function saits(){
  try{const x=await api('/api/bundle/saits?from='+npt()+'&limit=12');q('#saits').innerHTML=x.items?.length?x.items.map(s=>'<div class=item><b>'+esc(s.key)+'</b><small>'+esc(s.fact_date)+' · '+esc(s.location_key)+' · '+esc(s.source_title||'स्रोत')+'</small>'+(s.source_url?'<a target=_blank rel=noreferrer href="'+esc(s.source_url)+'"> स्रोत</a>':'')+'</div>').join(''):'<p class=muted>हाल sourced future साइत छैन। एपले साइत बनाउँदैन।</p>'}catch(e){q('#saits').innerHTML='<p class=danger>'+esc(e.message)+'</p>'}
}
function draw(){
  const now=new Date(),w=callWindows();
  q('#clocks').innerHTML='<div class=clock><small>तपाईं</small><b>'+esc(fmt(now,tz,true))+'</b></div><div class=clock><small>नेपाल</small><b>'+esc(fmt(now,'Asia/Kathmandu',true))+'</b></div><div class=clock><small>DST-aware zone</small><b>'+esc(tz)+'</b></div>';
  q('#calls').innerHTML=w.length?w.map(d=>'<div class=item><b>'+esc(fmt(d,tz))+'</b><small>तपाईं · नेपाल '+esc(fmt(d,'Asia/Kathmandu'))+(q('#third').value.trim()&&valid(q('#third').value.trim())?' · तेस्रो '+esc(fmt(d,q('#third').value.trim())):'')+'</small></div>').join(''):'<p class=muted>दिइएको awake window मा overlap भेटिएन।</p>';
}
['#myStart','#myEnd','#homeStart','#homeEnd','#third'].forEach(s=>q(s).onchange=draw);
draw();festivals();saits();setInterval(draw,30000);


// Cached market panel: browser contacts only Nepal Miti /api/v1/market/latest.
(function(){
  const main=document.querySelector('main.wrap'),foot=document.querySelector('.footer');if(!main||!foot)return;
  const box=document.createElement('div');box.className='grid';box.id='nmMarketGrid';
  box.innerHTML='<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">NEPSE Index</h2><p class="muted" style="margin:3px 0 0">Server-cached market snapshot</p></div><span id="nepseFresh" class="badge">लोड हुँदैछ…</span></div><div id="nepseOut" style="margin-top:14px"></div></div><div class="card"><div class="row" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">NRB Forex</h2><p class="muted" style="margin:3px 0 0">USD · EUR · GBP · JPY · INR</p></div><button id="forexToggle" class="ghost" type="button">सबै मुद्रा</button></div><div id="forexOut" style="margin-top:12px"></div></div>';
  main.insertBefore(box,foot);
  const nf=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const dt=x=>{try{return new Intl.DateTimeFormat('ne-NP',{timeZone:'Asia/Kathmandu',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(x))}catch{return String(x||'—')}};
  const status=(x)=>x?.freshness==='stale'?'पुरानो डेटा':x?.freshness==='latest_trading_session'?'पछिल्लो कारोबार दिन':x?.freshness==='latest_published'?'पछिल्लो प्रकाशित':x?.freshness==='cached'?'क्यास गरिएको':'अद्यावधिक';
  let all=false,market=null;
  function forexRows(items){
    const order=['USD','EUR','GBP','JPY','INR'],base=items.filter(x=>x.provider==='nrb_forex'),rows=(all?base:order.map(k=>base.find(x=>x.asset===k)).filter(Boolean));
    if(!rows.length)return '<p class="muted">दर उपलब्ध छैन।</p>';
    return '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:7px">मुद्रा</th><th style="text-align:right;padding:7px">किन्ने</th><th style="text-align:right;padding:7px">बेच्ने</th></tr></thead><tbody>'+rows.map(x=>'<tr><td style="padding:7px;border-top:1px solid #edf2ee"><b>'+esc(x.asset)+'</b> <small class="muted">'+(Number(x.per)!==1?'('+esc(x.per)+' units)':'')+'</small></td><td style="text-align:right;padding:7px;border-top:1px solid #edf2ee">'+(x.buy==null?'—':nf.format(+x.buy))+'</td><td style="text-align:right;padding:7px;border-top:1px solid #edf2ee">'+(x.sell==null?'—':nf.format(+x.sell))+'</td></tr>').join('')+'</tbody></table></div><p class="muted">स्रोत: '+esc(rows[0].source_label||'Nepal Rastra Bank')+' · '+status(rows[0])+' · '+esc(rows[0].as_of)+' · fetched '+esc(dt(rows[0].fetched_at))+'</p>';
  }
  function paint(m){
    market=m;const items=m.items||[],n=items.find(x=>x.provider==='nepse_index'&&x.asset==='NEPSE'),fo=q('#forexOut'),no=q('#nepseOut'),fresh=q('#nepseFresh');
    if(n){
      const ch=Number(n.change||0),pc=Number(n.percent_change||0),sign=ch>0?'+':'',tone=ch>0?'#176f3b':ch<0?'#b22':'#68756c';
      fresh.textContent=status(n);fresh.style.background=n.stale?'#fff3cd':'#e8f5ec';fresh.style.color=n.stale?'#8a5b00':'#176f3b';
      no.innerHTML='<div style="display:flex;align-items:end;gap:12px;flex-wrap:wrap"><strong style="font-size:34px;line-height:1">'+nf.format(+n.value)+'</strong><b style="color:'+tone+'">'+sign+nf.format(ch)+' · '+sign+nf.format(pc)+'%</b></div><p style="margin:10px 0 5px"><b>कारोबार मिति:</b> '+esc(n.as_of)+'</p><p class="muted" style="margin:0">स्रोत: '+esc(n.source_label||'NEPSE')+' · source updated '+esc(dt(n.source_updated_at||n.fetched_at))+' · cache fetched '+esc(dt(n.fetched_at))+'</p>';
    }else{fresh.textContent='उपलब्ध छैन';no.innerHTML='<p class="muted">NEPSE snapshot उपलब्ध छैन। अर्को server refresh मा पुनः प्रयास हुन्छ।</p>'}
    fo.innerHTML=forexRows(items);
  }
  q('#forexToggle').onclick=()=>{all=!all;q('#forexToggle').textContent=all?'मुख्य ५':'सबै मुद्रा';if(market)paint(market)};
  async function loadMarket(){try{paint(await api('/api/v1/market/latest'))}catch(e){q('#nepseFresh').textContent='अस्थायी समस्या';q('#nepseOut').innerHTML='<p class="muted">क्यास बजार डेटा अहिले लोड हुन सकेन।</p>';q('#forexOut').innerHTML='<p class="muted">NRB दर अहिले लोड हुन सकेन।</p>'}}
  loadMarket();setInterval(loadMarket,300000);
})();
`,
"card":`${COMMON}
const T=[
 {k:'dashain',ne:'विजया दशमी',en:'Vijaya Dashami',a:'#c0392b',b:'#ffd27a',p:['विजया दशमीको हार्दिक मंगलमय शुभकामना! सुख, शान्ति र समृद्धि रहोस्।','Warm wishes for Vijaya Dashami — may peace and prosperity be with you.']},
 {k:'tihar',ne:'शुभ दीपावली',en:'Happy Tihar',a:'#ffb400',b:'#5a1e5c',p:['दीपावलीको उज्यालोले जीवन उज्यालो बनाओस्। शुभ तिहार!','May the lights of Tihar brighten your life.']},
 {k:'chhath',ne:'छठ पर्वको शुभकामना',en:'Happy Chhath',a:'#f57c00',b:'#ffc58a',p:['सूर्यदेवको आशीर्वादले परिवारमा सुख-शान्ति रहोस्।','May the Sun’s blessings bring peace to your family.']},
 {k:'nepal_sambat',ne:'नेपाल संवत् नयाँ वर्ष',en:'Nepal Sambat New Year',a:'#b71c1c',b:'#f7d9a8',p:['नेपाल संवत् नयाँ वर्षको हार्दिक शुभकामना!','Happy Nepal Sambat New Year!']},
 {k:'bs_new_year',ne:'नयाँ वर्षको शुभकामना',en:'Happy Nepali New Year',a:'#176f3b',b:'#bfe3cc',p:['नयाँ वर्षको हार्दिक शुभकामना! सुख र सफलता मिलोस्।','Happy New Year! Wishing you joy and success.']},
 {k:'teej',ne:'हरितालिका तीज',en:'Haritalika Teej',a:'#c2185b',b:'#f8b4c8',p:['तीजको हार्दिक शुभकामना! हाँसो र रमाइलोले भरियोस्।','Happy Teej! May it be full of laughter and joy.']},
 {k:'holi',ne:'रंगीन होली',en:'Happy Holi',a:'#6c5ce7',b:'#fff3cd',p:['होलीका रंगझैं जीवन रंगीन होस्!','May your life be as colourful as Holi!']},
 {k:'lhosar_tamu',ne:'तमु ल्होसार',en:'Tamu Lhosar',a:'#1f4e79',b:'#b3cde8',p:['तमु ल्होसारको हार्दिक शुभकामना!','Happy Tamu Lhosar!']},
 {k:'lhosar_sonam',ne:'सोनाम ल्होसार',en:'Sonam Lhosar',a:'#9b2226',b:'#e9d8a6',p:['सोनाम ल्होसारको हार्दिक शुभकामना!','Happy Sonam Lhosar!']},
 {k:'lhosar_gyalpo',ne:'ग्याल्पो ल्होसार',en:'Gyalpo Lhosar',a:'#5b2a86',b:'#d6c6f5',p:['ग्याल्पो ल्होसारको हार्दिक शुभकामना!','Happy Gyalpo Lhosar!']},
 {k:'maghe_sankranti',ne:'माघे संक्रान्ति / माघी',en:'Maghe Sankranti / Maghi',a:'#8d5524',b:'#f5dca0',p:['माघे संक्रान्ति र माघीको हार्दिक शुभकामना!','Warm wishes for Maghe Sankranti and Maghi!']},
 {k:'buddha_jayanti',ne:'बुद्ध जयन्ती',en:'Buddha Jayanti',a:'#d4a017',b:'#f6e7b8',p:['बुद्ध जयन्तीको हार्दिक शुभकामना — शान्ति र करुणा फैलियोस्।','Wishes on Buddha Jayanti — may peace and compassion spread.']},
 {k:'udhauli_ubhauli',ne:'उधौली / उभौली',en:'Udhauli / Ubhauli',a:'#386641',b:'#c9e4b6',p:['उधौली/उभौली पर्वको हार्दिक शुभकामना!','Warm wishes for Udhauli/Ubhauli!']},
 {k:'eid',ne:'ईद मुबारक',en:'Eid Mubarak',a:'#f2d06b',b:'#14532d',p:['ईद मुबारक! खुसी र शान्ति रहोस्।','Eid Mubarak! Wishing you joy and peace.']},
 {k:'christmas',ne:'क्रिसमसको शुभकामना',en:'Merry Christmas',a:'#e63946',b:'#1d5c47',p:['क्रिसमसको हार्दिक शुभकामना!','Merry Christmas!']}
];
q('#tpl').innerHTML=T.map((x,i)=>'<option value="'+i+'">'+x.ne+' / '+x.en+'</option>').join('');
const p=new URLSearchParams(location.search);
if(p.has('t')){const i=T.findIndex(x=>x.k===p.get('t'));if(i>=0)q('#tpl').value=i}
['sender','recipient','message'].forEach(k=>{if(p.get(k))q('#'+k).value=p.get(k)});
if(p.get('lang'))q('#lang').value=p.get('lang');if(p.get('size'))q('#size').value=p.get('size');
function wrap(c,text,x,y,max,line){const words=String(text).split(/\s+/),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(c.measureText(t).width>max&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);lines.slice(0,5).forEach((s,i)=>c.fillText(s,x,y+i*line))}
function fields(){const t=T[+q('#tpl').value],lang=q('#lang').value,msg=q('#message').value.trim()||t.p[lang==='en'?1:0];return{t,lang,msg,sender:q('#sender').value.trim(),recipient:q('#recipient').value.trim(),size:q('#size').value}}
function draw(){
  const f=fields(),cv=q('#cv'),story=f.size==='story';cv.width=1080;cv.height=story?1920:1080;const c=cv.getContext('2d'),g=c.createLinearGradient(0,0,cv.width,cv.height);g.addColorStop(0,f.t.b);g.addColorStop(1,f.t.a);c.fillStyle=g;c.fillRect(0,0,cv.width,cv.height);
  c.globalAlpha=.16;c.strokeStyle='#fff';c.lineWidth=4;for(let i=0;i<10;i++){c.beginPath();c.arc(850,220,(i+1)*38,0,Math.PI*2);c.stroke()}c.globalAlpha=1;
  c.fillStyle='#fff';c.textAlign='left';c.font='700 68px sans-serif';c.fillText(f.lang==='en'?f.t.en:f.t.ne,70,story?620:330);
  c.font='600 45px sans-serif';wrap(c,f.msg,70,story?790:480,920,66);
  if(f.recipient){c.font='500 34px sans-serif';c.fillText((f.lang==='en'?'To: ':'प्रति: ')+f.recipient,70,story?1160:760)}
  c.font='500 34px sans-serif';c.fillText((f.lang==='en'?'From: ':'बाट: ')+(f.sender||'—'),70,story?1240:830);
  c.font='600 28px sans-serif';c.fillText('नेपाल मिति · Nepal Miti',70,cv.height-70);
}
function shareUrl(){const f=fields(),u=new URL(location.href);u.search='';u.searchParams.set('t',f.t.k);u.searchParams.set('lang',f.lang);u.searchParams.set('size',f.size);if(f.sender)u.searchParams.set('sender',f.sender);if(f.recipient)u.searchParams.set('recipient',f.recipient);if(q('#message').value.trim())u.searchParams.set('message',q('#message').value.trim().slice(0,160));return u.toString()}
['#tpl','#sender','#recipient','#message','#lang','#size'].forEach(s=>q(s).oninput=draw);
q('#preset').onclick=()=>{const f=fields();q('#message').value=f.t.p[f.lang==='en'?1:0];draw()};
q('#download').onclick=()=>{const a=document.createElement('a');a.download='nepal-miti-'+fields().t.k+'.png';a.href=q('#cv').toDataURL('image/png');a.click();q('#status').textContent='PNG तयार भयो।'};
q('#copy').onclick=async()=>{const u=shareUrl();q('#link').value=u;try{await navigator.clipboard.writeText(u);q('#status').textContent='लिंक कपी भयो।'}catch{q('#status').textContent='लिंक तयार भयो — तलबाट कपी गर्नुहोस्।'}};
q('#share').onclick=async()=>{if(!fields().sender){q('#status').textContent='पठाउनेको नाम लेख्नुहोस्।';return}const blob=await new Promise(r=>q('#cv').toBlob(r,'image/png')),file=new File([blob],'nepal-miti-card.png',{type:'image/png'}),u=shareUrl();q('#link').value=u;if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({title:fields().lang==='en'?fields().t.en:fields().t.ne,text:u,files:[file]});q('#status').textContent='पठाइयो।';return}catch{}}q('#download').click()};
draw();
`,
"family":`${COMMON}async function state(){try{const x=await api('/api/family/state');q('#cloud').innerHTML='<p class=ok>Signed in: '+esc(x.user.email||'')+'</p>'+(x.memberships.length?x.memberships.map(m=>'<div class=item><b>'+esc(m.families?.name||m.family_id)+'</b><small>'+esc(m.role)+'</small><button class=ghost data-fid="'+m.family_id+'">Invite</button></div>').join(''):'<p class=muted>Cloud family छैन।</p>')+(x.events.length?'<h3>Shared events</h3>'+x.events.map(e=>'<div class=item><b>'+esc(e.title_ne||e.title_en||e.kind)+'</b><small>'+esc(e.rule)+'</small></div>').join(''):'');q('#create').classList.remove('hidden')}catch(e){q('#cloud').innerHTML='<p class=muted>Cloud sharing का लागि मुख्य पेजबाट Login & Sync गर्नुहोस्।</p>'}}q('#create').onclick=async()=>{await api('/api/family/create',{method:'POST',body:JSON.stringify({name:q('#fname').value||'मेरो परिवार',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});state()};q('#cloud').onclick=async e=>{const b=e.target.closest('[data-fid]');if(!b)return;const x=await api('/api/family/invite',{method:'POST',body:JSON.stringify({family_id:b.dataset.fid,role:'viewer',days:7})});prompt('Invite link',location.origin+x.url)};const L='nepalmiti.bundle.family.v2',read=()=>JSON.parse(localStorage.getItem(L)||'[]');q('#localSave').onclick=()=>{const a=read();a.push({id:uuid(),title:q('#ltitle').value,date:q('#ldate').value,kind:q('#lkind').value});localStorage.setItem(L,JSON.stringify(a));render()};function render(){q('#local').innerHTML=read().map(x=>'<div class=item><b>'+esc(x.title)+'</b><small>'+esc(x.kind)+' · '+esc(x.date)+'</small></div>').join('')||'<p class=muted>Local family date छैन।</p>'}q('#ldate').value=npt();render();state();`,
"family-join":`${COMMON}const tok=new URLSearchParams(location.search).get('token')||'';q('#tokenState').textContent=tok?'Invite token प्राप्त भयो। Login भएको अवस्थामा Join थिच्नुहोस्।':'Invite token छैन।';q('#join').onclick=async()=>{if(!tok){q('#status').textContent='Invite token छैन।';return}try{const x=await api('/api/family/join',{method:'POST',body:JSON.stringify({token:tok,display_name:q('#display').value||'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});q('#status').innerHTML='<span class=ok>परिवारमा सफलतापूर्वक सामेल भयो।</span> <a href=/family>परिवार खोल्नुहोस्</a>'}catch(e){q('#status').textContent=e.message==='authentication_required'?'पहिले मुख्य पेजबाट Login & Sync गर्नुहोस्।':e.message}}`,
"my-data":`${COMMON}function local(){const keys=['nepalmiti.bundle.tithi.v2','nepalmiti.bundle.family.v2','nepalmiti.life.v1','nepalmiti.notes.v2'];return Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]).filter(x=>x[1]!=null))}q('#localExport').onclick=()=>{const a=document.createElement('a'),b=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),data:local()},null,2)],{type:'application/json'});a.href=URL.createObjectURL(b);a.download='nepal-miti-local-data.json';a.click()};q('#cloudExport').onclick=async()=>{try{const x=await api('/api/my-data');const a=document.createElement('a'),b=new Blob([JSON.stringify(x,null,2)],{type:'application/json'});a.href=URL.createObjectURL(b);a.download='nepal-miti-cloud-data.json';a.click()}catch(e){alert(e.message)}};q('#eraseLocal').onclick=()=>{if(!confirm('यस browser को स्थानीय Nepal Miti डेटा मेटाउने?'))return;Object.keys(local()).forEach(k=>localStorage.removeItem(k));location.reload()};q('#eraseCloud').onclick=async()=>{if(!confirm('Server-side personal data मेटाउने? Owned family समेत मेटिन सक्छ।'))return;await api('/api/my-data',{method:'DELETE'});alert('Server-side personal data deleted')};q('#ics').onclick=async()=>{try{const x=await api('/api/ics/token',{method:'POST',body:'{}'});prompt('Private ICS URL',location.origin+x.url)}catch(e){alert(e.message)}};`,
"settings-holidays":`${COMMON}(async()=>{const x=await api('/api/v1/holidays?bsYear=2083');q('#out').innerHTML='<p>'+x.items.length+' announced records</p>'+x.items.slice(0,100).map(z=>'<div class=item><b>'+esc(z.bs_date)+' · '+esc(z.name_ne)+'</b><small>'+esc(z.scope_type)+' · '+(z.scope_verified?'verified scope':'scope review')+'</small></div>').join('')})().catch(e=>q('#out').textContent=e.message);`,
"settings-notifications":`${COMMON}const B64=s=>{const pad='='.repeat((4-s.length%4)%4),bin=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/')),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a},DID='nepalmiti.push.device.v1';function dev(){let x;try{x=JSON.parse(localStorage.getItem(DID)||'null')}catch{}if(!x){x={device_id:uuid(),device_secret:rand()};localStorage.setItem(DID,JSON.stringify(x))}return x}async function enable(){if(!('serviceWorker'in navigator)||!('PushManager'in window))throw Error('Push unsupported');const reg=await navigator.serviceWorker.register('/sw.js'),v=await api('/api/push/vapid'),sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:B64(v.publicKey)}),d=dev();await api('/api/push/subscribe',{method:'POST',body:JSON.stringify({...d,subscription:sub.toJSON(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,user_agent_family:navigator.userAgent.slice(0,31)})});q('#status').textContent='सूचना सक्रिय छ';q('#status').className='ok'}q('#enable').onclick=()=>enable().catch(e=>alert(e.message));q('#test').onclick=async()=>{await enable();const d=dev(),ref=rand().slice(0,32),at=new Date(Date.now()+120000).toISOString();const db=indexedDB.open('nepalmiti-push',1);db.onupgradeneeded=()=>{if(!db.result.objectStoreNames.contains('jobs'))db.result.createObjectStore('jobs',{keyPath:'job_ref'})};db.onsuccess=()=>{const tx=db.result.transaction('jobs','readwrite'),s=tx.objectStore('jobs'),v={job_ref:ref,title:'नेपाल मिति परीक्षण',body:'Web Push सफल भयो।',url:'/settings/notifications'};try{s.put(v)}catch{s.put(v,ref)}};await api('/api/push/jobs',{method:'PUT',body:JSON.stringify({...d,create:[{job_ref:ref,fire_at_utc:at,category:'due_date'}],cancel:[],reschedule:[]})});q('#status').textContent='२ मिनेटपछि test push schedule भयो'};q('#disable').onclick=async()=>{const d=dev();await api('/api/push/subscribe',{method:'DELETE',body:JSON.stringify(d)});const reg=await navigator.serviceWorker.getRegistration();const s=await reg?.pushManager.getSubscription();await s?.unsubscribe();q('#status').textContent='सबै सूचना बन्द'};`,
"offline":`${COMMON}q('#today').textContent=npt();`,
"developers":`${COMMON}fetch(BASE+'/api/v1/openapi.json').then(r=>r.json()).then(x=>q('#spec').textContent=JSON.stringify(x,null,2));`
};

function body(path:string){if(path==="/aaja")return `<div class=grid><div class=card><h2>आज खुला छ?</h2><div class=form><input id=date disabled><select id=aud><option value=government>सरकारी कार्यालय</option><option value=women_employees>महिला कर्मचारी</option><option value=community:newar>नेवार समुदाय</option></select><select id=district><option value=kathmandu>काठमाडौं</option><option value=lalitpur>ललितपुर</option><option value=bhaktapur>भक्तपुर</option><option value=other>अन्य जिल्ला</option></select><button id=go class=go>जाँच्नुहोस्</button></div><div id=out></div></div><div class=card><h2>Truth rule</h2><div class=notice>Coverage अपुग हुँदा “खुला” भनिँदैन। Holiday scope र स्रोत देखाइन्छ।</div><p><a href=/settings/holidays>Holiday coverage हेर्नुहोस्</a></p></div></div>`;
if(path==="/tithi")return `<div class=grid><div class=card><h2>तिथि recurrence</h2><p class=muted>श्राद्ध, तिथि-जन्मोत्सव र अन्य तिथि-आधारित सम्झना। निर्णय नियम, अधिक मास र स्रोत स्पष्ट राखिन्छ।</p><div class=form><input id=title placeholder="नाम / घटना"><select id=kind><option value=shraddha>वार्षिक श्राद्ध</option><option value=tithi_birthday>तिथि जन्मोत्सव</option><option value=custom>अन्य तिथि</option></select><select id=mode><option value=direct>तिथि आफैं छान्छु</option><option value=fromDate>वि.सं./ई.सं. मितिबाट निकाल्नुहोस्</option></select><span></span></div><div id=directBox><div class=form><select id=month></select><select id=paksha><option value=shukla>शुक्ल</option><option value=krishna>कृष्ण</option></select><input id=tithiNo type=number min=1 max=15 value=8><select id=system><option value=purnimanta>पूर्णिमान्त</option><option value=amanta>अमान्त</option></select></div></div><div id=dateBox class=hidden><div class=form><select id=cal><option value=bs>वि.सं.</option><option value=ad>ई.सं.</option></select><input id=date placeholder="2083-06-12"><button id=derive class=ghost>तिथि निकाल्नुहोस्</button><div id=derived class=notice><span id=dateHint>वि.सं. YYYY-MM-DD</span></div></div></div><details style="margin-top:10px"><summary><b>उन्नत सेटिङ</b></summary><div class=form style="margin-top:9px"><select id=rule><option value=aparahna>अपराह्न</option><option value=udaya>उदय तिथि</option><option value=madhyahna>मध्याह्न</option><option value=sayahna>सायाह्न</option><option value=pradosha>प्रदोष</option><option value=nishitha>निशीथ</option><option value=arunodaya>अरुणोदय</option><option value=official_only>आधिकारिक पात्रो मात्र</option></select><select id=adhik><option value=nija_month>निज महिनामा</option><option value=adhik_month>अधिक महिनामा</option><option value=both_flagged>दुवै देखाउनुहोस्</option></select><select id=location><option value=kathmandu_panchang>काठमाडौँ पञ्चाङ्ग</option><option value=local_computation>स्थानीय गणना</option></select><select id=source><option value=direct>प्रत्यक्ष तिथि</option><option value=fromDate>मितिबाट निकालिएको</option><option value=import>पारिवारिक मितिबाट</option></select></div></details><button id=save class=go style="margin-top:10px">सुरक्षित गर्नुहोस्</button><p id=status class=muted></p></div><div class=card><h2>मेरा तिथि सम्झना</h2><div id=saved class=list></div><div class=notice style="margin-top:10px">श्राद्धका लागि सामान्य तयारी checklist स्वतः बन्छ। धार्मिक विधि/दिनको अन्तिम पुष्टि परिवारको परम्परा र योग्य पुरोहित/पञ्चाङ्गसँग गर्नुहोस्।</div></div></div>`;
if(path==="/diaspora")return `<div class=grid><div class=card><h2>Diaspora · नेपालसँग समय मिलाउनुहोस्</h2><label>सहर / समय क्षेत्र</label><select id=city></select><label>वा IANA timezone</label><input id=customTz placeholder="America/Chicago"><p id=tzStatus class=danger></p><div id=clocks class=clock-grid></div><h3>घरमा फोन गर्ने राम्रो समय</h3><div class=form><label>म ब्युँझने<input id=myStart type=time value="07:00"></label><label>म सुत्ने<input id=myEnd type=time value="22:00"></label><label>घर ब्युँझने<input id=homeStart type=time value="06:30"></label><label>घर सुत्ने<input id=homeEnd type=time value="21:30"></label><label class=full>तेस्रो सहभागी timezone (वैकल्पिक)<input id=third placeholder="Australia/Sydney"></label></div><div id=calls class=list></div></div><div class=card><h2>पर्वसम्म कति बाँकी?</h2><div id=festivals class=list></div><h3 style="margin-top:16px">प्रकाशित साइत तपाईंको समयमा</h3><p class=muted>साइत बनाइँदैन; verified/sourced record उपलब्ध भए मात्र देखाइन्छ।</p><div id=saits class=list></div></div></div>`;
if(path==="/card")return `<div class=grid><div class=card><h2>Greeting card</h2><label>पर्व</label><select id=tpl></select><label>पठाउने</label><input id=sender placeholder="तपाईंको नाम"><label>पाउने (वैकल्पिक)</label><input id=recipient placeholder="नाम"><label>सन्देश</label><textarea id=message rows=4 maxlength=160 placeholder="Preset वा आफ्नै सन्देश"></textarea><div class=row><button id=preset class=ghost>Preset सन्देश</button><select id=lang style="width:auto"><option value=ne>नेपाली</option><option value=en>English</option></select><select id=size style="width:auto"><option value=square>वर्ग 1080×1080</option><option value=story>Story 1080×1920</option></select></div><div class=row style="margin-top:10px"><button id=share class=go>बनाएर पठाउनुहोस्</button><button id=download class=ghost>PNG</button><button id=copy class=ghost>लिंक कपी</button></div><input id=link readonly placeholder="साझा लिंक यहाँ देखिन्छ" style="margin-top:8px"><p id=status class=muted></p><p class=muted>कार्ड browserमै बन्छ; नाम/सन्देश सर्भरमा persist हुँदैन।</p></div><div class="card canvas-wrap"><canvas id=cv width=1080 height=1080></canvas></div></div>`;
if(path==="/family")return `<div class=grid><div class=card><h2>Local-first family dates</h2><div class=form><input id=ltitle placeholder=नाम><input id=ldate type=date><select id=lkind><option value=birthday>जन्मदिन</option><option value=anniversary>वार्षिकोत्सव</option><option value=shraddha>श्राद्ध</option><option value=custom>अन्य</option></select><button id=localSave class=go>Local save</button></div><div id=local></div></div><div class=card><h2>Opt-in cloud family</h2><div class=form><input id=fname value="मेरो परिवार"><button id=create class="go hidden">Create family</button></div><div id=cloud></div></div></div>`;
if(path==="/family/join")return `<div class=card><h2>परिवारमा सामेल हुनुहोस्</h2><p id=tokenState class=muted></p><div class=form><input id=display placeholder="देखाइने नाम (वैकल्पिक)"><button id=join class=go>Join family</button></div><div id=status class=notice style="margin-top:10px">Invite links are private; this page is noindex.</div></div>`;
if(path==="/my-data")return `<div class=grid><div class=card><h2>मेरो डेटा</h2><p class=muted>Local-first data browserमै रहन्छ; cloud export Login भएको अवस्थामा मात्र।</p><div class=row><button id=localExport class=go>Local export</button><button id=cloudExport class=ghost>Cloud export</button><button id=ics class=ghost>Private ICS</button></div></div><div class=card><h2>Delete</h2><div class=row><button id=eraseLocal class=ghost>Local erase</button><button id=eraseCloud class=ghost>Cloud erase</button></div></div></div>`;
if(path==="/settings/holidays")return `<div class=card><h2>Holiday coverage · 2083</h2><p class=muted>Source-linked records; unresolved scope remains visible.</p><div id=out></div></div>`;
if(path==="/settings/notifications")return `<div class=grid><div class=card><h2>Privacy-preserving Web Push</h2><p class=muted>Serverले reminder text राख्दैन; केवल opaque job_ref, समय र category.</p><div class=row><button id=enable class=go>सूचना सक्रिय</button><button id=test class=ghost>२ मिनेट test</button><button id=disable class=ghost>सबै सूचना बन्द</button></div><p id=status></p></div><div class=card><h2>Platform notes</h2><div class=notice>iOS 16.4+ मा Home Screen मा install गरेपछि Web Push चल्छ। Quiet-hour metadata subscription सँग सुरक्षित राखिन्छ।</div></div></div>`;
if(path==="/offline")return `<div class=card><h2>Offline Nepal Miti</h2><p>आज: <b id=today></b></p><div class=notice>Calendar shell र पछिल्लो आज/tithi payload service worker cache बाट उपलब्ध हुन्छ।</div></div>`;
if(path==="/developers")return `<div class=grid><div class=card><h2>Public API v1</h2><div class=api>/api/v1/today<br>/api/v1/convert?bs=2083-06-12<br>/api/v1/calendar/2083/06<br>/api/v1/panchang?ad=2026-09-28<br>/api/v1/tithi/next?...<br>/api/v1/festivals?year=2083<br>/api/v1/holidays?bsYear=2083<br>/api/v1/market/latest</div><p><a href=/api/v1/openapi.json>OpenAPI 3.1 JSON</a></p></div><div class=card><h2>Embeds & ICS</h2><div class=api>/embed/today<br>/embed/converter<br>/embed/nepal-miti-today.js<br>/embed/nepal-miti-converter.js<br>/ical/holidays.ics<br>/ical/festivals.ics<br>/ical/bs-dates.ics</div><pre id=spec style="white-space:pre-wrap;max-height:320px;overflow:auto"></pre></div></div>`;return `<div class=card><h2>नेपाल मिति</h2></div>`;}

export const BUNDLE_PAGES=new Set(["/tithi","/diaspora","/card","/family","/family/join","/my-data","/offline","/developers"]);
export function bundlePage(path:string){const key=path.replace(/^\//,"").replace(/\//g,"-")||"aaja",publicPage=["/aaja","/tithi","/diaspora","/card","/developers"].includes(path),tabs=[["/tithi","तिथि"],["/diaspora","Diaspora"],["/card","कार्ड"],["/family","परिवार"],["/developers","API"],["/my-data","मेरो डेटा"]],nav=tabs.map(([r,l])=>`<a href="${r}" class="${path===r?'active':''}">${l}</a>`).join("");return `<!doctype html><html lang=ne><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content="${publicPage?'index,follow':'noindex,nofollow'}"><meta name=theme-color content=#176f3b><title>नेपाल मिति · ${esc(tabs.find(x=>x[0]===path)?.[1]||'Tools')}</title><style>${CSS}</style></head><body><header class=top><div class="wrap nav"><div class=brand>नेपाल मिति<small>Protected production bundle</small></div><nav class=tabs>${nav}</nav></div></header><main class=wrap><section class=hero><div><h1>${esc(tabs.find(x=>x[0]===path)?.[1]||'नेपाल मिति')}</h1><p>Source-aware · local-first · protected backend · Nepal Sambat and provenance preserved.</p></div></section>${body(path)}<div class=footer><a href=/>मुख्य पात्रो</a> · <a href=/developers>विकासकर्ता/API</a> · <a href=/explore>Explore</a></div></main><script>${SCRIPTS[key]||''}</script></body></html>`;}

function embed(kind:string){const script=kind==="today"?`fetch('/api/v1/today').then(r=>r.json()).then(x=>document.getElementById('nm').innerHTML='<b>'+x.bs.key+'</b><br>'+x.weekday.ne+' · '+x.panchang.tithi.ne)`:`document.getElementById('go').onclick=()=>fetch('/api/v1/convert?bs='+encodeURIComponent(document.getElementById('d').value)).then(r=>r.json()).then(x=>document.getElementById('o').textContent=x.ad||x.error)`;return new Response(`<!doctype html><meta charset=utf-8><style>body{font-family:system-ui;margin:0;padding:10px;color:#17231b}.box{border:1px solid #dce6df;border-radius:12px;padding:12px}input,button{padding:7px}</style><div class=box id=nm>${kind==='today'?'लोड हुँदैछ…':'<input id=d placeholder=2083-06-12><button id=go>Convert</button><div id=o></div>'}</div><script>${script}</script>`,{headers:{...HTML_HEADERS,"x-robots-tag":"noindex, nofollow"}});}


function parseCsv(text:string){const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell="";}else if(c==='\n'){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell="";}else cell+=c;}if(cell.length||row.length){row.push(cell.replace(/\r$/,""));rows.push(row)}return rows.filter(r=>r.some(x=>x.trim()!==""));}
function holidayImportRows(csv:string){const rows=parseCsv(csv);if(rows.length<2)return {items:[],errors:[{row:0,field:"csv",message:"header and at least one row required"}],warnings:[]};const head=rows[0].map(x=>x.trim()),need=["ad_date","bs_date","name_ne","name_en","scope_type","audiences","effect","status","source_url","source_title"],errors:any[]=[],warnings:any[]=[],items:any[]=[];for(const n of need)if(!head.includes(n))errors.push({row:0,field:n,message:"required column"});if(errors.length)return {items,errors,warnings};const scopes=new Set(["national","province","district","valley","custom"]),effects=new Set(["closed","partial","open_exception"]),statuses=new Set(["announced","tentative","cancelled"]),baseAud=new Set(["government","bank","school","private","women_employees"]);for(let i=1;i<rows.length;i++){const o:any={};head.forEach((h,k)=>o[h]=(rows[i][k]||"").trim());const e=(f:string,m:string)=>errors.push({row:i,field:f,message:m}),w=(f:string,m:string)=>warnings.push({row:i,field:f,message:m});for(const n of need)if(!o[n])e(n,"required");if(o.ad_date&&!/^\d{4}-\d{2}-\d{2}$/.test(o.ad_date))e("ad_date","YYYY-MM-DD required");if(o.bs_date&&!/^\d{4}-\d{2}-\d{2}$/.test(o.bs_date))e("bs_date","YYYY-MM-DD required");if(o.scope_type&&!scopes.has(o.scope_type))e("scope_type","invalid scope");if(o.effect&&!effects.has(o.effect))e("effect","invalid effect");if(o.status&&!statuses.has(o.status))e("status","invalid status");if(o.source_url&&!/^https:\/\//.test(o.source_url))e("source_url","https URL required");const codes=(o.scope_codes||"").split(";").map((x:string)=>x.trim()).filter(Boolean),auds=(o.audiences||"").split(";").map((x:string)=>x.trim()).filter(Boolean);for(const a of auds)if(!baseAud.has(a)&&!/^community:[a-z0-9_]+$/.test(a))e("audiences","invalid audience "+a);if(["district","province"].includes(o.scope_type)&&!codes.length)e("scope_codes","scope codes required");if(o.scope_type==="national"&&codes.length)e("scope_codes","national scope takes no codes");if(!o.notice_date)w("notice_date","missing notice date");if(!o.verified_at)w("verified_at","not verified");if(errors.some(x=>x.row===i))continue;const slug=(o.name_en||"holiday").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);items.push({id:o.id||o.bs_date+":"+slug+":"+o.scope_type,ad_date:o.ad_date,bs_date:o.bs_date,name_ne:o.name_ne,name_en:o.name_en,scope_type:o.scope_type,scope_codes:codes,audiences:auds,effect:o.effect,status:o.status,scope_verified:o.scope_verified?String(o.scope_verified).toLowerCase()!=="false":!(o.scope_type==="custom"&&!codes.length),source_url:o.source_url,source_title:o.source_title,notice_date:o.notice_date||null,verified_by:o.verified_by||null,verified_at:o.verified_at||null});}const seen=new Set<string>();for(const x of items){if(seen.has(x.id))errors.push({row:0,field:"id",message:"duplicate id "+x.id});seen.add(x.id)}return {items,errors,warnings};}
async function adminHolidays(req:Request,u:URL){if(req.method!=="POST")return j({error:"method_not_allowed"},405);const {user}=await currentUser(req);if(!user||user.app_metadata?.role!=="admin")return j({error:"forbidden"},403);const csv=await req.text();if(csv.length>2_000_000)return j({error:"too_large"},413);const v=holidayImportRows(csv);if(v.errors.length)return j({ok:false,errors:v.errors,warnings:v.warnings},422);const db=admin();if(!db)return j({error:"backend_not_configured"},503);const {data:existing,error:readError}=await db.from("holidays").select("*");if(readError)return j({error:"holiday_lookup_failed"},500);const years=[...new Set(v.items.map((x:any)=>x.bs_date.slice(0,4)))],ex=(existing||[]).filter((x:any)=>years.includes(String(x.bs_date).slice(0,4))),old=new Map(ex.map((x:any)=>[x.id,x])),incoming=new Map(v.items.map((x:any)=>[x.id,x])),added=v.items.filter((x:any)=>!old.has(x.id)),removed=ex.filter((x:any)=>!incoming.has(x.id)),changed=v.items.filter((x:any)=>old.has(x.id)&&JSON.stringify(old.get(x.id))!==JSON.stringify(x));const commit=u.searchParams.get("commit")==="1";if(commit){for(const y of years){const d=await db.from("holidays").delete().like("bs_date",y+"-%");if(d.error)return j({error:d.error.message},500)}if(v.items.length){const ins=await db.from("holidays").insert(v.items);if(ins.error)return j({error:ins.error.message},500)}await db.from("audit_log").insert({actor:user.id,action:"holidays.import",entity:"holidays",entity_id:years.join(","),diff:{added:added.length,removed:removed.length,changed:changed.length}});}return j({ok:true,committed:commit,warnings:v.warnings,report:{added:added.length,removed:removed.length,changed:changed.length,unchanged:Math.max(0,v.items.length-added.length-changed.length),years}});}
function assetLinks(){const pkg=env("ANDROID_PACKAGE_NAME")||"np.nepalmiti.twa",fps=(env("ANDROID_SHA256_CERT_FINGERPRINTS")||"").split(",").map(x=>x.trim()).filter(Boolean),body=fps.length?[{relation:["delegate_permission/common.handle_all_urls"],target:{namespace:"android_app",package_name:pkg,sha256_cert_fingerprints:fps}}]:[];return j(body,200,{"cache-control":"public, max-age=3600"});}
async function revalidateCron(req:Request){if(!(await cronAuthorized(req)))return j({error:"unauthorized"},401);return j({revalidated:true,mode:"protected_edge_dynamic",paths:["/","/aaja","/date/[bsDate]","/[bsYear]/[bsMonth]"],at:new Date().toISOString()});}
function embedComponentJs(kind:string){const js=kind==="today"?`(()=>{class NMToday extends HTMLElement{connectedCallback(){this.attachShadow({mode:"open"});this.load()}async load(){const base=this.getAttribute("api")==="self"?location.origin:(this.getAttribute("api")||"https://patro-blush.vercel.app");try{const r=await fetch(base+"/api/v1/today"),x=await r.json(),lang=this.getAttribute("lang")==="en"?"en":"ne",bs=x.bs?.key||[x.bs?.year,x.bs?.month,x.bs?.day].filter(Boolean).join("-"),t=x.panchang?.tithi?.[lang]||x.tithi?.name?.[lang]||"",ns=x.nepal_sambat?.month?.dev||x.nepalSambat?.text?.[lang]||"";this.shadowRoot.innerHTML="<style>:host{font-family:system-ui}.c{border:1px solid #d8e2dc;border-radius:12px;padding:12px;background:#fff;color:#17231b}.b{font-size:1.25em;font-weight:800}.m{color:#647069;font-size:.85em}</style><div class=c><div class=b>"+bs+"</div><div>"+(x.weekday?.[lang]||x.weekday?.ne||"")+" · "+t+"</div><div class=m>"+ns+"</div><a href="+base+"/tithi target=_blank rel=noopener>नेपाल मिति</a></div>"}catch(e){this.shadowRoot.textContent="Nepal Miti unavailable"}}}customElements.get("nepal-miti-today")||customElements.define("nepal-miti-today",NMToday)})();`:`(()=>{class NMConv extends HTMLElement{connectedCallback(){this.attachShadow({mode:"open"});this.shadowRoot.innerHTML='<style>:host{font-family:system-ui}.c{border:1px solid #d8e2dc;border-radius:12px;padding:12px;background:#fff;color:#17231b}input,select,button{padding:7px;margin:3px}</style><div class=c><select id=f><option value=bs>BS → AD</option><option value=ad>AD → BS</option></select><input id=d placeholder="2083-06-12"><button id=g>Convert</button><div id=o></div></div>';this.shadowRoot.getElementById("g").onclick=()=>this.go()}async go(){const base=this.getAttribute("api")==="self"?location.origin:(this.getAttribute("api")||"https://patro-blush.vercel.app"),f=this.shadowRoot.getElementById("f").value,d=this.shadowRoot.getElementById("d").value,p=f==="bs"?"bs":"ad";try{const r=await fetch(base+"/api/v1/convert?"+p+"="+encodeURIComponent(d)),x=await r.json();this.shadowRoot.getElementById("o").textContent=f==="bs"?(x.ad||x.error):(typeof x.bs==="string"?x.bs:(x.bs?.key||x.error))}catch(e){this.shadowRoot.getElementById("o").textContent="Unavailable"}}}customElements.get("nepal-miti-converter")||customElements.define("nepal-miti-converter",NMConv)})();`;return new Response(js,{headers:{"content-type":"application/javascript; charset=utf-8","cache-control":"public, max-age=3600"}});}
export async function bundleApi(req:Request,path:string,u:URL):Promise<Response|null>{
 if(path==="/.well-known/assetlinks.json")return assetLinks();
 if(path==="/embed/nepal-miti-today.js")return embedComponentJs("today");
 if(path==="/embed/nepal-miti-converter.js")return embedComponentJs("converter");
 if(path==="/api/admin/holidays")return adminHolidays(req,u);
 if(path==="/api/cron/revalidate")return revalidateCron(req);
 if(path==="/api/bundle/holiday-status")return holidayStatus(u);
 if(path==="/api/bundle/saits")return saits(u);
 if(path==="/api/v1/holidays")return holidaysApi(u);
 if(path==="/api/v1/market/latest")return marketLatest();
 if(path==="/api/v1/openapi.json")return j(openApi(),200,{"cache-control":"public, max-age=300"});
 if(path==="/api/push/vapid"){const k=await vapidKeys();return j({publicKey:k.publicKey});}
 if(path==="/api/push/subscribe"&&req.method==="POST")return pushSubscribe(req);
 if(path==="/api/push/subscribe"&&req.method==="DELETE")return pushDelete(req);
 if(path==="/api/push/jobs"&&req.method==="PUT")return pushJobs(req);
 if(path==="/api/cron/market"){if(!(await cronAuthorized(req)))return j({error:"unauthorized"},401);return j(await refreshMarket());}
 if(path==="/api/cron/push"){if(!(await cronAuthorized(req)))return j({error:"unauthorized"},401);return j(await dispatchPush());}
 if(path.startsWith("/api/family/")){const r=await familyApi(req,path);if(r)return r;}
 if(path==="/api/my-data")return myData(req);
 if(path==="/api/ics/token")return icsToken(req);
 if(path==="/ical/holidays.ics")return holidayIcs(u);
 const pm=path.match(/^\/ical\/u\/([A-Za-z0-9_-]{20,80})$/);if(pm)return personalIcs(pm[1]);
 if(path==="/embed/today")return embed("today");
 if(path==="/embed/converter")return embed("converter");
 return null;
}