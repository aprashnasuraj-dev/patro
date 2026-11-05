// Move the existing native unit into the known server-rendered date template.
// Unknown templates and large/compressed bodies are returned unchanged.
const DATE_PATH = /^\/date\/\d{4}-\d{2}-\d{2}$/;
const SLOT = /<aside\b(?=[^>]*\bid\s*=\s*["']patro-native-ad-slot["'])[^>]*>[\s\S]*?<\/aside\s*>/gi;
const NAV = /<nav\b(?=[^>]*\baria-label\s*=\s*["']Date navigation["'])[^>]*>/gi;
const MAX_BYTES = 512 * 1024;

export function moveNativeIntoDate(html) {
  const slots = [...html.matchAll(SLOT)];
  const anchors = [...html.matchAll(NAV)];
  // Do not guess when a response has an unexpected or duplicate structure.
  if (slots.length !== 1 || anchors.length !== 1 || slots[0].index >= anchors[0].index) return null;
  const slot = slots[0];
  const without = html.slice(0, slot.index) + html.slice(slot.index + slot[0].length);
  const anchor = without.search(NAV);
  if (anchor < 0) return null;
  return without.slice(0, anchor) + slot[0] + without.slice(anchor);
}

async function readBoundedClone(response) {
  const clone = response.clone();
  if (!clone.body) return null;
  const reader = clone.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > MAX_BYTES) {
      // The original response remains available to the client.
      void reader.cancel().catch(() => {});
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

export async function dateNativeLayout(request, response) {
  if (request.method !== 'GET' || request.headers.has('range') ||
      !DATE_PATH.test(new URL(request.url).pathname) || response.status !== 200 ||
      !(response.headers.get('content-type') || '').toLowerCase().includes('text/html') ||
      response.headers.has('content-encoding')) return response;
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES) return response;
  try {
    const original = await readBoundedClone(response);
    if (original === null) return response;
    const updated = moveNativeIntoDate(original);
    if (updated === null) return response;
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('etag');
    headers.delete('content-md5');
    headers.set('x-patro-ad-layout', 'date-inline-1');
    return new Response(updated, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}
