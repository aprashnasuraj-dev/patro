import { createClient } from "npm:@supabase/supabase-js@2";
const SOURCES=[
 {id:"onlinekhabar",name:"OnlineKhabar",url:"https://www.onlinekhabar.com/feed",home:"https://www.onlinekhabar.com",lang:"ne",enabled:true},
 {id:"kantipur",name:"Kantipur",url:"https://ekantipur.com/feed",home:"https://ekantipur.com",lang:"ne",enabled:true},
 {id:"setopati",name:"Setopati",url:"https://www.setopati.com/feed",home:"https://www.setopati.com",lang:"ne",enabled:true},
 {id:"ratopati",name:"Ratopati",url:"https://www.ratopati.com/feed",home:"https://www.ratopati.com",lang:"ne",enabled:true},
 {id:"nagarik",name:"Nagarik News",url:"https://nagariknews.nagariknetwork.com/feed",home:"https://nagariknews.nagariknetwork.com",lang:"ne",enabled:true},
 {id:"annapurna",name:"Annapurna Post",url:"https://annapurnapost.com/feed",home:"https://annapurnapost.com",lang:"ne",enabled:true},
 {id:"nepalpress",name:"Nepal Press",url:"https://www.nepalpress.com/feed/",home:"https://www.nepalpress.com",lang:"ne",enabled:true},
 {id:"nepalkhabar",name:"Nepal Khabar",url:"https://nepalkhabar.com/feed",home:"https://nepalkhabar.com",lang:"ne",enabled:true},
 {id:"khabarhub",name:"Khabarhub",url:"https://khabarhub.com/feed",home:"https://khabarhub.com",lang:"ne",enabled:true},
 {id:"himalkhabar",name:"Himal Khabar",url:"https://www.himalkhabar.com/feed",home:"https://www.himalkhabar.com",lang:"ne",enabled:true},
 {id:"ujyaalo",name:"Ujyaalo Online",url:"https://ujyaaloonline.com/feed",home:"https://ujyaaloonline.com",lang:"ne",enabled:true},
 {id:"deshsanchar",name:"Desh Sanchar",url:"https://deshsanchar.com/feed",home:"https://deshsanchar.com",lang:"ne",enabled:true},
 {id:"shilapatra",name:"Shilapatra",url:"https://shilapatra.com/feed",home:"https://shilapatra.com",lang:"ne",enabled:true},
 {id:"imagekhabar",name:"Image Khabar",url:"https://www.imagekhabar.com/feed",home:"https://www.imagekhabar.com",lang:"ne",enabled:true},
 {id:"nepalviews",name:"Nepal Views",url:"https://www.nepalviews.com/feed",home:"https://www.nepalviews.com",lang:"ne",enabled:false},
 {id:"gorkhapatra",name:"Gorkhapatra Online",url:"https://gorkhapatraonline.com/feed",home:"https://gorkhapatraonline.com",lang:"ne",enabled:true},
 {id:"kathmandupost",name:"The Kathmandu Post",url:"https://kathmandupost.com/rss",home:"https://kathmandupost.com",lang:"en",enabled:true},
 {id:"myrepublica",name:"myRepublica",url:"https://myrepublica.nagariknetwork.com/feed",home:"https://myrepublica.nagariknetwork.com",lang:"en",enabled:true},
 {id:"risingnepal",name:"The Rising Nepal",url:"https://risingnepaldaily.com/feed",home:"https://risingnepaldaily.com",lang:"en",enabled:true},
 {id:"bbc-nepali",name:"BBC News नेपाली",url:"https://feeds.bbci.co.uk/nepali/rss.xml",home:"https://www.bbc.com/nepali",lang:"ne",enabled:true},
 {id:"bizmandu",name:"Bizmandu",url:"https://bizmandu.com/feed/",home:"https://bizmandu.com",lang:"ne",enabled:true},
 {id:"arthasarokar",name:"Arthasarokar",url:"https://arthasarokar.com/feed",home:"https://arthasarokar.com",lang:"ne",enabled:true},
 {id:"sharesansar",name:"ShareSansar",url:"https://www.sharesansar.com/feed",home:"https://www.sharesansar.com",lang:"en",enabled:true},
 {id:"techpana",name:"TechPana",url:"https://techpana.com/feed",home:"https://techpana.com",lang:"ne",enabled:true},
 {id:"ictsamachar",name:"ICT Samachar",url:"https://ictsamachar.com/feed",home:"https://ictsamachar.com",lang:"ne",enabled:true},
 {id:"hamrokhelkud",name:"HamroKhelkud",url:"https://www.hamrokhelkud.com/feed",home:"https://www.hamrokhelkud.com",lang:"ne",enabled:true},
 {id:"merokhel",name:"MeroKhel",url:"https://www.merokhel.com/feed",home:"https://www.merokhel.com",lang:"ne",enabled:false},
 {id:"nepallivetoday",name:"Nepal Live Today",url:"https://www.nepallivetoday.com/feed",home:"https://www.nepallivetoday.com",lang:"en",enabled:false}
];
let CACHE:{at:number;items:any[];health:any[]}|null=null;
const entity=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
const text=(s:string)=>entity(s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const tag=(x:string,n:string)=>{const m=x.match(new RegExp("<"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+n+">","i"));return text(m?.[1]||"")};
function category(t:string){const s=t.normalize("NFC").toLowerCase();if(/राजनीति|सरकार|संसद|मन्त्री|चुनाव|निर्वाचन|politic|election|parliament|government/.test(s))return"राजनीति";if(/अर्थ|व्यापार|व्यवसाय|बजार|शेयर|बैंक|finance|econom|market|business|stock/.test(s))return"अर्थ/व्यवसाय";if(/प्रदेश|पालिका|महानगर|नगरपालिका|गाउँपालिका|स्थानीय|district|province|municipal|local/.test(s))return"प्रदेश/स्थानीय";if(/विश्व|अन्तर्राष्ट्रिय|भारत|चीन|अमेरिका|international|world|global|india|china|america/.test(s))return"विश्व";if(/खेल|फुटबल|क्रिकेट|football|cricket|sports/.test(s))return"खेलकुद";if(/मनोरञ्जन|चलचित्र|संगीत|फिल्म|कलाकार|entertainment|movie|music|cinema/.test(s))return"मनोरञ्जन";if(/विज्ञान|science|research|अन्तरिक्ष|space/.test(s))return"विज्ञान";if(/प्रविधि|technology|tech|\bai\b|इन्टरनेट|मोबाइल|साइबर|software|digital/.test(s))return"प्रविधि";if(/स्वास्थ्य|अस्पताल|रोग|health|hospital|disease|medicine/.test(s))return"स्वास्थ्य";if(/शिक्षा|विद्यालय|विश्वविद्यालय|education|school|university|exam/.test(s))return"शिक्षा";if(/जीवनशैली|खाना|यात्रा|फेसन|lifestyle|travel|food|fashion/.test(s))return"जीवनशैली";if(/वातावरण|जलवायु|मौसम|environment|climate|pollution|weather/.test(s))return"वातावरण";if(/विचार|सम्पादकीय|opinion|editorial|column/.test(s))return"विचार";if(/प्रवास|वैदेशिक|diaspora|migration|migrant/.test(s))return"प्रवास";if(/समाज|अपराध|दुर्घटना|समुदाय|society|crime|community|accident/.test(s))return"समाज";return"अन्य"}
async function one(s:any){try{const r=await fetch(s.url,{headers:{"user-agent":"Nepal-Miti-Samachar/1.0 (+https://patro-blush.vercel.app/samachar)","accept":"application/rss+xml, application/atom+xml, application/xml, text/xml"},signal:AbortSignal.timeout(9000),redirect:"follow"});if(!r.ok)throw Error("HTTP "+r.status);const len=Number(r.headers.get("content-length")||0);if(len>1500000)throw Error("feed_too_large");const raw=(await r.text()).slice(0,1500000),blocks=[...raw.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].slice(0,18).map(m=>m[2]);const items=blocks.map((b,i)=>{const title=tag(b,"title"),link=tag(b,"link")||(b.match(/<link[^>]+href=["']([^"']+)/i)?.[1]||""),desc=tag(b,"description")||tag(b,"summary")||tag(b,"content"),pub=tag(b,"pubDate")||tag(b,"published")||tag(b,"updated");try{const u=new URL(link);if(!["http:","https:"].includes(u.protocol))return null}catch{return null}return{id:s.id+"-"+i+"-"+title.slice(0,20),source_id:s.id,source:s.name,title,excerpt:desc.slice(0,260),url:link,published_at:pub,category:category(title+" "+desc),language:s.lang}}).filter((x:any)=>x?.title);return{ok:true,source:s.name,items}}catch(e){return{ok:false,source:s.name,error:String(e?.message||e),items:[]}}}
function dedupe(items:any[]){const seenUrl=new Set<string>(),seenTitle=new Set<string>(),out:any[]=[];for(const x of items.sort((a,b)=>Date.parse(b.published_at||"0")-Date.parse(a.published_at||"0"))){const tk=String(x.title||"").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,"").replace(/\s+/g," ").trim();if(seenUrl.has(x.url)||seenTitle.has(tk))continue;seenUrl.add(x.url);seenTitle.add(tk);out.push(x)}return out}async function aggregate(){if(CACHE&&Date.now()-CACHE.at<1800000)return CACHE;const enabled=SOURCES.filter((s:any)=>s.enabled!==false),out=await Promise.all(enabled.map(one)),items=dedupe(out.flatMap(x=>x.items));CACHE={at:Date.now(),items,health:out.map(x=>({source:x.source,ok:x.ok,error:x.ok?undefined:x.error,count:x.items.length}))};return CACHE}

function newsAdmin(){
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 return url&&key?createClient(url,key,{auth:{persistSession:false}}):null;
}
function canonicalUrl(u:string){try{const x=new URL(u);for(const k of [...x.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$|^ref$/i.test(k))x.searchParams.delete(k);x.hash="";return x.toString()}catch{return u}}
function plainExcerpt(v:string,max=300){const t=text(v||"").replace(/\s+/g," ").trim();if(t.length<=max)return t;const cut=t.slice(0,max),sp=cut.lastIndexOf(" ");return (sp>max*.6?cut.slice(0,sp):cut)+"…"}
async function shaId(v:string){const b=new TextEncoder().encode(v),d=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const NEWS_STOP=new Set(["र","तथा","पनि","छ","छन्","हो","भन्दै","गर्न","भएको","हुने","गरेको","गर्ने","थियो","the","a","an","of","in","to","and","on","for","with"]);
const NEWS_SUFFIX=["हरूलाई","हरूको","हरूले","हरू","द्वारा","लाई","बाट","सँग","देखि","सम्म","ले","को","का","की","मा"];
function nstem(w:string){for(const x of NEWS_SUFFIX)if(w.length>x.length+1&&w.endsWith(x))return w.slice(0,-x.length);return w}
function ntokens(t:string){return new Set(t.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu," ").split(/\s+/).map(nstem).filter(w=>w.length>1&&!NEWS_STOP.has(w)))}
function njacc(a:Set<string>,b:Set<string>){let i=0;for(const x of a)if(b.has(x))i++;const u=a.size+b.size-i;return u?i/u:0}
function ninter(a:Set<string>,b:Set<string>){let i=0;for(const x of a)if(b.has(x))i++;return i}
function fixedCategory(v:string){
 if(v==="राजनीति")return"politics"; if(v==="अर्थ/व्यवसाय")return"economy"; if(v==="खेलकुद")return"sports";
 if(v==="प्रदेश/स्थानीय")return"province"; if(v==="विश्व")return"world"; if(v==="प्रविधि"||v==="विज्ञान")return"tech";
 if(v==="मनोरञ्जन")return"entertainment"; if(v==="जीवनशैली")return"society"; if(["समाज","स्वास्थ्य","शिक्षा","वातावरण","विचार","प्रवास"].includes(v))return"society"; return null;
}
async function newsProvince(title:string,excerpt:string,db:any){
 const {data}=await db.from("np_districts").select("name_ne,name_en,province");const hay=(" "+title+" "+excerpt+" ").normalize("NFC").toLowerCase(),hits=new Set<number>();
 for(const d of data||[]){for(const n of [d.name_ne,d.name_en]){const z=String(n||"").toLowerCase();if(z.length>3&&hay.includes(z)){hits.add(Number(d.province));break}}}
 return hits.size===1?[...hits][0]:null;
}
async function persistNews(force=false){
 const db=newsAdmin();if(!db)return {ok:false,error:"db_unavailable"};
 if(!force){const {data:last}=await db.from("news_items").select("fetched_at").order("fetched_at",{ascending:false}).limit(1);if(last?.[0]&&Date.now()-Date.parse(last[0].fetched_at)<10*60_000)return {ok:true,skipped:true}}
 const d=await aggregate(),now=new Date(),rows:any[]=[];
 for(const x of d.items){
   const url=canonicalUrl(x.url),id=await shaId(url),raw=plainExcerpt(x.excerpt||"",300);let pub=Date.parse(x.published_at||"");
   if(!Number.isFinite(pub))pub=now.getTime();if(pub>now.getTime())pub=now.getTime();
   rows.push({id,source_id:x.source_id,title:String(x.title||"").slice(0,500),excerpt:raw,url,image_url:null,category_raw:x.category||null,category:fixedCategory(x.category),province:await newsProvince(x.title||"",raw,db),published_at:new Date(pub).toISOString(),fetched_at:now.toISOString()});
 }
 for(let i=0;i<rows.length;i+=100){await db.from("news_items").upsert(rows.slice(i,i+100),{onConflict:"id"})}
 for(const h of d.health){const src=SOURCES.find(x=>x.name===h.source);if(!src)continue;await db.from("news_source_health").upsert({source_id:src.id,last_ok_at:h.ok?now.toISOString():undefined,last_error_at:h.ok?undefined:now.toISOString(),last_error:h.ok?null:String(h.error||"fetch_failed").slice(0,500),consecutive_failures:h.ok?0:1},{onConflict:"source_id"})}
 const cutoff=new Date(Date.now()-48*3600_000).toISOString(),{data:recent}=await db.from("news_items").select("id,source_id,title,published_at,category,province,excerpt").gte("published_at",cutoff).order("published_at",{ascending:false});
 const a=recent||[],tok=a.map((x:any)=>ntokens(x.title)),parent=a.map((_:any,i:number)=>i),find=(i:number):number=>parent[i]===i?i:(parent[i]=find(parent[i]));
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){if(Date.parse(a[i].published_at)-Date.parse(a[j].published_at)>36*3600_000)break;if(a[i].source_id===a[j].source_id||tok[i].size<3||tok[j].size<3)continue;if(njacc(tok[i],tok[j])>=.53)parent[find(j)]=find(i)}
 const groups=new Map<number,any[]>();a.forEach((x:any,i:number)=>{const r=find(i);groups.set(r,[...(groups.get(r)||[]),x])});
 const clusters=[...groups.values()].map(g=>{const lead=[...g].filter(x=>x.excerpt).sort((x,y)=>Date.parse(x.published_at)-Date.parse(y.published_at))[0]||g[0];const provinces=new Set(g.map(x=>x.province).filter(Boolean));return{id:lead.id,item_ids:g.map(x=>x.id),source_count:new Set(g.map(x=>x.source_id)).size,lead_published_at:lead.published_at,category:lead.category,province:provinces.size===1?[...provinces][0]:null,updated_at:now.toISOString()}}).filter(x=>x.source_count>=1);
 for(let i=0;i<clusters.length;i+=100)await db.from("news_clusters").upsert(clusters.slice(i,i+100),{onConflict:"id"});
 const old=new Date(Date.now()-14*86400_000).toISOString();await db.from("news_clusters").delete().lt("lead_published_at",old);await db.from("news_items").delete().lt("published_at",old);
 return {ok:true,items:rows.length,clusters:clusters.length,health:d.health.length};
}

async function rebuildNewsClusters(db:any){
 const cutoff=new Date(Date.now()-48*3600_000).toISOString(),{data:recent}=await db.from("news_items").select("id,source_id,title,published_at,category,province,excerpt").gte("published_at",cutoff).order("published_at",{ascending:false});
 const a=recent||[],tok=a.map((x:any)=>ntokens(x.title)),parent=a.map((_:any,i:number)=>i),find=(i:number):number=>parent[i]===i?i:(parent[i]=find(parent[i]));
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){if(Date.parse(a[i].published_at)-Date.parse(a[j].published_at)>36*3600_000)break;if(a[i].source_id===a[j].source_id||tok[i].size<3||tok[j].size<3)continue;const sim=njacc(tok[i],tok[j]),shared=ninter(tok[i],tok[j]);if(sim===1||(sim>=.46&&shared>=4))parent[find(j)]=find(i)}
 const groups=new Map<number,any[]>();a.forEach((x:any,i:number)=>{const r=find(i);groups.set(r,[...(groups.get(r)||[]),x])});
 await db.from("news_clusters").delete().gte("lead_published_at",cutoff);
 const now=new Date().toISOString(),clusters=[...groups.values()].map(g=>{const lead=[...g].filter(x=>x.excerpt).sort((x,y)=>Date.parse(x.published_at)-Date.parse(y.published_at))[0]||g[0],ps=new Set(g.map(x=>x.province).filter(Boolean));return{id:lead.id,item_ids:g.map(x=>x.id),source_count:new Set(g.map(x=>x.source_id)).size,lead_published_at:lead.published_at,category:lead.category,province:ps.size===1?[...ps][0]:null,updated_at:now}});
 for(let i=0;i<clusters.length;i+=100)await db.from("news_clusters").upsert(clusters.slice(i,i+100),{onConflict:"id"});
 const old=new Date(Date.now()-14*86400_000).toISOString();await db.from("news_clusters").delete().lt("lead_published_at",old);await db.from("news_items").delete().lt("published_at",old);
 return clusters.length;
}
async function persistNewsBatch(offset=0,limit=6){
 const db=newsAdmin();if(!db)return {ok:false,error:"db_unavailable"};
 const enabled=SOURCES.filter((x:any)=>x.enabled!==false),batch=enabled.slice(offset,offset+limit),out=await Promise.all(batch.map(one)),now=new Date(),{data:districts}=await db.from("np_districts").select("name_ne,name_en,province"),rows:any[]=[];
 const detect=(title:string,excerpt:string)=>{const hay=(" "+title+" "+excerpt+" ").normalize("NFC").toLowerCase(),hits=new Set<number>();for(const d of districts||[]){for(const n of [d.name_ne,d.name_en]){const z=String(n||"").toLowerCase();if(z.length>3&&hay.includes(z)){hits.add(Number(d.province));break}}}return hits.size===1?[...hits][0]:null};
 for(const x of dedupe(out.flatMap(x=>x.items))){
   const url=canonicalUrl(x.url),id=await shaId(url),ex=plainExcerpt(x.excerpt||"",300);let pub=Date.parse(x.published_at||"");if(!Number.isFinite(pub))pub=now.getTime();if(pub>now.getTime())pub=now.getTime();
   rows.push({id,source_id:x.source_id,title:String(x.title||"").slice(0,500),excerpt:ex,url,image_url:null,category_raw:x.category||null,category:fixedCategory(x.category),province:detect(x.title||"",ex),published_at:new Date(pub).toISOString(),fetched_at:now.toISOString()});
 }
 if(rows.length)for(let i=0;i<rows.length;i+=100)await db.from("news_items").upsert(rows.slice(i,i+100),{onConflict:"id"});
 for(const h of out){const src=SOURCES.find(x=>x.name===h.source);if(!src)continue;const prev=await db.from("news_source_health").select("consecutive_failures").eq("source_id",src.id).maybeSingle(),fail=h.ok?0:Number(prev.data?.consecutive_failures||0)+1;await db.from("news_source_health").upsert({source_id:src.id,last_ok_at:h.ok?now.toISOString():undefined,last_error_at:h.ok?undefined:now.toISOString(),last_error:h.ok?null:String(h.error||"fetch_failed").slice(0,500),consecutive_failures:fail},{onConflict:"source_id"})}
 const clusters=await rebuildNewsClusters(db);return {ok:true,offset,limit,sources:batch.length,items:rows.length,clusters,next:offset+limit<enabled.length?offset+limit:null,total_sources:enabled.length};
}

async function newsV2Feed(u:URL){
 const db=newsAdmin();if(!db)return json({error:"db_unavailable"},503);
 const limit=Math.min(60,Math.max(1,Number(u.searchParams.get("limit"))||20)),category=u.searchParams.get("category")||"",province=Number(u.searchParams.get("province")||0),q=(u.searchParams.get("q")||"").trim().toLowerCase();
 let cq=db.from("news_clusters").select("*").order("source_count",{ascending:false}).order("lead_published_at",{ascending:false}).limit(120);if(category)cq=cq.eq("category",category);if(province)cq=cq.eq("province",province);
 const {data:clusters,error}=await cq;if(error)return json({error:"query_failed"},503);
 const ids=[...new Set((clusters||[]).flatMap((x:any)=>x.item_ids||[]))],{data:items}=ids.length?await db.from("news_items").select("*").in("id",ids):{data:[] as any[]};
 const im=new Map((items||[]).map((x:any)=>[x.id,x])),sm=new Map(SOURCES.map(x=>[x.id,x])),out:any[]=[];
 for(const c of clusters||[]){let xs=(c.item_ids||[]).map((id:string)=>im.get(id)).filter(Boolean);if(q&&!xs.some((x:any)=>[x.title,x.excerpt,sm.get(x.source_id)?.name].join(" ").toLowerCase().includes(q)))continue;xs.sort((x:any,y:any)=>Date.parse(x.published_at)-Date.parse(y.published_at));const lead=xs.find((x:any)=>x.excerpt)||xs[0];if(!lead)continue;out.push({...c,lead:{...lead,source:sm.get(lead.source_id)?.name||lead.source_id},items:xs.map((x:any)=>({...x,source:sm.get(x.source_id)?.name||x.source_id}))});if(out.length>=limit)break}
 const {data:health}=await db.from("news_source_health").select("*");return json({ok:true,clusters:out,source_health:health||[],sources:SOURCES.map(({url,...x})=>x),updated_at:new Date().toISOString()});
}

const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=120, s-maxage=300, stale-while-revalidate=900"}});
export async function samacharApi(path:string,u:URL){
 if(path==="/api/samachar/feed"){const d=await aggregate(),q=(u.searchParams.get("q")||"").trim().toLowerCase(),cat=u.searchParams.get("category")||"",src=u.searchParams.get("source")||"",limit=Math.min(60,Math.max(1,Number(u.searchParams.get("limit"))||30)),items=d.items.filter(x=>(!q||[x.title,x.excerpt,x.source].join(" ").toLowerCase().includes(q))&&(!cat||cat==="सबै"||x.category===cat)&&(!src||x.source_id===src)).slice(0,limit);return json({ok:true,updated_at:new Date(d.at).toISOString(),returned:items.length,total_matching:items.length,items,source_health:d.health.map(x=>({source:x.source,ok:x.ok,count:x.count}))})}

 if(path==="/api/samachar/v2/feed")return await newsV2Feed(u);
 if(path==="/api/samachar/v2/refresh"){const off=Math.max(0,Number(u.searchParams.get("offset")||0)),lim=Math.min(8,Math.max(1,Number(u.searchParams.get("limit")||6)));return json(await persistNewsBatch(off,lim))}
 if(path==="/api/samachar/v2/health"){const db=newsAdmin();if(!db)return json({error:"db_unavailable"},503);const {data}=await db.from("news_source_health").select("*").order("source_id");return json({ok:true,items:data||[]})}
 if(path==="/api/samachar/sources")return json({ok:true,items:SOURCES.map(({url,...x})=>x)});
 return null;
}
export function samacharPage(){return `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#8f1f21"><title>समाचार · Nepal Miti</title><style>
:root{--red:#9a2426;--ink:#191d1a;--muted:#69716b;--line:#dddeda;--paper:#fffdfa;--bg:#f2f0ea}*{box-sizing:border-box}body{margin:0;font-family:Inter,"Noto Sans Devanagari",system-ui,sans-serif;background:var(--bg);color:var(--ink)}button,input{font:inherit}.top{position:sticky;top:0;z-index:20;background:#fffdfaf2;border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}nav{width:min(1160px,calc(100% - 24px));min-height:62px;margin:auto;display:flex;align-items:center;justify-content:space-between}nav a{color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:8px 10px}.wrap{width:min(1160px,calc(100% - 24px));margin:auto;padding:20px 0 70px}.mast{border-top:6px solid var(--ink);border-bottom:1px solid var(--ink);padding:18px 0;display:grid;grid-template-columns:1fr auto;align-items:end}.mast h1{font-family:Georgia,"Noto Serif Devanagari",serif;font-size:clamp(48px,8vw,96px);letter-spacing:-.05em;margin:0}.mast p{max-width:450px;color:var(--muted);line-height:1.5}.tools{display:grid;grid-template-columns:1fr auto;gap:8px;margin:14px 0}.tools input{border:1px solid var(--line);background:var(--paper);border-radius:12px;padding:12px}.btn{border:0;background:var(--red);color:white;border-radius:12px;padding:10px 15px;font-weight:850;cursor:pointer}.cats{display:flex;overflow:auto;gap:6px;padding-bottom:12px}.cats button{white-space:nowrap;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:7px 10px;cursor:pointer}.cats .on{background:var(--ink);color:white}.meta{font-size:11px;color:var(--muted);margin-bottom:10px}.feed{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.story{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;min-height:245px}.story:first-child{grid-column:span 2;background:linear-gradient(145deg,#fffdfa,#f4e8e2);border-color:#cfae9e}.story h2{font-family:Georgia,"Noto Serif Devanagari",serif;font-size:21px;line-height:1.35;margin:9px 0}.story:first-child h2{font-size:clamp(26px,4vw,42px)}.story p{color:#535b55;line-height:1.55;font-size:13px}.source{font-size:11px;color:var(--red);font-weight:850}.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:8px}.foot a{color:var(--red);font-weight:850;text-decoration:none}.status{font-size:10px;border-radius:99px;background:#e7f3ea;color:#27663b;padding:4px 7px}.notice{margin-top:14px;border:1px dashed #bbb8b0;padding:11px;border-radius:12px;color:var(--muted);font-size:12px;line-height:1.5}.empty{grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)}@media(max-width:850px){.feed{grid-template-columns:1fr 1fr}.mast{grid-template-columns:1fr}.story:first-child{grid-column:1/-1}}@media(max-width:560px){.feed{grid-template-columns:1fr}.story:first-child{grid-column:auto}.mast h1{font-size:54px}.story:first-child h2{font-size:26px}}
</style></head><body><header class="top"><nav><b>समाचार · SAMACHAR</b><div><a href="/">पात्रो</a> <a href="/explore">अन्वेषण</a></div></nav></header><main class="wrap"><section class="mast"><h1>समाचार</h1></section><div class="tools"><input id="q" type="search" placeholder="समाचार खोज्नुहोस्…"><button class="btn" id="go">खोज्नुहोस्</button></div><div class="cats" id="cats"></div><div class="meta" id="meta"></div><section class="feed" id="feed"></section><div class="notice"><b>प्रकाशकीय सीमा:</b> Nepal Miti समाचार कक्ष होइन। हामी पूर्ण लेख पुनःप्रकाशित गर्दैनौं; headline, छोटो feed excerpt, समय, category र स्रोत मात्र देखाइन्छ। प्रत्येक कार्डले मूल प्रकाशकमा लैजान्छ।</div></main><script>
const cats=["सबै","राजनीति","अर्थ/व्यवसाय","समाज","प्रदेश/स्थानीय","विश्व","खेलकुद","मनोरञ्जन","विज्ञान","प्रविधि","स्वास्थ्य","शिक्षा","जीवनशैली","वातावरण","विचार","प्रवास","अन्य"],feed=document.querySelector("#feed"),meta=document.querySelector("#meta"),bar=document.querySelector("#cats");let active="सबै";const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));bar.innerHTML=cats.map((x,i)=>'<button class="'+(i?"":"on")+'" data-cat="'+x+'">'+x+"</button>").join("");bar.querySelectorAll("button").forEach(b=>b.onclick=()=>{active=b.dataset.cat;bar.querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");load()});
function relative(x){const d=Date.parse(x);if(!d)return"समय उपलब्ध छैन";const m=Math.max(0,Math.floor((Date.now()-d)/60000));return m<60?m+" मिनेटअघि":m<1440?Math.floor(m/60)+" घण्टाअघि":Math.floor(m/1440)+" दिनअघि"}
async function load(){feed.innerHTML='<div class="empty">नयाँ समाचार लोड हुँदैछ…</div>';const q=document.querySelector("#q").value.trim(),j=await (await fetch("/api/samachar/feed?limit=45&category="+encodeURIComponent(active)+"&q="+encodeURIComponent(q))).json();const healthy=(j.source_health||[]).filter(x=>x.ok).length;meta.textContent="अपडेट: "+new Date(j.updated_at).toLocaleTimeString("ne-NP")+" · "+j.returned+" समाचार";feed.innerHTML=j.items.length?j.items.map(x=>'<article class="story"><div><span class="source">'+esc(x.source)+'</span></div><h2>'+esc(x.title)+'</h2><p>'+esc(x.excerpt||"मूल स्रोतमा पूरा समाचार पढ्नुहोस्।")+'</p><div class="foot"><small>'+relative(x.published_at)+" · "+esc(x.category)+'</small><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">मूल समाचार ↗</a></div></article>').join(""):'<div class="empty">यस छनोटमा समाचार भेटिएन वा स्रोत अस्थायी रूपमा उपलब्ध छैन।</div>'}
document.querySelector("#go").onclick=load;document.querySelector("#q").onkeydown=e=>{if(e.key==="Enter")load()};load().catch(()=>{feed.innerHTML='<div class="empty">समाचार स्रोत अहिले खुल्न सकेन। फेरि प्रयास गर्नुहोस्।</div>';meta.textContent=""});
</script><script src="/nm-foundation.js"></script><script>
(async()=>{
 const f=await fetch('/api/flags',{cache:'no-store'}).then(r=>r.json()).catch(()=>({flags:{}}));
 if(f.flags?.news_pipeline){fetch('/api/samachar/v2/refresh?offset=0&limit=6',{cache:'no-store'}).then(r=>r.json()).then(async j=>{if(j?.next!=null)fetch('/api/samachar/v2/refresh?offset='+j.next+'&limit=6',{cache:'no-store'}).catch(()=>{})}).catch(()=>{});} // news_pipeline_warm
 if(!f.flags?.news_desk)return;
 const NE='०१२३४५६७८९',ne=v=>String(v).replace(/[0-9]/g,d=>NE[+d]),esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const map={सबै:'',राजनीति:'politics','अर्थ/व्यवसाय':'economy',समाज:'society','प्रदेश/स्थानीय':'province',विश्व:'world',खेलकुद:'sports',मनोरञ्जन:'entertainment',विज्ञान:'tech',प्रविधि:'tech',स्वास्थ्य:'society',शिक्षा:'society',जीवनशैली:'entertainment',वातावरण:'society',विचार:'society',प्रवास:'society',अन्य:''};
 const feed2=document.querySelector('#feed'),meta2=document.querySelector('#meta'),q2=document.querySelector('#q'),bar2=document.querySelector('#cats');
 const top=document.createElement('section');top.className='nm-news-v2';top.style.cssText='display:grid;gap:10px;margin:0 0 14px';bar2.after(top);
 const favKey='nm.v1.news.bookmarks',muteKey='nm.v1.news.muted',followKey='nm.v1.news.followed';const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
 function rel(v){const m=Math.max(0,Math.floor((Date.now()-Date.parse(v))/60000));return m<60?ne(m)+' मिनेट अघि':m<1440?ne(Math.floor(m/60))+' घण्टा अघि':ne(Math.floor(m/1440))+' दिन अघि'}
 function card(c,hero=false){const x=c.lead,book=read(favKey,[]).some(b=>b.id===x.id);return '<article class="story" data-cl="'+esc2(c.id)+'" style="'+(hero?'grid-column:1/-1':'')+'"><div><span class="source">'+esc2(x.source)+'</span> <span class="status">'+ne(c.source_count)+' स्रोत</span></div><h2>'+esc2(x.title)+'</h2><p>'+esc2(x.excerpt||'मूल स्रोतमा पूरा समाचार पढ्नुहोस्।')+'</p><div class="foot"><small>'+rel(x.published_at)+(x.category?' · '+esc2(x.category):'')+'</small><span><button data-book="'+esc2(x.id)+'" style="border:0;background:transparent;cursor:pointer" aria-label="बुकमार्क">'+(book?'🔖':'☆')+'</button> <a href="'+esc2(x.url)+'" target="_blank" rel="noopener noreferrer">मूल स्रोतमा पढ्नुहोस् ↗</a></span></div><details><summary>अन्य स्रोत ('+ne(Math.max(0,c.items.length-1))+')</summary>'+c.items.map(i=>'<p><a href="'+esc2(i.url)+'" target="_blank" rel="noopener noreferrer">'+esc2(i.source)+' · '+esc2(i.title)+'</a></p>').join('')+'</details></article>'}
 async function load2(){
  const cat=map[active]||'',u=new URL('/api/samachar/v2/feed',location.origin);u.searchParams.set('limit','40');if(cat)u.searchParams.set('category',cat);if(q2.value.trim())u.searchParams.set('q',q2.value.trim());
  feed2.innerHTML='<div class="empty">लोड हुँदैछ…</div>';const j=await fetch(u,{cache:'no-store'}).then(r=>r.json());if(!j.ok){feed2.innerHTML='<div class="empty">समाचार अहिले खुल्न सकेन। फेरि प्रयास गर्नुहोस्।</div>';return}
  const health=j.source_health||[],ok=health.filter(x=>x.last_ok_at&&(!x.last_error_at||Date.parse(x.last_ok_at)>=Date.parse(x.last_error_at))).length;meta2.textContent=ne(ok)+'/'+ne(j.sources.length)+' स्रोत सक्रिय';
  const c=j.clusters||[],today=c.filter(x=>new Date(x.lead_published_at).toLocaleDateString('en-CA',{timeZone:'Asia/Kathmandu'})===new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kathmandu'}));
  top.innerHTML='<div style="border:1px solid #dddeda;background:#fffdfa;border-radius:14px;padding:12px"><b>आजका ५ मुख्य समाचार</b><ol>'+today.slice(0,5).map(x=>'<li>'+esc2(x.lead.title)+'</li>').join('')+'</ol></div>'+(c[0]?'<div style="display:flex;gap:7px;overflow:auto">'+c.slice(0,10).map(x=>'<a href="'+esc2(x.lead.url)+'" target="_blank" rel="noopener noreferrer" style="min-width:260px;border:1px solid #dddeda;background:#fffdfa;border-radius:12px;padding:10px;color:#191d1a;text-decoration:none">'+esc2(x.lead.title)+'</a>').join('')+'</div>':'');
  feed2.innerHTML=c.length?c.map((x,i)=>card(x,i===0)).join(''):'<div class="empty">केही भेटिएन</div>';
  feed2.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>{let a=read(favKey,[]);const cl=c.find(x=>x.lead.id===b.dataset.book),x=cl?.lead;if(!x)return;a=a.some(z=>z.id===x.id)?a.filter(z=>z.id!==x.id):[...a,{id:x.id,title:x.title,source:x.source,url:x.url,updatedAt:new Date().toISOString()}];write(favKey,a);load2()});
 }
 document.querySelector('#go').onclick=load2;q2.onkeydown=e=>{if(e.key==='Enter')load2()};bar2.querySelectorAll('button').forEach(b=>{b.addEventListener('click',()=>setTimeout(load2,0))});
 let last=Date.now();setInterval(async()=>{if(document.hidden)return;const j=await fetch('/api/samachar/v2/feed?limit=5',{cache:'no-store'}).then(r=>r.json()).catch(()=>null);if(j?.ok&&Date.now()-last>300000){last=Date.now();const n=document.createElement('button');n.className='btn';n.textContent='नयाँ समाचार';n.onclick=()=>{n.remove();load2()};top.prepend(n)}},300000);
 await load2();
})().catch(()=>{});
</script></body></html>`}

