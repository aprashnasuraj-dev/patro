import type { ExploreFamily } from "./families";

export type LinkRef = { path: string; title: string; title_ne?: string };

/**
 * One prebuilt page record (R2 object explore/v1/pages{path}.json), written by scripts/explore/build.mjs.
 * Everything the page needs — breadcrumbs, children, siblings, the index decision — is precomputed, so a
 * cache miss costs exactly one R2 read and a template fill.
 */
export type ExploreRecord = {
  v: 1;
  family: string;
  path: string;
  title: string;
  title_ne?: string;
  description: string;
  summary?: string;
  summary_ne?: string;
  facts?: { label: string; label_ne?: string; value: string; value_ne?: string; href?: string }[];
  sections?: { heading: string; heading_ne?: string; text: string }[];
  child_heading?: string;
  child_heading_ne?: string;
  geo?: { lat: number; lng: number };
  website?: string;
  links?: { href: string; label: string }[];
  source_name?: string;
  source_url?: string;
  lastmod: string;
  indexable: boolean;
  ancestors: LinkRef[];
  children: LinkRef[];
  children_total: number;
  siblings: LinkRef[];
  hash: string;
};

export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
const safeHref = (href: string) => (/^\/(?!\/)/.test(href) || /^https?:\/\//.test(href) ? href : "#");

/** Final index decision: the build's quality gate AND the family's current thresholds must both pass. */
export function isIndexable(record: ExploreRecord, family: ExploreFamily): boolean {
  return record.indexable === true && (record.facts?.length ?? 0) >= family.min_facts && record.description.length >= family.min_description;
}

const STYLE = `:root{--bg:#f5f7f4;--card:#fff;--ink:#172019;--muted:#5b675e;--line:#dde3dc;--accent:#176f3b}
@media (prefers-color-scheme:dark){:root{--bg:#101511;--card:#18201a;--ink:#e8efe9;--muted:#a3b0a6;--line:#2a352d;--accent:#7fd19c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 system-ui,"Noto Sans Devanagari",sans-serif}
main{max-width:820px;margin:0 auto;padding:16px}article,nav.crumbs,section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:14px 0}
a{color:var(--accent)}h1{font-size:1.6rem;line-height:1.25;margin:.2em 0}h2{font-size:1.15rem;margin:.2em 0 .6em}.ne{color:var(--muted)}
nav.crumbs{font-size:.9rem;padding:10px 16px}nav.crumbs a{text-decoration:none}table{width:100%;border-collapse:collapse}
th,td{padding:9px 6px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{width:40%;font-weight:600}
ul.links{columns:2;column-gap:20px;padding-left:18px;margin:0}@media (max-width:560px){ul.links{columns:1}}
footer{font-size:.85rem;color:var(--muted);padding:6px 4px 30px}`;

const neSpan = (value?: string) => (value ? ` <span class="ne" lang="ne">${esc(value)}</span>` : "");

export function renderPage(site: string, family: ExploreFamily, r: ExploreRecord): string {
  const canonical = site + r.path;
  const indexable = isIndexable(r, family);
  const isRoot = r.path === family.prefix;
  const heading = isRoot ? family.root_label : r.title;
  const headingNe = isRoot ? family.root_label_ne : r.title_ne;
  const titleFull = headingNe ? `${heading} · ${headingNe}` : heading;
  const label = (l: LinkRef) => (l.path === family.prefix ? family.root_label : l.title);

  const crumbs = [{ path: "/", title: "आफ्नै पात्रो" }, ...r.ancestors.map((a) => ({ path: a.path, title: label(a) })), { path: r.path, title: heading }];
  const parent = r.ancestors.at(-1);

  const entity: Record<string, unknown> = { "@type": family.schema_type, "@id": canonical + "#entity", name: heading, url: canonical, description: r.description };
  if (headingNe) entity.alternateName = headingNe;
  if (parent && parent.path !== family.prefix) entity.containedInPlace = { "@type": family.schema_type, name: parent.title, url: site + parent.path };
  if (r.geo) entity.geo = { "@type": "GeoCoordinates", latitude: r.geo.lat, longitude: r.geo.lng };
  if (r.website && /^https?:\/\//.test(r.website)) entity.sameAs = [r.website];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": canonical, url: canonical, name: titleFull, description: r.description, inLanguage: ["en", "ne"], dateModified: r.lastmod, about: { "@id": canonical + "#entity" } },
      entity,
      { "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, item: site + c.path })) },
    ],
  };

  const facts = (r.facts || [])
    .map((f) => {
      const value = f.href ? `<a href="${esc(safeHref(f.href))}">${esc(f.value)}</a>` : esc(f.value);
      return `<tr><th>${esc(f.label)}${f.label_ne ? `<br><span class="ne" lang="ne">${esc(f.label_ne)}</span>` : ""}</th><td>${value}${neSpan(f.value_ne)}</td></tr>`;
    })
    .join("");

  const linkList = (rows: LinkRef[]) => `<ul class="links">${rows.map((l) => `<li><a href="${esc(l.path)}">${esc(l.title)}</a>${neSpan(l.title_ne)}</li>`).join("")}</ul>`;
  const sections = (r.sections || []).map((s) => `<section><h2>${esc(s.heading)}${neSpan(s.heading_ne)}</h2><p>${esc(s.text)}</p></section>`).join("");
  const more = r.children_total > r.children.length ? `<p>Showing ${r.children.length} of ${r.children_total}.</p>` : "";
  const extraLinks = [...(r.links || []), { href: "/today", label: "Today's Nepali date · आजको मिति" }, { href: "/festivals", label: "Festivals · चाडपर्व" }];
  const source = r.source_url
    ? `Source: <a href="${esc(safeHref(r.source_url))}" rel="nofollow noopener">${esc(r.source_name || r.source_url)}</a>. `
    : r.source_name
      ? `Source: ${esc(r.source_name)}. `
      : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titleFull)} | आफ्नै पात्रो</title>
