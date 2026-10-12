import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const widget=await readFile('public/embed/aafnai-tool-links.js','utf8');
const share=await readFile('src/components/SeoShareActions.tsx','utf8');
const support=await readFile('src/SeoSearchSupport.tsx','utf8');
test('static widget is free of API calls and tracking',()=>{
  assert.match(widget,/document\.currentScript/);
  for(const prohibited of ['fetch(','XMLHttpRequest','sendBeacon(','localStorage','innerHTML'])assert.ok(!widget.includes(prohibited));
  assert.match(widget,/noopener noreferrer/);
});
test('widget routes to existing public pages',()=>{
  for(const route of ['/today','/convert','/tools/nepali-typing','/time-machine','/moon'])assert.ok(widget.includes("'"+route+"'"));
});
test('share action omits private inputs and URL query parameters',()=>{
  assert.match(share,/navigator\.share/);
  assert.match(share,/clipboard/);
  assert.match(share,/https:\/\/aafnaipatro\.com\$\{path\}/);
  assert.doesNotMatch(share,/location\.search|localStorage|document\.cookie/);
  assert.ok(support.includes('<SeoShareActions path={path} title={meta.title} />'));
});
