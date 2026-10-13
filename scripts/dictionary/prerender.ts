/**
 * Prerender the dictionary's FIXED pages into dist/ and write the page shell the Worker uses
 * for word pages. Run AFTER `vite build`:  node scripts/dictionary/prerender.ts
 *
 *   dist/tool/nepalidictionary/index.html                home
 *   dist/tool/nepalidictionary/{ukhan,en,sikau,pariksha,shuddha,abhyas}/index.html
 *   dist/tool/nepalidictionary/sikau/<ne|en>-<A1..B2>/index.html   level lists (first 100 rows)
 *   dist/data/dict/v1/shell.html                                  ← worker/dictionary.ts renders words/English pages into this
 *
 * Word pages (9k+), A–Z, rhyme and English pages (12k) are NOT written as files: the Worker renders them from
 * the static shards, which keeps the deploy far under the 19,500-file budget.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  DICT_BASE_PATH, PRERENDER_ATTR, alphaNav, TOOL_PAGES, buildShell, dictHref as href, dictToolNav, englishSlug, escapeHtml as esc, fillShell,
  homeHead, proverbListHead, toolHead, type HeadData,
} from '../../src/lib/dictionary-core/index.ts';
import { ROOT, STATIC_DIR, cfg, encPath, loadBuild, plan, site } from './pages.ts';

const DIST = join(ROOT, process.env.DIST_DIR ?? 'dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`✖ ${DIST}/index.html not found — run "vite build" first`);
  process.exit(1);
}
const shell = buildShell(readFileSync(join(DIST, 'index.html'), 'utf8'));
const shellOut = join(DIST, cfg.staticOut.replace(/^public\//, ''), 'shell.html');
mkdirSync(dirname(shellOut), { recursive: true });
writeFileSync(shellOut, shell);

const b = loadBuild();
const p = plan(b);
const nav = dictToolNav();
let written = 0;
function write(urlPath: string, head: HeadData, body: string, boot?: unknown) {
  const file = join(DIST, ...urlPath.split('/').filter(Boolean), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, fillShell(shell, head, site.siteName, body, boot));
  written++;
}
const main = (cls: string, inner: string, lang = 'ne') => `<main class="dict ${cls}" lang="${lang}" ${PRERENDER_ATTR}>${nav}${inner}</main>`;
const canonical = (path: string) => site.origin + encPath(path);
// Home

write(DICT_BASE_PATH, homeHead(site, p.defined.length), main('dict-home', `<h1>नेपाली शब्दकोश</h1>
  <form class="dict-search" action="${DICT_BASE_PATH}" method="get" role="search"><input name="q" type="search" placeholder="शब्द खोज्नुहोस् · ghar · house" aria-label="शब्द खोज्नुहोस्"><button>खोज</button></form>
  ${alphaNav(p.initials)}
  <section class="dict-learn-grid">${[
    ['/en', 'English → नेपाली', 'अङ्ग्रेजी शब्दको नेपाली अर्थ'], ['/sikau', 'सिकौँ', 'A1–B2 स्तरका शब्द सूची'], ['/pariksha', 'परीक्षा तयारी', 'पर्यायवाची, विपरीतार्थी, शुद्धाशुद्धि, उखान'],
    ['/shuddha', 'शुद्धाशुद्धि जाँच', 'नेपाली लेखको हिज्जे जाँच'], ['/ukhan', 'उखान टुक्का', 'अर्थसहित उखान'],
  ].map(([h, t, d]) => `<a class="dict-card" href="${DICT_BASE_PATH}${h}"><strong>${t}</strong><span>${d}</span></a>`).join('')}</section>
  <section class="dict-block"><h2>धेरै खोजिने शब्द</h2><ul class="dict-chips">${p.defined.slice(0, 80).map((c) => `<li><a href="${href(c.keys.slug)}">${esc(c.entry.lemma)}</a></li>`).join('')}</ul></section>`), { kind: 'home' });

// Ukhan
write(`${DICT_BASE_PATH}/ukhan`, proverbListHead(site, b.proverbs), main('dict-ukhan', `<nav class="dict-crumbs"><a href="${DICT_BASE_PATH}">शब्दकोश</a> › उखान टुक्का</nav>
  <h1>नेपाली उखान र टुक्का</h1><ul class="dict-proverb-list">${b.proverbs.map((x) =>
    `<li id="${esc(x.id)}"><h2>${esc(x.text)}</h2><p>${esc(x.meaningNe)}</p>${x.meaningEn ? `<p lang="en">${esc(x.meaningEn)}</p>` : ''}${x.englishEquivalent ? `<p lang="en"><em>≈ ${esc(x.englishEquivalent)}</em></p>` : ''}</li>`).join('')}</ul>`), { kind: 'ukhan' });

// A–Z browse pages (/akshar/<letter>) are rendered by the Worker from browse/<hex>.json.
// Rhyme pages (/anupras/<word>) are rendered by the Worker from the rhyme shards.

// English hub
write(`${DICT_BASE_PATH}/en`, toolHead(site, TOOL_PAGES.en.path, TOOL_PAGES.en.title, TOOL_PAGES.en.description), main('dict-en', `<h1>English → नेपाली शब्दकोश</h1>
  <p class="dict-muted">${esc(TOOL_PAGES.en.description)}</p>
  <section class="dict-block"><h2>Common English words</h2><ul class="dict-chips">${p.english.slice(0, 300).map((k) => `<li><a href="${DICT_BASE_PATH}/en/${esc(encodeURIComponent(englishSlug(k)))}">${esc(k)}</a></li>`).join('')}</ul></section>`, 'en'));

// Level lists
const listLinks: string[] = [];
for (const l of p.lists) {
  const items = JSON.parse(readFileSync(join(STATIC_DIR, 'learn', `${l.id}.json`), 'utf8')) as Array<Record<string, any>>;
  const title = l.lang === 'ne'
    ? `धेरै प्रयोग हुने नेपाली शब्द — ${l.level.id} (${l.level.ne}) · Common Nepali words with English meaning`
    : `${l.level.id} English words with Nepali meaning · अङ्ग्रेजी शब्द — ${l.level.ne}`;
  const desc = l.lang === 'ne'
    ? `${items.length} धेरै प्रयोग हुने नेपाली शब्द (${l.level.id}) — अङ्ग्रेजी अर्थ, उच्चारण र उदाहरणसहित। Learn the most common Nepali words.`
    : `${items.length} essential English words (${l.level.id}) with Nepali meaning and pronunciation — अङ्ग्रेजी सिक्नेका लागि।`;
  const rows = items.slice(0, 100).map((it, i) => l.lang === 'ne'
    ? `<tr><td class="dict-num">${i + 1}</td><td><a class="dict-table-lemma" href="${href(it.s)}">${esc(it.l)}</a><div class="dict-muted" lang="en">${esc(it.r)}</div></td><td lang="en">${esc(it.e ?? '')}</td></tr>`
    : `<tr><td class="dict-num">${i + 1}</td><td lang="en"><a class="dict-table-lemma" href="${DICT_BASE_PATH}/en/${esc(encodeURIComponent(englishSlug(it.k)))}">${esc(it.k)}</a></td><td>${(it.m as string[][]).map(([lm, r, s]) => `<a href="${href(s)}">${esc(lm)}</a> <small lang="en">${esc(r)}</small>`).join(', ')}</td></tr>`).join('');
  const path = `${DICT_BASE_PATH}/sikau/${l.id}`;
  write(path, toolHead(site, `/sikau/${l.id}`, title, desc), main('dict-learn-list', `<nav class="dict-crumbs"><a href="${DICT_BASE_PATH}/sikau">सिकौँ</a> › ${l.id}</nav><h1>${esc(title)}</h1><table class="dict-table"><tbody>${rows}</tbody></table>`));
  listLinks.push(`<li><a href="${path}">${esc(title)}</a> (${items.length})</li>`);
}
write(`${DICT_BASE_PATH}/sikau`, toolHead(site, TOOL_PAGES.sikau.path, TOOL_PAGES.sikau.title, TOOL_PAGES.sikau.description),
  main('dict-learn', `<h1>शब्द सिकौँ</h1><p class="dict-muted">${esc(TOOL_PAGES.sikau.description)}</p><ul>${listLinks.join('')}</ul>`));

// Interactive tools: static head + intro for crawlers; the app renders the tool
for (const [key, robots] of [['pariksha', undefined], ['shuddha', undefined], ['abhyas', 'noindex,follow']] as const) {
  const t = TOOL_PAGES[key];
  write(`${DICT_BASE_PATH}${t.path}`, toolHead(site, t.path, t.title, t.description, robots), main('', `<h1>${esc(t.title.split('·')[0].trim())}</h1><p class="dict-muted">${esc(t.description)}</p>`));
}

console.log(`✔ dictionary: prerendered ${written} fixed pages + shell for ${p.defined.length} Worker-rendered word pages and ${p.english.length}+ English pages`);
