/**
 * Shared server-rendered HTML shell for the world-calendar families.
 * Standalone pages (no SPA bundle): the answer is in the first byte, every page carries computed, page-specific data.
 */
export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const jsonLd = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

export type Crumb = { href: string; label: string };
export type PageOpts = {
  site: string;
  path: string;
  lang: string;
  title: string;
  description: string;
  h1: string;
  sub?: string;
  body: string;
  crumbs: Crumb[];
  indexable: boolean;
  alternates?: { lang: string; path: string }[];
  schema?: Record<string, unknown>[];
  dir?: "ltr" | "rtl";
  footer?: string;
};

const STYLE = `:root{--bg:#f6f7f3;--card:#fff;--ink:#18201a;--muted:#5d6a60;--line:#dfe5dc;--accent:#176f3b;--soft:#eef5ef;--warn:#8a5a00}
@media (prefers-color-scheme:dark){:root{--bg:#0f1411;--card:#171f1a;--ink:#e7efe9;--muted:#a2b1a6;--line:#29342d;--accent:#7fd19c;--soft:#1b2a20;--warn:#f0c36b}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI","Noto Sans","Noto Sans Ethiopic",sans-serif}
main{max-width:860px;margin:0 auto;padding:12px 16px 40px}a{color:var(--accent)}
nav.crumbs{font-size:.88rem;color:var(--muted);margin:6px 0 10px}nav.crumbs a{text-decoration:none}
header.hero{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 20px;margin:8px 0 14px}
h1{font-size:1.65rem;line-height:1.2;margin:.1em 0 .25em}h2{font-size:1.15rem;margin:0 0 .6em}.sub{color:var(--muted);margin:0}
section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:12px 0}
.big{font-size:1.5rem;font-weight:700;line-height:1.3}.muted{color:var(--muted)}.note{font-size:.9rem;color:var(--muted)}.warn{color:var(--warn)}
table{width:100%;border-collapse:collapse}th,td{padding:8px 6px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{font-weight:600}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.chip{display:inline-block;background:var(--soft);border-radius:999px;padding:3px 10px;margin:2px 4px 2px 0}
.cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.cal div{background:var(--soft);border-radius:8px;padding:4px;min-height:52px;font-size:.82rem;overflow:hidden;overflow-wrap:anywhere}.cal .h{background:none;font-weight:600;min-height:auto;text-align:center}
.cal .today{outline:2px solid var(--accent)}ul.links{columns:2;column-gap:18px;padding-left:18px;margin:0}@media (max-width:560px){ul.links{columns:1}.cal div{min-height:44px;font-size:.68rem;padding:3px}th,td{padding:7px 4px}}
form.inline{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}form.inline label{display:flex;flex-direction:column;font-size:.85rem;color:var(--muted)}
input,select,button{font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}button{background:var(--accent);color:#fff;border:0;cursor:pointer}
footer{font-size:.85rem;color:var(--muted);margin-top:18px}`;

export function page(o: PageOpts): string {
  const canonical = o.site + o.path;
  const crumbs = [{ href: "/", label: "Aafnai Patro" }, ...o.crumbs];
  const schema = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": canonical, url: canonical, name: o.title, description: o.description, inLanguage: o.lang },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: o.site + c.href })) },
    ...(o.schema || []),
  ];
  const alts = (o.alternates || []).map((a) => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(o.site + a.path)}">`).join("");
  return `<!doctype html><html lang="${esc(o.lang)}" dir="${o.dir || "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title><meta name="description" content="${esc(o.description)}"><link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${o.indexable ? "index, follow, max-image-preview:large" : "noindex, follow"}">${alts}
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(o.site)}/og-default.png">
<link rel="icon" href="/favicon.ico"><script type="application/ld+json">${jsonLd(schema)}</script><style>${STYLE}</style></head><body><main>
<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(c.label)}</span>` : `<a href="${esc(c.href)}">${esc(c.label)}</a>`)).join(" › ")}</nav>
<header class="hero"><h1>${o.h1}</h1>${o.sub ? `<p class="sub">${o.sub}</p>` : ""}</header>
${o.body.replace(/<table/g, '<div class="tw"><table').replace(/<\/table>/g, "</table></div>")}
<footer>${o.footer || ""}<p><a href="/">Aafnai Patro</a> · <a href="/corrections">Report a correction</a> · <a href="/privacy">Privacy</a></p></footer>
</main></body></html>`;
}

/** Minimal ICS for "add reminder" links (yearly recurring all-day event). */
export function icsYearly(uid: string, summary: string, month: number, day: number, startYear: number, url: string): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const dt = `${startYear}${p(month)}${p(day)}`;
  const next = new Date(Date.UTC(startYear, month - 1, day + 1));
  const dtEnd = `${next.getUTCFullYear()}${p(next.getUTCMonth() + 1)}${p(next.getUTCDate())}`;
  const esc2 = (s: string) => s.replace(/([,;\\])/g, "\\$1");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aafnai Patro//World calendars//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${uid}@aafnaipatro.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${dt}`, `DTEND;VALUE=DATE:${dtEnd}`,
    "RRULE:FREQ=YEARLY", `SUMMARY:${esc2(summary)}`, `URL:${url}`, "TRANSP:TRANSPARENT", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}
