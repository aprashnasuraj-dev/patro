import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryArticleLayout, additionalNative } from './library-article-layout.mjs';
import { adsterraSmartlink } from './patro-adsterra.mjs';

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
      const secondSlot = /<aside\b[^>]*id="patro-native-ad-second"[^>]*>[\s\S]*?<\/aside>/i;
      const removeSecond = handlers.get('#patro-native-ad-second');
      if (removeSecond && secondSlot.test(html)) removeSecond.element({remove() {html = html.replace(secondSlot, '');}});
      const header = handlers.get('header.article-header');
      if (header) html = html.replace(/<header class="article-header">[^]*?<\/header>/gi, (value) => {
        let after = ''; header.element({after(s) { after = s; }}); return value + after;
      });
      const title = handlers.get('header.article-header > h1');
      if (title) html = html.replace(/(<header class="article-header">[^]*?)(<h1>[^]*?<\/h1>)/gi, (_, before, h1) => {
        let after = ''; title.element({after(s) { after = s; }}); return before + h1 + after;
      });
      const rail = handlers.get('aside.rail');
      if (rail) html = html.replace(/<aside class="rail">/gi, (tag) => {
        let before = ''; rail.element({prepend(s) { before += s; }}); return tag + before;
      });
      const related = /<section class="related">[^]*?<\/section>/i;
      const relatedHandler = handlers.get('section.related');
      if (relatedHandler && related.test(html)) relatedHandler.element({ remove() { html = html.replace(related, ''); } });
      const research = handlers.get('main.research-page > article > section');
      if (research) html = html.replace(/<section data-research="\d+">[^]*?<\/section>/g, value => {
        let after = ''; research.element({after(s) {after = s;}}); return value + after;
      });
      const paragraph = handlers.get('#article-body > p');
      if (paragraph) {
        const start = html.indexOf('<div id="article-body">');
        const end = html.indexOf('</div>', start);
        if (start >= 0 && end > start) {
          let body = html.slice(start, end), count = 0;
          const image = handlers.get('#article-body img');
          if (image) body = body.replace(/<img([^>]*)>/g, (_, attributes) => {
            const attrs = new Map([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
            image.element({ getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; }, setAttribute(name, value) { attrs.set(name, value); } });
            return '<img ' + [...attrs].map(([key, value]) => `${key}="${value}"`).join(' ') + '>';
          });
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
const newId = '0123456789abcdef0123456789abcdef';
const second = JSON.stringify({src:`https://approved-ad-host.example/21/${newId}`,container:`container-${newId}`});

test('uses the new publisher Smartlink for top and inline links and retains the old bottom link', () => {
  assert.match(adsterraSmartlink('top'), /https:\/\/asiafilm\.org\/4\/b1871169a9878fda2bc2de21a208995a/);
  assert.match(adsterraSmartlink('inline'), /https:\/\/asiafilm\.org\/4\/b1871169a9878fda2bc2de21a208995a/);
  assert.match(adsterraSmartlink('bottom'), /https:\/\/araplhn\.org\/4\/c752b529eb7d6d4ebf1096d225dfb10a/);
});

test('accepts a separate validated native placement and rejects duplicate or malformed codes', () => {
  assert.match(additionalNative(second), /data-patro-adsterra="native-second-loader"/);
  for (const raw of [undefined, '', '{}', 'not-json', JSON.stringify({src:'https://bauval.org/21/b86f7b1b852ea7f8de7539079e6e7816',container:'container-b86f7b1b852ea7f8de7539079e6e7816'}), JSON.stringify({src:`http://approved-ad-host.example/21/${newId}`,container:`container-${newId}`}), JSON.stringify({src:`https://approved-ad-host.example/21/${newId}`,container:'wrong'})])
    assert.equal(additionalNative(raw), null);
});

test('places the separate second native unit after paragraph eight on long articles', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  const paragraphs = Array.from({length: 14}, (_, i) => `<p>Paragraph ${i+1}</p>`).join('');
  const html = `<html><body>${slot}<main><header class="article-header">Title</header><div id="article-body">${paragraphs}</div></main></body></html>`;
  const output = await (await libraryArticleLayout(new Request('https://aafnaipatro.com/article/example'), new Response(html,{headers:{'content-type':'text/html'}}), {ADSTERRA_NATIVE_SECOND:second})).text();
  assert.ok(output.indexOf('Paragraph 3</p>') < output.indexOf(slot));
  assert.ok(output.indexOf('Paragraph 8</p>') < output.indexOf('id="patro-native-ad-second"'));
  assert.ok(output.indexOf('id="patro-native-ad-second"') < output.indexOf('Paragraph 9</p>'));
  assert.equal((output.match(/native-second-loader/g)||[]).length, 1);
  assert.equal((output.match(/smartlink-inline/g)||[]).length, 0);
});

test('places the existing native unit immediately after the article headline', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  const paragraphs = Array.from({length: 12}, (_, i) => `<p>Paragraph ${i+1}</p>`).join('');
  const html = `<html><body>${slot}<main><header class="article-header"><h1>Title</h1><p>Introduction</p></header><div id="article-body">${paragraphs}</div></main></body></html>`;
  const result = await libraryArticleLayout(new Request('https://aafnaipatro.com/article/example'), new Response(html,{headers:{'content-type':'text/html'}}));
  const output = await result.text();
  assert.equal(result.headers.get('x-patro-ad-layout'), 'article-headline-1');
  assert.ok(output.indexOf('<h1>Title</h1>') < output.indexOf(slot));
  assert.ok(output.indexOf(slot) < output.indexOf('<p>Introduction</p>'));
  assert.equal(output.split(slot).length-1, 1);
});

test('adds one labelled sponsored link to the existing rail on long articles', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  const paras = Array.from({length:12},(_,i)=>`<p>Paragraph ${i+1}</p>`).join('');
  const html = `<html><body>${slot}<main><header class="article-header"><h1>Title</h1></header><div id="article-body">${paras}</div><aside class="rail"><a href="/research/example">Sources</a></aside></main></body></html>`;
  const req = new Request('https://aafnaipatro.com/article/example');
  const response = await libraryArticleLayout(req,new Response(html,{headers:{'content-type':'text/html'}}));
  const output = await response.text();
  assert.equal((output.match(/data-patro-adsterra="smartlink-rail"/g)||[]).length,1);
  assert.ok(output.indexOf('<aside class="rail">') < output.indexOf('data-patro-adsterra="smartlink-rail"'));
  assert.match(output,/Sponsored · विज्ञापन/);assert.match(output,/https:\/\/asiafilm\.org\/4\/b1871169a9878fda2bc2de21a208995a/);
  assert.equal(output.split(slot).length-1,1);
  const repeated = await libraryArticleLayout(req,new Response(output,{headers:{'content-type':'text/html'}}));
  assert.equal(((await repeated.text()).match(/data-patro-adsterra="smartlink-rail"/g)||[]).length,1);
});

