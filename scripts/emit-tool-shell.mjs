import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const astroDir = resolve(root, "dist/astro");
const toolsDir = resolve(root, "dist/tools");
const site = (process.env.PUBLIC_SITE_URL || "https://patro-blush.vercel.app").replace(/\/+$/, "");

const shellSeo = {
  "/tools": ["नेपाली Utility Tools · MeroPatro", "मिति रूपान्तरण, नेपाली typing, Preeti/Unicode, तिथि, QR, कर र अन्य utilities।", "CollectionPage", true],
  "/fm": ["FM Radio · MeroPatro", "नेपाल र विश्वका प्ले गर्न मिल्ने FM तथा online radio stations।", "CollectionPage", true],
  "/tv": ["Live TV · MeroPatro", "देश, भाषा र विषय अनुसार उपलब्ध free live TV channels।", "CollectionPage", true],
  "/explore": ["MeroPatro का सबै सुविधा · Explore", "पात्रो, ज्योतिष, समाचार, FM, Live TV, इतिहास र नेपाली utilities एकै ठाउँमा।", "CollectionPage", true],
  "/my-diary": ["मेरो डायरी · MeroPatro", "Private diary and personal date workspace.", "WebPage", false],
  "/about": ["MeroPatro बारे · About", "MeroPatro को उद्देश्य, सार्वजनिक सुविधा र calendar platform context।", "WebPage", true],
  "/sources": ["स्रोत र Data Trust · MeroPatro", "MeroPatro मा प्रयोग हुने calendar, astronomy र अन्य data sources को provenance context।", "WebPage", true],
  "/privacy": ["Privacy · MeroPatro", "MeroPatro privacy information and data handling context।", "WebPage", true],
  "/terms": ["Terms · MeroPatro", "MeroPatro terms of use।", "WebPage", true],
  "/contact": ["Contact · MeroPatro", "MeroPatro contact information।", "WebPage", true],
  "/404": ["Page not found · MeroPatro", "The requested MeroPatro route was not found.", "WebPage", false],
  "/settings/community": ["Community settings · MeroPatro", "Private community calendar preferences.", "WebPage", false],
  "/admin/community-suites": ["Community admin · MeroPatro", "Private community calendar administration.", "WebPage", false],
  "/jyotish/janma-patro": ["जन्मपत्रो · Kundali · MeroPatro", "जन्म मिति, समय र स्थानका आधारमा जन्मपत्रो तथा ग्रह स्थिति।", "WebPage", true],
  "/jyotish/matchmaking": ["कुण्डली मिलान · Matchmaking · MeroPatro", "जन्म विवरणका आधारमा उपलब्ध ज्योतिषीय matchmaking tools।", "WebPage", true]
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function replaceOrAppend(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace("</head>", replacement + "</head>");
}

function decorateShell(source, route, meta) {
  const [title, description, pageType, indexable] = meta;
  const canonical = site + route;
  const robots = indexable
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow";
  const graph = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": site + "/#website",
        name: "MeroPatro",
        alternateName: "Mero Patro",
        url: site + "/",
        inLanguage: ["ne", "en"]
      },
      {
        "@type": pageType,
        "@id": canonical + "#webpage",
        name: title,
        description,
        url: canonical,
        inLanguage: ["ne", "en"],
        isPartOf: { "@id": site + "/#website" },
        primaryImageOfPage: { "@type": "ImageObject", url: site + "/og-default.svg", width: 1200, height: 630 }
      }
    ]
  }).replace(/</g, "\\u003c");

  let html = source;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(title) + "</title>");
  html = replaceOrAppend(html, /<meta\s+name=["']description["'][^>]*>/i, '<meta name="description" content="' + escapeHtml(description) + '">');
  html = replaceOrAppend(html, /<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="' + robots + '">');
  html = replaceOrAppend(html, /<meta\s+property=["']og:title["'][^>]*>/i, '<meta property="og:title" content="' + escapeHtml(title) + '">');
  html = replaceOrAppend(html, /<meta\s+property=["']og:description["'][^>]*>/i, '<meta property="og:description" content="' + escapeHtml(description) + '">');
  html = replaceOrAppend(html, /<meta\s+property=["']og:url["'][^>]*>/i, '<meta property="og:url" content="' + escapeHtml(canonical) + '">');
  html = replaceOrAppend(html, /<meta\s+property=["']og:image["'][^>]*>/i, '<meta property="og:image" content="' + escapeHtml(site + "/og-default.svg") + '">');
  html = replaceOrAppend(html, /<meta\s+name=["']twitter:image["'][^>]*>/i, '<meta name="twitter:image" content="' + escapeHtml(site + "/og-default.svg") + '">');
  html = replaceOrAppend(html, /<link\s+rel=["']canonical["'][^>]*>/i, '<link rel="canonical" href="' + escapeHtml(canonical) + '">');
  html = html.replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i, '<script type="application/ld+json">' + graph + '</script>');
  return html;
}

const astroShell = await readFile(resolve(astroDir, "index.html"), "utf8");

for (const [route, meta] of Object.entries(shellSeo)) {
  const relative = route.slice(1) || "index";
  const target = resolve(root, "dist", ...relative.split("/"), "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, decorateShell(astroShell, route, meta), "utf8");
}

await mkdir(toolsDir, { recursive: true });
await copyFile(resolve(astroDir, "sw.js"), resolve(toolsDir, "sw.js"));

console.log("Emitted route-specific static SPA shells with canonical SEO metadata.");
