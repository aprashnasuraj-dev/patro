/**
 * SEO builders shared by the prerender script (static HTML) and the React
 * `useDocumentHead` hook (client-side navigation). One source of truth means the
 * HTML Google indexes and the DOM after navigation never disagree.
 */

import type { LexiconEntry, Proverb } from './types.ts';
import { POS_LABELS } from './types.ts';
import { DICT_BASE_PATH, wordPathEncoded } from './keys.ts';

export interface SiteConfig {
  /** No trailing slash. e.g. "https://patro.example.com" */
  origin: string;
  siteName: string; // "मेरो पात्रो"
  dictName: string; // "मेरो पात्रो शब्दकोश"
  ogImage?: string;
}

export interface HeadData {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  ogType?: string;
  ogImage?: string;
  jsonLd: object[];
}

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,;।]+\S*$/, '') + '…');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function wordHead(e: LexiconEntry, slug: string, roman: string, site: SiteConfig): HeadData {
  const url = site.origin + wordPathEncoded(slug);
  const first = e.senses[0];
  const en = [...new Set(e.senses.flatMap((s) => s.en ?? []))].slice(0, 3);
  const glue = /\s/.test(e.lemma) ? ' को' : 'को'; // "घरको अर्थ", "आकाशको फल को अर्थ"

  const title = clip(`${e.lemma}${glue} अर्थ · ${cap(roman)} meaning${en.length ? ' in English' : ''} | ${site.dictName}`, 70);
  const parts = [
    `${e.lemma} (${roman}${first ? ', ' + POS_LABELS[first.pos].ne : ''}): ${first?.ne ?? ''}`,
    en.length ? `English: ${en.join(', ')}.` : '',
    e.synonyms?.length ? `पर्यायवाची: ${e.synonyms.slice(0, 3).join(', ')}.` : '',
    e.antonyms?.length ? `विपरीत: ${e.antonyms.slice(0, 2).join(', ')}.` : '',
    'उदाहरण वाक्य र अनुप्रास।',
  ];
  const description = clip(parts.filter(Boolean).join(' '), 160);

  const term = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${url}#term`,
    name: e.lemma,
    alternateName: [roman, ...(e.variants ?? [])],
    description: first?.ne,
    inLanguage: 'ne',
    url,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      '@id': `${site.origin}${DICT_BASE_PATH}#set`,
      name: site.dictName,
      inLanguage: 'ne',
    },
  };
  const crumbs = breadcrumb(site, [
    [site.dictName, site.origin + DICT_BASE_PATH],
    [e.lemma, url],
  ]);
  return { title, description, canonical: url, ogType: 'article', ogImage: site.ogImage, jsonLd: [term, crumbs] };
}

export function rhymeHead(lemma: string, slug: string, roman: string, count: number, site: SiteConfig, indexable = count >= 8): HeadData {
  const url = `${site.origin}${DICT_BASE_PATH}/anupras/${encodeURIComponent(slug)}`;
  return {
    title: clip(`${lemma}सँग मिल्ने शब्द · Words that rhyme with ${roman} | ${site.dictName}`, 70),
    description: clip(`${lemma} (${roman}) सँग तुक/अनुप्रास मिल्ने ${count} नेपाली शब्दहरू — गीत, कविता र गजल लेख्नका लागि। अक्षर सङ्ख्या र शब्दभेद अनुसार छान्नुहोस्।`, 160),
    canonical: url,
    // Only rhyme pages the build marked as worthwhile are indexable (see config.rhymePages).
    robots: indexable ? 'index,follow' : 'noindex,follow',
    jsonLd: [breadcrumb(site, [[site.dictName, site.origin + DICT_BASE_PATH], [lemma, site.origin + wordPathEncoded(slug)], ['अनुप्रास', url]])],
  };
}

export function proverbListHead(site: SiteConfig, items: Proverb[]): HeadData {
  const url = `${site.origin}${DICT_BASE_PATH}/ukhan`;
  return {
    title: `नेपाली उखान टुक्का र तिनको अर्थ | Nepali Proverbs & Idioms | ${site.dictName}`,
    description: clip(`${items.length}+ नेपाली उखान र टुक्का, अर्थ, अङ्ग्रेजी समतुल्य र प्रयोगसहित। ${items.slice(0, 2).map((p) => p.text).join(' · ')}`, 160),
    canonical: url,
    jsonLd: [breadcrumb(site, [[site.dictName, site.origin + DICT_BASE_PATH], ['उखान टुक्का', url]])],
  };
}

