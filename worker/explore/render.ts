import type { ExploreFamily } from "./families";
import type { ExploreRow, LinkRow } from "./db";

/** body_json contract written by scripts/explore/*.mjs (see scripts/explore/README.md). */
export type ExploreBody = {
  summary?: string;
  summary_ne?: string;
  facts?: { label: string; label_ne?: string; value: string; value_ne?: string; href?: string }[];
  sections?: { heading: string; heading_ne?: string; text: string }[];
  child_heading?: string;
  child_heading_ne?: string;
  geo?: { lat: number; lng: number };
  website?: string;
  links?: { href: string; label: string }[];
};

export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export function parseBody(row: ExploreRow): ExploreBody {
  try {
    const parsed = JSON.parse(row.body_json);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Index only rows that the importer marked indexable AND still carry enough facts. */
export function isIndexable(row: ExploreRow, body: ExploreBody, family: ExploreFamily): boolean {
  return row.indexable === 1 && (body.facts?.length ?? 0) >= family.minFacts && row.description.length >= 50;
}

/** Ancestor paths of /place/a/b/c → ["/place", "/place/a", "/place/a/b"]. */
export function ancestorPaths(path: string, prefix: string): string[] {
  const parts = path.slice(prefix.length).split("/").filter(Boolean);
  const out = [prefix];
  for (let i = 1; i < parts.length; i++) out.push(prefix + "/" + parts.slice(0, i).join("/"));
  return path === prefix ? [] : out;
}

const safeHref = (href: string) => (/^\/(?!\/)/.test(href) || /^https:\/\//.test(href) ? href : "#");

const STYLE = `:root{--bg:#f5f7f4;--card:#fff;--ink:#172019;--muted:#5b675e;--line:#dde3dc;--accent:#176f3b}
@media (prefers-color-scheme:dark){:root{--bg:#101511;--card:#18201a;--ink:#e8efe9;--muted:#a3b0a6;--line:#2a352d;--accent:#7fd19c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 system-ui,"Noto Sans Devanagari",sans-serif}
main{max-width:820px;margin:0 auto;padding:16px}article,nav.crumbs,section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:14px 0}
a{color:var(--accent)}h1{font-size:1.6rem;line-height:1.25;margin:.2em 0}h2{font-size:1.15rem;margin:.2em 0 .6em}.ne{color:var(--muted)}
nav.crumbs{font-size:.9rem;padding:10px 16px}nav.crumbs a{text-decoration:none}table{width:100%;border-collapse:collapse}
th,td{padding:9px 6px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{width:40%;font-weight:600}
ul.links{columns:2;column-gap:20px;padding-left:18px;margin:0}@media (max-width:560px){ul.links{columns:1}}
footer{font-size:.85rem;color:var(--muted);padding:6px 4px 30px}`;

export function renderPage(opts: {
  site: string;
  family: ExploreFamily;
  row: ExploreRow;
  body: ExploreBody;
  ancestors: LinkRow[];
  children: LinkRow[];
  siblings: LinkRow[];
}): string {
  const { site, family, row, body, ancestors, children, siblings } = opts;
  const canonical = site + row.path;
  const indexable = isIndexable(row, body, family);
  const titleFull = row.title_ne ? `${row.title} · ${row.title_ne}` : row.title;

  const crumbs = [
    { path: "/", title: "आफ्नै पात्रो" },
    ...ancestors.map((a) => ({ path: a.path, title: a.path === family.prefix ? family.rootLabel : a.title })),
    { path: row.path, title: row.path === family.prefix ? family.rootLabel : row.title },
  ];

  const parent = ancestors.at(-1);
  const entity: Record<string, unknown> = {
    "@type": family.schemaType,
    "@id": canonical + "#entity",
    name: row.title,
    url: canonical,
    description: row.description,
  };
  if (row.title_ne) entity.alternateName = row.title_ne;
  if (parent && parent.path !== family.prefix) entity.containedInPlace = { "@type": family.schemaType, name: parent.title, url: site + parent.path };
  if (body.geo) entity.geo = { "@type": "GeoCoordinates", latitude: body.geo.lat, longitude: body.geo.lng };
  if (body.website && /^https?:\/\//.test(body.website)) entity.sameAs = [body.website];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": canonical, url: canonical, name: titleFull, description: row.description, inLanguage: ["en", "ne"], dateModified: row.lastmod, about: { "@id": canonical + "#entity" } },
      entity,
      { "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, item: site + c.path })) },
    ],
  };

  const facts = (body.facts || [])
    .map((f) => {
      const value = f.href ? `<a href="${esc(safeHref(f.href))}">${esc(f.value)}</a>` : esc(f.value);
      const valueNe = f.value_ne ? ` <span class="ne" lang="ne">${esc(f.value_ne)}</span>` : "";
      const labelNe = f.label_ne ? `<br><span class="ne" lang="ne">${esc(f.label_ne)}</span>` : "";
      return `<tr><th>${esc(f.label)}${labelNe}</th><td>${value}${valueNe}</td></tr>`;
    })
    .join("");

  const linkList = (rows: LinkRow[]) =>
    `<ul class="links">${rows.map((r) => `<li><a href="${esc(r.path)}">${esc(r.title)}</a>${r.title_ne ? ` <span class="ne" lang="ne">${esc(r.title_ne)}</span>` : ""}</li>`).join("")}</ul>`;

  const sections = (body.sections || [])
    .map((s) => `<section><h2>${esc(s.heading)}${s.heading_ne ? ` <span class="ne" lang="ne">${esc(s.heading_ne)}</span>` : ""}</h2><p>${esc(s.text)}</p></section>`)
    .join("");

  const extraLinks = [...(body.links || []), { href: "/today", label: "Today's Nepali date · आजको मिति" }, { href: "/festivals", label: "Festivals · चाडपर्व" }];
  const source = row.source_url
    ? `Source: <a href="${esc(safeHref(row.source_url))}" rel="nofollow noopener">${esc(row.source_name || row.source_url)}</a>. `
    : row.source_name
      ? `Source: ${esc(row.source_name)}. `
      : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titleFull)} | आफ्नै पात्रो</title>
<meta name="description" content="${esc(row.description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${indexable ? "index, follow, max-image-preview:large" : "noindex, follow"}">
<meta property="og:title" content="${esc(titleFull)}"><meta property="og:description" content="${esc(row.description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(site)}/og-default.png">
<script type="application/ld+json">${jsonLd(schema)}</script>
<style>${STYLE}</style></head><body><main>
<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(c.title)}</span>` : `<a href="${esc(c.path)}">${esc(c.title)}</a>`)).join(" › ")}</nav>
<article><h1>${esc(row.path === family.prefix ? family.rootLabel : row.title)}${row.title_ne ? `<br><span class="ne" lang="ne">${esc(row.path === family.prefix ? family.rootLabelNe : row.title_ne)}</span>` : ""}</h1>
${body.summary ? `<p>${esc(body.summary)}</p>` : `<p>${esc(row.description)}</p>`}${body.summary_ne ? `<p lang="ne">${esc(body.summary_ne)}</p>` : ""}
${facts ? `<table>${facts}</table>` : ""}</article>
${sections}
${children.length ? `<section><h2>${esc(body.child_heading || "Inside " + row.title)}${body.child_heading_ne ? ` <span class="ne" lang="ne">${esc(body.child_heading_ne)}</span>` : ""}</h2>${linkList(children)}</section>` : ""}
${siblings.length ? `<section><h2>Nearby in ${esc(parent?.path === family.prefix ? family.rootLabel : parent?.title || family.rootLabel)}</h2>${linkList(siblings)}</section>` : ""}
<section><h2>More on आफ्नै पात्रो</h2><ul class="links">${extraLinks.map((l) => `<li><a href="${esc(safeHref(l.href))}">${esc(l.label)}</a></li>`).join("")}</ul></section>
<footer>${source}Last updated <time datetime="${esc(row.lastmod)}">${esc(row.lastmod)}</time>. Found a mistake? <a href="/corrections">Report a correction</a>.</footer>
</main></body></html>`;
}

export function renderNotFound(family: ExploreFamily): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found | आफ्नै पात्रो</title><meta name="robots" content="noindex, follow"><style>${STYLE}</style></head><body><main><article><h1>Page not found</h1><p>We could not find that page. Browse <a href="${esc(family.prefix)}">${esc(family.rootLabel)}</a> or go to <a href="/">आफ्नै पात्रो</a>.</p></article></main></body></html>`;
}
