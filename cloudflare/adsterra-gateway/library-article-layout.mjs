// Apply bounded, template-aware changes to published article pages. Unknown
// layouts remain untouched; this never reads or republishes the R2 source.
import { adsterraSmartlink } from './patro-adsterra.mjs';

const ARTICLE_PATH = /^\/(?:article|blogs)\/[^/]+\/?$/i;
const SLOT = /<aside\b(?=[^>]*\bid\s*=\s*["']patro-native-ad-slot["'])[^>]*>[\s\S]*?<\/aside\s*>/gi;
const RELATED = /<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\brelated\b[^"']*["'])[^>]*>[\s\S]*?<\/section\s*>/gi;
const MAX_BYTES = 512 * 1024;
const PLACEMENT_AFTER_PARAGRAPH = 3;
const SMARTLINK_AFTER_PARAGRAPH = 7;
const RELATED_AFTER_PARAGRAPH = 10;

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

export async function libraryArticleLayout(request, response) {
  if (request.method !== 'GET' || request.headers.has('range') ||
      !ARTICLE_PATH.test(new URL(request.url).pathname) || response.status !== 200 ||
      !(response.headers.get('content-type') || '').toLowerCase().includes('text/html') ||
      response.headers.has('content-encoding') || !globalThis.HTMLRewriter) return response;
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES) return response;
  try {
    const html = await boundedText(response);
    if (html === null) return response;
    const slots = [...html.matchAll(SLOT)];
    if (slots.length !== 1) return response;
    let paragraphs = 0;
    const inspect = new HTMLRewriter().on('#article-body > p', { element() { paragraphs++; } });
    await inspect.transform(new Response(html)).text();
    if (paragraphs < PLACEMENT_AFTER_PARAGRAPH) return response;
    // Only move a single, simple related-reading section produced by the
    // library template, and only if it contains existing internal cards.
    const related = [...html.matchAll(RELATED)];
    const moveRelated = paragraphs >= RELATED_AFTER_PARAGRAPH + 2 && related.length === 1 &&
      !/<section\b/i.test(related[0][0].slice(related[0][0].indexOf('>') + 1)) &&
      /<a\b[^>]*class=["']related-card["'][^>]*href=["']\/article\//i.test(related[0][0]);
    const headers = new Headers(response.headers);
    headers.delete('content-length'); headers.delete('etag'); headers.delete('content-md5');
    headers.set('x-patro-ad-layout', 'article-inline-1');
    let seen = 0;
    return new HTMLRewriter()
      .on('#patro-native-ad-slot', { element(el) { el.remove(); } })
      .on('section.related', { element(el) { if (moveRelated) el.remove(); } })
      .on('#article-body img', { element(el) {
        if (el.getAttribute('fetchpriority')?.toLowerCase() === 'high') return;
        if (el.getAttribute('loading') === null) el.setAttribute('loading', 'lazy');
        if (el.getAttribute('decoding') === null) el.setAttribute('decoding', 'async');
      } })
      .on('#article-body > p', { element(el) {
        seen++;
        if (seen === PLACEMENT_AFTER_PARAGRAPH) el.after(slots[0][0], { html: true });
        if (seen === SMARTLINK_AFTER_PARAGRAPH && paragraphs >= SMARTLINK_AFTER_PARAGRAPH + 2)
          el.after(adsterraSmartlink('inline'), { html: true });
        if (seen === RELATED_AFTER_PARAGRAPH && moveRelated) el.after(related[0][0], { html: true });
      } })
      .transform(new Response(html, { status: response.status, statusText: response.statusText, headers }));
  } catch { return response; }
}
