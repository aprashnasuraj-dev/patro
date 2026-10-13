/**
 * Server-side HTML for dictionary pages — plain string functions, shared by the build-time
 * prerender (Node) and the Cloudflare Worker (worker/dictionary.ts), so a page looks the same
 * whichever one produced it. React replaces the markup on boot (same classes as WordView).
 */
import { DICT_BASE_PATH, wordPath } from './keys.ts';
import { RHYME_LABELS, groupRhymes } from './rhyme.ts';
import { ORIGIN_LABELS, POS_LABELS, REGISTER_LABELS, type PartOfSpeech, type RhymeHit, type WordPayload } from './types.ts';
import { escapeHtml as esc, headToHtml, safeJson, type HeadData } from './seo.ts';

/** Marker the Worker uses to serve a prerendered page as-is (worker/connected-entry.ts PRERENDER_MARKER). */
export const PRERENDER_ATTR = 'data-seo-prerender="true"';

/** Strip the SPA's generic head tags so each page has exactly one of each. */
export function stripHead(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["'](description|robots|googlebot|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']alternate["'][^>]*hreflang[^>]*>/gi, '')
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
}

/**
 * Turn the app's dist/index.html into a reusable page shell with three placeholders.
 * The build writes it to /data/dict/v1/shell.html; the Worker fills it per request.
 */
export function buildShell(indexHtml: string): string {
  const rootRe = /<div id=["']root["'][^>]*>[\s\S]*?<\/div>(?=\s*(?:<script|<\/body|<noscript))/i;
  let html = stripHead(indexHtml).replace(/<html([^>]*)\blang=["'][^"']*["']/i, '<html$1lang="ne"');
  if (!rootRe.test(html)) throw new Error('index.html must contain <div id="root"></div>');
  html = html.replace(/<\/head>/i, '<!--DICT_HEAD--></head>');
  return html.replace(rootRe, `<div id="root"><!--DICT_BODY--></div><!--DICT_BOOT-->`);
}

export function fillShell(shell: string, head: HeadData, siteName: string, body: string, boot?: unknown): string {
  const bootTag = boot === undefined ? '' : `<script id="__DICT__" type="application/json">${safeJson(boot)}</script>`;
  return shell
    .replace('<!--DICT_HEAD-->', headToHtml(head, siteName))
    .replace('<!--DICT_BODY-->', () => body)
    .replace('<!--DICT_BOOT-->', () => bootTag);
}

export const dictHref = (slug: string) => esc(wordPath(slug));
/** rhyme word: linked if it has a page, plain text if it's a stub */
const rl = (h: { slug: string; lemma: string; defined?: boolean }) => (h.defined ? `<a href="${dictHref(h.slug)}">${esc(h.lemma)}</a>` : `<span>${esc(h.lemma)}</span>`);

export const DICT_NAV_ITEMS: Array<[string, string]> = [
  ['', 'शब्दकोश'], ['/en', 'English → नेपाली'], ['/sikau', 'सिकौँ'], ['/abhyas', 'अभ्यास'],
  ['/pariksha', 'परीक्षा तयारी'], ['/shuddha', 'शुद्धाशुद्धि'], ['/ukhan', 'उखान'],
];
export const dictToolNav = () =>
  `<nav class="dict-nav" aria-label="शब्दकोश">${DICT_NAV_ITEMS.map(([p, l]) => `<a href="${DICT_BASE_PATH}${p}">${l}</a>`).join('')}</nav>`;

function linkList(title: string, items: { lemma: string; slug: string | null }[], cls: string): string {
  if (!items.length) return '';
  const lis = items.map((i) => (i.slug ? `<li><a href="${dictHref(i.slug)}">${esc(i.lemma)}</a></li>` : `<li>${esc(i.lemma)}</li>`)).join('');
  return `<section class="dict-block ${cls}"><h2>${title}</h2><ul class="dict-chips">${lis}</ul></section>`;
}

export function renderWord(p: WordPayload): string {
  const e = p.entry;
  const ety = e.etymology && e.etymology.origin !== 'unknown'
    ? `<p class="dict-origin">${esc(ORIGIN_LABELS[e.etymology.origin].ne)}${e.etymology.from ? ` ← ${esc(e.etymology.from)}` : ''}</p>` : '';
  const senses = e.senses.map((s) => {
    const ex = (s.examples ?? []).map((x) => `<blockquote class="dict-ex"><p lang="ne">${esc(x.ne)}</p>${x.en ? `<p lang="en">${esc(x.en)}</p>` : ''}</blockquote>`).join('');
    const en = s.en?.length
      ? `<p class="dict-en" lang="en">${s.en.map((g) => `<a href="${esc(`${DICT_BASE_PATH}/en/${encodeURIComponent(g.trim().toLowerCase().replace(/\s+/g, '-'))}`)}">${esc(g)}</a>`).join(', ')}</p>`
      : '';
    return `<li id="${esc(s.id)}"><span class="dict-pos">${POS_LABELS[s.pos].ne}</span>${s.register && s.register !== 'neutral' ? `<span class="dict-tag">${REGISTER_LABELS[s.register]}</span>` : ''}<p class="dict-def">${esc(s.ne)}</p>${en}${s.usageNote ? `<p class="dict-note">${esc(s.usageNote)}</p>` : ''}${ex}</li>`;
  }).join('');
  const stub = e.senses.length === 0
    ? `<section class="dict-block dict-stub"><p>यो शब्द शब्दकोशमा छ तर यसको अर्थ अझै लेखिएको छैन।${e.posHint ? ` <span class="dict-pos">${POS_LABELS[e.posHint].ne}</span>` : ''}</p></section>`
    : `<section class="dict-block dict-senses"><h2>अर्थ</h2><ol>${senses}</ol></section>`;
  const g = groupRhymes(p.rhymes);
  const rhymes = p.rhymes.length
    ? `<section class="dict-block dict-rhymes"><h2>अनुप्रास मिल्ने शब्द <small lang="en">Rhymes</small></h2>${
      (['double', 'single', 'slant'] as const).filter((k) => g[k].length).map((k) =>
        `<h3>${RHYME_LABELS[k].ne}</h3><ul class="dict-chips">${g[k].map((h) => `<li>${rl(h)}</li>`).join('')}</ul>`).join('')
    }${p.rhymePage ? `<p><a href="${esc(`${DICT_BASE_PATH}/anupras/${p.keys.slug}`)}">सबै अनुप्रास हेर्नुहोस् →</a></p>` : ''}</section>`
    : '';
  const provs = p.proverbs.length
    ? `<section class="dict-block dict-proverbs"><h2>उखान टुक्का</h2><ul>${p.proverbs.map((x) =>
      `<li><strong>${esc(x.text)}</strong> — ${esc(x.meaningNe)}${x.englishEquivalent ? ` <em lang="en">(${esc(x.englishEquivalent)})</em>` : ''}</li>`).join('')}</ul></section>`
    : '';
  const en = [...new Set(e.senses.flatMap((s) => s.en ?? []))];
  const forms = p.forms?.length
    ? `<section class="dict-block dict-forms"><h2>रूपावली <small lang="en">Forms</small></h2><p class="dict-forms-list">${p.forms.map(esc).join(' · ')}</p></section>`
    : '';
  const credits = p.credits?.length
    ? `<footer class="dict-credits"><span>स्रोत:</span> ${p.credits.map((c) => (c.url ? `<a href="${esc(c.url)}" rel="noopener">${esc(c.name)}</a>` : esc(c.name)) + ` (${esc(c.license)})`).join('; ')}</footer>`
    : '';
  const enSummary = en.length
    ? `<section class="dict-block dict-en-summary" lang="en"><h2>${esc(p.keys.roman)} meaning in English</h2><p><strong>${esc(e.lemma)}</strong> (${esc(p.keys.roman)}) means <em>${esc(en.slice(0, 4).join(', '))}</em> in English.</p></section>`
    : '';
  const linkOrText = (title: string, items: typeof p.links.synonyms, cls: string) => linkList(title, items, cls);

  return `<main class="dict dict-word" lang="ne" ${PRERENDER_ATTR}>${dictToolNav()}
<nav class="dict-crumbs" aria-label="breadcrumb"><a href="${DICT_BASE_PATH}">शब्दकोश</a> › <span>${esc(e.lemma)}</span></nav>
<header class="dict-head"><h1 class="dict-lemma">${esc(e.lemma)}</h1><p class="dict-roman" lang="en">${esc(p.keys.roman)}</p>${ety}${p.links.variants.length ? `<p class="dict-variants">अरू रूप: ${p.links.variants.map(esc).join(', ')}</p>` : ''}</header>
${stub}${linkOrText('पर्यायवाची शब्द', p.links.synonyms, 'dict-syn')}${linkOrText('विपरीतार्थी शब्द', p.links.antonyms, 'dict-ant')}${linkOrText('सम्बन्धित शब्द', p.links.related, 'dict-rel')}${rhymes}${provs}${forms}${enSummary}${credits}
</main>`;
}

export interface EnHitLite { s: string; l: string; r: string; p: string; d: string; g: string }

export function renderEnglishWord(key: string, hits: EnHitLite[]): string {
  const list = hits.map((h) =>
    `<li><div class="dict-en-hit-head"><a class="dict-en-hit-lemma" lang="ne" href="${dictHref(h.s)}">${esc(h.l)}</a> <span class="dict-roman">${esc(h.r)}</span> <span class="dict-pos" lang="ne">${esc(POS_LABELS[h.p as PartOfSpeech]?.ne ?? h.p)}</span></div><p class="dict-def" lang="ne">${esc(h.d)}</p><p class="dict-en">${esc(h.g)}</p></li>`).join('');
  const summary = hits.length
    ? `<section class="dict-block dict-en-summary"><h2>How to say "${esc(key)}" in Nepali</h2><p>The most common Nepali word for <strong>${esc(key)}</strong> is <strong lang="ne">${esc(hits[0].l)}</strong> (${esc(hits[0].r)})${hits.length > 1 ? `. Other words: ${hits.slice(1, 5).map((h) => `${esc(h.l)} (${esc(h.r)})`).join(', ')}` : ''}.</p></section>`
    : '';
  return `<main class="dict dict-en-word" lang="en" ${PRERENDER_ATTR}>${dictToolNav()}<nav class="dict-crumbs"><a href="${DICT_BASE_PATH}">शब्दकोश</a> › <a href="${DICT_BASE_PATH}/en">English → नेपाली</a> › ${esc(key)}</nav>
<header class="dict-head"><h1 class="dict-lemma dict-lemma-en">${esc(key)}</h1><p class="dict-roman" lang="ne">${esc(key)}को नेपाली अर्थ</p></header>
<section class="dict-block"><h2 lang="ne">नेपाली अर्थ · Nepali meanings</h2><ol class="dict-en-hits">${list}</ol></section>${summary}</main>`;
}

/** /anupras/<word> — every rhyme, grouped by strength (Worker-rendered). */
export function renderRhymePage(lemma: string, slug: string, roman: string, hits: RhymeHit[]): string {
  const g = groupRhymes(hits);
  return `<main class="dict dict-rhyme" lang="ne" ${PRERENDER_ATTR}>${dictToolNav()}<nav class="dict-crumbs"><a href="${DICT_BASE_PATH}">शब्दकोश</a> › <a href="${dictHref(slug)}">${esc(lemma)}</a> › अनुप्रास</nav>
<h1>${esc(lemma)}सँग मिल्ने शब्द</h1><p lang="en">Words that rhyme with ${esc(roman)}</p>
${(['double', 'single', 'slant'] as const).filter((k) => g[k].length).map((k) =>
    `<section class="dict-block"><h2>${RHYME_LABELS[k].ne} <small lang="en">${RHYME_LABELS[k].en}</small></h2><ul class="dict-chips">${g[k].map((h) => `<li>${rl(h)} <small>${h.syllables}</small></li>`).join('')}</ul></section>`).join('')}</main>`;
}

export const BROWSE_PAGE_SIZE = 200;
export const browsePath = (ch: string, page = 1) => `${DICT_BASE_PATH}/akshar/${ch}${page > 1 ? `/${page}` : ''}`;
export const alphaNav = (initials: string[], current?: string) =>
  `<nav class="dict-alpha" aria-label="अक्षर अनुसार">${initials.map((ch) => `<a href="${esc(browsePath(ch))}"${ch === current ? ' aria-current="page"' : ''}>${ch}</a>`).join('')}</nav>`;

/** /akshar/<letter>[/<n>] — A–Z crawl path (Worker-rendered from browse/<hex>.json). */
export function renderBrowsePage(ch: string, page: number, items: Array<{ slug: string; lemma: string; roman: string }>, initials: string[]): { html: string; pages: number } | null {
  const pages = Math.max(1, Math.ceil(items.length / BROWSE_PAGE_SIZE));
  if (page < 1 || page > pages) return null;
  const slice = items.slice((page - 1) * BROWSE_PAGE_SIZE, page * BROWSE_PAGE_SIZE);
  const pager = pages > 1
    ? `<nav class="dict-pager">${Array.from({ length: pages }, (_, j) => `<a href="${esc(browsePath(ch, j + 1))}"${j + 1 === page ? ' aria-current="page"' : ''}>${j + 1}</a>`).join('')}</nav>`
    : '';
  return {
    pages,
    html: `<main class="dict dict-browse" lang="ne" ${PRERENDER_ATTR}>${dictToolNav()}<nav class="dict-crumbs"><a href="${DICT_BASE_PATH}">शब्दकोश</a> › ${esc(ch)}</nav><h1>"${esc(ch)}" बाट सुरु हुने शब्दहरू</h1>${alphaNav(initials, ch)}
<ul class="dict-list">${slice.map((c) => `<li><a href="${dictHref(c.slug)}">${esc(c.lemma)}</a> <span lang="en">${esc(c.roman)}</span></li>`).join('')}</ul>${pager}</main>`,
  };
}
