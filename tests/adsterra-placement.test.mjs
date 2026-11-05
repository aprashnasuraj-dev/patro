import test from 'node:test';
import assert from 'node:assert/strict';
import {installAdsterra,adsterraCsp,adsterraEligible,ADSTERRA_POPUNDER,ADSTERRA_SOCIAL,ADSTERRA_NATIVE,ADSTERRA_CONTAINER} from '../shared/adsterra.ts';

test('repeat builds produce exactly one correctly placed instance of each unit',()=>{
  const input=`<!doctype html><html><head><title>Tool</title><script src="/app.js"></script></head><body><main>Calculator</main></body></html>`;
  const once=installAdsterra(input),twice=installAdsterra(once);
  assert.equal(twice,once);
  for(const marker of [ADSTERRA_POPUNDER,ADSTERRA_SOCIAL,ADSTERRA_NATIVE,`id="${ADSTERRA_CONTAINER}"`])assert.equal(once.split(marker).length-1,1);
  assert(once.indexOf(ADSTERRA_POPUNDER)<once.indexOf('</head>'));
  assert(once.indexOf(ADSTERRA_NATIVE)>once.indexOf('<body>'));
  assert(once.indexOf(ADSTERRA_SOCIAL)>once.indexOf('</main>'));
  assert(once.includes('<main>Calculator</main>'));
  assert.equal((once.match(/data-cfasync="false"/g)||[]).length,3);
  assert.equal((once.match(/<script async data-cfasync/g)||[]).length,3);
});
test('CSP admits HTTPS creative resources while retaining containment',()=>{
  const p=adsterraCsp("default-src 'none'; script-src 'self'; script-src-elem 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  for(const d of ["object-src 'none'","base-uri 'self'","frame-ancestors 'none'","form-action 'self'"])assert(p.includes(d));
  assert(p.includes("script-src 'self' https: 'unsafe-inline'"));
  assert.equal(adsterraCsp(p),p);
});
test('private APIs and embedded widgets are excluded; public content remains eligible',()=>{
  for(const p of ['/admin','/admin-console/users','/api/v1/news','/me','/embed/today'])assert.equal(adsterraEligible(p),false);
  for(const p of ['/','/tools/typing','/nepalmap','/article/example','/library','/advancetools/web-tools'])assert.equal(adsterraEligible(p),true);
});