export function homeHead(site: SiteConfig, wordCount: number): HeadData {
  const url = site.origin + DICT_BASE_PATH;
  return {
    title: `नेपाली शब्दकोश · Nepali Dictionary (Nepali ↔ English) | ${site.siteName}`,
    description: `${wordCount.toLocaleString('en')}+ नेपाली शब्दको अर्थ, पर्यायवाची, विपरीतार्थी, अनुप्रास, उखान टुक्का र आजको शब्द। Search in Devanagari, Romanized Nepali or English.`,
    canonical: url,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.dictName,
        url,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${url}?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

function breadcrumb(_site: SiteConfig, items: Array<[string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  };
}

// ───────────── HTML serialization (used by prerender) ─────────────

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** JSON safe to inline in <script>: no "</script>", no U+2028/2029 surprises. */
export function safeJson(v: unknown): string {
  return JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function headToHtml(h: HeadData, siteName: string): string {
  const t = [
    `<title>${escapeHtml(h.title)}</title>`,
    `<meta name="description" content="${escapeHtml(h.description)}">`,
    `<link rel="canonical" href="${escapeHtml(h.canonical)}">`,
    `<meta name="robots" content="${h.robots ?? 'index,follow,max-image-preview:large'}">`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}">`,
    `<meta property="og:locale" content="ne_NP">`,
    `<meta property="og:type" content="${h.ogType ?? 'website'}">`,
    `<meta property="og:title" content="${escapeHtml(h.title)}">`,
    `<meta property="og:description" content="${escapeHtml(h.description)}">`,
    `<meta property="og:url" content="${escapeHtml(h.canonical)}">`,
    h.ogImage ? `<meta property="og:image" content="${escapeHtml(h.ogImage)}">` : '',
    `<meta name="twitter:card" content="summary">`,
    ...h.jsonLd.map((j) => `<script type="application/ld+json">${safeJson(j)}</script>`),
  ];
  return t.filter(Boolean).join('\n    ');
}

// ───────────── learning & English pages ─────────────

/** "house meaning in Nepali" — the most-searched dictionary query pattern in Nepal. */
export function englishHead(key: string, hits: Array<{ l: string; r: string; g: string; d: string }>, site: SiteConfig): HeadData {
  const path = `${DICT_BASE_PATH}/en/${encodeURIComponent(key.replace(/\s+/g, '-'))}`;
  const url = site.origin + path;
  const top = hits.slice(0, 4).map((h) => h.l);
  const Key = key.charAt(0).toUpperCase() + key.slice(1);
  return {
    title: clip(`${Key} meaning in Nepali · ${key}को नेपाली अर्थ: ${top.slice(0, 2).join(', ')} | ${site.dictName}`, 70),
    description: clip(`${Key} in Nepali: ${top.join(', ')}. ${hits[0] ? `${hits[0].l} (${hits[0].r}) — ${hits[0].d}` : ''} उच्चारण, उदाहरण र अभ्याससहित।`, 160),
    canonical: url,
    robots: hits.length ? 'index,follow' : 'noindex,follow',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        '@id': `${url}#term`,
        name: key,
        inLanguage: 'en',
        description: `Nepali: ${top.join(', ')}`,
        url,
        inDefinedTermSet: { '@type': 'DefinedTermSet', '@id': `${site.origin}${DICT_BASE_PATH}/en#set`, name: `English–Nepali · ${site.dictName}` },
      },
      breadcrumb(site, [[site.dictName, site.origin + DICT_BASE_PATH], ['English → Nepali', `${site.origin}${DICT_BASE_PATH}/en`], [key, url]]),
    ],
  };
}

/** Generic head for tool pages (quiz, spell-check, learning lists). */
export function toolHead(site: SiteConfig, sub: string, title: string, description: string, robots?: string): HeadData {
  const url = site.origin + DICT_BASE_PATH + sub;
  return {
    title: clip(`${title} | ${site.dictName}`, 75),
    description: clip(description, 160),
    canonical: url,
    robots,
    jsonLd: [breadcrumb(site, [[site.dictName, site.origin + DICT_BASE_PATH], [title.split('·')[0].trim(), url]])],
  };
}

/** Copy for the tool pages — shared by prerender (static HTML) and React (client navigation). */
export const TOOL_PAGES = {
  en: {
    path: '/en',
    title: 'English to Nepali Dictionary · अङ्ग्रेजी–नेपाली शब्दकोश',
    description: 'Find the Nepali meaning of any English word, with pronunciation, examples and practice. अङ्ग्रेजी शब्दको नेपाली अर्थ, उच्चारण र उदाहरण।',
  },
  sikau: {
    path: '/sikau',
    title: 'नेपाली र अङ्ग्रेजी शब्द सिकौँ · Learn Nepali & English words',
    description: 'सबैभन्दा धेरै प्रयोग हुने ५००, १५००, ३००० नेपाली र अङ्ग्रेजी शब्द, अर्थ, उच्चारण र उदाहरणसहित। Most common Nepali and English words by level (A1–B2).',
  },
  abhyas: {
    path: '/abhyas',
    title: 'शब्द अभ्यास · Flashcards',
    description: 'आफूले सुरक्षित गरेका शब्दहरू स्पेस्ड रिपिटिसन फ्ल्यासकार्डबाट दैनिक दोहोर्याउनुहोस्। Daily flashcards for Nepali and English vocabulary.',
  },
  pariksha: {
    path: '/pariksha',
    title: 'पर्यायवाची, विपरीतार्थी, शुद्धाशुद्धि र उखान अभ्यास · SEE, लोकसेवा तयारी',
    description: 'SEE, कक्षा ११–१२ र लोकसेवा परीक्षाका लागि पर्यायवाची शब्द, विपरीतार्थी शब्द, शुद्धाशुद्धि (हिज्जे), उखान–टुक्का र अङ्ग्रेजी अर्थका निःशुल्क अनलाइन क्विज।',
  },
  shuddha: {
    path: '/shuddha',
    title: 'नेपाली शुद्धाशुद्धि जाँच · Nepali Spell Checker',
    description: 'नेपाली लेखमा हिज्जे गल्ती (ि/ी, ु/ू, श/ष/स, ब/व) तुरुन्त पत्ता लगाउनुहोस् र सही शब्द सुझाव पाउनुहोस्। Free online Nepali spelling checker.',
  },
} as const;
