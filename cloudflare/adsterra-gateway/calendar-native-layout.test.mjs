import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarNativeLayout, moveNativeIntoCalendar } from './calendar-native-layout.mjs';

const slot = '<aside id="patro-native-ad-slot"><div></div><script async data-patro-adsterra="native-loader"></script></aside>';
const page = `<html><head><script async data-patro-adsterra="popunder"></script></head><body><aside>Sponsored</aside>${slot}<main><nav>Breadcrumb</nav><header class="hero solo"><h1>Calendar</h1><p>Today</p></header><section>Details</section></main><script async data-patro-adsterra="social"></script></body></html>`;

test('moves the existing native unit below the calendar introduction', () => {
  const result = moveNativeIntoCalendar(page);
  assert.ok(result.indexOf('</header>') < result.indexOf(slot));
  assert.ok(result.indexOf(slot) < result.indexOf('<section>'));
  assert.equal(result.replace(slot, ''), page.replace(slot, ''));
  assert.equal(result.split(slot).length - 1, 1);
});

test('leaves absent, duplicate or unknown markup unchanged', () => {
  for (const input of [page.replace(slot,''), page+slot, page.replace('class="hero solo"','class="other"'), page.replace('</header>','')]) assert.equal(moveNativeIntoCalendar(input), null);
});

test('rewrites supported calendar paths but not unrelated, compressed or non-HTML responses', async () => {
  for (const path of ['/bali-calendar', '/bali-calendar/hari-raya', '/weton', '/ethiopian-calendar', '/mondkalender', '/nameday', '/calendario-lunar', '/calendario-lunare']) {
    const r = await calendarNativeLayout(new Request('https://aafnaipatro.com'+path), new Response(page,{headers:{'content-type':'text/html','cache-control':'public, max-age=300',etag:'old'}}));
    assert.equal(r.headers.get('x-patro-ad-layout'),'calendar-inline-1');
    assert.equal(r.headers.get('cache-control'),'public, max-age=300');
    assert.equal(r.headers.get('etag'),null);
  }
  for (const path of ['/bali-calendar-sw.js','/date/2026-11-05','/api/data']) {
    const r = new Response(page,{headers:{'content-type':'text/html'}});
    assert.equal(await calendarNativeLayout(new Request('https://aafnaipatro.com'+path),r),r);
  }
  const compressed = new Response(page,{headers:{'content-type':'text/html','content-encoding':'gzip'}});
  assert.equal(await calendarNativeLayout(new Request('https://aafnaipatro.com/weton'),compressed),compressed);
});
