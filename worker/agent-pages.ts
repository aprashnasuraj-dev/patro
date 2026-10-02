import { createPatroAdapter, PATRO_CITIES } from "../lib/patro";
import { createD1PatroSource, type PatroEnv } from "./patro-source";

type AgentEnv = PatroEnv & { PUBLIC_SITE_URL?: string };

const SITE_FALLBACK = "https://aafnaipatro.com";
const BS_MONTHS = ["", "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
function site(env: AgentEnv) { return String(env.PUBLIC_SITE_URL || SITE_FALLBACK).replace(/\/+$/, ""); }
function citeString() { return `Cite as: Aafnai Patro (aafnaipatro.com), accessed ${new Date().toISOString().slice(0, 10)}`; }
function adOf(row: any) { return String(row?.ad_date || row?.fact_date || row?.date || row?.ad || "").slice(0, 10); }
function nameOf(row: any) { return String(row?.name_ne || row?.title_ne || row?.name_en || row?.title || row?.key || row?.id || "चाडपर्व"); }
function sourceOf(row: any) { return String(row?.source_title || row?.source || row?.source_url || "Aafnai Patro validated calendar archive"); }
function validBsDate(value: string) { return /^\d{4}-\d{1,2}-\d{1,2}$/.test(value); }
function cleanSlug(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, "-").replace(/^-+|-+$/g, ""); }
function nepalToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function secondsUntilNepalMidnight() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(now);
  const values: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") values[p.type] = Number(p.value);
  const elapsed = (values.hour || 0) * 3600 + (values.minute || 0) * 60 + (values.second || 0);
  return Math.max(60, 86400 - elapsed);
}
function dateLabel(ad: string, timeZone = "Asia/Kathmandu") {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(ad + "T12:00:00Z"));
}
function pageShell(env: AgentEnv, request: Request, opts: { title: string; description: string; body: string; schema?: any; index?: boolean; cacheSeconds?: number; frame?: boolean }) {
  const url = new URL(request.url);
  const canonical = site(env) + url.pathname;
  const index = opts.index !== false;
  const schema = opts.schema || { "@context": "https://schema.org", "@type": "WebPage", name: opts.title, description: opts.description, url: canonical };
  const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title><meta name="description" content="${esc(opts.description)}"><meta name="robots" content="${index ? "index,follow" : "noindex,nofollow"}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Noto Sans Devanagari",sans-serif;margin:0;background:#f6f7f4;color:#172019}main{max-width:900px;margin:auto;padding:28px 18px 56px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 24px}a{color:#176f3b}article{background:white;border:1px solid #dfe6df;border-radius:20px;padding:24px;box-shadow:0 12px 34px rgba(23,111,59,.08)}h1{line-height:1.2;margin-top:0}.fact{font-size:1.08rem;line-height:1.7}.meta{color:#5b675e;font-size:.9rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{border:1px solid #e2e8e2;border-radius:14px;padding:14px;background:#fbfcfa}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e7ece7;text-align:left}</style></head><body><main><nav><a href="/">आज</a><a href="/convert">मिति रूपान्तरण</a><a href="/tools">आफ्नै टुल्स</a><a href="/methodology">पद्धति</a><a href="/corrections">सुधार लग</a></nav>${opts.body}<p class="meta">${esc(citeString())}</p></main></body></html>`;
  const cache = Math.max(0, Number(opts.cacheSeconds ?? 3600));
  return new Response(html, { status: 200, headers: {
    "content-type": "text/html; charset=utf-8",
    "cache-control": index ? `public, max-age=${Math.min(cache, 300)}, s-maxage=${cache}` : "public, max-age=300",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-robots-tag": index ? "index, follow" : "noindex, nofollow",
    "content-security-policy": opts.frame ? "default-src 'self'; style-src 'unsafe-inline'; frame-ancestors *; base-uri 'none'" : "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'"
  }});
}

