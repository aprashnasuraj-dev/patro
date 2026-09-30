const STATIC_EXACT = new Set([
  "/astro",
  "/fm",
  "/tv",
  "/tools",
  "/tools/nepali-typing",
  "/jyotish/janma-patro",
  "/jyotish/matchmaking",
  "/explore",
  "/my-diary",
  "/about",
  "/sources",
  "/privacy",
  "/terms",
  "/contact",
  "/404",
  "/samudaya",
  "/nepal-sambat/mandala",
  "/settings/community",
  "/admin/community-suites",
  "/tools/samudaya"
]);

const WORKER_EXACT = new Set([
  "/tools/tithi",
  "/tools/diaspora",
  "/tools/card",
  "/tools/family",
  "/tools/api",
  "/tools/my-data"
]);

const STATIC_SEO = {
  "/astro": ["खगोलीय पात्रो · Astronomy Calendar · MeroPatro", "AD, BS, Nepal Sambat, तिथि, lunar phase र astronomy data एउटै पात्रोमा।", "WebPage"],
  "/fm": ["FM Radio · MeroPatro", "नेपाल र विश्वका प्ले गर्न मिल्ने FM तथा online radio stations।", "CollectionPage"],
  "/tv": ["Live TV · MeroPatro", "देश, भाषा र विषय अनुसार उपलब्ध free live TV channels।", "CollectionPage"],
  "/tools": ["नेपाली Utility Tools · MeroPatro", "मिति रूपान्तरण, नेपाली typing, Preeti/Unicode, तिथि, QR, कर र अन्य utilities।", "CollectionPage"],
  "/tools/nepali-typing": ["नेपाली Typing · Roman to Unicode · MeroPatro", "Romanized Nepali लाई Unicode नेपालीमा टाइप र रूपान्तरण गर्ने browser tool।", "WebPage"],
  "/jyotish/janma-patro": ["जन्मपत्रो · Kundali · MeroPatro", "जन्म मिति, समय र स्थानका आधारमा जन्मपत्रो तथा ग्रह स्थिति।", "WebPage"],
  "/jyotish/matchmaking": ["कुण्डली मिलान · Matchmaking · MeroPatro", "जन्म विवरणका आधारमा उपलब्ध ज्योतिषीय matchmaking tools।", "WebPage"],
  "/explore": ["MeroPatro का सबै सुविधा · Explore", "पात्रो, ज्योतिष, समाचार, FM, Live TV, इतिहास र नेपाली utilities एकै ठाउँमा।", "CollectionPage"],
  "/samudaya": ["समुदाय पात्रो · Community Calendars · MeroPatro", "नेपालका समुदाय र परम्परासँग सम्बन्धित calendar suites र चाडपर्व context।", "CollectionPage"],
  "/nepal-sambat/mandala": ["नेपाल संवत् मण्डला · MeroPatro", "नेपाल संवत् calendar view, dates and festival context।", "WebPage"],
  "/samudaya/lhosar": ["ल्होसार पात्रो · MeroPatro", "ल्होसार सम्बन्धित calendar dates, events and cultural context।", "WebPage"],
  "/samudaya/tharu": ["थारु समुदाय पात्रो · MeroPatro", "थारु समुदायका calendar dates, events and cultural context।", "WebPage"],
  "/samudaya/mithila": ["मिथिला पात्रो · MeroPatro", "मिथिला परम्पराका calendar dates, events and cultural context।", "WebPage"],
  "/samudaya/kirat": ["किरात पात्रो · MeroPatro", "किरात परम्पराका calendar dates, events and cultural context।", "WebPage"],
  "/samudaya/hijri": ["हिजरी पात्रो · Hijri Calendar · MeroPatro", "Hijri dates and available community calendar context।", "WebPage"],
  "/samudaya/chakra": ["समुदाय Calendar Chakra · MeroPatro", "MeroPatro का community calendar suites को संयुक्त overview।", "CollectionPage"],
  "/about": ["MeroPatro बारे · About", "MeroPatro को उद्देश्य, सार्वजनिक सुविधा र calendar platform context।", "WebPage"],
  "/sources": ["स्रोत र Data Trust · MeroPatro", "MeroPatro मा प्रयोग हुने calendar, astronomy र अन्य data sources को provenance context।", "WebPage"],
  "/privacy": ["Privacy · MeroPatro", "MeroPatro privacy information and data handling context।", "WebPage"],
  "/terms": ["Terms · MeroPatro", "MeroPatro terms of use।", "WebPage"],
  "/contact": ["Contact · MeroPatro", "MeroPatro contact information।", "WebPage"]
};

function canonicalPath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function configuredOrigin(url, env) {
  const configured = String(env?.PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[^/]+/.test(configured) ? configured : url.origin;
}

function seoMeta(path) {
  if (STATIC_SEO[path]) return STATIC_SEO[path];
  if (path.startsWith("/samudaya/")) return ["समुदाय पात्रो · MeroPatro", "समुदाय calendar dates, events and cultural context।", "WebPage"];
  if (path.startsWith("/tools/")) return ["नेपाली Utility Tool · MeroPatro", "MeroPatro को free browser utility tool।", "WebPage"];
  return ["MeroPatro · नेपाली पात्रो", "नेपाली पात्रो, आजको मिति, तिथि, चाडपर्व, राशिफल र दैनिक utilities।", "WebPage"];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function isPrivateStatic(path) {
  return path === "/my-diary" ||
    path === "/settings" || path.startsWith("/settings/") ||
    path === "/admin" || path.startsWith("/admin/");
}

function staticSchema(origin, canonical, meta) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": origin + "/#website",
        name: "MeroPatro",
        alternateName: "Mero Patro",
        url: origin + "/",
        inLanguage: ["ne", "en"]
      },
      {
        "@type": meta[2] || "WebPage",
        "@id": canonical + "#webpage",
        name: meta[0],
        description: meta[1],
        url: canonical,
        inLanguage: ["ne", "en"],
        isPartOf: { "@id": origin + "/#website" },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: origin + "/og-default.svg",
          width: 1200,
          height: 630
        }
      }
    ]
  };
}

