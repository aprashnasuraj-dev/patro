/** One managed instance of each publisher-supplied unit per HTML document. */
export const ADSTERRA_VERSION = "2026-11-05-v5";
export const ADSTERRA_POPUNDER = "https://abscloud.org/1/fe7eda2cd06bda210f4e85075df3069c";
export const ADSTERRA_SOCIAL = "https://bauval.org/14/d526bb158baa587de984d6036f99adaf";
export const ADSTERRA_NATIVE = "https://bauval.org/21/b86f7b1b852ea7f8de7539079e6e7816";
export const ADSTERRA_SMARTLINK = "https://araplhn.org/4/c752b529eb7d6d4ebf1096d225dfb10a";
export const ADSTERRA_SMARTLINK_NEW = "https://asiafilm.org/4/b1871169a9878fda2bc2de21a208995a";
export const ADSTERRA_CONTAINER = "container-b86f7b1b852ea7f8de7539079e6e7816";
// The ad scripts are asynchronous; establish their connections early as well.
const ADSTERRA_CONNECTIONS = '<link data-patro-adsterra-preconnect rel="preconnect" href="https://abscloud.org"><link data-patro-adsterra-preconnect rel="preconnect" href="https://bauval.org">';
// A voluntary, dismissible notice only when both ad scripts fail to load.
// No extra ad requests, ad clicks, tracking, reloads or content blocking.
export const ADSTERRA_RECOVERY_JS = `(()=>{const failed={};let hidden=false;try{hidden=sessionStorage.getItem('patro-ad-notice-dismissed')==='1'}catch{}if(hidden)return;function show(){if(!document.body||document.getElementById('patro-ad-notice'))return;const box=document.createElement('aside');box.id='patro-ad-notice';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.style.cssText='box-sizing:border-box;max-width:1100px;margin:12px auto;padding:12px 16px;border:1px solid #b8c5bd;border-radius:10px;background:#f5f8f6;color:#33483c;display:flex;gap:16px;align-items:center;justify-content:space-between;font:13px/1.5 system-ui,sans-serif';const msg=document.createElement('span');msg.textContent='Ads could not load. If you use an ad blocker, please consider allowing ads to support AafnaiPatro.';const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.style.cssText='padding:6px 10px;cursor:pointer';close.addEventListener('click',()=>{hidden=true;try{sessionStorage.setItem('patro-ad-notice-dismissed','1')}catch{}box.remove()});box.append(msg,close);document.body.prepend(box)}window.addEventListener('error',event=>{const node=event.target;if(hidden||!node||node.tagName!=='SCRIPT')return;const kind=node.getAttribute('data-patro-adsterra');if(kind!=='native-loader'&&kind!=='social')return;failed[kind]=true;if(failed['native-loader']&&failed.social){if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true})}},true)})();`;
const ADSTERRA_RECOVERY_HTML = `<script data-patro-adsterra="recovery">${ADSTERRA_RECOVERY_JS}</script>`;
const managed = /abscloud\.org|bauval\.org|araplhn\.org|asiafilm\.org|patro-support\.js/i;
const script = (src        , kind        ) => `<script async data-cfasync="false" data-patro-adsterra="${kind}" src="${src}"></script>`;
export const ADSTERRA_HEAD = script(ADSTERRA_POPUNDER, "popunder");
export const ADSTERRA_SOCIAL_HTML = script(ADSTERRA_SOCIAL, "social");
export const ADSTERRA_NATIVE_HTML = `<aside id="patro-native-ad-slot" data-patro-adsterra="native" aria-label="Advertisement" style="display:block;box-sizing:border-box;max-width:1100px;width:calc(100% - 24px);margin:24px auto;padding:14px;border:1px solid #b8c5bd;border-radius:12px;background:#f5f8f6;color:#33483c;overflow:hidden"><div style="font:11px/1.5 system-ui,sans-serif;letter-spacing:.06em;margin-bottom:8px">ADVERTISEMENT · विज्ञापन</div><div id="${ADSTERRA_CONTAINER}"></div>${script(ADSTERRA_NATIVE, "native-loader")}</aside>`;
export function additionalNative(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const unit = JSON.parse(raw), url = new URL(unit.src);
    const id = url.pathname.match(/^\/21\/([a-f0-9]{32})$/i)?.[1];
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
        !id || unit.container !== `container-${id}` || id.toLowerCase() === 'b86f7b1b852ea7f8de7539079e6e7816') return null;
    return `<aside id="patro-native-ad-second" data-patro-adsterra="native-second" aria-label="Advertisement" style="display:block;box-sizing:border-box;max-width:1100px;width:calc(100% - 24px);margin:24px auto;padding:14px;border:1px solid #b8c5bd;border-radius:12px;background:#f5f8f6;color:#33483c;overflow:hidden"><div style="font:11px/1.5 system-ui,sans-serif;letter-spacing:.06em;margin-bottom:8px">ADVERTISEMENT · विज्ञापन</div><div id="${unit.container}"></div>${script(url.href, "native-second-loader")}</aside>`;
  } catch { return null; }
}
export function adsterraSmartlink(position        )         {
  const target = position === 'bottom' ? ADSTERRA_SMARTLINK : ADSTERRA_SMARTLINK_NEW;
  return `<aside data-patro-adsterra="smartlink-${position}" aria-label="Sponsored advertisement" style="box-sizing:border-box;max-width:1100px;width:calc(100% - 24px);margin:12px auto;padding:12px 16px;border:1px solid #b8c5bd;border-radius:10px;background:#f5f8f6;color:#33483c;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;font:13px/1.5 system-ui,sans-serif"><span>Sponsored · विज्ञापन</span><a href="${target}" target="_blank" rel="sponsored noopener noreferrer nofollow" style="color:#176f3b;font-weight:700;text-decoration:underline">Explore sponsor offers ↗</a></aside>`;
}

