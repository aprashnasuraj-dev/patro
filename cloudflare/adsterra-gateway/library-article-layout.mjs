// Relocate the existing native slot on known published article templates.
// The original response is returned if the expected structure is not present.
const ARTICLE_PATH = /^\/(?:article|blogs)\/[^/]+\/?$/i;
const SLOT = /<aside\b(?=[^>]*\bid\s*=\s*["']patro-native-ad-slot["'])[^>]*>[\s\S]*?<\/aside\s*>/gi;
const MAX_BYTES = 512 * 1024;
const PLACEMENT_AFTER_PARAGRAPH = 3;

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
    const headers = new Headers(response.headers);
    headers.delete('content-length'); headers.delete('etag'); headers.delete('content-md5');
    headers.set('x-patro-ad-layout', 'article-inline-1');
    let seen = 0;
    return new HTMLRewriter()
      .on('#patro-native-ad-slot', { element(el) { el.remove(); } })
      .on('#article-body > p', { element(el) { if (++seen === PLACEMENT_AFTER_PARAGRAPH) el.after(slots[0][0], { html: true }); } })
      .transform(new Response(html, { status: response.status, statusText: response.statusText, headers }));
  } catch { return response; }
}
