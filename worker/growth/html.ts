/**
 * Shared English HTML shell for the growth page families (moon, US festival timing).
 *
 * Design rules (keep them):
 *  - Standalone server-rendered HTML, no SPA bundle, so the answer is in the first byte.
 *  - Every page carries computed, page-specific data (times, tables). Never ship a page
 *    whose only difference from another page is a swapped keyword: that is scaled-content
 *    abuse under Google's spam policies and can hurt the whole domain.
 *  - Edge cacheable, no D1 reads.
 */

export type GrowthEnv = Record<string, unknown> & { PUBLIC_SITE_URL?: string };

export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export const siteOrigin = (env: GrowthEnv) => String(env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");

export const cleanPath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

/** US time zones shown on every timing table, in this order, plus UTC and Nepal. */
export const US_ZONES: Array<{ tz: string; label: string }> = [
  { tz: "America/New_York", label: "Eastern (ET)" },
  { tz: "America/Chicago", label: "Central (CT)" },
  { tz: "America/Denver", label: "Mountain (MT)" },
  { tz: "America/Phoenix", label: "Arizona (MST)" },
  { tz: "America/Los_Angeles", label: "Pacific (PT)" },
  { tz: "America/Anchorage", label: "Alaska (AKT)" },
  { tz: "Pacific/Honolulu", label: "Hawaii (HT)" },
];
export const EXTRA_ZONES: Array<{ tz: string; label: string }> = [
  { tz: "UTC", label: "UTC" },
  { tz: "Asia/Kathmandu", label: "Nepal (NPT)" },
  { tz: "Asia/Kolkata", label: "India (IST)" },
];

export function fmtTime(instant: Date | null | undefined, tz: string, opts: { date?: boolean; weekday?: boolean } = {}) {
  if (!instant) return "—";
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    ...(opts.date ? { month: "short", day: "numeric" } : {}),
    ...(opts.weekday ? { weekday: "short" } : {}),
  });
  return f.format(instant);
}