test('does not add a rail link to short or ambiguous article layouts', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  for (const [count,rails] of [[3,1],[12,2]]) {
    const paras=Array.from({length:count},()=>'<p>Text</p>').join('');
    const html=`<html><body>${slot}<header class="article-header"><h1>Title</h1></header><div id="article-body">${paras}</div>${'<aside class="rail">Sources</aside>'.repeat(rails)}</body></html>`;
    const result=await libraryArticleLayout(new Request('https://aafnaipatro.com/article/example'),new Response(html,{headers:{'content-type':'text/html'}}));
    assert.doesNotMatch(await result.text(),/smartlink-rail/);
  }
});

test('places a second native unit after the known header of short articles and after research sections', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  const article = `<html><body>${slot}<main><header class="article-header">Title</header><div id="article-body"><p>One</p><p>Two</p><p>Three</p></div></main></body></html>`;
  const articleOut = await (await libraryArticleLayout(new Request('https://aafnaipatro.com/article/example'), new Response(article,{headers:{'content-type':'text/html'}}), {ADSTERRA_NATIVE_SECOND:second})).text();
  assert.ok(articleOut.indexOf('</header>') < articleOut.indexOf('id="patro-native-ad-second"'));
  assert.ok(articleOut.indexOf('id="patro-native-ad-second"') < articleOut.indexOf('<p>Three</p>'));
  const research = `<html><body>${slot}<main class="research-page"><article><section data-research="1">Scope</section><section data-research="2">Evidence</section><section data-research="3">Sources</section></article></main></body></html>`;
  const researchOut = await (await libraryArticleLayout(new Request('https://aafnaipatro.com/research/example'), new Response(research,{headers:{'content-type':'text/html'}}), {ADSTERRA_NATIVE_SECOND:second})).text();
  assert.ok(researchOut.indexOf('Evidence</section>') < researchOut.indexOf('id="patro-native-ad-second"'));
  assert.ok(researchOut.indexOf('id="patro-native-ad-second"') < researchOut.indexOf('Sources</section>'));
  assert.equal((researchOut.match(/native-second-loader/g)||[]).length, 1);
});

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

test('adds a voluntary inline sponsor link, repositions existing related cards and defers body images on long articles', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  const paragraphs = Array.from({length: 14}, (_, i) => `<p>Paragraph ${i+1}${i===3?' <img src="diagram.png">':''}</p>`).join('');
  const cards = '<section class="related"><h2>Related reading</h2><a class="related-card" href="/article/related">Related article</a></section>';
  const html = `<html><body>${slot}<main><div id="article-body">${paragraphs}</div>${cards}</main></body></html>`;
  const result = await libraryArticleLayout(new Request('https://aafnaipatro.com/article/example'), new Response(html,{headers:{'content-type':'text/html'}}));
  const output = await result.text();
  assert.ok(output.indexOf('Paragraph 3</p>') < output.indexOf(slot));
  assert.ok(output.indexOf('Paragraph 7</p>') < output.indexOf('data-patro-adsterra="smartlink-inline"'));
  assert.ok(output.indexOf('data-patro-adsterra="smartlink-inline"') < output.indexOf('Paragraph 8</p>'));
  assert.ok(output.indexOf('Paragraph 10</p>') < output.indexOf(cards));
  assert.ok(output.indexOf(cards) < output.indexOf('Paragraph 11</p>'));
  assert.equal(output.split(cards).length-1, 1);
  assert.match(output, /<img src="diagram.png" loading="lazy" decoding="async">/);
});

test('preserves related sections when the section is duplicated or is not a known internal-card layout', async () => {
  globalThis.HTMLRewriter = TestRewriter;
  const paragraphs = Array.from({length: 14}, (_, i) => `<p>Paragraph ${i+1}</p>`).join('');
  const cards = '<section class="related"><h2>Related</h2><a class="related-card" href="/article/related">Read</a></section>';
  for (const sections of [cards+cards, '<section class="related"><p>No internal cards</p></section>']) {
    const html = `<html><body>${slot}<main><div id="article-body">${paragraphs}</div>${sections}</main></body></html>`;
    const result = await libraryArticleLayout(new Request('https://aafnaipatro.com/article/example'), new Response(html,{headers:{'content-type':'text/html'}}));
    const output = await result.text();
    assert.ok(output.includes(sections));
    assert.ok(output.indexOf(sections) > output.indexOf('Paragraph 14'));
  }
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
