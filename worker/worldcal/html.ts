/**
 * Shared server-rendered HTML shell for the world-calendar families.
 * Standalone pages (no SPA bundle): the answer is in the first byte, every page carries computed, page-specific data.
 *
 * Each family has its own visual identity (theme), chosen from its subject:
 *  - moon:     night sky over a garden — indigo dusk, moonlight gold; the hero is today's real moon disc.
 *  - eth:      Ethiopian New Year — roasted-coffee brown, Adey Abeba (Meskel daisy) yellow, highland green; 13-month ring.
 *  - bali:     temple courtyard — frangipani white, volcanic stone, temple gold, poleng checker band; 210-day Pawukon ring.
 *  - weton:    Javanese batik — indigo cloth, sogan gold, kawung motif; the 35-day weton grid.
 *  - nameday:  the kitchen wall calendar — paper, ink and calendar red; a tear-off sheet.
 * No web fonts are loaded (privacy and speed); every stack is a deliberate system choice per theme.
 */
export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const jsonLd = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

export type Theme = "moon" | "eth" | "bali" | "weton" | "nameday";
export type Crumb = { href: string; label: string };
export type PageOpts = {
  site: string;
  path: string;
  lang: string;
  title: string;
  description: string;
  h1: string;
  sub?: string;
  /** Signature visual shown in the hero beside the heading. */
  hero?: string;
  /** Short line under the hero (the answer, in words). */
  lede?: string;
  body: string;
  crumbs: Crumb[];
  indexable: boolean;
  alternates?: { lang: string; path: string }[];
  schema?: Record<string, unknown>[];
  dir?: "ltr" | "rtl";
  footer?: string;
};

export function themeFor(path: string): Theme {
  if (path.startsWith("/mondkalender") || path.startsWith("/calendario-lunar")) return "moon";
  if (path.startsWith("/ethiopian-calendar")) return "eth";
  if (path.startsWith("/bali-calendar")) return "bali";
  if (path.startsWith("/weton")) return "weton";
  return "nameday";
}