async function todayPage(request: Request, env: AgentEnv, citySlug?: string) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const day = await adapter.getTodayNepal();
  if (!day) return new Response("Calendar unavailable", { status: 503 });
  const city = citySlug ? PATRO_CITIES.find((x) => x.slug === cleanSlug(citySlug)) : undefined;
  if (citySlug && !city) return new Response("Unknown city", { status: 404 });
  const tithi = day.panchang?.tithi?.ne || day.panchang?.tithi?.name_ne || day.panchang?.tithi_name_ne || "तिथि डेटा उपलब्ध छैन";
  const ns = day.ns?.formatted_ne || day.ns?.formatted || "";
  const title = city ? `Nepali Date Today in ${city.name} · Aafnai Patro` : `आज कति गते? नेपाली पात्रो · Aafnai Patro`;
  const description = city ? `${city.name} बाट हेर्दा आजको नेपाल-आधारित Bikram Sambat मिति, तिथि र Nepal-midnight boundary.` : "नेपाल समयअनुसार आजको Bikram Sambat मिति, तिथि, Nepal Sambat र पञ्चाङ्ग तथ्य।";
  const localNow = city ? new Intl.DateTimeFormat("en-GB", { timeZone: city.timeZone, dateStyle: "full", timeStyle: "short" }).format(new Date()) : "";
  const body = `<article><h1>${esc(title)}</h1><p class="fact"><strong>${esc(day.bs?.formatted || `${day.bs.year}-${day.bs.month}-${day.bs.day}`)}</strong> = ${esc(dateLabel(day.ad))}</p><div class="grid"><div class="card"><b>तिथि</b><div>${esc(tithi)}</div></div><div class="card"><b>Nepal Sambat</b><div>${esc(ns || "—")}</div></div><div class="card"><b>AD</b><div>${esc(day.ad)}</div></div>${city ? `<div class="card"><b>${esc(city.name)} local time</b><div>${esc(localNow)}</div></div>` : ""}</div><p class="meta">Date boundary: Asia/Kathmandu (UTC+05:45). ${city ? `Local display timezone: ${esc(city.timeZone)}.` : ""}</p></article>`;
  return pageShell(env, request, { title, description, body, cacheSeconds: secondsUntilNepalMidnight(), schema: { "@context": "https://schema.org", "@type": "WebPage", name: title, description, dateModified: new Date().toISOString(), mainEntity: { "@type": "Thing", name: "Nepali date today", description: `${day.bs?.formatted || `${day.bs.year}-${day.bs.month}-${day.bs.day}`} = ${day.ad}; tithi: ${String(tithi)}` } } });
}

function methodologyPage(request: Request, env: AgentEnv) {
  const title = "नेपाली पात्रो पद्धति · Aafnai Patro Methodology";
  const description = "Aafnai Patro ले एउटै validated calendar archive बाट BS, AD, Nepal Sambat, tithi, festival र conversion तथ्य कसरी प्रस्तुत गर्छ भन्ने पद्धति।";
  const body = `<article><h1>${esc(title)}</h1><p class="fact">Aafnai Patro ले दोस्रो calendar dataset बनाउँदैन। UI, search-visible HTML, conversion endpoints र agent tools ले एउटै validated calendar source प्रयोग गर्छन्। Bikram Sambat महिनाको लम्बाइ वर्षअनुसार बदलिन सक्छ, त्यसैले conversion कुनै fixed 30-day assumption बाट गरिँदैन।</p><h2>Source-of-truth rules</h2><ul><li>BS ↔ AD mapping archive record बाट मात्र।</li><li>Tithi/Panchang archive वा astronomical calculator बाट; hardcoded daily fact छैन।</li><li>Holiday/festival source record र correction overlay बाट।</li><li>Unknown or unavailable facts are reported as unavailable, not guessed.</li></ul><p>Current production archive coverage and verification metadata are published through the Sources page.</p><p><a href="/sources">स्रोत हेर्नुहोस्</a></p></article>`;
  return pageShell(env, request, { title, description, body, schema: { "@context": "https://schema.org", "@type": "TechArticle", headline: title, description } });
}

