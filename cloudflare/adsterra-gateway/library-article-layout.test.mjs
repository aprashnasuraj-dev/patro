import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryArticleLayout } from './library-article-layout.mjs';

// A small test double drives the two documented HTMLRewriter callbacks. Live
// Worker verification checks the actual parser and served article markup.
class TestRewriter {
  handlers = new Map();
  on(selector, handler) { this.handlers.set(selector, handler); return this; }
  transform(response) {
    const handlers = this.handlers;
    const stream = new ReadableStream({ async start(controller) {
      let html = await response.text();
      const slot = /<aside\b[^>]*id="patro-native-ad-slot"[^>]*>[\s\S]*?<\/aside>/i;
      const remove = handlers.get('#patro-native-ad-slot');
      if (remove && slot.test(html)) remove.element({ remove() { html = html.replace(slot, ''); } });
      const paragraph = handlers.get('#article-body > p');
      if (paragraph) {
        const start = html.indexOf('<div id="article-body">');
        const end = html.indexOf('</div>', start);
        if (start >= 0 && end > start) {
          let body = html.slice(start, end), count = 0;
          body = body.replace(/<p>[^]*?<\/p>/g, (p) => {
            let after = ''; paragraph.element({ after(value) { after = value; } }); count++;
            return p + after;
          });
          html = html.slice(0, start) + body + html.slice(end);
        }
      }
      controller.enqueue(new TextEncoder().encode(html)); controller.close();
    }});
    return new Response(stream, {status:response.status,headers:response.headers});
  }
}

const slot = '<aside id="patro-native-ad-slot"><div></div><script async data-patro-adsterra="native-loader"></script></aside>';
const page = `<html><body>${slot}<main><div id="article-body"><p>One</p><p>Two</p><p>Three</p><p>Four</p></div></main></body></html>`;

test('moves the existing native unit after the third article paragraph', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  const response = new Response(page,{headers:{'content-type':'text/html','cache-control':'public, max-age=300',etag:'old'}});
  const result = await libraryArticleLayout(new Request('https://aafnaipatro.com/article/example'), response);
  const html = await result.text();
  assert.equal(result.headers.get('x-patro-ad-layout'),'article-inline-1');
  assert.equal(result.headers.get('cache-control'),'public, max-age=300');
  assert.equal(result.headers.get('etag'),null);
  assert.ok(html.indexOf('<p>Three</p>') < html.indexOf(slot));
  assert.ok(html.indexOf(slot) < html.indexOf('<p>Four</p>'));
  assert.equal(html.split(slot).length-1,1);
});

test('leaves short articles, duplicate slots, other routes and partial requests alone', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  for (const [path,body,headers] of [
    ['/article/example',page.replace('<p>Three</p><p>Four</p>',''),{}],
    ['/article/example',page+slot,{}],
    ['/research/example',page,{}],
    ['/article/example',page,{range:'bytes=0-4'}],
  ]) {
    const res = new Response(body,{headers:{'content-type':'text/html'}});
    assert.equal(await libraryArticleLayout(new Request('https://aafnaipatro.com'+path,{headers}),res),res);
    assert.equal(await res.text(),body);
  }
});
