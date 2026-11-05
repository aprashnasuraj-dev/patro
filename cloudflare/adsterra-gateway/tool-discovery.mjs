import { relatedArticles } from './related-articles.mjs';

const TOOL_PATH = /^\/(?:tool|calculators|generators|converters|utilities|validators|editors|planners|extractors|analyzers|formatters|comparisons|timers)\/[a-z0-9-]+(?:\/[a-z0-9-]+)?\/?$/i;
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function toolDiscoveryNav(path) {
  const clean=path.replace(/\/$/,'');
  if (!TOOL_PATH.test(path)) return '';
  const articles=relatedArticles(clean);
  const specific=articles.map(a=>'<li><a href="'+esc(a.path)+'">'+esc(a.title)+'</a></li>').join('');
  return '<nav id="patro-tool-discovery" aria-label="Explore the library" style="margin:24px auto;padding:16px;border:1px solid #d3ddd6;border-radius:10px;max-width:1100px"><strong>Explore related reading</strong>'+(specific?'<ul>'+specific+'</ul>':'')+'<p><a href="/library/subjects/">Browse articles by subject</a> · <a href="/library/catalogue/">See all library articles</a></p></nav>';
}
export function addToolDiscovery(request,response) {
  const path=new URL(request.url).pathname, nav=toolDiscoveryNav(path);
  if (!nav || request.method!=='GET' || request.headers.has('range') || response.status!==200 ||
      !(response.headers.get('content-type')||'').toLowerCase().includes('text/html') ||
      response.headers.has('content-encoding') || response.headers.get('x-patro-tool-discovery')==='1' ||
      !globalThis.HTMLRewriter) return response;
  const headers=new Headers(response.headers);
  for (const key of ['content-length','etag','content-md5']) headers.delete(key);
  headers.set('x-patro-tool-discovery','1');
  let inserted=false;
  return new HTMLRewriter().on('body',{element(el){if(!inserted){inserted=true;el.append(nav,{html:true});}}})
    .transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}