async function correctionsPage(request: Request, env: AgentEnv) {
  const title = "पात्रो सुधार लग · Calendar Corrections";
  let rows: any[] = [];
  if (env.DB) {
    try { rows = (await env.DB.prepare("select id,ad_date,name_ne,name_en,effect,status,source_url,source_title,updated_at from holiday_overrides order by updated_at desc limit 100").all()).results || []; } catch {}
  }
  const list = rows.length ? `<table><thead><tr><th>Date</th><th>Correction</th><th>Source</th><th>Updated</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.ad_date || "—")}</td><td>${esc(r.name_ne || r.name_en || r.id)}</td><td>${r.source_url ? `<a rel="nofollow noopener" href="${esc(r.source_url)}">${esc(r.source_title || "source")}</a>` : esc(r.source_title || "—")}</td><td>${esc(r.updated_at || "—")}</td></tr>`).join("")}</tbody></table>` : `<p>No published correction overlays are present in the current production database snapshot.</p>`;
  const body = `<article><h1>${esc(title)}</h1><p class="fact">यो पृष्ठले production correction overlays मात्र देखाउँछ। मूल archive silently rewrite गरिँदैन; verified correction छुट्टै overlay का रूपमा traceable राखिन्छ।</p>${list}<p><a href="/contact">गल्ती रिपोर्ट गर्नुहोस्</a></p></article>`;
  return pageShell(env, request, { title, description: "Public log of verified Aafnai Patro calendar correction overlays.", body });
}

async function festivalPage(request: Request, env: AgentEnv, slug: string, year: number) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const festival = await adapter.getFestival(slug, year);
  if (!festival) return new Response("Festival not found", { status: 404 });
  const ad = adOf(festival);
  const title = `${nameOf(festival)} ${year} कहिले? · Aafnai Patro`;
  const body = `<article><h1>${esc(title)}</h1><p class="fact"><strong>${esc(nameOf(festival))}</strong>${ad ? `: ${esc(dateLabel(ad))} (${esc(ad)})` : " — verified date unavailable"}.</p><p>Source: ${esc(sourceOf(festival))}</p><p><a href="/festivals/${esc(slug)}/${year - 1}">अघिल्लो वर्ष</a> · <a href="/festivals/${esc(slug)}/${year + 1}">अर्को वर्ष</a>${ad ? ` · <a href="/date/${esc(ad)}">दिनको पात्रो</a>` : ""}</p></article>`;
  return pageShell(env, request, { title, description: `${nameOf(festival)} ${year} को verified Nepali calendar date and source context.`, body, schema: { "@context": "https://schema.org", "@type": "Event", name: nameOf(festival), ...(ad ? { startDate: ad } : {}), url: site(env) + new URL(request.url).pathname, description: `Source: ${sourceOf(festival)}` } });
}

async function countdownPage(request: Request, env: AgentEnv, slug: string, year: number) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const festival = await adapter.getFestival(slug, year);
  if (!festival) return new Response("Festival not found", { status: 404 });
  const ad = adOf(festival);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ad)) return new Response("Festival date unavailable", { status: 404 });
  const diff = Math.round((Date.parse(ad + "T00:00:00Z") - Date.parse(nepalToday() + "T00:00:00Z")) / 86400000);
  const answer = diff === 0 ? "आज हो।" : diff > 0 ? `${diff} दिन बाँकी छ।` : `${Math.abs(diff)} दिन अघि बितिसकेको छ।`;
  const title = `${nameOf(festival)} ${year} countdown · ${Math.abs(diff)} days · Aafnai Patro`;
  const body = `<article><h1>${esc(nameOf(festival))} ${year} सम्म कति दिन?</h1><p class="fact"><strong>${esc(answer)}</strong></p><p>${esc(nameOf(festival))}: ${esc(dateLabel(ad))} (${esc(ad)}).</p><p><a href="/festivals/${esc(slug)}/${year}">Festival details</a></p></article>`;
  return pageShell(env, request, { title, description: `${nameOf(festival)} ${year} सम्मको Nepal-time countdown based on the verified festival date.`, body, cacheSeconds: secondsUntilNepalMidnight() });
}

async function panchangPage(request: Request, env: AgentEnv, city: string, bsDate: string) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const result = await adapter.getTithiAt(city, bsDate);
  if (!result) return new Response("Panchang record not found", { status: 404 });
  const p = result.panchang || {};
  const tithi = typeof result.tithi === "string" ? result.tithi : result.tithi?.tithi?.ne || result.tithi?.name_ne || result.tithi?.tithi || p?.tithi?.ne || p?.tithi_name_ne || "—";
  const title = `${result.city.name} Panchang ${bsDate} · Aafnai Patro`;
  const facts = [
    ["Tithi", tithi], ["Sunrise", p.sunrise || "—"], ["Sunset", p.sunset || "—"],
    ["Rahu Kaal", p.rahu_kaal || p.rahuKaal || "—"], ["AD", result.ad], ["Timezone", result.city.timeZone]
  ];
  const body = `<article><h1>${esc(title)}</h1><p class="fact">${esc(result.city.name)} का लागि ${esc(bsDate)} को उपलब्ध पञ्चाङ्ग र तिथि तथ्य। Nepal date boundary Asia/Kathmandu मा anchored छ; local display timezone ${esc(result.city.timeZone)} हो।</p><div class="grid">${facts.map(([k, v]) => `<div class="card"><b>${esc(k)}</b><div>${esc(v)}</div></div>`).join("")}</div></article>`;
  return pageShell(env, request, { title, description: `${result.city.name} panchang for BS ${bsDate}: tithi, sunrise, sunset and available kaal data.`, body });
}

function extractFestivalMoment(row: any) {
  for (const key of ["tika_time_iso", "tika_at", "muhurat_iso", "datetime", "date_time", "start_at"]) {
    const value = row?.[key];
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value);
  }
  return null;
}

async function tikaTimePage(request: Request, env: AgentEnv, slug: string, year: number, citySlug: string) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const festival = await adapter.getFestival(slug, year);
  const city = PATRO_CITIES.find((x) => x.slug === cleanSlug(citySlug));
  if (!festival || !city) return new Response("Festival or city not found", { status: 404 });
  const moment = extractFestivalMoment(festival);
  const title = `${nameOf(festival)} ${year} tika time in ${city.name} · Aafnai Patro`;
  let fact = "यो source record मा official tika/muhurat timestamp उपलब्ध छैन; Aafnai Patro ले समय अनुमान गर्दैन।";
  if (moment) {
    const local = new Intl.DateTimeFormat("en-GB", { timeZone: city.timeZone, dateStyle: "full", timeStyle: "short" }).format(moment);
    const nepal = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", dateStyle: "full", timeStyle: "short" }).format(moment);
    fact = `Tika muhurat in ${city.name}: ${local} (${city.timeZone}); Nepal time: ${nepal}.`;
  }
  const body = `<article><h1>${esc(title)}</h1><p class="fact">${esc(fact)}</p><p>Source: ${esc(sourceOf(festival))}</p><p><a href="/festivals/${esc(slug)}/${year}">Festival details</a></p></article>`;
  return pageShell(env, request, { title, description: `${nameOf(festival)} ${year} local-time tika/muhurat conversion for ${city.name}, only when an official source timestamp exists.`, body });
}

async function busiestMonthsPage(request: Request, env: AgentEnv, type: string, year: number) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const rows = await adapter.getSait(type, year);
  const counts = new Map<number, number>();
  for (const row of rows.slice(0, 500)) {
    let month = Number(row?.bs?.month || row?.bs_month || 0);
    if (!month) {
      const ad = adOf(row);
      if (ad) month = Number((await adapter.convertAdToBs(ad))?.bs?.month || 0);
    }
    if (month >= 1 && month <= 12) counts.set(month, (counts.get(month) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const title = `${type} ${year} busiest months · Aafnai Patro`;
  const body = `<article><h1>${esc(title)}</h1>${ranked.length ? `<p class="fact">सबैभन्दा धेरै उपलब्ध ${esc(type)} साइत भएका महिना: <strong>${esc(BS_MONTHS[ranked[0][0]])}</strong> (${ranked[0][1]} records).</p><ol>${ranked.map(([m, n]) => `<li>${esc(BS_MONTHS[m])}: ${n}</li>`).join("")}</ol>` : `<p class="fact">यो वर्ष/type का लागि structured sait records उपलब्ध छैनन्।</p>`}<p><a href="/tools/sait">साइत tool खोल्नुहोस्</a></p></article>`;
  return pageShell(env, request, { title, description: `${year} BS मा उपलब्ध ${type} sait records को month distribution.`, body });
}

function icsEscape(value: string) { return value.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n"); }
async function festivalIcs(request: Request, env: AgentEnv, slug: string, year: number) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const festival = await adapter.getFestival(slug, year);
  if (!festival) return new Response("Festival not found", { status: 404 });
  const ad = adOf(festival);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ad)) return new Response("Festival date unavailable", { status: 404 });
  const dt = ad.replaceAll("-", "");
  const next = new Date(Date.parse(ad + "T00:00:00Z") + 86400000).toISOString().slice(0, 10).replaceAll("-", "");
  const name = nameOf(festival);
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aafnai Patro//Festival Calendar//NE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${cleanSlug(slug)}-${year}@aafnaipatro.com`, `DTSTART;VALUE=DATE:${dt}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${icsEscape(name)}`, `DESCRIPTION:${icsEscape(`Source: ${sourceOf(festival)}. ${citeString()}`)}`, `URL:${site(env)}/festivals/${cleanSlug(slug)}/${year}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  return new Response(body, { status: 200, headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${cleanSlug(slug)}-${year}.ics"`, "cache-control": "public, max-age=3600", "x-robots-tag": "noindex, nofollow" } });
}

