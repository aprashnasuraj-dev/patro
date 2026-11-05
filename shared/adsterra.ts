/** One managed instance of each publisher-supplied unit per HTML document. */
export const ADSTERRA_VERSION = "2026-11-05-v1";
export const ADSTERRA_POPUNDER = "https://abscloud.org/1/fe7eda2cd06bda210f4e85075df3069c";
export const ADSTERRA_SOCIAL = "https://bauval.org/14/d526bb158baa587de984d6036f99adaf";
export const ADSTERRA_NATIVE = "https://bauval.org/21/b86f7b1b852ea7f8de7539079e6e7816";
export const ADSTERRA_SMARTLINK = "https://araplhn.org/4/c752b529eb7d6d4ebf1096d225dfb10a";
export const ADSTERRA_CONTAINER = "container-b86f7b1b852ea7f8de7539079e6e7816";
const managed = /abscloud\.org|bauval\.org|araplhn\.org|patro-support\.js/i;
const script = (src: string, kind: string) => `<script async data-cfasync="false" data-patro-adsterra="${kind}" src="${src}"></script>`;
export const ADSTERRA_HEAD = script(ADSTERRA_POPUNDER, "popunder");
export const ADSTERRA_SOCIAL_HTML = script(ADSTERRA_SOCIAL, "social");
export const ADSTERRA_NATIVE_HTML = `<aside id="patro-native-ad-slot" data-patro-adsterra="native" aria-label="Advertisement" style="display:block;box-sizing:border-box;max-width:1100px;width:calc(100% - 24px);margin:24px auto;padding:14px;border:1px solid #b8c5bd;border-radius:12px;background:#f5f8f6;color:#33483c;overflow:hidden"><div style="font:11px/1.5 system-ui,sans-serif;letter-spacing:.06em;margin-bottom:8px">ADVERTISEMENT · विज्ञापन</div><div id="${ADSTERRA_CONTAINER}"></div>${script(ADSTERRA_NATIVE, "native-loader")}</aside>`;
export function adsterraSmartlink(position: string): string {
  return `<aside data-patro-adsterra="smartlink-${position}" aria-label="Sponsored advertisement" style="box-sizing:border-box;max-width:1100px;width:calc(100% - 24px);margin:12px auto;padding:12px 16px;border:1px solid #b8c5bd;border-radius:10px;background:#f5f8f6;color:#33483c;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;font:13px/1.5 system-ui,sans-serif"><span>Sponsored · विज्ञापन</span><a href="${ADSTERRA_SMARTLINK}" target="_blank" rel="sponsored noopener noreferrer nofollow" style="color:#176f3b;font-weight:700;text-decoration:underline">Explore sponsor offers ↗</a></aside>`;
}

/** Ad creatives use rotating HTTPS delivery hosts. Keep object/base/form and
 * frame-ancestor restrictions; broaden only ad resource directives. */
export function adsterraCsp(policy: string): string {
  const directives = policy.split(";").map(x => x.trim()).filter(Boolean);
  const ensure = (name: string, sources: string[]) => {
    const i = directives.findIndex(x => x.split(/\s/)[0].toLowerCase() === name);
    const fallback = directives.find(x => /^default-src\s/i.test(x))?.split(/\s+/).slice(1) || ["'self'"];
    const existing = i < 0 ? fallback : directives[i].split(/\s+/).slice(1);
    const next = [name, ...new Set([...existing.filter(x => x !== "'none'"), ...sources])].join(" ");
    if (i < 0) directives.push(next); else directives[i] = next;
  };
  ensure("script-src", ["https:", "'unsafe-inline'"]);
  if (directives.some(x => /^script-src-elem\s/i.test(x))) ensure("script-src-elem", ["https:", "'unsafe-inline'"]);
  ensure("connect-src", ["https:"]);
  ensure("img-src", ["https:", "data:"]);
  ensure("frame-src", ["https:"]);
  ensure("style-src", ["'unsafe-inline'"]);
  return directives.join("; ");
}

export function adsterraEligible(path: string): boolean {
  return !/^\/(?:admin(?:-console)?|api|compat-api|auth|me|private|embed|widget|offline)(?:\/|$)/i.test(path);
}

export function installAdsterra(html: string): string {
  if (!/<head\b/i.test(html) || !/<body\b/i.test(html)) return html;
  // Remove the entire managed regions first, making repeat builds idempotent.
  let out = html.replace(/<aside\b[^>]*data-patro-adsterra=["'][^"']*["'][^>]*>[\s\S]*?<\/aside\s*>/gi, "");
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, tag => {
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    return managed.test(src) || /data-patro-adsterra/i.test(tag) ? "" : tag;
  });
  out = out.replace(/<div\b[^>]*id=["'](?:patro-native-ad-slot|container-b86f7b1b852ea7f8de7539079e6e7816)["'][^>]*>\s*<\/div>/gi, "");
  out = out.replace(/<meta\b[^>]*>/gi, tag => {
    if (!/http-equiv\s*=\s*["']content-security-policy["']/i.test(tag)) return tag;
    return tag.replace(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i, (_, quote, policy) => `content=${quote}${adsterraCsp(policy)}${quote}`);
  });
  out = out.replace(/<\/head\s*>/i, ADSTERRA_HEAD + "</head>");
  out = out.replace(/<body\b[^>]*>/i, tag => tag + adsterraSmartlink("top") + ADSTERRA_NATIVE_HTML);
  return out.replace(/<\/body\s*>/i, adsterraSmartlink("bottom") + ADSTERRA_SOCIAL_HTML + "</body>");
}

/** Streaming decoration preserves content and existing response/cache headers. */
export function adsterraResponse(request: Request, response: Response): Response {
  if (request.method !== "GET" || response.status !== 200 || !response.headers.get("content-type")?.toLowerCase().includes("text/html") || !adsterraEligible(new URL(request.url).pathname)) return response;
  if (response.headers.get("x-patro-adsterra") === ADSTERRA_VERSION) return response;
  const headers = new Headers(response.headers);
  const csp = headers.get("content-security-policy");
  if (csp) headers.set("content-security-policy", adsterraCsp(csp));
  headers.set("x-patro-adsterra", ADSTERRA_VERSION);
  headers.delete("content-length"); headers.delete("etag"); headers.delete("content-md5");
  const result = new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  // @ts-ignore Available in the Cloudflare Workers runtime.
  return new HTMLRewriter()
    .on("script", {element(el: any) {if (managed.test(el.getAttribute("src") || "") || el.getAttribute("data-patro-adsterra") !== null) el.remove();}})
    .on("[data-patro-adsterra]", {element(el: any) {el.remove();}})
    .on("#patro-native-ad-slot", {element(el: any) {el.remove();}})
    .on(`#${ADSTERRA_CONTAINER}`, {element(el: any) {el.remove();}})
    .on("a[href]", {element(el: any) {if (managed.test(el.getAttribute("href") || "")) el.remove();}})
    .on("meta[http-equiv]", {element(el: any) {if ((el.getAttribute("http-equiv") || "").toLowerCase() === "content-security-policy") el.setAttribute("content", adsterraCsp(el.getAttribute("content") || "default-src 'self'"));}})
    .on("head", {element(el: any) {el.append(ADSTERRA_HEAD, {html:true});}})
    .on("body", {element(el: any) {el.prepend(adsterraSmartlink("top") + ADSTERRA_NATIVE_HTML, {html:true});el.append(adsterraSmartlink("bottom") + ADSTERRA_SOCIAL_HTML, {html:true});}})
    .transform(result);
}
