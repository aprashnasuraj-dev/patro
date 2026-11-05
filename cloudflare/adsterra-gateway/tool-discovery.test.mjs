import test from 'node:test';
import assert from 'node:assert/strict';
import {addToolDiscovery,toolDiscoveryNav} from './tool-discovery.mjs';
import {mkdtemp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import gateway from './worker.mjs';
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
    on(selector,handler){this.handler=handler;assert.equal(selector,'body');return this}
    transform(r){this.handler.element({append(s){inserts.push(s)}});return r}
  };
  let original=new Response('<body><main>tool</main></body>',{headers:{'content-type':'text/html','etag':'old'}});
  let changed=addToolDiscovery(req('/tool/example'),original);
  assert.equal(inserts.length,1);assert.equal(changed.headers.get('x-patro-tool-discovery'),'1');assert.equal(changed.headers.get('etag'),null);
  assert.equal(addToolDiscovery(req('/tool/example'),changed),changed);assert.equal(inserts.length,1);
  let other=new Response('x',{headers:{'content-type':'text/html'}});assert.equal(addToolDiscovery(req('/article/example'),other),other);
  let partial=new Response('x',{status:206,headers:{'content-type':'text/html'}});assert.equal(addToolDiscovery(req('/tool/example'),partial),partial);
});
test('the root wrapper waits for calendar processing before adding tool navigation',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'patro-tool-test-'));
  try {
    for (const name of ['root-entry.mjs','patro-adsterra.mjs','calendar-native-layout.mjs','tool-discovery.mjs','related-articles.mjs'])
      await copyFile(new URL(name,import.meta.url),join(dir,name));
    await writeFile(join(dir,'package.json'),'{"type":"module"}');
    await writeFile(join(dir,'optimized-entry.js'),'export default { async fetch() { return new Response("<html><body><main>tool</main></body></html>", {headers:{"content-type":"text/html"}}); } };');
    let inserted='';
    globalThis.HTMLRewriter=class {
      on(selector,handler){if(selector==='body')this.body=handler;return this}
      transform(response){if(this.body)this.body.element({append(s){inserted=s},prepend(){}});return response}
    };
    const worker=(await import(pathToFileURL(join(dir,'root-entry.mjs')).href)).default;
    const result=await worker.fetch(req('/tool/example'),{},{}); 
    assert.equal(result.headers.get('x-patro-tool-discovery'),'1');
    assert.match(inserted,/Browse articles by subject/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('the gateway adds links when static assets bypass the root Worker',async()=>{
  let inserted='';
  globalThis.HTMLRewriter=class {
    on(selector,handler){if(selector==='body')this.body=handler;return this}
    transform(response){if(this.body)this.body.element({append(s){inserted=s},prepend(){}});return response}
  };
  const env={ORIGIN:{async fetch(){return new Response('<html><body><div id="root"></div></body></html>',{headers:{'content-type':'text/html'}})}},DATE:{}};
  const result=await gateway.fetch(req('/calculators/moon-phase-calculator'),env,{});
  assert.equal(result.headers.get('x-patro-tool-discovery'),'1');
  assert.match(inserted,/moon-phase-angle/);
});