/** Ad creatives use rotating HTTPS delivery hosts. Keep object/base/form and
 * frame-ancestor restrictions; broaden only ad resource directives. */
export function adsterraCsp(policy        )         {
  const directives = policy.split(";").map(x => x.trim()).filter(Boolean);
  const ensure = (name        , sources          ) => {
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

export function adsterraEligible(path        )          {
  return !/^\/(?:admin(?:-console)?|api|compat-api|auth|me|private|embed|widget|offline)(?:\/|$)/i.test(path);
}

export function installAdsterra(html        )         {
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
  out = out.replace(/<link\b[^>]*data-patro-adsterra-preconnect[^>]*>/gi, "");
  out = out.replace(/<head\b[^>]*>/i, tag => tag + ADSTERRA_CONNECTIONS + ADSTERRA_RECOVERY_HTML);
  out = out.replace(/<\/head\s*>/i, ADSTERRA_HEAD + "</head>");
  out = out.replace(/<body\b[^>]*>/i, tag => tag + adsterraSmartlink("top") + ADSTERRA_NATIVE_HTML);
  return out.replace(/<\/body\s*>/i, adsterraSmartlink("bottom") + ADSTERRA_SOCIAL_HTML + "</body>");
}

/** Streaming decoration preserves content and existing response/cache headers. */
export function adsterraResponse(request         , response          , env = {})           {
  if (request.method !== "GET" || response.status !== 200 || !response.headers.get("content-type")?.toLowerCase().includes("text/html") || !adsterraEligible(new URL(request.url).pathname)) return response;
  if (response.headers.get("x-patro-adsterra") === ADSTERRA_VERSION) return response;
  const isToolPage = /^\/tool\/[a-z0-9-]+\/?$/i.test(new URL(request.url).pathname);
  const secondNative = isToolPage ? additionalNative(env.ADSTERRA_NATIVE_SECOND) : null;
  const headers = new Headers(response.headers);
  const csp = headers.get("content-security-policy");
  if (csp) headers.set("content-security-policy", adsterraCsp(csp));
  headers.set("x-patro-adsterra", ADSTERRA_VERSION);
  headers.delete("content-length"); headers.delete("etag"); headers.delete("content-md5");
  const result = new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  // @ts-ignore Available in the Cloudflare Workers runtime.
  return new HTMLRewriter()
    .on("script", {element(el     ) {if (managed.test(el.getAttribute("src") || "") || el.getAttribute("data-patro-adsterra") !== null) el.remove();}})
    .on("[data-patro-adsterra]", {element(el     ) {el.remove();}})
    .on("#patro-native-ad-slot", {element(el     ) {el.remove();}})
    .on(`#${ADSTERRA_CONTAINER}`, {element(el     ) {el.remove();}})
    .on("a[href]", {element(el     ) {if (managed.test(el.getAttribute("href") || "")) el.remove();}})
    .on("meta[http-equiv]", {element(el     ) {if ((el.getAttribute("http-equiv") || "").toLowerCase() === "content-security-policy") el.setAttribute("content", adsterraCsp(el.getAttribute("content") || "default-src 'self'"));}})
    .on("link[data-patro-adsterra-preconnect]", {element(el     ) {el.remove();}})
    .on("head", {element(el     ) {el.prepend(ADSTERRA_CONNECTIONS + ADSTERRA_RECOVERY_HTML, {html:true});el.append(ADSTERRA_HEAD, {html:true});}})
    .on("#ct-tool", {element(el     ) {if (isToolPage) el.after(secondNative || adsterraSmartlink("tool-after"), {html:true});}})
    .on("body", {element(el     ) {el.prepend(adsterraSmartlink("top") + ADSTERRA_NATIVE_HTML, {html:true});el.append(adsterraSmartlink("bottom") + ADSTERRA_SOCIAL_HTML, {html:true});}})
    .transform(result);
}