export function fmtDate(instant: Date, tz: string, style: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: style === "long" ? "long" : "short",
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

/** yyyy-mm-dd of an instant in a time zone. */
export function ymd(instant: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

export const MONTH_SLUGS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export const MONTH_NAMES = MONTH_SLUGS.map((m) => m[0].toUpperCase() + m.slice(1));

const CSS = `:root{--bg:#f6f8f5;--card:#fff;--ink:#14231a;--muted:#55665b;--line:#dfe6df;--accent:#176f3b;--soft:#e9f3ec}
@media (prefers-color-scheme:dark){:root{--bg:#0f1512;--card:#17201b;--ink:#e7efe9;--muted:#a3b3a8;--line:#2a372f;--accent:#5fc18a;--soft:#1d2a22}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans Devanagari",sans-serif}
a{color:var(--accent)}header.top{border-bottom:1px solid var(--line);background:var(--card)}header.top div{max-width:1040px;margin:auto;padding:12px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header.top a.brand{font-weight:700;text-decoration:none;color:var(--ink)}main{max-width:1040px;margin:auto;padding:20px 16px 48px}
.crumbs{font-size:14px;color:var(--muted)}h1{font-size:clamp(26px,4vw,36px);line-height:1.2;margin:.3em 0}
.answer{background:var(--soft);border:1px solid var(--line);border-radius:16px;padding:16px 18px;font-size:18px;margin:12px 0 18px}
.answer strong{font-size:22px}.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.stat b{display:block;font-size:13px;color:var(--muted);font-weight:600}.stat span{font-size:20px}
.tablewrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:15px}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;white-space:nowrap}
th{font-size:13px;color:var(--muted);font-weight:600}td.wrap,th.wrap{white-space:normal}.tag{display:inline-block;font-size:12px;border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin-left:6px;color:var(--muted)}
.note{font-size:14px;color:var(--muted)}.links{display:flex;flex-wrap:wrap;gap:8px}.links a{border:1px solid var(--line);border-radius:999px;padding:4px 12px;text-decoration:none;background:var(--card)}
.moon{width:72px;height:72px;flex:none}.hero{display:flex;gap:16px;align-items:center}footer{max-width:1040px;margin:auto;padding:0 16px 40px;font-size:14px;color:var(--muted)}
@media (max-width:600px){th,td{padding:7px 8px;font-size:14px}}`;

export interface ShellOptions {
  title: string;
  description: string;
  body: string;
  schema?: unknown;
  index?: boolean;
  /** seconds for the edge cache; live pages use short values */
  sMaxAge?: number;
  backend?: string;
  lang?: string;
  /** hreflang alternates, e.g. [{ lang: "de", path: "/de/mond" }]; x-default should be included by the caller */
  alternates?: Array<{ lang: string; path: string }>;
  /** replaces the default (English) header links */
  nav?: string;
  /** replaces the default (English) footer text */
  footer?: string;
}

export function shell(request: Request, env: GrowthEnv, opts: ShellOptions): Response {
  const canonical = siteOrigin(env) + cleanPath(new URL(request.url).pathname);
  const index = opts.index !== false;
  const robots = index ? "index,follow,max-snippet:-1,max-image-preview:large" : "noindex,follow";
  const schema = opts.schema ? `<script type="application/ld+json">${JSON.stringify(opts.schema).replace(/</g, "\\u003c")}</script>` : "";
  const alternates = (opts.alternates || []).map((a) => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(siteOrigin(env) + a.path)}">`).join("");
  const nav = opts.nav ?? `<a href="/moon">Moon today</a><a href="/moon/full-moon/${new Date().getUTCFullYear()}">Full moons</a><a href="/eclipse">Eclipses</a><a href="/us/festivals">Festival times (US)</a><a href="/nepal">Nepal</a><a href="/">नेपाली पात्रो</a>`;
  const footer = opts.footer ?? `Times are computed with the open-source astronomy-engine library (about 1 arc-minute accuracy) and shown to the minute. Festival dates follow the rules described on each page; local temples or family priests may follow a different tradition. <a href="/methodology">Methodology</a> · <a href="/corrections">Report a correction</a>`;
  const html = `<!doctype html><html lang="${esc(opts.lang || "en")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title><meta name="description" content="${esc(opts.description)}"><meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonical)}">${alternates}<meta property="og:type" content="website"><meta property="og:site_name" content="Aafnai Patro">
<meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}"><meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(siteOrigin(env))}/og-default.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#176f3b"><style>${CSS}</style>${schema}</head>
<body><header class="top"><div><a class="brand" href="/">Aafnai Patro</a>${nav}</div></header>
<main>${opts.body}</main>
<footer><p>${footer}</p></footer>
</body></html>`;
  const sMaxAge = opts.sMaxAge ?? 86_400;
  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": `public, max-age=${Math.min(sMaxAge, 900)}, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 4}`,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-patro-backend": opts.backend || "growth-dynamic",
      "x-robots-tag": index ? "index, follow" : "noindex, follow",
    },
  });
}

export function notFound(message = "Not found") {
  return new Response(message, { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300", "x-robots-tag": "noindex, nofollow" } });
}

export function redirect(request: Request, pathname: string, status = 301) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = "";
  return Response.redirect(url.toString(), status);
}

export function breadcrumbs(env: GrowthEnv, items: Array<[string, string]>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: siteOrigin(env) + path })),
  };
}

export function crumbsHtml(items: Array<[string, string]>) {
  return `<p class="crumbs">${items.map(([name, path], i) => (i === items.length - 1 ? esc(name) : `<a href="${esc(path)}">${esc(name)}</a>`)).join(" › ")}</p>`;
}

