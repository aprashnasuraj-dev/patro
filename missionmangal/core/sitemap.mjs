import {assertRegistry,MAX_ARTICLES} from './portfolio.mjs';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const key=r=>(r.type||'blog')+'/'+r.slug;
export const SITEMAP_NAME='sitemap-missionmangal.xml';
export const SITEMAP_URL_LIMIT=50000; // sitemaps.org / Google per-file limit; one file covers the whole portfolio.
export function publishedRoutes(registry,renderedFiles){assertRegistry(registry);const out=registry.filter(r=>r.status==='published'&&renderedFiles.has(key(r)));if(out.length>MAX_ARTICLES||out.length>SITEMAP_URL_LIMIT)throw Error('Sitemap capacity exceeded');return out;}
const day=v=>{const t=Date.parse(v);return Number.isNaN(t)?null:new Date(t).toISOString().slice(0,10);};
export function sitemapXml(registry,renderedFiles){const records=publishedRoutes(registry,renderedFiles);const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+records.map(r=>{const lm=day(r.updated_at||r.published_at);return '  <url><loc>'+esc(r.url)+'</loc>'+(lm?'<lastmod>'+lm+'</lastmod>':'')+'</url>';}).join('\n')+'\n</urlset>\n';if(Buffer.byteLength(xml)>50*1024*1024)throw Error('Sitemap exceeds 50 MB');return xml;}
export function assertSitemap(xml,registry,renderedFiles){const routes=publishedRoutes(registry,renderedFiles);if((xml.match(/<loc>/g)||[]).length!==routes.length)throw Error('Sitemap count mismatch');for(const r of routes)if(!xml.includes('<loc>'+esc(r.url)+'</loc>'))throw Error('Sitemap missing '+r.url);return true;}
export const robotsAddition=site=>'Sitemap: '+site+'/'+SITEMAP_NAME+'\n';
