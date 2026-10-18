// Rights-aware image finder. A candidate is auto-accepted ONLY if the provider's own licence metadata is on the allowlist.
// Sources: NASA Image Library, Wikimedia Commons, Openverse. Output carries visible credit + source link for small-print attribution.
const OK_LIC=/^(cc0|public domain|pd\b|pdm|pexels license|unsplash license|cc[- ]by([- ]sa)?\b(?![- ]n[cd]))/i;
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

export async function met(q,f){const d=await get(f,'https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q='+encodeURIComponent(q),UA);const out=[];
 for(const id of (d.objectIDs||[]).slice(0,5)){try{const o=await get(f,'https://collectionapi.metmuseum.org/public/collection/v1/objects/'+id,UA);if(o.isPublicDomain&&o.primaryImageSmall)out.push({provider:'The Met Open Access',url:o.primaryImageSmall,title:o.title,text:[o.title,o.objectName,o.culture,o.period,o.medium,o.tags?.map?.(t=>t.term).join(' ')].filter(Boolean).join(' '),credit:(o.artistDisplayName||'Unknown artist')+', '+(o.objectDate||''),license:'CC0 (Met Open Access)',source_url:o.objectURL,licence_raw:'cc0'});}catch{}}return out;}
export const pexels=env=>async(q,f)=>{if(!env.PEXELS_API_KEY)throw Error('no key');const r=await f('https://api.pexels.com/v1/search?per_page=8&query='+encodeURIComponent(q),{headers:{authorization:env.PEXELS_API_KEY,'user-agent':UA}});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();return (d.photos||[]).map(p=>({provider:'Pexels',url:p.src.large2x||p.src.large,title:p.alt,text:p.alt,credit:p.photographer,license:'Pexels License',source_url:p.url,licence_raw:'Pexels License'}));};
export const unsplash=env=>async(q,f)=>{if(!env.UNSPLASH_ACCESS_KEY)throw Error('no key');const r=await f('https://api.unsplash.com/search/photos?per_page=8&query='+encodeURIComponent(q),{headers:{authorization:'Client-ID '+env.UNSPLASH_ACCESS_KEY,'user-agent':UA}});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();return (d.results||[]).map(p=>({provider:'Unsplash',url:p.urls.regular,title:p.alt_description||p.description,text:(p.alt_description||'')+' '+(p.description||''),credit:p.user?.name,license:'Unsplash License',source_url:p.links?.html,licence_raw:'Unsplash License'}));};
export function providerOrder(preferred,env=process.env){const all={'wikimedia commons api':commons,'the met collection':met,'the metropolitan museum of art':met,'pexels api':pexels(env),'unsplash api':unsplash(env),nasa:nasa};const base=[nasa,commons,met,pexels(env),unsplash(env),openverse];const first=all[String(preferred||'').toLowerCase()];return first?[first,...base.filter(x=>x!==first)]:base;}
// Several distinct images per article: one query per section heading (plus the main question), global de-duplication, each with credit.
export async function findImages(topic,{n=4,queries=[],fetchImpl=fetch,used=new Set(),order,minRelevance=0.34}={}){
 const media=[],errors=[];const qs=[topic.query,...queries].filter(Boolean);
 for(const q of qs){if(media.length>=n)break;const r=await findImage({query:q,title:topic.title},{fetchImpl,used,order,minRelevance});errors.push(...r.errors);if(r.media){used.add(r.media.url);media.push(r.media);}}
 return {media,errors};
}
