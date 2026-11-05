// Publish references to existing library sitemaps without replacing the site's
// existing robots policy or other sitemap entries.
const MAPS = [
  'https://aafnaipatro.com/sitemap-library.xml',
  'https://aafnaipatro.com/library/catalogue/sitemap.xml',
  'https://aafnaipatro.com/library/subjects/sitemap.xml',
];
export async function addLibrarySitemaps(request, response) {
  const path=new URL(request.url).pathname;
  if (!['/robots.txt','/sitemap.xml'].includes(path) || !['GET','HEAD'].includes(request.method) ||
      request.headers.has('range') || response.status!==200 || response.headers.has('content-encoding')) return response;
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if ((path==='/robots.txt' && !type.includes('text/plain')) ||
      (path==='/sitemap.xml' && !type.includes('xml'))) return response;
  if (Number(response.headers.get('content-length'))>1024*1024) return response;
  const headers=new Headers(response.headers);
  for (const key of ['content-length','etag','content-md5','last-modified']) headers.delete(key);
  if (request.method==='HEAD') return new Response(null,{status:response.status,statusText:response.statusText,headers});
  let body;
  try { body=await response.clone().text(); } catch { return response; }
  if (body.length>1024*1024) return response;
  if (path==='/robots.txt') {
    const missing=MAPS.filter(url=>!body.includes(url));
    if (!missing.length) return response;
    body=body.replace(/\s*$/,'')+'\n'+missing.map(url=>'Sitemap: '+url).join('\n')+'\n';
  } else {
    if (!/<sitemapindex(?:\s|>)/i.test(body) || !/<\/sitemapindex\s*>/i.test(body)) return response;
    const missing=MAPS.filter(url=>!body.includes(url));
    if (!missing.length) return response;
    const extra=missing.map(url=>'  <sitemap><loc>'+url+'</loc></sitemap>').join('\n');
    body=body.replace(/<\/sitemapindex\s*>/i,extra+'\n</sitemapindex>');
  }
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
