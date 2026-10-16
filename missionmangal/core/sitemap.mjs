import {assertRegistry,MAX_ARTICLES,NAMESPACE} from './portfolio.mjs';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export function publishedRoutes(registry,renderedFiles){
 assertRegistry(registry);
 const output=registry.filter(r=>r.status==='published' && renderedFiles.has(r.slug));
 if(output.length>MAX_ARTICLES)throw Error('Sitemap capacity exceeded');
 return output;
}
export function sitemapXml(registry,renderedFiles){
 const records=publishedRoutes(registry,renderedFiles);
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+records.map(r=>'  <url><loc>'+esc(r.url)+'</loc></url>').join('\n')+'\n</urlset>\n';
}
export function assertSitemap(xml,registry,renderedFiles){
 const routes=publishedRoutes(registry,renderedFiles);
 if((xml.match(/<loc>/g)||[]).length!==routes.length)throw Error('Sitemap count mismatch');
 for(const r of routes)if(!xml.includes('<loc>'+esc(r.url)+'</loc>'))throw Error('Sitemap missing '+r.url);
 if(xml.includes('/facts/'))throw Error('Existing Facts route must never enter Mission Mangal sitemap');
 return true;
}
export const SITEMAP_NAME='sitemap-missionmangal.xml';
