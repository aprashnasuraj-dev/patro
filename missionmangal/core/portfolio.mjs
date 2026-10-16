import {createHash} from 'node:crypto';
export const SITE='https://aafnaipatro.com';
export const MAX_ARTICLES=2000;
export const NAMESPACE='/blogs/';
export function slugify(input) {
 const s=String(input).normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,88).replace(/-+$/,'');
 if (!s) throw Error('English transliteration/explicit unique slug required');
 return s;
}
export function safeSlug(s) { return typeof s==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length<=88 && !['facts','api','admin','sitemap','index'].includes(s); }
export function canonical(slug){ if(!safeSlug(slug))throw Error('Invalid slug'); return SITE+NAMESPACE+slug+'/'; }
export function reserve(registry,candidate) {
 if(!Array.isArray(registry)||registry.length>=MAX_ARTICLES) throw Error('Portfolio capacity exhausted');
 const id=String(candidate.id||'').trim();
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,79}$/.test(id))throw Error('Invalid article id');
 const slug=candidate.slug?String(candidate.slug):slugify(candidate.title||'');
 if(!safeSlug(slug))throw Error('Invalid slug');
 if(registry.some(a=>a.id===id||a.slug===slug||a.url===canonical(slug)))throw Error('Duplicate id, slug or canonical URL');
 if(!String(candidate.intent||'').trim())throw Error('Editorial intent required');
 // No automatic reuse of existing slugs, including retired reservations.
 const record={id,slug,url:canonical(slug),intent:String(candidate.intent).trim(),status:'reserved'};
 return [...registry,record];
}
export function assertRegistry(registry){
 if(!Array.isArray(registry)||registry.length>MAX_ARTICLES)throw Error('Invalid portfolio size');
 const ids=new Set(), slugs=new Set(), urls=new Set();
 for(const r of registry){
  if(!r||!r.id||!safeSlug(r.slug)||r.url!==canonical(r.slug)||ids.has(r.id)||slugs.has(r.slug)||urls.has(r.url))throw Error('Registry collision or invalid canonical URL');
  if(!['reserved','draft','blocked','review','approved','rendered','published','retired'].includes(r.status))throw Error('Invalid portfolio status');
  ids.add(r.id);slugs.add(r.slug);urls.add(r.url);
 }
 return true;
}
export function fingerprint(input){return createHash('sha256').update(JSON.stringify(input)).digest('hex');}