function rewriteStaticHtml(request, response, env) {
  const type = response.headers.get("content-type") || "";
  const HTMLRewriterCtor = globalThis.HTMLRewriter;
  if (!type.includes("text/html") || !HTMLRewriterCtor) return response;

  const url = new URL(request.url);
  const path = canonicalPath(url.pathname);
  const origin = configuredOrigin(url, env);
  const canonical = origin + path;
  const meta = seoMeta(path);
  const robots = isPrivateStatic(path)
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const schema = JSON.stringify(staticSchema(origin, canonical, meta)).replace(/</g, "\\u003c");

  const headBlock =
    '<meta name="description" content="' + escapeHtml(meta[1]) + '">' +
    '<meta name="robots" content="' + robots + '">' +
    '<meta property="og:title" content="' + escapeHtml(meta[0]) + '">' +
    '<meta property="og:description" content="' + escapeHtml(meta[1]) + '">' +
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">' +
    '<meta property="og:locale" content="ne_NP">' +
    '<meta property="og:image" content="' + escapeHtml(origin + "/og-default.svg") + '">' +
    '<meta property="og:image:width" content="1200">' +
    '<meta property="og:image:height" content="630">' +
    '<meta name="twitter:title" content="' + escapeHtml(meta[0]) + '">' +
    '<meta name="twitter:description" content="' + escapeHtml(meta[1]) + '">' +
    '<meta name="twitter:image" content="' + escapeHtml(origin + "/og-default.svg") + '">' +
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
    '<link rel="describedby" href="/llms.txt" type="text/plain">' +
    '<script type="application/ld+json" data-seo-route="pages">' + schema + '</script>';

  return new HTMLRewriterCtor()
    .on("title", { element(el) { el.setInnerContent(meta[0]); } })
    .on('meta[name="description"]', { element(el) { el.remove(); } })
    .on('meta[name="robots"]', { element(el) { el.remove(); } })
    .on('meta[property="og:title"]', { element(el) { el.remove(); } })
    .on('meta[property="og:description"]', { element(el) { el.remove(); } })
    .on('meta[property="og:url"]', { element(el) { el.remove(); } })
    .on('meta[property="og:locale"]', { element(el) { el.remove(); } })
    .on('meta[property="og:image"]', { element(el) { el.remove(); } })
    .on('meta[property="og:image:width"]', { element(el) { el.remove(); } })
    .on('meta[property="og:image:height"]', { element(el) { el.remove(); } })
    .on('meta[name="twitter:title"]', { element(el) { el.remove(); } })
    .on('meta[name="twitter:description"]', { element(el) { el.remove(); } })
    .on('meta[name="twitter:image"]', { element(el) { el.remove(); } })
    .on('link[rel="canonical"]', { element(el) { el.remove(); } })
    .on('link[rel="describedby"]', { element(el) { el.remove(); } })
    .on('script[data-seo-route="pages"]', { element(el) { el.remove(); } })
    .on("head", { element(el) { el.append(headBlock, { html: true }); } })
    .transform(response);
}

export function routeMode(pathname) {
  const path = canonicalPath(pathname);

  if (
    path === "/api" ||
    path.startsWith("/api/") ||
    path === "/fm-v2-stream" ||
    path.startsWith("/fm-v2-stream/") ||
    path === "/fm-stream" ||
    path.startsWith("/fm-stream/")
  ) {
    return "worker";
  }

  if (WORKER_EXACT.has(path)) return "worker";
  if (STATIC_EXACT.has(path)) return "static";

  if (
    path.startsWith("/astro/") ||
    path.startsWith("/samudaya/") ||
    path.startsWith("/nepal-sambat/mandala/")
  ) {
    return "static";
  }

  if (path.startsWith("/tools/")) return "static";

  const leaf = path.split("/").pop() || "";
  if (leaf.includes(".")) return "static";

  return "worker";
}

function missingBinding() {
  return new Response(JSON.stringify({
    error: "patro_api_service_binding_missing",
    hint: "Bind PATRO_API to the mero-patro Worker in the Pages project."
  }), {
    status: 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const path = url.pathname;

  if ((request.method === "GET" || request.method === "HEAD") && path.length > 1 && path.endsWith("/") && !path.startsWith("/api/")) {
    const canonical = new URL(request.url);
    canonical.pathname = canonicalPath(path);
    return Response.redirect(canonical.toString(), 308);
  }

  const mode = routeMode(path);
  if (mode === "static") {
    const response = await next();
    return rewriteStaticHtml(request, response, env);
  }

  if (!env.PATRO_API || typeof env.PATRO_API.fetch !== "function") {
    return missingBinding();
  }
  return env.PATRO_API.fetch(request);
};
