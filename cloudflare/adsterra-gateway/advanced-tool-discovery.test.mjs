import test from 'node:test';
import assert from 'node:assert/strict';
import {advancedToolNav,addAdvancedToolDiscovery} from './advanced-tool-discovery.mjs';
const req=p=>new Request('https://aafnaipatro.com'+p);
test('adds relevant articles for known tools and a directory link for other advanced tools',()=>{
  assert.match(advancedToolNav('/advanced-tools/knitting-gauge-repeat-planner'),/knitting-gauge-pattern-recalculation/);
  assert.match(advancedToolNav('/advanced-tools/audio-loop-batch-editor/'),/digital-headroom/);
  assert.match(advancedToolNav('/advanced-tools/survey-branching-tester'),/library\/subjects/);
  assert.equal(advancedToolNav('/article/example'),'');
});
test('decorates eligible HTML once and preserves non-HTML or unrelated routes',()=>{
  let added='';
  globalThis.HTMLRewriter=class {on(selector,handler){assert.equal(selector,'body');this.handler=handler;return this}transform(response){this.handler.element({append(s){added=s}});return response}};
  const a=new Response('<body><div>tool</div></body>',{headers:{'content-type':'text/html','etag':'old'}});
  const b=addAdvancedToolDiscovery(req('/advanced-tools/knitting-gauge-repeat-planner'),a);
  assert.match(added,/knitting-gauge-pattern/);assert.equal(b.headers.get('etag'),null);assert.equal(b.headers.get('x-patro-tool-discovery'),'1');
  assert.equal(addAdvancedToolDiscovery(req('/advanced-tools/knitting-gauge-repeat-planner'),b),b);
  const c=new Response('{}',{headers:{'content-type':'application/json'}});
  assert.equal(addAdvancedToolDiscovery(req('/advanced-tools/knitting-gauge-repeat-planner/api'),c),c);
});
