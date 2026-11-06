// This small wrapper works with the independently deployed advanced tools.
const TOOL = /^\/advanced-tools\/[a-z0-9-]+(?:\/|$)/i;
const MATCHES = {
  '/advanced-tools/knitting-gauge-repeat-planner': [
    ['/article/knitting-gauge-pattern-recalculation-calculator','Knitting gauge recalculation'],
    ['/article/blocked-swatch-growth-calculator','Blocked swatch growth for knitting and crochet'],
    ['/article/yarn-substitution-meterage-and-skein-calculator','Yarn substitution and meterage'],
  ],
  '/advanced-tools/fabric-nesting-planner': [
    ['/article/how-fabric-repeat-matching-works-in-practice','How fabric repeat matching works'],
    ['/article/fabric-repeat-matching-calculator-worksheet-for-planning-a-project','Fabric repeat matching worksheet'],
  ],
  '/advanced-tools/audio-loop-batch-editor': [
    ['/article/digital-headroom-calculator-worksheet-for-planning-a-project','Digital audio headroom'],
    ['/article/how-bit-depth-noise-floor-works-in-practice','Bit depth and digital audio noise'],
  ],
};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function advancedToolNav(path) {
  if (!TOOL.test(path)) return '';
  const root=path.match(/^\/advanced-tools\/[a-z0-9-]+/i)?.[0].toLowerCase();
  const links=(MATCHES[root]||[]).map(([href,title])=>'<li><a href="'+href+'">'+escapeHtml(title)+'</a></li>').join('');
  return '<nav id="patro-tool-discovery" aria-label="Explore the library" style="margin:24px auto;padding:16px;border:1px solid #d3ddd6;border-radius:10px;max-width:1100px"><strong>Explore related reading</strong>'+(links?'<ul>'+links+'</ul>':'')+'<p><a href="/library/subjects/">Browse articles by subject</a> · <a href="/library/catalogue/">See all library articles</a></p></nav>';
}
export function addAdvancedToolDiscovery(request,response) {
  const nav=advancedToolNav(new URL(request.url).pathname);
  if (!nav || request.method!=='GET' || request.headers.has('range') || response.status!==200 ||
      !(response.headers.get('content-type')||'').toLowerCase().includes('text/html') ||
      response.headers.has('content-encoding') || response.headers.get('x-patro-tool-discovery')==='1' ||
      !globalThis.HTMLRewriter) return response;
  const headers=new Headers(response.headers);
  for(const key of ['content-length','etag','content-md5']) headers.delete(key);
  headers.set('x-patro-tool-discovery','1');
  let inserted=false;
  return new HTMLRewriter().on('body',{element(el){if(!inserted){inserted=true;el.append(nav,{html:true});}}})
    .transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}