function pdfEscape(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?"); }
function basicPdf(lines: string[]) {
  const text = ["BT", "/F1 12 Tf", "50 790 Td", ...lines.flatMap((line, i) => [i ? "0 -16 Td" : "", `(${pdfEscape(line)}) Tj`]).filter(Boolean), "ET"].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
    `4 0 obj << /Length ${text.length} >> stream\n${text}\nendstream\nendobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
  ];
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) { offsets.push(out.length); out += obj + "\n"; }
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  out += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

async function calendarPdf(request: Request, env: AgentEnv, year: number, month: number) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const days = await adapter.getMonth(year, month);
  if (!days.length) return new Response("Calendar month unavailable", { status: 404 });
  const lines = [`Aafnai Patro - Nepali Calendar ${year} ${BS_MONTHS[month]}`, citeString(), ""];
  for (const d of days) lines.push(`${year}-${String(month).padStart(2, "0")}-${String(d.bs.day).padStart(2, "0")}  =  ${d.ad}`);
  return new Response(basicPdf(lines), { status: 200, headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="aafnai-patro-${year}-${String(month).padStart(2, "0")}.pdf"`, "cache-control": "public, max-age=86400", "x-robots-tag": "noindex, nofollow" } });
}

async function todayWidget(request: Request, env: AgentEnv) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const day = await adapter.getTodayNepal();
  if (!day) return new Response("Unavailable", { status: 503 });
  const body = `<article><h1>आज</h1><p class="fact"><strong>${esc(day.bs?.formatted || `${day.bs.year}-${day.bs.month}-${day.bs.day}`)}</strong></p><p>${esc(dateLabel(day.ad))}</p><p><a target="_blank" rel="noopener" href="${esc(site(env))}/">Aafnai Patro</a></p></article>`;
  return pageShell(env, request, { title: "Aafnai Patro Today Widget", description: "Embeddable current Nepali date widget.", body, index: false, cacheSeconds: secondsUntilNepalMidnight(), frame: true });
}

