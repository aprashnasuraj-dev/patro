import test from 'node:test';
import assert from 'node:assert/strict';
import {addToolDiscovery,toolDiscoveryNav} from './tool-discovery.mjs';
const req=p=>new Request('https://aafnaipatro.com'+p);
test('renders relevant article links and a library directory for recognized tools',()=>{
  let s=toolDiscoveryNav('/calculators/moon-phase-calculator');
  assert.match(s,/href="\/article\/moon-phase-angle/);assert.match(s,/href="\/library\/subjects\/"/);
  s=toolDiscoveryNav('/tool/example');assert.match(s,/library\/catalogue/);
  assert.equal(toolDiscoveryNav('/api/example'),'');assert.equal(toolDiscoveryNav('/article/example'),'');
});
test('injects once for eligible HTML and passes unrelated or partial requests through',()=>{
  let inserts=[];
  globalThis.HTMLRewriter=class {
    on(selector,handler){this.handler=handler;assert.equal(selector,'main');return this}
    transform(r){this.handler.element({append(s){inserts.push(s)}});return r}
  };
  let original=new Response('<main>tool</main>',{headers:{'content-type':'text/html','etag':'old'}});
  let changed=addToolDiscovery(req('/tool/example'),original);
  assert.equal(inserts.length,1);assert.equal(changed.headers.get('x-patro-tool-discovery'),'1');assert.equal(changed.headers.get('etag'),null);
  assert.equal(addToolDiscovery(req('/tool/example'),changed),changed);assert.equal(inserts.length,1);
  let other=new Response('x',{headers:{'content-type':'text/html'}});assert.equal(addToolDiscovery(req('/article/example'),other),other);
  let partial=new Response('x',{status:206,headers:{'content-type':'text/html'}});assert.equal(addToolDiscovery(req('/tool/example'),partial),partial);
});