<meta name="description" content="${esc(r.description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${indexable ? "index, follow, max-image-preview:large" : "noindex, follow"}">
<meta property="og:title" content="${esc(titleFull)}"><meta property="og:description" content="${esc(r.description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(site)}/og-default.png">
<script type="application/ld+json">${jsonLd(schema)}</script>
<style>${STYLE}</style></head><body><main>
<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(c.title)}</span>` : `<a href="${esc(c.path)}">${esc(c.title)}</a>`)).join(" › ")}</nav>
<article><h1>${esc(heading)}${headingNe ? `<br><span class="ne" lang="ne">${esc(headingNe)}</span>` : ""}</h1>
<p>${esc(r.summary || r.description)}</p>${r.summary_ne ? `<p lang="ne">${esc(r.summary_ne)}</p>` : ""}
${facts ? `<table>${facts}</table>` : ""}</article>
${sections}
${r.children.length ? `<section><h2>${esc(r.child_heading || "Inside " + heading)}${neSpan(r.child_heading_ne)}</h2>${linkList(r.children)}${more}</section>` : ""}
${r.siblings.length && parent ? `<section><h2>More in ${esc(label(parent))}</h2>${linkList(r.siblings)}</section>` : ""}
<section><h2>More on आफ्नै पात्रो</h2><ul class="links">${extraLinks.map((l) => `<li><a href="${esc(safeHref(l.href))}">${esc(l.label)}</a></li>`).join("")}</ul></section>
<footer>${source}Last updated <time datetime="${esc(r.lastmod)}">${esc(r.lastmod)}</time>. Found a mistake? <a href="/corrections">Report a correction</a>.</footer>
</main></body></html>`;
}

export function renderNotFound(family: ExploreFamily): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found | आफ्नै पात्रो</title><meta name="robots" content="noindex, follow"><style>${STYLE}</style></head><body><main><article><h1>Page not found</h1><p>We could not find that page. Browse <a href="${esc(family.prefix)}">${esc(family.root_label)}</a> or go to <a href="/">आफ्नै पात्रो</a>.</p></article></main></body></html>`;
}
