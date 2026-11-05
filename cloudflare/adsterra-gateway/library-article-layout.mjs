// Apply bounded, template-aware changes to published article pages. Unknown
// layouts remain untouched; this never reads or republishes the R2 source.
import { adsterraSmartlink } from './patro-adsterra.mjs';
import { articleDiscoveryNav } from './library-discovery.mjs';
import { relatedTool } from './related-tools.mjs';

const ARTICLE_PATH = /^\/(?:article|blogs)\/[^/]+\/?$/i;
const SLOT = /<aside\b(?=[^>]*\bid\s*=\s*["']patro-native-ad-slot["'])[^>]*>[\s\S]*?<\/aside\s*>/gi;
const RELATED = /<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\brelated\b[^"']*["'])[^>]*>[\s\S]*?<\/section\s*>/gi;
const MAX_BYTES = 512 * 1024;
const PLACEMENT_AFTER_PARAGRAPH = 3;
const SMARTLINK_AFTER_PARAGRAPH = 7;
const RELATED_AFTER_PARAGRAPH = 10;
const EXTRA_NATIVE_AFTER_PARAGRAPH = 8;

// A second placement must use a separate publisher-issued unit. The optional
// public variable is JSON: {"src":"https://.../21/<id>","container":"container-<id>"}.
// Missing, malformed or duplicated configuration emits no second ad.
export function additionalNative(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const unit = JSON.parse(raw), url = new URL(unit.src);
    const id = url.pathname.match(/^\/21\/([a-f0-9]{32})$/i)?.[1];
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
        !id || unit.container !== `container-${id}` ||
        id.toLowerCase() === 'b86f7b1b852ea7f8de7539079e6e7816') return null;
    return `<aside id="patro-native-ad-second" data-patro-adsterra="native-second" aria-label="Advertisement" style="display:block;box-sizing:border-box;max-width:1100px;width:calc(100% - 24px);margin:24px auto;padding:14px;border:1px solid #b8c5bd;border-radius:12px;background:#f5f8f6;color:#33483c;overflow:hidden"><div style="font:11px/1.5 system-ui,sans-serif;letter-spacing:.06em;margin-bottom:8px">ADVERTISEMENT · विज्ञापन</div><div id="${unit.container}"></div><script async data-cfasync="false" data-patro-adsterra="native-second-loader" src="${url.href}"></script></aside>`;
  } catch { return null; }
}

async function boundedText(response) {
  const reader = response.clone().body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0, text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > MAX_BYTES) { void reader.cancel().catch(() => {}); return null; }
    text += decoder.decode(value, { stream: true });
  }
}

export async function libraryArticleLayout(request, response, env = {}) {
  const path = new URL(request.url).pathname;
  const second = additionalNative(env.ADSTERRA_NATIVE_SECOND);
  const isResearch = /^\/research\/[^/]+\/?$/i.test(path);
  if (request.method !== 'GET' || request.headers.has('range') ||
      (!ARTICLE_PATH.test(path) && !(isResearch && second)) || response.status !== 200 ||
      !(response.headers.get('content-type') || '').toLowerCase().includes('text/html') ||
      response.headers.has('content-encoding') || !globalThis.HTMLRewriter) return response;
  if (isResearch) {
    const headers = new Headers(response.headers);
    headers.delete('content-length'); headers.delete('etag'); headers.delete('content-md5');
    let sections = 0;
    return new HTMLRewriter()
      .on('#patro-native-ad-second', { element(el) { el.remove(); } })
      .on('main.research-page > article > section', { element(el) { if (++sections === 2) el.after(second, {html:true}); } })
      .transform(new Response(response.body, {status:response.status, statusText:response.statusText, headers}));
  }
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES) return response;
  try {
    const html = await boundedText(response);
    if (html === null) return response;
    const slots = [...html.matchAll(SLOT)];
    if (slots.length !== 1) return response;
    let paragraphs = 0, articleHeaders = 0, articleTitles = 0;
    const inspect = new HTMLRewriter()
      .on('#article-body > p', { element() { paragraphs++; } })
      .on('header.article-header', { element() { articleHeaders++; } })
      .on('header.article-header > h1', { element() { articleTitles++; } });
    await inspect.transform(new Response(html)).text();
    const nativeAtTitle = articleTitles === 1;
    const moveNative = nativeAtTitle || paragraphs >= PLACEMENT_AFTER_PARAGRAPH;
    const secondAtHeader = !!second && paragraphs < EXTRA_NATIVE_AFTER_PARAGRAPH + 1 && articleHeaders === 1;
    const secondInserted = !!second && (paragraphs >= EXTRA_NATIVE_AFTER_PARAGRAPH + 1 || secondAtHeader);
    if (!moveNative && !secondAtHeader) return response;
    const discovery = articleHeaders === 1 && !html.includes('class="patro-discovery"')
      ? articleDiscoveryNav(html, path.replace(/\/$/, ''), relatedTool(path.replace(/\/$/, ''))) : '';
    // Only move a single, simple related-reading section produced by the
    // library template, and only if it contains existing internal cards.
    const related = [...html.matchAll(RELATED)];
    const moveRelated = paragraphs >= RELATED_AFTER_PARAGRAPH + 2 && related.length === 1 &&
      !/<section\b/i.test(related[0][0].slice(related[0][0].indexOf('>') + 1)) &&
      /<a\b[^>]*class=["']related-card["'][^>]*href=["']\/article\//i.test(related[0][0]);
    const headers = new Headers(response.headers);
    headers.delete('content-length'); headers.delete('etag'); headers.delete('content-md5');
    headers.set('x-patro-ad-layout', secondInserted ? 'article-configured-2' : nativeAtTitle ? 'article-headline-1' : 'article-inline-1');
    let seen = 0;
    return new HTMLRewriter()
      .on('#patro-native-ad-slot', { element(el) { if (moveNative) el.remove(); } })
      .on('#patro-native-ad-second', { element(el) { el.remove(); } })
      .on('header.article-header > h1', { element(el) { if (nativeAtTitle) el.after(slots[0][0], {html:true}); } })
      .on('header.article-header', { element(el) {
        if (secondAtHeader) el.after(second, {html:true});
        if (discovery) el.after(discovery, {html:true});
      } })
      .on('section.related', { element(el) { if (moveRelated) el.remove(); } })
      .on('#article-body img', { element(el) {
        if (el.getAttribute('fetchpriority')?.toLowerCase() === 'high') return;
        if (el.getAttribute('loading') === null) el.setAttribute('loading', 'lazy');
        if (el.getAttribute('decoding') === null) el.setAttribute('decoding', 'async');
      } })
      .on('#article-body > p', { element(el) {
        seen++;
        if (seen === PLACEMENT_AFTER_PARAGRAPH && moveNative && !nativeAtTitle) el.after(slots[0][0], { html: true });
        if (seen === EXTRA_NATIVE_AFTER_PARAGRAPH && secondInserted && !secondAtHeader) el.after(second, {html:true});
        if (seen === SMARTLINK_AFTER_PARAGRAPH && !secondInserted && paragraphs >= SMARTLINK_AFTER_PARAGRAPH + 2)
          el.after(adsterraSmartlink('inline'), { html: true });
        if (seen === RELATED_AFTER_PARAGRAPH && moveRelated) el.after(related[0][0], { html: true });
      } })
      .transform(new Response(html, { status: response.status, statusText: response.statusText, headers }));
  } catch { return response; }
}
