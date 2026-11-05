import test from 'node:test';
import assert from 'node:assert/strict';
import {librarySubjectResponse, articleDiscoveryNav, subjectSlug} from './library-discovery.mjs';
const articles=Array.from({length:55},(_,i)=>({url:'/article/entry-'+(i+1),title:i===0?'A <safe> title':'Article '+(i+1),dek:'A useful description',sector:'Physics & Measurement'}));
articles.push({url:'/article/business',title:'Business',dek:'Example',sector:'Business'});
articles.push({url:'https://evil.example/',title:'bad',sector:'Business'});
let reads=0;
const env={LIBRARY:{async get(){reads++;return {size:1000,json:async()=>({articles})}}}};
const req=(p,method='GET')=>new Request('https://aafnaipatro.com'+p,{method});
test('renders real published subject groups and escapes catalogue metadata',async()=>{
  let r=await librarySubjectResponse(req('/library/subjects/'),env), text=await r.text();
  assert.equal(r.status,200); assert.match(text,/Physics &amp; Measurement/); assert.match(text,/55 articles/);
  assert.match(text,/href="\/library\/subjects\/physics-measurement\/"/); assert.doesNotMatch(text,/evil\.example/);
  r=await librarySubjectResponse(req('/library/subjects/physics-measurement/'),env); text=await r.text();
  assert.match(text,/A &lt;safe&gt; title/); assert.match(text,/href="\/library\/subjects\/physics-measurement\/2\/" rel="next"|rel="next" href="\/library\/subjects\/physics-measurement\/2\/"/);
  assert.equal((text.match(/href="\/article\/entry-/g)||[]).length,50);
  r=await librarySubjectResponse(req('/library/subjects/physics-measurement/2/'),env); text=await r.text();
  assert.match(text,/entry-55/); assert.doesNotMatch(text,/entry-54x/); assert.equal(reads,1);
});
test('sitemaps, canonical redirects, HEAD and invalid paths behave correctly',async()=>{
  let r=await librarySubjectResponse(req('/library/subjects/sitemap.xml'),env), x=await r.text();
  assert.match(x,/<loc>https:\/\/aafnaipatro\.com\/library\/subjects\/physics-measurement\/2\/<\/loc>/);
  assert.equal((x.match(/<loc>/g)||[]).length,4);
  r=await librarySubjectResponse(req('/library/subjects/physics-measurement'),env); assert.equal(r.status,301);
  r=await librarySubjectResponse(req('/library/subjects/physics-measurement/1/'),env); assert.equal(r.status,301);
  r=await librarySubjectResponse(req('/library/subjects/physics-measurement/999/'),env); assert.equal(r.status,404);
  r=await librarySubjectResponse(req('/library/subjects/','HEAD'),env); assert.equal(r.status,200);assert.equal(await r.text(),'');
  assert.equal(await librarySubjectResponse(req('/library/subjects-other'),env),null);
});
test('article navigation uses its own metadata and only safe known paths',()=>{
  let source='<script type="application/ld+json">{"articleSection":"Physics & Measurement"}</script>';
  let nav=articleDiscoveryNav(source,'/article/entry-1',{path:'/calculators/example',title:'Example & tool'});
  assert.match(nav,/href="\/library\/subjects\/physics-measurement\/"/);
  assert.match(nav,/More in Physics &amp; Measurement/);assert.match(nav,/Example &amp; tool/);
  assert.equal(articleDiscoveryNav(source,'/elsewhere',null),'');
  assert.equal(articleDiscoveryNav('no metadata','/article/entry-1',null),'');
  assert.equal(subjectSlug('Earth Science, Geology & Hazards'),'earth-science-geology-hazards');
});
