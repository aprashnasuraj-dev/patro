// Searchable navigation over already-published catalogue records. This never
// publishes editorial drafts or changes objects in R2.
const BASE = 'https://aafnaipatro.com';
const ROOT = '/library/subjects/';
const PAGE_SIZE = 50;
const MAX_ARTICLES = 10000;
let pending, expires = 0;
const html = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const subjectSlug = value => String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const allowedPath = path => typeof path === 'string' && /^\/article\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path);
function pageUrl(group, n) { return ROOT + group.slug + '/' + (n === 1 ? '' : n + '/'); }
function reply(body, type, head, status=200) {
  return new Response(head ? null : body, {status, headers:{'content-type':type+'; charset=utf-8','cache-control':status===200?'public, max-age=300, s-maxage=3600':'no-store','x-content-type-options':'nosniff'}});
}
async function catalogue(env) {
  if (!pending || Date.now() >= expires) {
    expires = Date.now() + 300000;
    pending = (async () => {
      const obj = await env.LIBRARY.get('phase1/catalog.json');
      if (!obj || obj.size > 8388608) throw new Error('catalogue unavailable');
      const data = typeof obj.json === 'function' ? await obj.json() : JSON.parse(await obj.text());
      if (!Array.isArray(data.articles) || data.articles.length > MAX_ARTICLES) throw new Error('invalid catalogue');
      const groups = new Map(), seen = new Set();
      for (const a of data.articles) {
        const name = String(a.sector || '').slice(0, 200), slug = subjectSlug(name);
        if (!name || !slug || !allowedPath(a.url) || seen.has(a.url)) continue;
        let group = groups.get(slug);
        // Avoid merging two unrelated sector names if their slugs collide.
        if (group && group.name !== name) continue;
        if (!group) groups.set(slug, group = {name, slug, articles:[]});
        seen.add(a.url);
        group.articles.push({path:a.url, title:String(a.title || 'Article').slice(0,500), dek:String(a.dek || '').slice(0,1200)});
      }
      return [...groups.values()].filter(g => g.articles.length).sort((a,b)=>a.name.localeCompare(b.name));
    })().catch(error => {pending = undefined; expires = 0; throw error;});
  }
  return pending;
}
function shell(title, description, canonical, body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html(title)+'</title><meta name="description" content="'+html(description)+'"><link rel="canonical" href="'+html(BASE+canonical)+'"><meta name="robots" content="index,follow"><style>body{font:16px/1.55 system-ui,sans-serif;max-width:68rem;margin:auto;padding:1rem}li{margin:1rem 0}nav a{margin-right:1rem}a{color:#16563b}</style></head><body><main>'+body+'</main></body></html>';
}
export async function librarySubjectResponse(request, env) {
  const path = new URL(request.url).pathname, head = request.method === 'HEAD';
  if (path !== '/library/subjects' && !path.startsWith('/library/subjects/')) return null;
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});
  if (path === '/library/subjects') return Response.redirect(BASE+ROOT, 301);
  const match = path.match(/^\/library\/subjects\/([a-z0-9-]+)(?:\/([1-9][0-9]*))?\/?$/);
  const isIndex = path === ROOT, isSitemap = path === ROOT+'sitemap.xml';
  if (!isIndex && !isSitemap && !match) return reply('Not found','text/plain',head,404);
  let groups;
  try { groups = await catalogue(env); } catch { return reply('Catalogue temporarily unavailable','text/plain',head,503); }
  if (!groups.length) return reply('Catalogue temporarily unavailable','text/plain',head,503);
  if (isSitemap) {
    const urls=[ROOT];
    for (const g of groups) for (let p=1;p<=Math.ceil(g.articles.length/PAGE_SIZE);p++) urls.push(pageUrl(g,p));
    return reply('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(u=>'<url><loc>'+BASE+u+'</loc></url>').join('')+'</urlset>','application/xml',head);
  }
  if (isIndex) {
    const body='<nav><a href="/library">Library</a><a href="/library/catalogue/">All articles</a><a href="/advancetools/">Browser tools</a></nav><h1>Browse articles by subject</h1><p>Explore published explanations by subject, with direct links to every article.</p><ul>'+groups.map(g=>'<li><a href="'+ROOT+g.slug+'/">'+html(g.name)+'</a> ('+g.articles.length+' articles)</li>').join('')+'</ul>';
    return reply(shell('Article subjects | AafnaiPatro','Browse AafnaiPatro articles by subject.',ROOT,body),'text/html',head);
  }
  const group=groups.find(g=>g.slug===match[1]), n=Number(match[2]||1);
  if (!group || !Number.isSafeInteger(n) || n>Math.ceil(group.articles.length/PAGE_SIZE)) return reply('Not found','text/plain',head,404);
  const canonical=pageUrl(group,n);
  if (path!==canonical) return Response.redirect(BASE+canonical,301);
  const pages=Math.ceil(group.articles.length/PAGE_SIZE), batch=group.articles.slice((n-1)*PAGE_SIZE,n*PAGE_SIZE);
  const nav='<nav aria-label="Subject pages">'+(n>1?'<a rel="prev" href="'+pageUrl(group,n-1)+'">Previous</a>':'')+' Page '+n+' of '+pages+' '+(n<pages?'<a rel="next" href="'+pageUrl(group,n+1)+'">Next</a>':'')+'</nav>';
  const body='<nav><a href="/library/subjects/">All subjects</a><a href="/library/catalogue/">All articles</a><a href="/advancetools/">Browser tools</a></nav><h1>'+html(group.name)+' articles</h1><p>'+group.articles.length+' published articles; page '+n+' of '+pages+'.</p>'+nav+'<ol start="'+((n-1)*PAGE_SIZE+1)+'">'+batch.map(a=>'<li><article><h2><a href="'+a.path+'">'+html(a.title)+'</a></h2><p>'+html(a.dek)+'</p></article></li>').join('')+'</ol>'+nav;
  return reply(shell(group.name+' articles — page '+n+' | AafnaiPatro','Browse published articles about '+group.name+'.',canonical,body),'text/html',head);
}

