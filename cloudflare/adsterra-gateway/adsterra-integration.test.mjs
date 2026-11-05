import test from 'node:test';
import assert from 'node:assert/strict';
import { installAdsterra, adsterraEligible } from './patro-adsterra.mjs';
import { moveNativeIntoCalendar } from './calendar-native-layout.mjs';

test('repeated decoration keeps one of each ad script and preserves the Google tag', () => {
  const html = '<!doctype html><html><head><script async data-patro-google-tag src="https://www.googletagmanager.com/gtag/js?id=G-KWLDWTSK14"></script></head><body><main><header class="hero"><h1>Calendar</h1></header><section>Useful content</section></main></body></html>';
  const output = installAdsterra(installAdsterra(html));
  for (const kind of ['popunder','native-loader','social']) assert.equal((output.match(new RegExp(`data-patro-adsterra="${kind}"`,'g'))||[]).length,1);
  assert.equal((output.match(/googletagmanager\.com\/gtag\/js/g)||[]).length,1);
  const moved = moveNativeIntoCalendar(output);
  assert.ok(moved && moved.indexOf('</header>') < moved.indexOf('id="patro-native-ad-slot"'));
});

test('ad decoration excludes private and API route families', () => {
  for (const path of ['/api/x','/admin','/auth/login','/me','/private/a','/embed/x','/widget/today','/offline']) assert.equal(adsterraEligible(path),false);
  assert.equal(adsterraEligible('/bali-calendar'),true);
});
