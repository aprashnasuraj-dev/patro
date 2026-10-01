import { useEffect } from "react";

type Meta = {
  title: string;
  description: string;
  robots?: string;
};

const SITE_ORIGIN = (((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_PUBLIC_BASE_URL) || "https://aafnaipatro.com").replace(/\/+$/, "");
const PRODUCTION_HOST = "aafnaipatro.com";
const PRIVATE_PREFIXES = ["/notes", "/planner", "/settings", "/family", "/my-data", "/my-diary", "/offline", "/admin"];

const EXACT: Record<string, Meta> = {
  "/": {
    title: "नेपाली पात्रो, तिथि र राशिफल · आफ्नै पात्रो",
    description: "आफ्नै पात्रो — नेपाली पात्रो, तिथि, चाडपर्व, राशिफल, मिति रूपान्तरण, समाचार, रेडियो र लाइभ टिभी।"
  },
  "/astro": {
    title: "खगोलीय पात्रो · Astronomy Calendar · आफ्नै पात्रो",
    description: "AD, BS, Nepal Sambat, तिथि, lunar phase र NASA astronomy data एउटै पात्रोमा।"
  },
  "/fm": { title: "FM Radio · आफ्नै पात्रो", description: "नेपाल र विश्वका प्ले गर्न मिल्ने FM तथा online radio stations।" },
  "/tv": { title: "Live TV · आफ्नै पात्रो", description: "देश, भाषा र विषय अनुसार उपलब्ध free live TV channels खोज्नुहोस्।" },
  "/samachar": { title: "समाचार · Samachar · आफ्नै पात्रो", description: "प्रमुख नेपाली स्रोतहरूबाट वर्गीकृत समाचार र source links।" },
  "/time-machine": { title: "नेपाल Time Machine · आफ्नै पात्रो", description: "नेपालको इतिहास, समयरेखा र मिति-आधारित घटनाहरू अन्वेषण गर्नुहोस्।" },
  "/on-this-day": { title: "आज इतिहासमा · On This Day · आफ्नै पात्रो", description: "आजको मितिसँग सम्बन्धित ऐतिहासिक घटनाहरू र स्रोतहरू।" },
  "/tools": { title: "नेपाली Utility Tools · आफ्नै पात्रो", description: "मिति रूपान्तरण, नेपाली typing, Preeti/Unicode, तिथि, QR, कर र अन्य utilities।" },
  "/convert": { title: "AD ↔ BS Date Converter · आफ्नै पात्रो", description: "Gregorian AD र Bikram Sambat BS मिति रूपान्तरण।" },
  "/jyotish/rashifal": { title: "राशिफल · Rashifal · आफ्नै पात्रो", description: "दैनिक, साप्ताहिक र मासिक राशिफल तथा Vedic astrology context।" },
  "/jyotish/china": { title: "चिना टिपन · जन्मपत्रो · आफ्नै पात्रो", description: "जन्म मिति, समय र स्थानका आधारमा चिना, जन्मपत्रो, ग्रह स्थिति, दशा र कुण्डली।" },
  "/jyotish/janma-patro": { title: "चिना टिपन · जन्मपत्रो · आफ्नै पात्रो", description: "जन्म मिति, समय र स्थानका आधारमा चिना, जन्मपत्रो, ग्रह स्थिति, दशा र कुण्डली।" },
  "/about": { title: "About आफ्नै पात्रो", description: "आफ्नै पात्रो को उद्देश्य, data boundaries र platform जानकारी।" },
  "/sources": { title: "Sources · आफ्नै पात्रो", description: "Calendar, astronomy, media र utility data का स्रोतहरू।" }
};

function cleanPath(path: string) {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

function routeMeta(path: string): Meta {
  if (EXACT[path]) return EXACT[path];
  const cal = path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);
  if (cal) return {
    title: `नेपाली पात्रो ${cal[1]}/${String(cal[2]).padStart(2, "0")} · आफ्नै पात्रो`,
    description: `वि.सं. ${cal[1]} सालको महिना ${cal[2]}: तिथि, चाडपर्व, बिदा र AD/BS date context।`
  };
  const date = path.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/);
  if (date) return { title: `${date[1]} नेपाली मिति · आफ्नै पात्रो`, description: `${date[1]} को AD, BS, Nepal Sambat, तिथि र पात्रो विवरण।` };
  if (path.startsWith("/festival/")) return { title: "चाडपर्व · Festival · आफ्नै पात्रो", description: "चाडपर्वको मिति, पात्रो context र उपलब्ध स्रोत विवरण।" };
  if (path.startsWith("/tools/")) return { title: "नेपाली Utility Tool · आफ्नै पात्रो", description: "आफ्नै पात्रो को free browser utility tool।" };
  return { title: "आफ्नै पात्रो · नेपाली पात्रो", description: "नेपाली पात्रो, तिथि, चाडपर्व, राशिफल र दैनिक utilities।" };
}

function isHistoricalCalendar(path: string) {
  const match = path.match(/^\/calendar\/(\d{4})\//);
  if (!match) return false;
  const adYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Kathmandu" }).format(new Date()));
  const approximateBsYear = adYear + 57;
  return Number(match[1]) < approximateBsYear - 10;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
}

function upsertLink(key: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(`link[data-patro-seo="${key}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.dataset.patroSeo = key;
    document.head.appendChild(el);
  }
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
}

export function SeoMeta({ path }: { path: string }) {
  useEffect(() => {
    const normalized = cleanPath(path);
    const meta = routeMeta(normalized);
    const canonicalPath = normalized === "/jyotish/janma-patro" ? "/jyotish/china" : normalized;
    const canonical = SITE_ORIGIN + canonicalPath;
    const privateRoute = PRIVATE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix + "/"));
    const preview = window.location.hostname !== PRODUCTION_HOST && (window.location.hostname.endsWith(".workers.dev") || window.location.hostname.endsWith(".pages.dev"));
    const robots = (privateRoute || preview) ? "noindex, nofollow" : isHistoricalCalendar(normalized) ? "noindex, follow" : meta.robots || "index, follow";

    document.title = meta.title;
    upsertMeta('meta[name="description"]', { name: "description", content: meta.description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: meta.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: meta.description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "ne_NP" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: meta.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: meta.description });

    upsertLink("canonical", { rel: "canonical", href: canonical });
    upsertLink("hreflang-ne", { rel: "alternate", hreflang: "ne", href: canonical });
    upsertLink("hreflang-default", { rel: "alternate", hreflang: "x-default", href: canonical });

    const old = document.getElementById("patro-route-schema");
    old?.remove();
    const script = document.createElement("script");
    script.id = "patro-route-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: meta.title,
      description: meta.description,
      url: canonical,
      inLanguage: ["ne", "en"],
      isPartOf: {
        "@type": "WebSite",
        name: "आफ्नै पात्रो",
        url: SITE_ORIGIN + "/"
      }
    }).replace(/</g, "\\u003c");
    document.head.appendChild(script);
  }, [path]);

  return null;
}