// Article metadata is already present in the served HTML, so adding navigation
// needs no catalogue/R2 read on an article request.
export function articleDiscoveryNav(source, path, relatedTool) {
  const match=source.match(/"articleSection"\s*:\s*("(?:\\.|[^"\\])*")/);
  let name; try { name=match ? JSON.parse(match[1]) : ''; } catch { return ''; }
  const slug=subjectSlug(name);
  if (!slug || name.length>200 || !/^\/article\/[a-z0-9-]+$/.test(path)) return '';
  const specific=relatedTool ? ' · <a href="'+html(relatedTool.path)+'">'+html(relatedTool.title)+'</a>' : '';
  return '<nav aria-label="Explore related subjects and tools" class="patro-discovery"><a href="'+ROOT+slug+'/">More in '+html(name)+'</a>'+specific+' · <a href="/advancetools/">Browse browser tools</a></nav>';
}

// Add a normal crawlable entry point on the existing library and catalogue.
export function addSubjectIndexLink(request, response) {
  const p=new URL(request.url).pathname;
  if (request.method!=='GET' || response.status!==200 || !globalThis.HTMLRewriter ||
      !(p==='/library' || /^\/library\/catalogue\/(?:[1-9][0-9]*\/)?$/.test(p)) ||
      !(response.headers.get('content-type')||'').includes('text/html') || response.headers.has('content-encoding')) return response;
  const headers=new Headers(response.headers);
  for (const key of ['content-length','etag','content-md5']) headers.delete(key);
  let inserted=false;
  return new HTMLRewriter().on('h1',{element(el){if(!inserted){inserted=true;el.after('<p><a href="/library/subjects/">Browse articles by subject</a></p>',{html:true});}}})
    .transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}