/** Small inline SVG of the moon's lit fraction (northern-hemisphere view). */
export function moonSvg(phaseAngle: number, size = 72, id?: string) {
  // phaseAngle 0 = new, 180 = full. Lit side on the right while waxing.
  const r = size / 2 - 2;
  const c = size / 2;
  const k = Math.cos((phaseAngle * Math.PI) / 180); // 1 new … -1 full
  const waxing = phaseAngle < 180;
  const rx = Math.abs(k) * r;
  const litRight = waxing;
  // Outer lit half-circle + terminator ellipse.
  const sweepOuter = litRight ? 1 : 0;
  const sweepInner = (k > 0) === litRight ? 0 : 1;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${sweepOuter} ${c} ${c + r} A ${rx} ${r} 0 0 ${sweepInner} ${c} ${c - r} Z`;
  return `<svg class="moon"${id ? ` id="${id}"` : ""} viewBox="0 0 ${size} ${size}" role="img" aria-label="Moon phase illustration"><circle cx="${c}" cy="${c}" r="${r}" fill="#2b3530"/><path d="${d}" fill="#f4f1de"/></svg>`;
}

/**
 * Live moon values for statically prerendered pages (Cloudflare Free plan: pages are static files, so the
 * server-rendered numbers are "as of the build"). This tiny script recomputes phase, illumination, age and
 * the next full moon in the visitor's browser from a list of exact quarter instants embedded in the page —
 * no library, no network, no Worker request. Elements it updates: [data-m=m-phase|m-lit|m-age], #m-svg, #m-answer.
 */
export function moonLiveBlock(opts: {
  quarters: Array<[string, number]>; // [kind, epoch ms], sorted, covering at least build-40d … build+400d
  phases: Record<string, string>;
  intl: string;
  yes: string;                       // HTML when it is full moon now
  no: string;                        // HTML template with {date} {time} {days}
}) {
  const data = JSON.stringify(opts).replace(/</g, "\\u003c");
  return `<script type="application/json" id="moon-live">${data}</script>
<script>(()=>{try{const d=JSON.parse(document.getElementById("moon-live").textContent),now=Date.now(),q=d.quarters,i=q.findIndex(x=>x[1]>now);if(i<1)return;
const A={new:0,first:90,full:180,last:270},[k0,t0]=q[i-1],[,t1]=q[i],ang=(A[k0]+90*(now-t0)/(t1-t0))%360,lit=(1-Math.cos(ang*Math.PI/180))/2;
const near=q.find(x=>Math.abs(x[1]-now)<432e5),key=near?near[0]:ang<90?"waxingCrescent":ang<180?"waxingGibbous":ang<270?"waningGibbous":"waningCrescent";
const pn=[...q].reverse().find(x=>x[0]==="new"&&x[1]<=now),nf=q.find(x=>x[0]==="full"&&x[1]>now),set=(id,v)=>document.querySelectorAll('[data-m="'+id+'"]').forEach(e=>{e.textContent=v});
set("m-phase",d.phases[key]);set("m-lit",Math.round(lit*100)+" %");if(pn)set("m-age",((now-pn[1])/864e5).toLocaleString(d.intl,{maximumFractionDigits:1}));
const svg=document.getElementById("m-svg");if(svg){const p=svg.querySelector("path"),z=svg.viewBox.baseVal.width,r=z/2-2,c=z/2,k=Math.cos(ang*Math.PI/180),w=ang<180,rx=Math.abs(k)*r;p&&p.setAttribute("d","M "+c+" "+(c-r)+" A "+r+" "+r+" 0 0 "+(w?1:0)+" "+c+" "+(c+r)+" A "+rx+" "+r+" 0 0 "+(((k>0)===w)?0:1)+" "+c+" "+(c-r)+" Z")}
const ans=document.getElementById("m-answer");if(ans&&nf){const full=key==="full"||nf[1]-now<18*36e5;const dt=new Date(nf[1]);ans.innerHTML=full?d.yes:d.no.replace("{date}",dt.toLocaleDateString(d.intl,{weekday:"long",day:"numeric",month:"long",year:"numeric"})).replace("{time}",dt.toLocaleTimeString(d.intl,{hour:"2-digit",minute:"2-digit"})).replace("{days}",String(Math.max(0,Math.round((nf[1]-now)/864e5))))}}catch(e){}})();</script>`;
}
