import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { installAdsterra, adsterraEligible, adsterraResponse, ADSTERRA_RECOVERY_JS } from './patro-adsterra.mjs';
import { moveNativeIntoCalendar } from './calendar-native-layout.mjs';

test('repeated decoration keeps one of each ad script and preserves the Google tag', () => {
  const html = '<!doctype html><html><head><script async data-patro-google-tag src="https://www.googletagmanager.com/gtag/js?id=G-KWLDWTSK14"></script></head><body><main><header class="hero"><h1>Calendar</h1></header><section>Useful content</section></main></body></html>';
  const output = installAdsterra(installAdsterra(html));
  for (const kind of ['popunder','native-loader','social']) assert.equal((output.match(new RegExp(`data-patro-adsterra="${kind}"`,'g'))||[]).length,1);
  assert.equal((output.match(/data-patro-adsterra="recovery"/g)||[]).length,1);
  assert.equal((output.match(/data-patro-adsterra-preconnect/g)||[]).length,2);
  assert.ok(output.indexOf('rel="preconnect"') < output.indexOf('data-patro-adsterra="popunder"'));
  assert.equal((output.match(/https:\/\/asiafilm\.org\/4\/b1871169a9878fda2bc2de21a208995a/g)||[]).length,1);
  assert.equal((output.match(/https:\/\/araplhn\.org\/4\/c752b529eb7d6d4ebf1096d225dfb10a/g)||[]).length,1);
  assert.equal((output.match(/googletagmanager\.com\/gtag\/js/g)||[]).length,1);
  const moved = moveNativeIntoCalendar(output);
  assert.ok(moved && moved.indexOf('</header>') < moved.indexOf('id="patro-native-ad-slot"'));
});

test('shows a dismissible notice only after both ad scripts fail', () => {
  const listeners = {}, stored = new Map();
  let notice = null;
  const document = {
    body: {prepend(el) { notice = el; }},
    getElementById(id) {return notice?.id === id ? notice : null;},
    addEventListener() {},
    createElement(tag) {return {tag,style:{},children:[],setAttribute(){},append(...children){this.children.push(...children)},addEventListener(type,fn){this[type]=fn},remove(){notice=null}};},
  };
  const window = {addEventListener(type, fn) {listeners[type] = fn;}};
  const sessionStorage = {getItem(k){return stored.get(k)},setItem(k,v){stored.set(k,v)}};
  runInNewContext(ADSTERRA_RECOVERY_JS,{window,document,sessionStorage});
  const fail = kind => listeners.error({target:{tagName:'SCRIPT',getAttribute(){return kind;}}});
  fail('native-loader'); assert.equal(notice,null);
  fail('social'); assert.equal(notice?.id,'patro-ad-notice');
  assert.match(notice.children[0].textContent,/If you use an ad blocker/);
  notice.children[1].click(); assert.equal(notice,null);
  fail('social'); assert.equal(notice,null);
  assert.equal(stored.get('patro-ad-notice-dismissed'),'1');
});

test('ad decoration excludes private and API route families', () => {
  for (const path of ['/api/x','/admin','/auth/login','/me','/private/a','/embed/x','/widget/today','/offline']) assert.equal(adsterraEligible(path),false);
  assert.equal(adsterraEligible('/bali-calendar'),true);
});

test('a labelled sponsor link is positioned after the known tool container only on tool pages', () => {
  let inserted = '';
  globalThis.HTMLRewriter = class {
    on(selector, handler) { if (selector === '#ct-tool') this.tool = handler; return this; }
    transform(response) { this.tool.element({ after(html) { inserted = html; } }); return response; }
  };
  for (const [path, expected] of [['/tool/example', true], ['/article/example', false]]) {
    inserted = '';
    adsterraResponse(new Request('https://aafnaipatro.com' + path), new Response('<html></html>', {headers:{'content-type':'text/html'}}));
    assert.equal(Boolean(inserted), expected);
    if (expected) {
      assert.match(inserted, /data-patro-adsterra="smartlink-tool-after"/);
      assert.match(inserted, /Sponsored/);
      assert.match(inserted, /rel="sponsored noopener noreferrer nofollow"/);
    }
  }
  const id = '0123456789abcdef0123456789abcdef';
  const unit = JSON.stringify({src:`https://approved-ad-host.example/21/${id}`,container:`container-${id}`});
  inserted = '';
  adsterraResponse(new Request('https://aafnaipatro.com/tool/example'), new Response('<html></html>', {headers:{'content-type':'text/html'}}), {ADSTERRA_NATIVE_SECOND:unit});
  assert.match(inserted, /data-patro-adsterra="native-second-loader"/);
  assert.doesNotMatch(inserted, /smartlink-tool-after/);
});

test('adds one approved after-tool placement to recognized MM530 tool templates',()=>{
  let inserts=[];
  globalThis.HTMLRewriter=class {
    on(selector,handler){if(selector==='#ct-tool')this.client=handler;if(selector==='.mm530-frame-wrap')this.mm=handler;return this;}
    transform(response){const el={after(value){inserts.push(value)}};this.client.element(el);this.mm.element(el);this.mm.element(el);return response;}
  };
  for(const prefix of ['calculators','generators','converters','utilities','validators','editors','planners','extractors','analyzers','formatters','comparisons','timers']){
    inserts=[];adsterraResponse(new Request(`https://aafnaipatro.com/${prefix}/example`),new Response('<html></html>',{headers:{'content-type':'text/html'}}));
    assert.equal(inserts.length,1);assert.match(inserts[0],/smartlink-tool-after/);assert.match(inserts[0],/Sponsored/);
  }
  const id='0123456789abcdef0123456789abcdef';
  const unit=JSON.stringify({src:`https://approved-ad-host.example/21/${id}`,container:`container-${id}`});
  inserts=[];adsterraResponse(new Request('https://aafnaipatro.com/calculators/example'),new Response('<html></html>',{headers:{'content-type':'text/html'}}),{ADSTERRA_NATIVE_SECOND:unit});
  assert.equal(inserts.length,1);assert.match(inserts[0],/native-second-loader/);
  inserts=[];adsterraResponse(new Request('https://aafnaipatro.com/calculators/'),new Response('<html></html>',{headers:{'content-type':'text/html'}}));assert.equal(inserts.length,0);
});
