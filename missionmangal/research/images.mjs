// Rights-aware image finder. A candidate is auto-accepted ONLY if the provider's own licence metadata is on the allowlist.
// Sources: NASA Image Library, Wikimedia Commons, Openverse. Output carries visible credit + source link for small-print attribution.
const OK_LIC=/^(cc0|public domain|pd\b|pdm|cc[- ]by([- ]sa)?\b(?![- ]n[cd]))/i;
const BAD_LIC=/\b(nc|nd|gfdl|fair use|all rights|non-?commercial|no derivatives)\b/i;
export const licenceOk=l=>!!l&&OK_LIC.test(String(l).trim())&&!BAD_LIC.test(l);
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;|&#39;/g,"'").replace(/\s+/g,' ').trim();
const words=s=>new Set(String(s).toLowerCase().match(/[a-z]{4,}/g)||[]);
export const relevance=(q,text)=>{const a=words(q),b=words(text);let n=0;for(const w of a)if(b.has(w))n++;return a.size?n/a.size:0;};
const get=async(f,url,ua)=>{const r=await f(url,{headers:{'user-agent':ua,accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();};
export const UA='AafnaiPatroResearchBot/1.0 (+https://aafnaipatro.com/editorial-guidelines/)';
export async function nasa(q,f){const d=await get(f,'https://images-api.nasa.gov/search?media_type=image&q='+encodeURIComponent(q),UA);
 return (d.collection?.items||[]).slice(0,8).map(i=>{const m=i.data?.[0]||{};const u=i.links?.find(l=>l.render==='image')?.href;return u&&{provider:'NASA',url:u,title:m.title,text:m.title+' '+(m.description||''),credit:'NASA'+(m.center?' / '+m.center:''),license:'NASA media (public domain unless noted)',source_url:'https://images.nasa.gov/details/'+m.nasa_id,licence_raw:'public domain'};}).filter(Boolean);}
export async function commons(q,f){const d=await get(f,'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=1200&gsrsearch='+encodeURIComponent(q+' filetype:bitmap'),UA);
 return Object.values(d.query?.pages||{}).map(p=>{const ii=p.imageinfo?.[0];if(!ii||!/^image\/(jpeg|png|webp)$/.test(ii.mime))return null;const x=ii.extmetadata||{};const lic=x.LicenseShortName?.value;return {provider:'Wikimedia Commons',url:ii.thumburl||ii.url,title:strip(x.ObjectName?.value||p.title),text:strip(x.ImageDescription?.value)+' '+p.title,credit:(strip(x.Artist?.value)||strip(x.Credit?.value)||'Wikimedia Commons contributor').slice(0,120),license:lic,source_url:ii.descriptionurl,licence_raw:lic};}).filter(Boolean);}
export async function openverse(q,f){const d=await get(f,'https://api.openverse.org/v1/images/?page_size=10&license_type=commercial,modification&q='+encodeURIComponent(q),UA);
 return (d.results||[]).map(r=>({provider:'Openverse/'+(r.source||r.provider),url:r.url,title:r.title,text:(r.title||'')+' '+(r.tags||[]).map(t=>t.name).join(' '),credit:r.creator||'Unknown creator',license:('CC '+String(r.license).toUpperCase()+' '+(r.license_version||'')).trim(),source_url:r.foreign_landing_url,licence_raw:'CC '+String(r.license).toUpperCase()}));}
export async function findImage(topic,{fetchImpl=fetch,used=new Set(),order=[nasa,commons,openverse],minRelevance=0.34}={}){
 const errors=[];
 for(const src of order){let list=[];try{list=await src(topic.query,fetchImpl);}catch(e){errors.push(src.name+': '+e.message);continue;}
  const best=list.filter(c=>/^https:\/\//.test(c.url||'')&&!used.has(c.url)&&licenceOk(c.licence_raw)&&relevance(topic.query,c.text||c.title)>=minRelevance).sort((a,b)=>relevance(topic.query,b.text)-relevance(topic.query,a.text))[0];
  if(best)return {media:{type:'image',url:best.url,alt:('Image related to '+topic.title+': '+(best.title||topic.query)).slice(0,160),credit:best.credit,license:best.license,provider:best.provider,source_url:best.source_url,rights_verified:true,rights_basis:'provider licence metadata allowlist (automated)'},errors};}
 return {media:null,errors};
}
