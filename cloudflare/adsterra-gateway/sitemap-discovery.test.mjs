import test from 'node:test';
import assert from 'node:assert/strict';
import {addLibrarySitemaps} from './sitemap-discovery.mjs';
const req=(path,method='GET',headers={})=>new Request('https://aafnaipatro.com'+path,{method,headers});
test('adds the library, catalogue and subject sitemaps once while preserving entries',async()=>{
  let r=new Response('User-agent: *\nDisallow: /api/\nSitemap: https://aafnaipatro.com/sitemap.xml\n',{headers:{'content-type':'text/plain','etag':'old'}});
  r=await addLibrarySitemaps(req('/robots.txt'),r);let s=await r.text();
  assert.match(s,/Disallow: \/api\//);assert.match(s,/Sitemap: https:\/\/aafnaipatro.com\/sitemap-library.xml/);
  assert.match(s,/library\/catalogue\/sitemap.xml/);assert.match(s,/library\/subjects\/sitemap.xml/);assert.equal(r.headers.get('etag'),null);
  r=await addLibrarySitemaps(req('/robots.txt'),new Response(s,{headers:{'content-type':'text/plain'}}));
  assert.equal((await r.text()).match(/sitemap-library.xml/g).length,1);
  r=await addLibrarySitemaps(req('/sitemap.xml'),new Response('<?xml version="1.0"?><sitemapindex><sitemap><loc>https://aafnaipatro.com/existing.xml</loc></sitemap></sitemapindex>',{headers:{'content-type':'application/xml'}}));
  s=await r.text();assert.match(s,/existing.xml/);assert.equal((s.match(/<sitemap>/g)||[]).length,4);assert.match(s,/<\/sitemapindex>$/);
});
test('leaves other routes, non-index XML and partial responses alone',async()=>{
  let r=new Response('<urlset></urlset>',{headers:{'content-type':'application/xml'}});assert.equal(await addLibrarySitemaps(req('/sitemap.xml'),r),r);
  r=new Response('unchanged');assert.equal(await addLibrarySitemaps(req('/other'),r),r);
  r=new Response('partial',{status:206,headers:{'content-type':'text/plain'}});assert.equal(await addLibrarySitemaps(req('/robots.txt','GET',{range:'bytes=0-6'}),r),r);
});