async function calendarWidget(request: Request, env: AgentEnv, year: number, month: number) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  const days = await adapter.getMonth(year, month);
  if (!days.length) return new Response("Unavailable", { status: 404 });
  const body = `<article><h1>${esc(BS_MONTHS[month])} ${year}</h1><div class="grid">${days.map((d) => `<div class="card"><b>${esc(d.bs.day)}</b><div>${esc(d.ad.slice(5))}</div></div>`).join("")}</div><p><a target="_blank" rel="noopener" href="${esc(site(env))}/calendar/${year}/${String(month).padStart(2, "0")}">Open full calendar</a></p></article>`;
  return pageShell(env, request, { title: `Aafnai Patro ${BS_MONTHS[month]} ${year} Widget`, description: "Embeddable Nepali calendar month widget.", body, index: false, cacheSeconds: 86400, frame: true });
}

export async function agentPageResponse(request: Request, env: AgentEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  if (path === "/today") return todayPage(request, env);
  const todayCity = path.match(/^\/today\/([a-z0-9-]+)$/i); if (todayCity) return todayPage(request, env, todayCity[1]);
  if (path === "/methodology") return methodologyPage(request, env);
  if (path === "/corrections") return correctionsPage(request, env);

  const festival = path.match(/^\/festivals\/([^/]+)\/(\d{4})$/); if (festival) return festivalPage(request, env, festival[1], Number(festival[2]));
  const countdown = path.match(/^\/countdown\/([^/]+)-(\d{4})$/); if (countdown) return countdownPage(request, env, countdown[1], Number(countdown[2]));
  const panchang = path.match(/^\/panchang\/([a-z0-9-]+)\/(\d{4}-\d{1,2}-\d{1,2})$/i); if (panchang && validBsDate(panchang[2])) return panchangPage(request, env, panchang[1], panchang[2]);
  const tika = path.match(/^\/festivals\/([^/]+)\/(\d{4})\/tika-time\/([a-z0-9-]+)$/i); if (tika) return tikaTimePage(request, env, tika[1], Number(tika[2]), tika[3]);
  const busiest = path.match(/^\/sait\/([^/]+)\/(\d{4})\/busiest-months$/i); if (busiest) return busiestMonthsPage(request, env, busiest[1], Number(busiest[2]));
  const ics = path.match(/^\/ics\/([^/]+)-(\d{4})$/i); if (ics) return festivalIcs(request, env, ics[1], Number(ics[2]));
  const pdf = path.match(/^\/pdf\/calendar\/(\d{4})\/(\d{1,2})$/); if (pdf) return calendarPdf(request, env, Number(pdf[1]), Number(pdf[2]));
  if (path === "/widget/today") return todayWidget(request, env);
  const widget = path.match(/^\/widget\/calendar\/(\d{4})\/(\d{1,2})$/); if (widget) return calendarWidget(request, env, Number(widget[1]), Number(widget[2]));
  return null;
}