const BASE = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.62 var(--body);min-height:100vh}
main{max-width:920px;margin:0 auto;padding:14px 16px 48px}
a{color:var(--link)}a:hover{color:var(--accent)}:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:4px}
nav.crumbs{font-size:.86rem;color:var(--muted);margin:4px 0 18px}nav.crumbs a{color:var(--muted);text-decoration:none}nav.crumbs a:hover{color:var(--ink)}
.hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px;align-items:center;padding:18px 0 26px;border-bottom:1px solid var(--line);margin-bottom:8px}
.hero.solo{grid-template-columns:1fr}.hero-art{display:flex;justify-content:center}.hero-art svg{max-width:100%;height:auto}
h1{font:600 clamp(1.9rem,4.6vw,3rem)/1.08 var(--display);letter-spacing:-.01em;margin:0 0 10px}
.sub{color:var(--muted);margin:0 0 14px;font-size:1.02rem}.lede{font:500 clamp(1.25rem,2.6vw,1.6rem)/1.35 var(--display);margin:0}
h2{font:600 1.22rem/1.3 var(--display);margin:0 0 12px}
section{padding:22px 0;border-bottom:1px solid var(--line)}section:last-of-type{border-bottom:0}
.big{font:600 clamp(1.3rem,3vw,1.75rem)/1.3 var(--display);margin:0 0 10px}.muted{color:var(--muted)}.note{font-size:.9rem;color:var(--muted)}.warn{color:var(--warn)}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{padding:9px 8px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{font-weight:600;color:var(--muted)}tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}
.chip{display:inline-block;background:var(--chip);color:var(--ink);border-radius:999px;padding:3px 12px;margin:3px 6px 3px 0;text-decoration:none}a.chip:hover{background:var(--accent);color:var(--on-accent)}
.cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.cal div{background:var(--chip);border-radius:10px;padding:6px;min-height:58px;font-size:.8rem;overflow:hidden;overflow-wrap:anywhere}
.cal .h{background:none;min-height:auto;text-align:center;color:var(--muted);font-weight:600}.cal .today{background:var(--accent);color:var(--on-accent)}.cal .today a{color:var(--on-accent)}
ul.links{columns:2;column-gap:18px;padding-left:18px;margin:0}
form.inline{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}form.inline label{display:flex;flex-direction:column;font-size:.85rem;color:var(--muted);gap:4px}
input,select,button{font:inherit;padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:var(--field);color:var(--ink)}
button{background:var(--accent);color:var(--on-accent);border:0;font-weight:600;cursor:pointer}button:hover{filter:brightness(1.07)}
footer{font-size:.85rem;color:var(--muted);margin-top:28px;padding-top:14px;border-top:1px solid var(--line)}footer a{color:var(--muted)}
.intro-anim{animation:rise .9s cubic-bezier(.2,.7,.2,1) both}@keyframes rise{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
@media (max-width:700px){.hero{grid-template-columns:1fr;gap:10px}.hero-art{order:-1}.hero-art svg{width:min(78vw,300px)}}
@media (max-width:560px){ul.links{columns:1}.cal div{min-height:46px;font-size:.66rem;padding:4px}th,td{padding:8px 5px}body{font-size:16px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;

const THEMES: Record<Theme, string> = {
  moon: `:root{--bg:#0e1533;--ink:#eef0ff;--muted:#a3abd9;--line:rgba(214,220,255,.14);--accent:#f2d589;--on-accent:#1a1840;--link:#f6e3ab;--chip:rgba(255,255,255,.07);--field:rgba(255,255,255,.06);--warn:#ffcf8a;
--display:"Iowan Old Style","Palatino Linotype","Book Antiqua",Palatino,"URW Palladio L",Georgia,serif;--body:"Segoe UI",system-ui,-apple-system,"Noto Sans",sans-serif}
body{background:radial-gradient(1200px 700px at 78% -10%,#2b3a7e 0%,rgba(43,58,126,0) 60%),linear-gradient(180deg,#0e1533 0%,#141c46 55%,#0f1a2e 100%);background-attachment:fixed}
body::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.55;background-image:radial-gradient(1px 1px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 33% 72%,#cfd6ff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 58% 12%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 82% 44%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 91% 83%,#cfd6ff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 46% 38%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 22% 91%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 70% 64%,#e6e9ff 50%,transparent 51%)}
main{position:relative}.moon{filter:drop-shadow(0 0 40px rgba(246,231,181,.18))}.moon-lit{animation:wax 1.6s ease-out both}@keyframes wax{from{opacity:0}to{opacity:1}}
.hc{display:inline-block;padding:1px 10px;border-radius:999px;font-weight:600}.hc-best{background:#f2d589;color:#1a1840}.hc-good{background:rgba(242,213,137,.35)}.hc-neutral{color:var(--muted)}.hc-avoid{background:rgba(255,120,120,.18);color:#ffb3b3}
.daytype{display:inline-block;padding:2px 12px;border-radius:999px;font-weight:600;color:#14162e}.dt-fruit{background:#f3a96b}.dt-root{background:#c9a27a}.dt-flower{background:#e9b3e0}.dt-leaf{background:#93d3a2}`,
  eth: `:root{--bg:#24170f;--ink:#f7ecdb;--muted:#c9b59b;--line:rgba(247,236,219,.14);--accent:#f0b429;--on-accent:#2a1a0c;--link:#f5c75a;--chip:rgba(240,180,41,.12);--field:rgba(255,255,255,.06);--warn:#ffb38a;--green:#3f9b62;
--display:"Charter","Bitstream Charter","Sitka Text",Cambria,"Noto Serif","Noto Serif Ethiopic","Abyssinica SIL","Nyala",serif;--body:"Segoe UI",system-ui,-apple-system,"Noto Sans","Noto Sans Ethiopic","Nyala",sans-serif}
body{background:radial-gradient(900px 500px at 85% -5%,#4a2d17 0%,rgba(74,45,23,0) 65%),#24170f}
.tibeb{height:14px;margin:0 -16px 14px;background:repeating-linear-gradient(90deg,#f0b429 0 10px,#24170f 10px 14px,#3f9b62 14px 24px,#24170f 24px 28px,#c8463c 28px 38px,#24170f 38px 42px);opacity:.9;mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.ring .seg{fill:none;stroke:rgba(247,236,219,.18);stroke-width:16;stroke-linecap:round}.ring .seg.cur{stroke:rgba(240,180,41,.42)}.ring .seg.pag{stroke:rgba(63,155,98,.55)}
.ring .progress{fill:none;stroke:#f0b429;stroke-width:6;stroke-linecap:round;stroke-dasharray:2000;stroke-dashoffset:2000;animation:draw 1.8s .2s cubic-bezier(.3,.7,.2,1) forwards}@keyframes draw{to{stroke-dashoffset:0}}
.ring .mark{fill:#f0b429;stroke:#24170f;stroke-width:4}.ring .lbl{fill:#c9b59b;font:13px var(--display)}.ring .cbig{fill:#f7ecdb;font:700 46px var(--display)}.ring .csmall{fill:#c9b59b;font:15px var(--body)}
.geez{font:600 clamp(1.5rem,3.4vw,2.1rem)/1.3 var(--display);color:var(--accent);margin:0 0 4px}`,
  bali: `:root{--bg:#fbfaf5;--ink:#2e322c;--muted:#6c7066;--line:#e3e0d3;--accent:#a8781c;--on-accent:#fff;--link:#8a5f10;--chip:#f1ecdc;--field:#fff;--warn:#a23a3a;
--display:"Optima","Candara","Segoe UI","Noto Sans",sans-serif;--body:"Segoe UI",system-ui,-apple-system,"Noto Sans",sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#1d201b;--ink:#f0eee4;--muted:#b1b2a6;--line:#363a31;--accent:#e2b24b;--on-accent:#1d201b;--link:#e9c46a;--chip:#2a2e26;--field:#24271f}}
.poleng{height:12px;margin:0 -16px 14px;background-image:linear-gradient(45deg,var(--ink) 25%,transparent 25%,transparent 75%,var(--ink) 75%),linear-gradient(45deg,var(--ink) 25%,transparent 25%,transparent 75%,var(--ink) 75%);background-size:12px 12px;background-position:0 0,6px 6px;opacity:.85}
.ring .seg{fill:none;stroke:var(--line);stroke-width:18}.ring .seg.cur{stroke:var(--accent)}.ring .hol{fill:#b23a48}.ring .mark{fill:var(--ink);stroke:var(--bg);stroke-width:4;animation:pulse 2.4s ease-in-out 1}
@keyframes pulse{50%{r:14}}.ring .cbig{fill:var(--ink);font:600 34px var(--display)}.ring .csmall{fill:var(--muted);font:15px var(--body)}`,
  weton: `:root{--bg:#16203a;--ink:#f3ead6;--muted:#b9b29f;--line:rgba(243,234,214,.14);--accent:#d9a35b;--on-accent:#1a1f33;--link:#e7bb7a;--chip:rgba(217,163,91,.13);--field:rgba(255,255,255,.06);--warn:#ffb38a;
--display:"Optima","Candara","Segoe UI","Noto Sans",sans-serif;--body:"Segoe UI",system-ui,-apple-system,"Noto Sans",sans-serif}
body{background-color:#16203a;background-image:radial-gradient(circle at 50% 50%,transparent 9px,rgba(217,163,91,.07) 10px,rgba(217,163,91,.07) 11px,transparent 12px),radial-gradient(circle at 0 0,rgba(217,163,91,.06) 12px,transparent 13px);background-size:36px 36px;background-attachment:fixed}
.wgrid{display:grid;grid-template-columns:auto repeat(5,minmax(0,1fr));gap:5px;font-variant-numeric:tabular-nums;width:100%;max-width:400px}
.wg-h{font-size:.78rem;color:var(--muted);text-align:center;align-self:center}.wg-h.row{text-align:right;padding-right:6px}.wg-h.on{color:var(--accent);font-weight:700}
.wg-c{display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:50%;background:var(--chip);color:var(--ink);text-decoration:none;font-weight:600;font-size:.95rem}
.t-weton .hero-art{order:0}.wg-c:hover{background:rgba(217,163,91,.35)}.wg-c.on{background:var(--accent);color:var(--on-accent);box-shadow:0 0 0 6px rgba(217,163,91,.22);animation:glow 2.2s ease-in-out 1}@keyframes glow{40%{box-shadow:0 0 0 14px rgba(217,163,91,.12)}}
.neptu{font:700 clamp(3rem,9vw,5rem)/1 var(--display);color:var(--accent);margin:0}`,
  nameday: `:root{--bg:#f7f5f0;--ink:#1d1b19;--muted:#6b665f;--line:#e2ddd3;--accent:#c4122f;--on-accent:#fff;--link:#a30f27;--chip:#efe9df;--field:#fff;--warn:#9a5a00;--paper:#fffefb;
--display:"Rockwell","Roboto Slab","Zilla Slab","Clarendon","Georgia",serif;--body:"Segoe UI",system-ui,-apple-system,"Noto Sans",sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#191715;--ink:#f1ede6;--muted:#b0a99e;--line:#33302b;--accent:#ff5a6e;--on-accent:#191715;--link:#ff8494;--chip:#26231f;--field:#211e1b;--paper:#fffefb}}
.sheet{width:min(270px,70vw);background:var(--paper);color:#1d1b19;border-radius:6px 6px 14px 14px;box-shadow:0 1px 0 #ddd,0 18px 40px -18px rgba(60,40,20,.35);text-align:center;padding:0 0 18px;transform:rotate(-1.5deg);position:relative}
.sheet::after{content:"";position:absolute;left:8px;right:8px;bottom:-7px;height:10px;background:var(--paper);border-radius:0 0 10px 10px;opacity:.7;z-index:-1;transform:rotate(1.8deg)}
.sheet-top{height:30px;background:#c4122f;border-radius:6px 6px 0 0;display:flex;justify-content:space-around;align-items:center}.sheet-top span{width:10px;height:10px;border-radius:50%;background:#7a0b1d}
.sheet-month{font:600 1.05rem var(--body);margin-top:12px;color:#c4122f}.sheet-day{font:700 6.2rem/1 var(--display);color:#c4122f;margin:4px 0}.sheet-wd{font-size:.95rem;color:#6b665f}
.sheet-names{font:600 1.15rem/1.35 var(--display);margin:10px 14px 0;color:#1d1b19}`,
};

export function page(o: PageOpts): string {
  const canonical = o.site + o.path;
  const theme = themeFor(o.path);
  const crumbs = [{ href: "/", label: "Aafnai Patro" }, ...o.crumbs];
  const schema = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": canonical, url: canonical, name: o.title, description: o.description, inLanguage: o.lang },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: o.site + c.href })) },
    ...(o.schema || []),
  ];
  const alts = (o.alternates || []).map((a) => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(o.site + a.path)}">`).join("");
  const band = theme === "eth" ? '<div class="tibeb" aria-hidden="true"></div>' : theme === "bali" ? '<div class="poleng" aria-hidden="true"></div>' : "";
  const themeColor = { moon: "#0e1533", eth: "#24170f", bali: "#fbfaf5", weton: "#16203a", nameday: "#f7f5f0" }[theme];
  const body = o.body.replace(/<table/g, '<div class="tw"><table').replace(/<\/table>/g, "</table></div>");
  return `<!doctype html><html lang="${esc(o.lang)}" dir="${o.dir || "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title><meta name="description" content="${esc(o.description)}"><link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${o.indexable ? "index, follow, max-image-preview:large" : "noindex, follow"}">${alts}<meta name="theme-color" content="${themeColor}">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(o.site)}/og-default.png">
<link rel="icon" href="/favicon.ico"><script type="application/ld+json">${jsonLd(schema)}</script><style>${THEMES[theme]}\n${BASE}</style></head><body class="t-${theme}"><main>
${band}<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(c.label)}</span>` : `<a href="${esc(c.href)}">${esc(c.label)}</a>`)).join(" / ")}</nav>
<header class="hero${o.hero ? "" : " solo"}"><div><h1>${o.h1}</h1>${o.sub ? `<p class="sub">${o.sub}</p>` : ""}${o.lede ? `<p class="lede">${o.lede}</p>` : ""}</div>${o.hero ? `<div class="hero-art intro-anim">${o.hero}</div>` : ""}</header>
${body}
<footer>${o.footer || ""}<p><a href="/">Aafnai Patro</a> &nbsp; <a href="/corrections">Report a correction</a> &nbsp; <a href="/privacy">Privacy</a></p></footer>
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
