import {assertRegistry,MAX_ARTICLES} from './portfolio.mjs';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const key=r=>(r.type||'blog')+'/'+r.slug;
export function publishedRoutes(registry,renderedFiles){assertRegistry(registry);const out=registry.filter(r=>r.status==='published'&&renderedFiles.has(key(r)));if(out.length>MAX_ARTICLES)throw Error('Sitemap capacity exceeded');return out;}
export function sitemapXml(registry,renderedFiles){const records=publishedRoutes(registry,renderedFiles);return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+records.map(r=>'  <url><loc>'+esc(r.url)+'</loc></url>').join('\n')+'\n</urlset>\n';}
export function assertSitemap(xml,registry,renderedFiles){const routes=publishedRoutes(registry,renderedFiles);if((xml.match(/<loc>/g)||[]).length!==routes.length)throw Error('Sitemap count mismatch');for(const r of routes)if(!xml.includes('<loc>'+esc(r.url)+'</loc>'))throw Error('Sitemap missing '+r.url);return true;}
export const SITEMAP_NAME='sitemap-missionmangal.xml';
