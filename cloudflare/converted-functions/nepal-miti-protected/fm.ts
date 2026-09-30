import { envGet } from "../_shared/env";
import { createClient } from "@supabase/supabase-js";
const STATIONS=[
 {id:"radio-nepal-national",name_en:"Radio Nepal",name_ne:"रेडियो नेपाल",province:"bagmati",district:"kathmandu",municipality:"Kathmandu",category:"समाचार",languages:["नेपाली"],website:"https://radionepal.gov.np/",stream:"https://stream1.radionepal.gov.np/live/",type:"mp3",rights:"verified_stream",source:"https://radionepal.gov.np/en/station-details/",verified_at:"2026-09-25",playable:false,status_ne:"आधिकारिक स्रोत प्रमाणित"},
 {id:"radio-nepal-madhesh-bardibas",name_en:"Radio Nepal — Madhesh",name_ne:"रेडियो नेपाल — मधेश",province:"madhesh",district:"mahottari",municipality:"Bardibas",frequency:"103.0",category:"समाचार",languages:["नेपाली"],website:"https://radionepal.gov.np/",stream:"https://stream1.radionepal.gov.np/live/",type:"mp3",rights:"verified_stream",source:"https://radionepal.gov.np/en/station-details/",verified_at:"2026-09-25",playable:false,status_ne:"आधिकारिक स्रोत प्रमाणित"},
 {id:"radio-kantipur-96-1",name_en:"Radio Kantipur",name_ne:"रेडियो कान्तिपुर",province:"bagmati",district:"kathmandu",municipality:"Kathmandu",frequency:"96.1",category:"समाचार तथा मनोरञ्जन",languages:["नेपाली"],website:"https://radiokantipur.com/",stream:"https://radio-broadcast.ekantipur.com/stream",type:"mp3",rights:"verified_stream",source:"https://radiokantipur.com/",verified_at:"2026-09-25",playable:true,status_ne:"आधिकारिक स्रोत प्रमाणित"},
 {id:"ujyaalo-90-network",name_en:"Ujyaalo 90 Network",name_ne:"उज्यालो ९० नेटवर्क",province:"bagmati",district:"lalitpur",municipality:"Lalitpur / Jawalakhel",frequency:"90.0",category:"समाचार",languages:["नेपाली"],website:"https://ujyaaloonline.com/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://tingfm.com/radio/64130",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"kalika-fm-95-2",name_en:"Kalika FM 95.2",name_ne:"कालिका एफएम ९५.२",province:"bagmati",district:"chitwan",municipality:"Bharatpur",frequency:"95.2",category:"समाचार तथा मनोरञ्जन",languages:["नेपाली"],website:"",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.freqtrail.com/stations/NP",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"radio-audio-106-3",name_en:"Radio Audio",name_ne:"रेडियो अडियो",province:"bagmati",district:"kathmandu",municipality:"New Baneshwor",frequency:"106.3",category:"मनोरञ्जन",languages:["नेपाली"],website:"",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.freqtrail.com/stations/NP",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"hits-fm-91-2",name_en:"Hits FM 91.2",name_ne:"हिट्स एफएम ९१.२",province:"bagmati",district:"kathmandu",municipality:"New Baneshwor",frequency:"91.2",category:"संगीत",languages:["नेपाली","English"],website:"https://hitsfm.com.np/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.freqtrail.com/stations/NP",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"capital-fm-92-4",name_en:"Capital FM 92.4",name_ne:"क्यापिटल एफएम ९२.४",province:"bagmati",district:"kathmandu",municipality:"Thapagaun",frequency:"92.4",category:"समाचार तथा मनोरञ्जन",languages:["नेपाली"],website:"",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.freqtrail.com/stations/NP",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"radio-thaha-sanchar-99-6",name_en:"Radio Thaha Sanchar 99.6",name_ne:"रेडियो थाहा सञ्चार ९९.६",province:"bagmati",district:"makwanpur",municipality:"Hetauda",frequency:"99.6",category:"समाचार",languages:["नेपाली"],website:"",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.freqtrail.com/stations/NP",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"butwal-fm-94-4",name_en:"Butwal FM 94.4",name_ne:"बुटवल एफएम ९४.४",province:"lumbini",district:"rupandehi",municipality:"Butwal",frequency:"94.4",category:"समाचार तथा मनोरञ्जन",languages:["नेपाली"],website:"",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.freqtrail.com/stations/NP",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"radio-resunga-106-2",name_en:"Radio Resunga 106.2",name_ne:"रेडियो रेसुङ्गा १०६.२",province:"lumbini",district:"gulmi",municipality:"Tamghas",frequency:"106.2",category:"Community",languages:["नेपाली"],website:"https://radioresunga.com.np/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://tingfm.com/radio/69413",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"radio-madhyapaschim-91-4",name_en:"Radio Madhyapaschim 91.4",name_ne:"रेडियो मध्यपश्चिम ९१.४",province:"lumbini",district:"dang",municipality:"Ghorahi",frequency:"91.4",category:"Community",languages:["नेपाली"],website:"https://www.radiomp.org/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://yp.casterclub.com/station-detail.php?id=3103",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"itahari-fm-92-5",name_en:"Itahari FM 92.5",name_ne:"इटहरी एफएम ९२.५",province:"koshi",district:"sunsari",municipality:"Itahari",frequency:"92.5",category:"समाचार तथा मनोरञ्जन",languages:["नेपाली"],website:"https://itaharifm.com.np/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.rcast.net/dir/nepali/page1",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"radio-annapurna-93-4",name_en:"Radio Annapurna 93.4",name_ne:"रेडियो अन्नपूर्ण ९३.४",province:"gandaki",district:"kaski",municipality:"Pokhara",frequency:"93.4",category:"समाचार तथा मनोरञ्जन",languages:["नेपाली"],website:"http://radioannapurna.com.np/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://yp.casterclub.com/station-detail.php?id=3101",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"radio-syangja-89-6",name_en:"Radio Syangja 89.6",name_ne:"रेडियो स्याङ्जा ८९.६",province:"gandaki",district:"syangja",municipality:"Putalibazar",frequency:"89.6",category:"Community",languages:["नेपाली"],website:"https://www.radiosyangja.org/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://yp.casterclub.com/directory.php",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"radio-bheri-98-6",name_en:"Radio Bheri 98.6",name_ne:"रेडियो भेरी ९८.६",province:"karnali",district:"surkhet",municipality:"Birendranagar",frequency:"98.6",category:"समाचार तथा Community",languages:["नेपाली"],website:"https://radiobheri.com.np/",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://yp.casterclub.com/directory.php",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"tikapur-fm-101",name_en:"Tikapur FM 101",name_ne:"टीकापुर एफएम १०१",province:"sudurpashchim",district:"kailali",municipality:"Tikapur",frequency:"101.0",category:"Community",languages:["नेपाली"],website:"",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://yp.casterclub.com/station-detail.php?id=3126",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"},
 {id:"jayaprithvi-fm-96-3",name_en:"Jayaprithvi FM 96.3",name_ne:"जयपृथ्वी एफएम ९६.३",province:"sudurpashchim",district:"bajhang",municipality:"Chainpur",frequency:"96.3",category:"समाचार तथा Community",languages:["नेपाली"],website:"",stream:"",type:"mp3",rights:"submitted_unverified",source:"https://www.freqtrail.com/stations/NP",verified_at:"2026-09-25",playable:false,status_ne:"Verification pending"}
];

function fmV2Admin(){
 const url=envGet("SUPABASE_URL"),key=envGet("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return null;
 return createClient(url,key,{auth:{persistSession:false}});
}
const FM_PROV:any={1:"koshi",2:"madhesh",3:"bagmati",4:"gandaki",5:"lumbini",6:"karnali",7:"sudurpashchim"};
const FM_PROV_NE:any={1:"कोशी",2:"मधेश",3:"बागमती",4:"गण्डकी",5:"लुम्बिनी",6:"कर्णाली",7:"सुदूरपश्चिम"};
const NE_DIG="०१२३४५६७८९";
function fmNorm(v:any){return String(v??"").replace(/[०-९]/g,(d:string)=>String(NE_DIG.indexOf(d))).normalize("NFC").toLowerCase()}
async function fmV2Directory(){
 const db=fmV2Admin(); if(!db)return null;
 const [{data:stations,error:se},{data:districts,error:de}]=await Promise.all([
   db.from("fm_stations").select("id,slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,facebook,logo_url,stream_format,stream_status,stream_evidence_url,listing_source,fail_count,last_checked_at,last_ok_at,updated_at,category"),
   db.from("np_districts").select("id,name_ne,name_en,province,hq_name_ne")
 ]);
 if(se||de)return null;
 const dm=new Map((districts||[]).map((d:any)=>[d.id,d]));
 const items=(stations||[]).map((s:any)=>{const d:any=dm.get(s.district_id)||{};return {
   id:s.id,slug:s.slug,name_ne:s.name_ne,name_en:s.name_en,frequency:s.frequency_mhz==null?null:String(s.frequency_mhz),
   district:s.district_id,district_ne:d.name_ne||s.district_id,district_en:d.name_en||s.district_id,province:FM_PROV[d.province]||"",province_ne:FM_PROV_NE[d.province]||"",
   municipality:s.city||d.hq_name_ne||"",languages:s.languages||[],website:s.website||null,facebook:s.facebook||null,logo_url:s.logo_url||null,
   type:s.stream_format||null,status:s.stream_status,playable:s.stream_status==="verified",stream_evidence_url:s.stream_evidence_url||null,
   listing_source:s.listing_source,last_checked_at:s.last_checked_at,last_ok_at:s.last_ok_at,category:s.category||""
 }});
 return {items,districts:districts||[]};
}

function js(x:any,status=200){return new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=300, s-maxage=900"}})}
export async function fmApi(path:string,u:URL){
 if(path==="/api/fm/stations"){const q=(u.searchParams.get("q")||"").trim().toLowerCase(),province=u.searchParams.get("province")||"",district=u.searchParams.get("district")||"",items=STATIONS.filter(s=>s.playable&&(!province||s.province===province)&&(!district||s.district===district)&&(!q||[s.name_en,s.name_ne,s.district,s.municipality,s.category,s.frequency].join(" ").toLowerCase().includes(q))).map(({stream,...s})=>s);return js({ok:true,total:items.length,catalog_total:STATIONS.length,verified_total:STATIONS.filter(s=>s.playable).length,rights_gate:true,items})}
 if(path.startsWith("/api/fm/play/")){const id=decodeURIComponent(path.split("/").pop()||""),s=STATIONS.find(x=>x.id===id);if(!s)return js({error:"not_found"},404);if(!s.playable)return js({error:"station_temporarily_unavailable",website:s.website},503);return js({ok:true,station:{...s,stream:"/fm-stream/"+encodeURIComponent(s.id)+".mp3",stream_expires:null},notice:"रेडियो स्ट्रिमको उपलब्धता सम्बन्धित रेडियो स्टेसनमा निर्भर हुन्छ।"},200)}
 if(path.startsWith("/fm-stream/")){const id=decodeURIComponent((path.split("/").pop()||"").replace(/\.mp3$/i,"")),s=STATIONS.find(x=>x.id===id);if(!s)return js({error:"not_found"},404);const upstream=await fetch(s.stream,{headers:{"user-agent":"Nepal-Miti-FM/1.0","icy-metadata":"0","accept":"audio/mpeg,audio/aac,*/*"},redirect:"follow",signal:AbortSignal.timeout(12000)});if(!upstream.ok||!upstream.body)return js({error:"station_unavailable",status:upstream.status},502);const type=upstream.headers.get("content-type")||"audio/mpeg";if(!/^audio\//i.test(type)&&!/octet-stream/i.test(type))return js({error:"invalid_stream_type"},502);return new Response(upstream.body,{status:200,headers:{"content-type":"audio/mpeg","cache-control":"no-store","x-content-type-options":"nosniff","content-disposition":"inline; filename=\""+s.id+".mp3\""}})}
 if(path==="/api/fm/v2/stations"){
   const d=await fmV2Directory(); if(!d)return js({error:"directory_unavailable"},503);
   const q=fmNorm(u.searchParams.get("q")||""),province=u.searchParams.get("province")||"",district=u.searchParams.get("district")||"",
     language=u.searchParams.get("language")||"",streamOnly=u.searchParams.get("stream")==="verified";
   let items=d.items.filter((s:any)=>(!province||s.province===province)&&(!district||s.district===district)&&(!language||(s.languages||[]).includes(language))&&(!streamOnly||s.playable));
   if(q)items=items.filter((s:any)=>fmNorm([s.name_ne,s.name_en,s.frequency,s.district_ne,s.district_en,s.municipality,s.category].join(" ")).includes(q));
   items.sort((a:any,b:any)=>(Number(b.playable)-Number(a.playable))||String(a.name_ne).localeCompare(String(b.name_ne),"ne"));
   const all=d.items,langs=[...new Set(all.flatMap((x:any)=>x.languages||[]))].sort((a:any,b:any)=>String(a).localeCompare(String(b),"ne"));
   return js({ok:true,total:items.length,catalog_total:all.length,verified_total:all.filter((x:any)=>x.playable).length,covered_districts:new Set(all.map((x:any)=>x.district).filter(Boolean)).size,languages:langs,items},200);
 }
 if(path.startsWith("/api/fm/v2/play/")){
   const slug=decodeURIComponent(path.split("/").pop()||""),db=fmV2Admin(); if(!db)return js({error:"directory_unavailable"},503);
   const {data:s,error}=await db.from("fm_stations").select("slug,name_ne,name_en,frequency_mhz,district_id,city,logo_url,stream_format,stream_status,stream_url,stream_evidence_url").eq("slug",slug).maybeSingle();
   if(error||!s)return js({error:"not_found"},404);
   if(s.stream_status!=="verified"||!s.stream_url)return js({error:"station_temporarily_unavailable"},503);
   return js({ok:true,station:{slug:s.slug,name_ne:s.name_ne,name_en:s.name_en,frequency:s.frequency_mhz==null?null:String(s.frequency_mhz),district:s.district_id,city:s.city,logo_url:s.logo_url,type:s.stream_format,stream:"/fm-v2-stream/"+encodeURIComponent(s.slug),rights:"verified_stream"}},200);
 }
 if(path.startsWith("/fm-v2-stream/")){
   const slug=decodeURIComponent(path.split("/").pop()||""),db=fmV2Admin(); if(!db)return js({error:"directory_unavailable"},503);
   const {data:s,error}=await db.from("fm_stations").select("slug,stream_url,stream_format,stream_status").eq("slug",slug).maybeSingle();
   if(error||!s)return js({error:"not_found"},404);
   if(s.stream_status!=="verified"||!s.stream_url)return js({error:"unverified_stream"},403);
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
   try{
     const upstream=await fetch(s.stream_url,{headers:{"user-agent":"Nepal-Miti-FM/2.0","icy-metadata":"0","accept":"audio/mpeg,audio/aac,application/vnd.apple.mpegurl,application/x-mpegURL,*/*"},redirect:"follow",signal:ctrl.signal});
     if(!upstream.ok||!upstream.body)return js({error:"station_unavailable",status:upstream.status},502);
     const type=upstream.headers.get("content-type")||((s.stream_format==="hls")?"application/vnd.apple.mpegurl":"audio/mpeg");
     if(!/audio|mpegurl|aac|ogg|octet-stream/i.test(type))return js({error:"invalid_stream_type"},502);
     return new Response(upstream.body,{status:200,headers:{"content-type":type,"cache-control":"no-store","x-content-type-options":"nosniff","content-disposition":"inline"}});
   }catch{return js({error:"station_unavailable"},502)}finally{clearTimeout(timer)}
 }


 return null;
}
export function fmPage(){return `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b5131"><title>Nepal Miti FM · नेपाली रेडियो</title><style>
:root{--g:#0c6a3c;--g2:#e8f6ed;--ink:#17231b;--muted:#68746c;--line:#dbe6de;--bg:#f3f7f4}*{box-sizing:border-box}body{margin:0;font-family:Inter,"Noto Sans Devanagari",system-ui,sans-serif;background:linear-gradient(#f9fbf9,#eef5f0);color:var(--ink)}button,input{font:inherit}.top{position:sticky;top:0;z-index:20;background:#ffffffed;border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}nav{width:min(1100px,calc(100% - 24px));min-height:62px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:10px}a{color:var(--g)}nav a{text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:8px 10px}.wrap{width:min(1100px,calc(100% - 24px));margin:auto;padding:20px 0 120px}.hero{border-radius:26px;padding:clamp(24px,5vw,54px);background:radial-gradient(circle at 80% 20%,#55c98255,transparent 28%),linear-gradient(135deg,#073b25,#0d7c46);color:white;position:relative;overflow:hidden}.hero:after{content:"◖ )))";position:absolute;right:5%;top:10%;font-size:clamp(80px,17vw,180px);opacity:.1}.hero h1{font-size:clamp(42px,7vw,78px);margin:4px 0}.hero p{max-width:700px;line-height:1.6}.search{display:grid;grid-template-columns:1fr 150px 180px auto;gap:8px;margin:14px 0}.search input,.search select{border:1px solid var(--line);border-radius:13px;padding:12px;background:#fff}.btn{border:0;border-radius:13px;padding:11px 16px;background:var(--g);color:white;font-weight:850;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.station{border:1px solid var(--line);background:white;border-radius:18px;padding:17px;display:grid;grid-template-columns:64px 1fr auto;gap:13px;align-items:center}.logo{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--g2);color:var(--g);font-size:25px;font-weight:950}.station h2{font-size:18px;margin:0}.station p{margin:4px 0;color:var(--muted);font-size:12px}.verify,.pending{display:inline-block;font-size:10px;border-radius:999px;padding:4px 7px}.verify{color:#176f3b;background:#e8f5ec}.pending{color:#8a6319;background:#fff4d8}.player{position:fixed;z-index:30;left:50%;bottom:14px;transform:translateX(-50%);width:min(760px,calc(100% - 20px));background:#11251a;color:white;border:1px solid #47775c;border-radius:18px;padding:12px;box-shadow:0 20px 60px #00180c66;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.player[hidden]{display:none}.player audio{width:100%;height:38px}.notice{border:1px dashed #b8cec0;background:#f9fcfa;border-radius:13px;padding:11px;margin-top:14px;color:var(--muted);line-height:1.5}.empty{text-align:center;padding:50px;color:var(--muted)}@media(max-width:700px){.grid{grid-template-columns:1fr}.station{grid-template-columns:52px 1fr auto}.logo{width:52px;height:52px}.player{grid-template-columns:1fr}.hero{border-radius:20px}}@media(prefers-contrast:more){.station,.notice{border-color:#315a40}.muted{color:#33453a}}

<style id="nm-fm-v2-enhancement-20260926">
.nm-fm-v2-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:-4px 0 12px}
.nm-fm-v2-tools select,.nm-fm-v2-tools button,.nm-fm-v2-tools label{min-height:44px}
.nm-fm-v2-tools select{border:1px solid var(--line);border-radius:12px;padding:9px 11px;background:#fff}
.nm-fm-v2-toggle{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;padding:7px 11px;background:#fff;cursor:pointer}
.nm-fm-v2-toggle input{width:auto}
.nm-fm-v2-fav{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 11px;cursor:pointer}
.nm-fm-v2-fav.on{background:#fff6d6;border-color:#d7b24c}
.nm-fm-v2-card-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.nm-fm-v2-star{width:44px;height:44px;border:1px solid var(--line);background:#fff;border-radius:50%;cursor:pointer;font-size:18px}
.nm-fm-v2-star.on{background:#fff6d6;border-color:#d7b24c}
.nm-fm-v2-status{display:inline-block;font-size:10px;border-radius:999px;padding:4px 7px;margin-top:3px}
.nm-fm-v2-status.ok{background:#e8f5ec;color:#176f3b}
.nm-fm-v2-status.off{background:#fff3df;color:#8b5a00}
.nm-fm-v2-status.none{background:#f0f2f0;color:#5f6962}
.nm-fm-v2-recent{margin:0 0 12px;padding:10px;border:1px solid var(--line);border-radius:14px;background:#fff}
.nm-fm-v2-recent[hidden]{display:none}
.nm-fm-v2-recent strong{display:block;margin-bottom:7px}
.nm-fm-v2-recent-list{display:flex;gap:7px;overflow:auto;padding-bottom:2px}
.nm-fm-v2-recent-list button{white-space:nowrap;border:1px solid var(--line);background:#f8fbf9;border-radius:999px;padding:8px 11px;cursor:pointer}
.nm-fm-v2-player-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:7px}
.nm-fm-v2-player-tools select{border:1px solid #47775c;background:#173324;color:#fff;border-radius:10px;padding:7px 9px}
.nm-fm-v2-pulse{display:inline-block;width:8px;height:8px;border-radius:50%;background:#59dc89;margin-right:6px;box-shadow:0 0 0 0 rgba(89,220,137,.55);animation:nm-fm-v2-pulse 1.5s infinite}
@keyframes nm-fm-v2-pulse{70%{box-shadow:0 0 0 8px rgba(89,220,137,0)}100%{box-shadow:0 0 0 0 rgba(89,220,137,0)}}
@media(prefers-reduced-motion:reduce){.nm-fm-v2-pulse{animation:none}}
@media(max-width:700px){.nm-fm-v2-tools{display:grid;grid-template-columns:1fr 1fr}.nm-fm-v2-tools>*{width:100%}.nm-fm-v2-card-actions{grid-column:1/-1;justify-content:flex-start}.station{grid-template-columns:52px 1fr}}
</style></style></head><body><header class="top"><nav><b>📻 Nepal Miti FM</b><div><a href="/">पात्रो</a> <a href="/explore">अन्वेषण</a></div></nav></header><main class="wrap"><section class="hero"><small>NEPAL MITI LIVE RADIO</small><h1>नेपाली आवाज,<br>जहाँ भए पनि</h1><p>उपलब्ध नेपाली live radio स्टेशनहरू खोज्नुहोस् र यहीँ सुन्नुहोस्।</p></section><div class="search"><input id="q" type="search" placeholder="स्टेशन, frequency वा विषय"><select id="province"><option value="">सबै प्रदेश</option><option value="koshi">कोशी</option><option value="madhesh">मधेश</option><option value="bagmati">बागमती</option><option value="gandaki">गण्डकी</option><option value="lumbini">लुम्बिनी</option><option value="karnali">कर्णाली</option><option value="sudurpashchim">सुदूरपश्चिम</option></select><select id="district"><option value="">सबै जिल्ला</option></select><button class="btn" id="go">खोज्नुहोस्</button></div><div class="muted" id="fmMeta" style="margin:0 0 10px"></div><section class="grid" id="grid"></section><div class="notice"><b>प्रसारण सीमा:</b> रेडियो स्ट्रिमको उपलब्धता सम्बन्धित रेडियो स्टेसनमा निर्भर हुन्छ। सुन्ने इतिहास सर्भरमा सुरक्षित गरिँदैन।</div></main><aside class="player" id="player" hidden><div><b id="now">रेडियो</b><div id="state" style="font-size:11px;color:#b7d9c4">तयार</div><audio id="audio" controls playsinline preload="none"></audio></div><button class="btn" id="stop">बन्द</button></aside><script>
const REGIONS={koshi:["bhojpur","dhankuta","ilam","jhapa","khotang","morang","okhaldhunga","panchthar","sankhuwasabha","solukhumbu","sunsari","taplejung","terhathum","udayapur"],madhesh:["bara","dhanusha","mahottari","parsa","rautahat","saptari","sarlahi","siraha"],bagmati:["bhaktapur","chitwan","dhading","dolakha","kathmandu","kavrepalanchok","lalitpur","makwanpur","nuwakot","ramechhap","rasuwa","sindhuli","sindhupalchok"],gandaki:["baglung","gorkha","kaski","lamjung","manang","mustang","myagdi","nawalpur","parbat","syangja","tanahun"],lumbini:["arghakhanchi","banke","bardiya","dang","eastern-rukum","gulmi","kapilvastu","parasi","palpa","pyuthan","rolpa","rupandehi"],karnali:["dailekh","dolpa","humla","jajarkot","jumla","kalikot","mugu","salyan","surkhet","western-rukum"],sudurpashchim:["achham","baitadi","bajhang","bajura","dadeldhura","darchula","doti","kailali","kanchanpur"]};const grid=document.querySelector("#grid"),player=document.querySelector("#player"),audio=document.querySelector("#audio"),now=document.querySelector("#now"),state=document.querySelector("#state"),province=document.querySelector("#province"),district=document.querySelector("#district"),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));function districts(){district.innerHTML='<option value="">सबै जिल्ला</option>'+((REGIONS[province.value]||[]).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join(""))}
async function load(){const q=document.querySelector("#q").value.trim(),j=await (await fetch("/api/fm/stations?q="+encodeURIComponent(q)+"&province="+encodeURIComponent(province.value)+"&district="+encodeURIComponent(district.value))).json();document.querySelector("#fmMeta").textContent=j.total+" स्टेशन";grid.innerHTML=j.items.length?j.items.map(s=>'<article class="station"><div class="logo">FM</div><div><h2>'+esc(s.name_ne)+'</h2><p>'+esc(s.name_en)+(s.frequency?" · "+esc(s.frequency)+" MHz":"")+'</p><p>'+esc(s.category)+" · "+esc(s.municipality||"")+" · "+esc(s.district)+'</p>'+(s.playable?'<span class="verify">उपलब्ध</span>':'<span class="pending">अहिले उपलब्ध छैन</span>')+'</div>'+(s.playable?'<button class="btn" data-play="'+esc(s.id)+'" data-name="'+esc(s.name_ne)+'">▶ सुन्नुहोस्</button>':(s.website?'<a href="'+esc(s.website)+'" target="_blank" rel="noopener noreferrer">Official site ↗</a>':'<span></span>'))+'</article>').join(""):'<div class="empty">यस filter मा station भेटिएन।</div>';grid.querySelectorAll("[data-play]").forEach(b=>b.onclick=()=>play(b.dataset.play,b.dataset.name))}
async function play(id,name){state.textContent="रेडियो खोलिँदैछ…";player.hidden=false;now.textContent=name;const j=await (await fetch("/api/fm/play/"+encodeURIComponent(id))).json();if(!j.ok){state.textContent="रेडियो अहिले उपलब्ध छैन";return}audio.src=j.station.stream;try{await audio.play();state.textContent="Live · "+j.station.rights}catch(e){state.textContent="Play थिचेर सुरु गर्नुहोस् · Browser autoplay रोकिएको हुन सक्छ"}}
audio.onerror=()=>state.textContent="Broadcaster stream अहिले चलेन। केहीबेरपछि फेरि प्रयास गर्नुहोस्।";document.querySelector("#stop").onclick=()=>{audio.pause();audio.removeAttribute("src");audio.load();player.hidden=true};document.querySelector("#go").onclick=load;document.querySelector("#q").onkeydown=e=>{if(e.key==="Enter")load()};province.onchange=()=>{districts();load()};district.onchange=load;districts();load().catch(()=>grid.innerHTML='<div class="empty">रेडियो सूची अहिले खुल्न सकेन।</div>');
</script>
<script id="nm-fm-v2-enhancement-20260926">
(async function(){
  const f=await fetch('/api/flags',{cache:'no-store'}).then(function(r){return r.json()}).catch(function(){return {flags:{}}});
  if(!f.flags||!f.flags.fm_directory_v2)return;
  const qEl=document.getElementById('q'),provinceEl=document.getElementById('province'),districtEl=document.getElementById('district'),
        goEl=document.getElementById('go'),gridEl=document.getElementById('grid'),metaEl=document.getElementById('fmMeta'),
        playerEl=document.getElementById('player'),audioEl=document.getElementById('audio'),nowEl=document.getElementById('now'),
        stateEl=document.getElementById('state'),stopEl=document.getElementById('stop');
  if(!qEl||!provinceEl||!districtEl||!goEl||!gridEl||!metaEl||!playerEl||!audioEl)return;
  const NE='०१२३४५६७८९', ne=function(v){return String(v).replace(/[0-9]/g,function(d){return NE[Number(d)]})};
  const esc2=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  const favKey='nm.v1.fm.favorites',recentKey='nm.v1.fm.recent';
  const read=function(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return []}};
  const write=function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
  let favs=read(favKey),recent=read(recentKey),favOnly=false,current=null,retries=0,retryTimer=0,sleepTimer=0,lastItems=[];
  const tools=document.createElement('div');tools.className='nm-fm-v2-tools';
  tools.innerHTML='<select id="nmFmLang" aria-label="भाषा"><option value="">सबै भाषा</option></select>'+
    '<label class="nm-fm-v2-toggle"><input id="nmFmStream" type="checkbox"> काम गर्ने stream मात्र</label>'+
    '<button type="button" class="nm-fm-v2-fav" id="nmFmFavOnly">★ मनपर्ने</button>';
  const searchBox=document.querySelector('.search');searchBox.insertAdjacentElement('afterend',tools);
  const recentBox=document.createElement('section');recentBox.className='nm-fm-v2-recent';recentBox.hidden=true;
  recentBox.innerHTML='<strong>हालै सुनेको</strong><div class="nm-fm-v2-recent-list"></div>';
  tools.insertAdjacentElement('afterend',recentBox);
  const langEl=document.getElementById('nmFmLang'),streamEl=document.getElementById('nmFmStream'),favOnlyEl=document.getElementById('nmFmFavOnly');
  const playerTools=document.createElement('div');playerTools.className='nm-fm-v2-player-tools';
  playerTools.innerHTML='<label>Sleep <select id="nmFmSleep"><option value="0">off</option><option value="15">15 मिनेट</option><option value="30">30 मिनेट</option><option value="60">60 मिनेट</option></select></label>';
  audioEl.insertAdjacentElement('afterend',playerTools);
  const sleepEl=document.getElementById('nmFmSleep');

  function setState(kind,msg){stateEl.innerHTML=(kind==='playing'?'<span class="nm-fm-v2-pulse"></span>':'')+esc2(msg)}
  function stopAudio(hide){
    clearTimeout(retryTimer);retries=0;current=null;
    try{audioEl.pause();audioEl.removeAttribute('src');audioEl.load()}catch(e){}
    if(hide)playerEl.hidden=true;
  }
  function remember(s){
    recent=[s.slug].concat(recent.filter(function(x){return x!==s.slug})).slice(0,10);
    write(recentKey,recent);renderRecent();
  }
  function renderRecent(){
    const box=recentBox.querySelector('.nm-fm-v2-recent-list');
    const rows=recent.map(function(slug){return lastItems.find(function(x){return x.slug===slug})}).filter(Boolean);
    recentBox.hidden=!rows.length;
    box.innerHTML=rows.map(function(s){return '<button type="button" data-rslug="'+esc2(s.slug)+'">'+esc2(s.name_ne)+'</button>'}).join('');
    box.querySelectorAll('[data-rslug]').forEach(function(b){b.onclick=function(){const s=lastItems.find(function(x){return x.slug===b.dataset.rslug});if(s&&s.playable)playV2(s)}});
  }
  function mediaSession(s){
    if(!('mediaSession' in navigator))return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:s.name_ne,artist:[s.frequency?s.frequency+' MHz':'',s.district_ne||s.district||''].filter(Boolean).join(' · '),album:'Nepal Miti FM',artwork:s.logo_url?[{src:s.logo_url}]:[]});
      navigator.mediaSession.setActionHandler('play',function(){audioEl.play().catch(function(){})});
      navigator.mediaSession.setActionHandler('pause',function(){audioEl.pause()});
      navigator.mediaSession.setActionHandler('stop',function(){stopAudio(true)});
    }catch(e){}
  }
  async function attachAndPlay(){
    if(!current)return;
    setState(retries?'reconnecting':'loading',retries?'पुनः जडान हुँदैछ…':'जडान हुँदैछ…');
    const j=await fetch('/api/fm/v2/play/'+encodeURIComponent(current.slug),{cache:'no-store'}).then(function(r){return r.json()}).catch(function(){return null});
    if(!j||!j.ok){setState('failed','स्टेशन अहिले उपलब्ध छैन');return}
    audioEl.src=j.station.stream;
    try{await audioEl.play()}catch(e){setState('paused','Play थिचेर सुरु गर्नुहोस्')}
  }
  function scheduleReconnect(){
    if(!current)return;
    const delays=[1000,2000,4000,8000,15000];
    if(retries>=delays.length){setState('failed','स्टेशन अहिले उपलब्ध छैन · फेरि प्रयास गर्नुहोस्');return}
    setState('reconnecting','पुनः जडान हुँदैछ…');
    clearTimeout(retryTimer);retryTimer=setTimeout(function(){retries++;attachAndPlay()},delays[retries]);
  }
  async function playV2(s){
    stopAudio(false);current=s;retries=0;playerEl.hidden=false;nowEl.textContent=s.name_ne;remember(s);mediaSession(s);await attachAndPlay();
  }
  function toggleFav(slug){
    favs=favs.includes(slug)?favs.filter(function(x){return x!==slug}):[slug].concat(favs.filter(function(x){return x!==slug}));
    write(favKey,favs);render(lastItems);
  }
  function statusBadge(s){
    if(s.status==='verified')return '<span class="nm-fm-v2-status ok">✓ प्रमाणित stream</span>';
    if(s.status==='offline')return '<span class="nm-fm-v2-status off">अहिले अफलाइन</span>';
    return '<span class="nm-fm-v2-status none">stream उपलब्ध छैन</span>';
  }
  function render(items){
    const rows=favOnly?items.filter(function(s){return favs.includes(s.slug)}):items;
    gridEl.innerHTML=rows.length?rows.map(function(s){
      const mon=(s.name_ne||'FM').trim().slice(0,1);
      const action=s.playable?'<button class="btn" type="button" data-v2play="'+esc2(s.slug)+'">▶ सुन्नुहोस्</button>':
        (s.website?'<a class="btn" style="text-decoration:none;display:inline-block" target="_blank" rel="noopener noreferrer" href="'+esc2(s.website)+'">वेबसाइट ↗</a>':'');
      return '<article class="station"><div class="logo">'+esc2(mon)+'</div><div><h2>'+esc2(s.name_ne)+'</h2><p>'+esc2(s.name_en||'')+(s.frequency?' · '+ne(s.frequency)+' MHz':'')+'</p><p>'+esc2(s.district_ne||s.district||'')+(s.province_ne?' · '+esc2(s.province_ne):'')+(s.languages&&s.languages.length?' · '+esc2(s.languages.join(' / ')):'')+'</p>'+statusBadge(s)+'</div><div class="nm-fm-v2-card-actions"><button class="nm-fm-v2-star '+(favs.includes(s.slug)?'on':'')+'" type="button" aria-label="मनपर्ने" data-v2fav="'+esc2(s.slug)+'">'+(favs.includes(s.slug)?'★':'☆')+'</button>'+action+'</div></article>';
    }).join(''):'<div class="empty">यस छनोटमा स्टेशन भेटिएन।</div>';
    gridEl.querySelectorAll('[data-v2play]').forEach(function(b){b.onclick=function(){const s=lastItems.find(function(x){return x.slug===b.dataset.v2play});if(s)playV2(s)}});
    gridEl.querySelectorAll('[data-v2fav]').forEach(function(b){b.onclick=function(){toggleFav(b.dataset.v2fav)}});
    renderRecent();
  }
  async function loadV2(){
    gridEl.innerHTML='<div class="empty">लोड हुँदैछ…</div>';
    const u=new URL('/api/fm/v2/stations',location.origin);
    if(qEl.value.trim())u.searchParams.set('q',qEl.value.trim());
    if(provinceEl.value)u.searchParams.set('province',provinceEl.value);
    if(districtEl.value)u.searchParams.set('district',districtEl.value);
    if(langEl.value)u.searchParams.set('language',langEl.value);
    if(streamEl.checked)u.searchParams.set('stream','verified');
    const j=await fetch(u,{cache:'no-store'}).then(function(r){return r.json()}).catch(function(){return null});
    if(!j||!j.ok){gridEl.innerHTML='<div class="empty">रेडियो सूची अहिले खुल्न सकेन। फेरि प्रयास गर्नुहोस्।</div>';return}
    lastItems=j.items||[];
    metaEl.textContent=ne(j.total)+' / '+ne(j.catalog_total||j.total)+' स्टेशन · '+ne(j.verified_total||0)+' live';
    if(langEl.options.length<=1)(j.languages||[]).forEach(function(x){const o=document.createElement('option');o.value=x;o.textContent=x;langEl.appendChild(o)});
    render(lastItems);
  }
  audioEl.onerror=scheduleReconnect;
  audioEl.addEventListener('stalled',scheduleReconnect);
  audioEl.addEventListener('playing',function(){retries=0;setState('playing','Live')});
  audioEl.addEventListener('pause',function(){if(current&&!audioEl.ended)setState('paused','रोकिएको')});
  sleepEl.onchange=function(){clearTimeout(sleepTimer);const m=Number(sleepEl.value);if(m)sleepTimer=setTimeout(function(){audioEl.pause();setState('paused','Sleep timer पूरा भयो')},m*60000)};
  stopEl.onclick=function(){stopAudio(true)};
  favOnlyEl.onclick=function(){favOnly=!favOnly;favOnlyEl.classList.toggle('on',favOnly);render(lastItems)};
  goEl.onclick=loadV2;qEl.onkeydown=function(e){if(e.key==='Enter')loadV2()};
  provinceEl.onchange=function(){if(typeof districts==='function')districts();loadV2()};districtEl.onchange=loadV2;langEl.onchange=loadV2;streamEl.onchange=loadV2;
  await loadV2();
})().catch(function(){});
</script></body></html>`}
