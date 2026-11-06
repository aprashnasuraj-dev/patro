import test from 'node:test';
import assert from 'node:assert/strict';
import {submitChanges} from '../scripts/indexnow-changed-content.mjs';
const xml=paths=>'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>https://aafnaipatro.com'+p+'</loc></url>').join('')+'</urlset>';
const bodies={
  '/sitemap-library.xml':xml(Array.from({length:2640},(_,i)=>'/article/item-'+i)),
  '/library/subjects/sitemap.xml':xml(['/library/subjects/']),
  '/sitemap-client-tools.xml':xml(Array.from({length:550},(_,i)=>'/tool/item-'+i)),
  '/sitemap-mm530.xml':xml(Array.from({length:530},(_,i)=>'/calculators/item-'+i)),
  '/sitemap-tools.xml':xml(['/advanced-tools/example/','/other-page']),
};
test('previews a bounded public batch, then surfaces rate limits without retrying',async()=>{
  const key='0123456789abcdef0123456789abcdef';let posts=0;
  const fetcher=async (input,options={})=>{
    const url=new URL(input);
    if(url.host==='api.indexnow.org'){posts++;const body=JSON.parse(options.body);assert.equal(body.urlList.length,3722);return new Response('',{status:429,headers:{'retry-after':'600'}})}
    if(url.pathname==='/'+key+'.txt')return new Response(key);
    return new Response(bodies[url.pathname]||'',{status:bodies[url.pathname]?200:404});
  };
  const preview=await submitChanges({fetcher,key});assert.equal(preview.total,3722);assert.equal(posts,0);
  const result=await submitChanges({fetcher,key,submit:true});assert.equal(result.submitted,false);assert.equal(result.status,429);assert.equal(result.retryAfter,'600');assert.equal(posts,1);
});
