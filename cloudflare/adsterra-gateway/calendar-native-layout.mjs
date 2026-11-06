// On the known server-rendered world-calendar templates, retain the existing
// native unit but place it after the page's introductory hero. Unknown markup
// is deliberately left untouched.
const CALENDAR_PATH = /^\/(?:bali-calendar|weton|ethiopian-calendar|mondkalender|nameday|calendario-lunar|calendario-lunare)(?:\/|$)/i;
const SLOT = /<aside\b(?=[^>]*\bid\s*=\s*["']patro-native-ad-slot["'])[^>]*>[\s\S]*?<\/aside\s*>/gi;
const HERO = /<header\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bhero\b[^"']*["'])[^>]*>/i;
const MAX_BYTES = 512 * 1024;

export function moveNativeIntoCalendar(html) {
  const slots = [...html.matchAll(SLOT)];
  const body = html.search(/<body\b[^>]*>/i);
  const main = body < 0 ? -1 : html.slice(body).search(/<main\b[^>]*>/i) + body;
  if (slots.length !== 1 || body < 0 || main < body || slots[0].index >= main) return null;
  const beforeMainEnd = html.indexOf('</main>', main);
  if (beforeMainEnd < 0) return null;
  const content = html.slice(main, beforeMainEnd);
  const hero = content.search(HERO);
  if (hero < 0) return null;
  const close = content.indexOf('</header>', hero);
  if (close < 0) return null;
  const slot = slots[0];
  const without = html.slice(0, slot.index) + html.slice(slot.index + slot[0].length);
  const anchor = main + close + '</header>'.length - slot[0].length;
  return without.slice(0, anchor) + slot[0] + without.slice(anchor);
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

export async function calendarNativeLayout(request, response) {
  if (request.method !== 'GET' || request.headers.has('range') ||
      !CALENDAR_PATH.test(new URL(request.url).pathname) || response.status !== 200 ||
      !(response.headers.get('content-type') || '').toLowerCase().includes('text/html') ||
      response.headers.has('content-encoding')) return response;
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES) return response;
  try {
    const html = await boundedText(response);
    const updated = html === null ? null : moveNativeIntoCalendar(html);
    if (updated === null) return response;
    const headers = new Headers(response.headers);
    headers.delete('content-length'); headers.delete('etag'); headers.delete('content-md5');
    headers.set('x-patro-ad-layout', 'calendar-inline-1');
    return new Response(updated, { status: response.status, statusText: response.statusText, headers });
  } catch { return response; }
}
