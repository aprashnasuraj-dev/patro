import {createHash} from 'node:crypto';
export const SITE='https://aafnaipatro.com';
export const MAX_ARTICLES=2500;
export const ROUTES=Object.freeze({article:'articles',blog:'blogs',fact:'facts',answer:'what'});
export const BYLINE='AafnaiPatro Editor Team';
export function slugify(input){const s=String(input).normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,88).replace(/-+$/,'');if(!s)throw Error('Explicit English slug/transliteration required');return s;}
export function safeSlug(s){return typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=88&&!['api','admin','index','sitemap'].includes(s);}
export function pathFor(type,slug){if(!Object.hasOwn(ROUTES,type)||!safeSlug(slug))throw Error('Invalid content type/slug');return '/'+ROUTES[type]+'/'+slug+'/';}
export function canonical(typeOrSlug,slug){if(slug===undefined)return SITE+pathFor('blog',typeOrSlug);return SITE+pathFor(typeOrSlug,slug);}
export function reserve(registry,candidate){
 if(!Array.isArray(registry)||registry.length>=MAX_ARTICLES)throw Error('Portfolio capacity exhausted');
 const id=String(candidate.id||'').trim(),type=candidate.type||'blog';
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,79}$/.test(id))throw Error('Invalid article id');
 const slug=candidate.slug?String(candidate.slug):slugify(candidate.title||'');
 const url=canonical(type,slug);
 if(registry.some(r=>r.id===id||r.url===url))throw Error('Duplicate ID or canonical URL');
 if(!String(candidate.intent||'').trim())throw Error('Editorial intent required');
 // Existing site's /facts area remains authoritative. Namespace integration requires separate collision audit.
 return [...registry,{id,type,slug,url,intent:String(candidate.intent).trim(),author:BYLINE,status:'reserved'}];
}
export function assertRegistry(registry){
 if(!Array.isArray(registry)||registry.length>MAX_ARTICLES)throw Error('Invalid portfolio size');
 const ids=new Set(),urls=new Set();
 for(const r of registry){
  if(!r||!r.id||!Object.hasOwn(ROUTES,r.type||'blog')||!safeSlug(r.slug)||r.url!==canonical(r.type||'blog',r.slug)||ids.has(r.id)||urls.has(r.url))throw Error('Registry collision/invalid canonical URL');
  if(r.author&&r.author!==BYLINE)throw Error('Invalid editorial author');
  if(!['reserved','discovered','researching','sourced','draft','editing','verifying','verified','blocked','review','approved','rendered','published','retired'].includes(r.status))throw Error('Invalid portfolio status');
  ids.add(r.id);urls.add(r.url);
 }return true;
}
export function fingerprint(input){return createHash('sha256').update(JSON.stringify(input)).digest('hex');}
