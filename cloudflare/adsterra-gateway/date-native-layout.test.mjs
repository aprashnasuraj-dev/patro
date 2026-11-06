import test from 'node:test';
import assert from 'node:assert/strict';
import { dateNativeLayout, moveNativeIntoDate } from './date-native-layout.mjs';

const slot = '<aside id="patro-native-ad-slot" data-patro-adsterra="native"><div id="native"></div><script async src="https://bauval.org/21/example"></script></aside>';
const nav = '<nav aria-label="Date navigation"><a href="/date/2026-11-06">Next</a></nav>';
const page = `<!doctype html><html><head><script async data-patro-adsterra="popunder"></script></head><body><aside>Sponsored</aside>${slot}<main><article><h1>2083-07-19</h1><div class="grid">Date facts</div>${nav}</article></main><script async data-patro-adsterra="social"></script></body></html>`;

test('moves one existing native slot after the date facts without changing other units', () => {
  const result = moveNativeIntoDate(page);
  assert.ok(result.indexOf('Date facts') < result.indexOf(slot));
  assert.ok(result.indexOf(slot) < result.indexOf(nav));
  assert.equal(result.split(slot).length - 1, 1);
  assert.equal(result.replace(slot, ''), page.replace(slot, ''));
  assert.match(result, /data-patro-adsterra="popunder"/);
  assert.match(result, /data-patro-adsterra="social"/);
});

test('does not guess when the slot or anchor is missing or duplicated', () => {
  for (const html of [page.replace(slot, ''), page.replace(nav, ''), page + slot, page + nav]) {
    assert.equal(moveNativeIntoDate(html), null);
  }
});

test('only rewrites eligible date HTML and preserves important response headers', async () => {
  const req = new Request('https://aafnaipatro.com/date/2026-11-05');
  const response = new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=240', etag: 'old', 'content-md5': 'old' } });
  const result = await dateNativeLayout(req, response);
  assert.equal(result.headers.get('x-patro-ad-layout'), 'date-inline-1');
  assert.equal(result.headers.get('cache-control'), 'public, max-age=240');
  assert.equal(result.headers.get('etag'), null);
  assert.equal(result.headers.get('content-md5'), null);
  assert.equal(await result.text(), moveNativeIntoDate(page));
});

test('passes through non-date, HEAD, range, non-HTML, error, compressed and oversized responses', async () => {
  const cases = [
    [new Request('https://aafnaipatro.com/tools'), new Response(page, { headers: { 'content-type': 'text/html' } })],
    [new Request('https://aafnaipatro.com/date/2026-11-05', { method: 'HEAD' }), new Response(null, { headers: { 'content-type': 'text/html' } })],
    [new Request('https://aafnaipatro.com/date/2026-11-05', { headers: { range: 'bytes=0-10' } }), new Response(page, { headers: { 'content-type': 'text/html' } })],
    [new Request('https://aafnaipatro.com/date/2026-11-05'), new Response('{}', { headers: { 'content-type': 'application/json' } })],
    [new Request('https://aafnaipatro.com/date/2026-11-05'), new Response(page, { status: 404, headers: { 'content-type': 'text/html' } })],
    [new Request('https://aafnaipatro.com/date/2026-11-05'), new Response(page, { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' } })],
    [new Request('https://aafnaipatro.com/date/2026-11-05'), new Response(page, { headers: { 'content-type': 'text/html', 'content-length': '524289' } })],
  ];
  for (const [req, res] of cases) assert.equal(await dateNativeLayout(req, res), res);
});

test('returns the original response intact when markup cannot be relocated', async () => {
  const res = new Response('<html><body>No slot</body></html>', { headers: { 'content-type': 'text/html' } });
  assert.equal(await dateNativeLayout(new Request('https://aafnaipatro.com/date/2026-11-05'), res), res);
  assert.equal(await res.text(), '<html><body>No slot</body></html>');
});

test('passes an oversized response with no declared length through intact', async () => {
  const html = page + 'x'.repeat(530000);
  const res = new Response(html, { headers: { 'content-type': 'text/html' } });
  assert.equal(await dateNativeLayout(new Request('https://aafnaipatro.com/date/2026-11-05'), res), res);
  assert.equal((await res.text()).length, html.length);
});
