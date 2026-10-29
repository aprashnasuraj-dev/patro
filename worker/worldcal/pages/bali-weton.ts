import { addDaysIso, gregorianToJdn, isoToJdn, jdnToIso, parseIso, todayIn } from "../dates";
import { esc, page } from "../html";
import { NYEPI, OTHER_BALI_DAYS, PURNAMA_TILEM } from "../data/bali-saka";
import {
  ASTAWARA, CATURWARA, DASAWARA, DWIWARA, HARI_JAWA, JODOH, NEPTU_HARI, NEPTU_PASARAN, otonanDates, PANCAWARA, PASARAN, PAWUKON_CYCLE_DAYS, palelintanganMatrix, pawukon, pawukonDay, pawukonEvents, pawukonHolidaysInYear, SADWARA, SANGAWARA, SAPTAWARA, SAPTAWARA_AKSARA, TRIWARA, WUKU, weton, wetonJodoh,
} from "../engines/pawukon";
import { INDEX_WINDOW } from "../config";
import { pawukonRing, wetonGrid } from "../visuals";
import { PAWUKON_HOLIDAYS, TUMPEK } from "../engines/pawukon";
import type { Ctx, Rendered } from "../types";
import { ROADMAP_FLAGS } from "../../roadmap/flags";
import { sourceBadge, type SourceStatus } from "../../roadmap/provenance";
import { baliFeedRoute } from "./bali-feeds";
import { BALI_PIODALAN, matchesPiodalanRule, nextPawukonPiodalan } from "../data/bali-piodalan";
import { annualSasihReadiness, sasihGregorianDate } from "../data/bali-annual-sources";
import { astaDauh, merthaYoga, pancaDauh, PEWIWAHAN_SAPTAWARA, pitraImmediateRestrictions, sasihReference, WARIGA_DAUH_SOURCE } from "../engines/wariga";
import { sunriseSunset } from "../../../src/patro-tools/core/astro";
import { moonDay } from "../engines/moon";
import { renderTraditionalWorkspace } from "./bali-traditional";
import { lintangProfile } from "./bali-lintang";

const BP = "/bali-calendar";
const WP = "/weton";
const BALI_TZ = "Asia/Makassar";
const JAVA_TZ = "Asia/Jakarta";
const BALI_RANGE = { minYear: 1929, maxYear: 2129 };
const WETON_RANGE = { minYear: 1900, maxYear: 2100 };
const HOLIDAY_YEARS = { min: 2020, max: 2032 };
function baliPwaConfig(ctx: Ctx) {
  return ctx.flags.baliPwa ? { pwa: { manifest: "/bali-calendar/manifest.webmanifest", appName: "Bali Calendar", script: "/bali-calendar/pwa.js" } } : {};
}

const ID_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ID_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const idDate = (iso: string) => {
  const p = parseIso(iso)!;
  return `${ID_DAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]}, ${p.d} ${ID_MONTHS[p.m - 1]} ${p.y}`;
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BALI_NOTE = `<p class="note">Pawukon berulang dalam siklus 210 hari. Purnama, Tilem dan Sasih mengikuti kalender Bali tahunan yang tersedia. Untuk waktu dan tata upacara, tetap ikuti keluarga, desa adat, pengempon atau pemangku setempat.</p>`;
const WETON_NOTE = `<p class="note">Weton dan perhitungan neptu disajikan sebagai warisan budaya menurut tradisi primbon Jawa, bukan ramalan yang menentukan nasib. Hari Jawa berganti saat maghrib: jika lahir setelah maghrib, weton mengikuti hari berikutnya.</p>`;

function inBaliRange(iso: string) {
  const y = Number(iso.slice(0, 4));
  return y >= BALI_RANGE.minYear && y <= BALI_RANGE.maxYear;
}
function inWetonRange(iso: string) {
  const y = Number(iso.slice(0, 4));
  return y >= WETON_RANGE.minYear && y <= WETON_RANGE.maxYear;
}
const indexableDate = (iso: string, today: string) => {
  const d = isoToJdn(iso) - isoToJdn(today);
  return d >= -INDEX_WINDOW.pastDays && d <= INDEX_WINDOW.futureDays;
};

function sakaFacts(iso: string): string[] {
  const y = Number(iso.slice(0, 4));
  const out: string[] = [];
  if (NYEPI[y]?.date === iso) out.push(`Hari Raya Nyepi${NYEPI[y].status === "provisional" ? " (perkiraan)" : ""}`);
  const pt = PURNAMA_TILEM[y];
  if (pt?.purnama.includes(iso)) out.push("Purnama");
  if (pt?.tilem.includes(iso)) out.push("Tilem");
  for (const o of OTHER_BALI_DAYS[y] || []) if (o.date === iso) out.push(o.name);
  return out;
}

export type BaliSignal = { type: "rerainan" | "nyepi" | "purnama" | "tilem" | "wuku"; priority: number; source_status: SourceStatus; ref: string };
export type DayCell = { gregorian_date: string; signals: BaliSignal[]; primary_signal: BaliSignal | null };

function baliSignals(iso: string): BaliSignal[] {
  const j = isoToJdn(iso), y = Number(iso.slice(0, 4));
  const out: BaliSignal[] = [];
  for (const name of pawukonEvents(j)) {
    const major = /Galungan|Kuningan|Saraswati|Pagerwesi|Banyu Pinaruh|Tumpek/.test(name);
    out.push({ type: "rerainan", priority: major ? 90 : 55, source_status: "calculated", ref: name });
  }
  const ny = NYEPI[y];
  if (ny?.date === iso) out.push({ type: "nyepi", priority: 100, source_status: ny.status, ref: "Hari Raya Nyepi" });
  const pt = PURNAMA_TILEM[y];
  if (pt?.purnama.includes(iso)) out.push({ type: "purnama", priority: 75, source_status: "published", ref: "Purnama" });
  if (pt?.tilem.includes(iso)) out.push({ type: "tilem", priority: 75, source_status: "published", ref: "Tilem" });
  for (const o of OTHER_BALI_DAYS[y] || []) if (o.date === iso) out.push({ type: "rerainan", priority: 80, source_status: "published", ref: o.name });
  const p = pawukon(j);
  if (p.day % 7 === 0) out.push({ type: "wuku", priority: 30, source_status: "calculated", ref: `Wuku ${p.wuku.name}` });
  return out.sort((a, b) => b.priority - a.priority || a.ref.localeCompare(b.ref));
}

export function baliMonthModel(year: number, month: number): DayCell[] {
  if (year < BALI_RANGE.minYear || year > BALI_RANGE.maxYear || month < 1 || month > 12) return [];
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    const signals = baliSignals(iso);
    return { gregorian_date: iso, signals, primary_signal: signals[0] || null };
  });
}

export function rerainanSearch(query: string, fromIso: string, limit = 40): { date: string; name: string; status: SourceStatus }[] {
  const needle = query.trim().toLocaleLowerCase("id").replace(/^hari raya\s+/, "").replace(/[·,]+/g, " ").replace(/\s+/g, " ");
  if (needle.length < 2 || !parseIso(fromIso)) return [];
  const out: { date: string; name: string; status: SourceStatus }[] = [];
  const start = isoToJdn(fromIso) - 210;
  const comboSearch = needle.split(" ").filter(Boolean).length >= 2;
  for (let j = start; j <= start + 630 && out.length < limit; j++) {
    const iso = jdnToIso(j);
    if (comboSearch) {
      const p = pawukon(j);
      const combo = p.combination.toLocaleLowerCase("id");
      if (combo.includes(needle)) out.push({ date: iso, name: p.combination, status: "calculated" });
      if (out.length >= limit) break;
    }
    for (const signal of baliSignals(iso)) {
      if (signal.type === "wuku") continue;
      const normalized = signal.ref.toLocaleLowerCase("id").replace(/^hari raya\s+/, "");
      if (normalized.includes(needle)) out.push({ date: iso, name: signal.ref, status: signal.source_status });
      if (out.length >= limit) break;
    }
  }
  return out;
}

function ymShift(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function baliMonth(ctx: Ctx, ym: string): Rendered | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]);
  const cells = baliMonthModel(year, month);
  if (!cells.length) return null;
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const blanks = Array.from({ length: firstDow }, () => "<div aria-hidden=\"true\"></div>").join("");
  const body = cells.map((cell) => {
    const d = Number(cell.gregorian_date.slice(-2));
    const primary = cell.primary_signal;
    const label = primary ? `<span>${esc(primary.ref)}</span>` : "";
    const source = primary && ctx.flags.provenanceUi ? sourceBadge(primary.source_status, primary.ref) : "";
    return `<div><a href="${BP}/${cell.gregorian_date}"><b>${d}</b></a>${label}${source}</div>`;
  }).join("");
  const prev = ymShift(year, month, -1), next = ymShift(year, month, 1);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return {
    status: 200, maxAge: 86400, indexable: false,
    html: page({
      site: ctx.site, path: `${BP}/bulan/${key}`, lang: "id",
      title: `Kalender Bali ${ID_MONTHS[month - 1]} ${year} — Pawukon, rerainan, purnama dan tilem`,
      description: `Kalender Bali bulan ${ID_MONTHS[month - 1]} ${year}: Pawukon, rerainan, Purnama, Tilem dan hari penting dengan status sumber.`,
      h1: `Kalender Bali ${ID_MONTHS[month - 1]} ${year}`,
      sub: "Ringkasan bulanan; buka tanggal untuk Wewaran lengkap.",
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/bulan/${key}`, label: key }],
      indexable: false,
      body: `${baliModeNav("gregorian", key + "-01")}<section><div class="cal"><div class="h">Min</div><div class="h">Sen</div><div class="h">Sel</div><div class="h">Rab</div><div class="h">Kam</div><div class="h">Jum</div><div class="h">Sab</div>${blanks}${body}</div></section>
<section><p><a href="${BP}/bulan/${prev.year}-${String(prev.month).padStart(2, "0")}">← bulan sebelumnya</a> · <a href="${BP}/bulan/${next.year}-${String(next.month).padStart(2, "0")}">bulan berikutnya →</a></p></section>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function baliRerainanSearch(ctx: Ctx): Rendered {
  const q = (ctx.url.searchParams.get("q") || "").trim();
  const today = todayIn(BALI_TZ, ctx.now);
  const results = rerainanSearch(q, today);
  const rows = results.map((r) => `<tr><td><a href="${BP}/${r.date}">${esc(idDate(r.date))}</a></td><td>${esc(r.name)}</td><td>${ctx.flags.provenanceUi ? sourceBadge(r.status, r.name) : esc(r.status)}</td></tr>`).join("");
  return {
    status: 200, maxAge: 3600, indexable: false,
    html: page({
      site: ctx.site, path: `${BP}/cari`, lang: "id",
      title: "Cari rerainan & kombinasi Pawukon Bali — Galungan atau Buda Kliwon Dungulan",
      description: "Cari tanggal dari nama rerainan atau kombinasi Saptawara + Pancawara + Wuku seperti Buda Kliwon Dungulan.",
      h1: "Cari rerainan / kombinasi Pawukon",
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/cari`, label: "Cari rerainan" }],
      indexable: false,
      body: `<section><form class="inline" method="get" action="${BP}/cari"><label>Nama rerainan<input name="q" value="${esc(q)}" placeholder="Galungan atau Buda Kliwon Dungulan" required></label><button>Cari</button></form></section>${q ? `<section><h2>Hasil untuk “${esc(q)}”</h2>${rows ? `<table><tbody>${rows}</tbody></table>` : "<p>Tidak ditemukan dalam jendela pencarian.</p>"}</section>` : ""}`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}


function wewaranGuide(ctx: Ctx): Rendered {
  const today = todayIn(BALI_TZ, ctx.now);
  const p = pawukon(isoToJdn(today));
  const cycles: { name: string; size: number; values: readonly string[]; today: string }[] = [
    { name: "Ekawara", size: 1, values: ["Luang"], today: p.ekawara || "—" },
    { name: "Dwiwara", size: 2, values: DWIWARA, today: p.dwiwara },
    { name: "Triwara", size: 3, values: TRIWARA, today: p.triwara },
    { name: "Caturwara", size: 4, values: CATURWARA, today: p.caturwara },
    { name: "Pancawara", size: 5, values: PANCAWARA, today: p.pancawara },
    { name: "Sadwara", size: 6, values: SADWARA, today: p.sadwara },
    { name: "Saptawara", size: 7, values: SAPTAWARA, today: p.saptawara },
    { name: "Astawara", size: 8, values: ASTAWARA, today: p.astawara },
    { name: "Sangawara", size: 9, values: SANGAWARA, today: p.sangawara },
    { name: "Dasawara", size: 10, values: DASAWARA, today: p.dasawara },
  ];
  const rows = cycles.map((x) => `<tr><th>${esc(x.name)}</th><td>${x.size}</td><td>${esc(x.values.join(", "))}</td><td><b>${esc(x.today)}</b></td></tr>`).join("");
  return {
    status: 200, maxAge: "midnight", tz: BALI_TZ, indexable: false,
    html: page({
      site: ctx.site, path: `${BP}/wewaran`, lang: "id",
      title: "Wewaran Bali: Ekawara sampai Dasawara — urutan dan contoh hari ini",
      description: "Panduan struktur Wewaran dalam Pawukon Bali: Ekawara sampai Dasawara, jumlah unsur tiap siklus, urutan nama dan contoh nilai hari ini.",
      h1: "Panduan Wewaran Bali",
      sub: "Struktur siklus yang dihitung oleh mesin Pawukon AafnaiPatro; halaman ini tidak menafsirkan nasib atau dewasa.",
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/wewaran`, label: "Wewaran" }],
      indexable: false,
      body: `<section><p>Wewaran adalah kumpulan siklus nama hari yang berjalan bersamaan di dalam Pawukon. Tabel ini menunjukkan struktur yang dipakai oleh kalkulator, bukan tafsir ritual atau ramalan.</p><table><thead><tr><th>Siklus</th><th>Jumlah</th><th>Urutan nama</th><th>${esc(idDate(today))}</th></tr></thead><tbody>${rows}</tbody></table></section>
<section><h2>Lihat contoh pada tanggal nyata</h2><p><a href="${BP}/${today}">Buka Wewaran lengkap untuk ${esc(idDate(today))}</a>.</p></section>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function pawukonTable(iso: string): string {
  const j = isoToJdn(iso);
  const p = pawukon(j);
  const rows: [string, string][] = [
    ["Wuku", `<a href="${BP}/wuku/${slug(p.wuku.name)}">${esc(p.wuku.name)}</a> (ke-${p.wuku.index} dari 30)`],
    ["Saptawara", p.saptawara], ["Pancawara", p.pancawara], ["Triwara", p.triwara], ["Sadwara", p.sadwara], ["Caturwara", p.caturwara],
    ["Astawara", p.astawara], ["Sangawara", p.sangawara], ["Dasawara", p.dasawara], ["Dwiwara", p.dwiwara], ["Ekawara", p.ekawara || "—"],
    ["Ingkel Pandakan", p.ingkel], ["Ingkel Jejepan", p.jejepan],
    ["Urip (saptawara + pancawara)", String(p.urip)], ["Hari ke- dalam Pawukon", `${p.day + 1} dari 210`],
  ];
  return `<table><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${k === "Wuku" ? v : esc(v)}</td></tr>`).join("")}</tbody></table>`;
}

function upcomingBali(fromIso: string, n = 8): string {
  const out: string[] = [];
  const start = isoToJdn(fromIso);
  for (let j = start; j < start + 260 && out.length < n; j++) {
    const names = pawukonEvents(j).filter((x) => !["Kajeng Kliwon", "Anggara Kasih", "Buda Cemeng"].includes(x));
    const saka = sakaFacts(jdnToIso(j)).filter((x) => x !== "Purnama" && x !== "Tilem");
    if (names.length || saka.length) out.push(`<tr><td><a href="${BP}/${jdnToIso(j)}">${esc(idDate(jdnToIso(j)))}</a></td><td>${esc([...names, ...saka].join(", "))}</td></tr>`);
  }
  return `<table><tbody>${out.join("")}</tbody></table>`;
}

function otonanForm(lahir = "", waktu = "unknown"): string {
  return `<form class="inline" method="get" action="${BP}/otonan"><label>Tanggal lahir<input type="date" name="lahir" value="${esc(lahir)}" required></label>
<label>Waktu lahir relatif terhadap matahari terbit<select name="waktu">
<option value="unknown"${waktu === "unknown" ? " selected" : ""}>Tidak tahu / tidak yakin</option>
<option value="after"${waktu === "after" ? " selected" : ""}>Saat atau setelah matahari terbit</option>
<option value="before"${waktu === "before" ? " selected" : ""}>Antara tengah malam dan sebelum matahari terbit</option>
</select></label><button>Hitung otonan</button></form>`;
}

const RING_HOLIDAYS = [...PAWUKON_HOLIDAYS.filter((h) => ["banyu-pinaruh", "pagerwesi", "galungan", "kuningan", "saraswati"].includes(h.key)).map((h) => ({ day: h.day, name: h.id })), ...TUMPEK.filter((t) => t.day !== 83).map((t) => ({ day: t.day, name: t.id }))];
function baliHero(iso: string) {
  const j = isoToJdn(iso), p = pawukon(j);
  const events = [...pawukonEvents(j), ...sakaFacts(iso)];
  return {
    art: pawukonRing(p.day, WUKU, RING_HOLIDAYS, { big: p.wuku.name, small: `${p.saptawara} ${p.pancawara}` }),
    lede: `${esc(p.saptawara)} ${esc(p.pancawara)}, wuku ${esc(p.wuku.name)}${events.length ? `<br>${events.map((e) => `<span class="chip">${esc(e)}</span>`).join(" ")}` : ""}<br><span class="note">Lingkaran Pawukon: 30 wuku × 7 hari = 210 hari. Titik merah adalah hari raya, titik hitam adalah hari ini.</span>`,
  };
}
function wetonHero(iso: string, label?: string) {
  const w = weton(isoToJdn(iso));
  const hi = HARI_JAWA.indexOf(w.hari), pi = PASARAN.indexOf(w.pasaran);
  return { art: wetonGrid(HARI_JAWA, PASARAN, NEPTU_HARI, NEPTU_PASARAN, hi, pi), lede: `<span class="neptu">${w.neptu}</span><br>neptu ${esc(label || `${w.hari} ${w.pasaran}`)}` };
}

function piodalanForDate(iso: string) {
  const jdn = isoToJdn(iso);
  const year = Number(iso.slice(0, 4));
  return BALI_PIODALAN.filter((record) => {
    if (record.rule.type === "pawukon") return matchesPiodalanRule(jdn, record.rule);
    if (record.rule.type === "occurrence") return record.rule.date === iso || record.known_occurrences?.includes(iso);
    return sasihGregorianDate(record.rule, year) === iso;
  });
}

function lunarPhaseLabel(angle: number): string {
  const a = ((angle % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return "dekat Bulan Baru";
  if (a < 67.5) return "sabit membesar";
  if (a < 112.5) return "kuartal pertama";
  if (a < 157.5) return "cembung membesar";
  if (a < 202.5) return "dekat Bulan Purnama";
  if (a < 247.5) return "cembung mengecil";
  if (a < 292.5) return "kuartal terakhir";
  return "sabit mengecil";
}

function astronomicalLunarContext(iso: string): string {
  const m = moonDay(iso, BALI_TZ);
  const quarter = m.events.filter((e) => ["new-moon", "first-quarter", "full-moon", "last-quarter"].includes(e.kind));
  const names: Record<string,string> = { "new-moon":"Bulan Baru", "first-quarter":"Kuartal pertama", "full-moon":"Bulan Purnama astronomis", "last-quarter":"Kuartal terakhir" };
  return `<section class="bali-astro-lunar"><h2>Fase Bulan</h2><div class="bali-wariga-strip"><div><span>Fase Bulan</span><strong>${esc(lunarPhaseLabel(m.phaseAngle))}</strong></div><div><span>Cahaya Bulan</span><strong>${Math.round(m.illumination*100)}%</strong></div><div><span>Sudut fase</span><strong>${m.phaseAngle.toFixed(1)}°</strong></div><div><span>Perubahan fase hari ini</span><strong>${quarter.length ? esc(quarter.map((e)=>names[e.kind]||e.kind).join(", ")) : "tidak ada perubahan utama"}</strong></div></div><p class="note">Perhitungan fase Bulan membantu membaca keadaan langit pada tanggal ini. Penetapan Purnama, Tilem, Sasih dan hari upacara tetap mengikuti kalender Bali.</p></section>`;
}

function nextNamedPawukonEvent(fromIso: string, test: (name: string) => boolean) {
  const startJdn = isoToJdn(fromIso);
  for (let offset = 1; offset <= PAWUKON_CYCLE_DAYS; offset++) {
    const jdn = startJdn + offset;
    const name = pawukonEvents(jdn).find(test);
    if (name) return { date: jdnToIso(jdn), name };
  }
  return null;
}

function baliDayBody(ctx: Ctx, iso: string, today: string): string {
  const j = isoToJdn(iso);
  const p = pawukon(j);
  const pal = palelintanganMatrix().find((x) => x.saptawara === p.saptawara && x.pancawara === p.pancawara)!;
  const events = [...pawukonEvents(j), ...sakaFacts(iso)];
  const piodalan = ctx.flags.baliPiodalan ? piodalanForDate(iso) : [];
  const wariga = ctx.flags.baliPadewasan ? padewasanReferenceModel(iso, null, "penanggal") : null;
  const nextTumpek = nextNamedPawukonEvent(iso, (name) => /^Tumpek\b/.test(name));
  const nextKajeng = nextNamedPawukonEvent(iso, (name) => name === "Kajeng Kliwon");
  const eventHtml = events.length
    ? events.map((event) => `<span class="bali-event-chip">${esc(event)}</span>`).join("")
    : `<span class="muted">Tidak ada rerainan besar pada tanggal ini.</span>`;
  const piodalanHtml = piodalan.length
    ? `<div class="bali-piodalan-list">${piodalan.map((record) =>
        `<article><strong>${esc(record.name)}</strong><span>${esc(record.locality)}</span><a href="${esc(record.source.url)}" rel="nofollow noopener">sumber ↗</a></article>`
      ).join("")}</div>`
    : `<p class="muted">Belum ada Piodalan yang tercatat untuk tanggal ini. Piodalan yang mengikuti Sasih akan muncul bila tanggal tahunnya tersedia.</p>`;
  const personalActions = ctx.flags.baliPwa
    ? `<div class="bali-day-actions"><button type="button" class="bali-save-date" data-bali-save-date="${esc(iso)}" data-bali-save-label="${esc(p.combination)}">Simpan tanggal ini</button><button type="button" class="bali-share-date" data-bali-share-date="${esc(iso)}" data-bali-share-label="${esc(p.combination)}">Bagikan hari ini</button><a href="${BP}#my-bali">Buka My Bali Calendar</a></div>`
    : "";
  return `<section class="bali-day-snapshot"><div class="bali-snapshot-head"><div><span class="bali-face-kicker">Hari Bali</span><h2>${esc(p.combination)}</h2><p>${esc(idDate(iso))} · hari ${p.cycleDay}/${PAWUKON_CYCLE_DAYS} · hari ${p.dayInWuku}/7 dalam Wuku ${esc(p.wuku.name)}</p></div><a class="bali-secondary" href="${BP}/wuku/${slug(p.wuku.name)}">Wuku ${esc(p.wuku.name)}</a></div>
<div class="bali-event-row">${eventHtml}</div>${personalActions}</section>
<section><h2>Wewaran lengkap</h2>${pawukonTable(iso)}${ctx.flags.baliLearningGuides ? `<p><a href="${BP}/wewaran">Pelajari Ekawara–Dasawara →</a></p>` : ""}</section>
<section class="bali-lintang-day"><h2>Palelintangan hari ini</h2><div class="bali-wariga-strip"><div><span>Lintang</span><strong>${esc(pal.lintang)}</strong><small lang="ban-Bali">${esc(pal.lintangAksara)}</small></div><div><span>Saptawara × Pancawara</span><strong>${esc(p.saptawara)} × ${esc(p.pancawara)}</strong></div><div><span>Pelindung Saptawara</span><strong>${esc(pal.patron)}</strong></div><div><span>Urip</span><strong>${pal.urip}</strong></div></div><p><a href="${BP}/palelintangan?tanggal=${encodeURIComponent(iso)}">Lihat dalam bagan 35 Lintang →</a> · <a href="${BP}/palelintangan/${slug(pal.lintang)}">Baca kisah ${esc(pal.lintang)} →</a></p></section>
${ctx.flags.baliPiodalan ? `<section><h2>Piodalan yang cocok</h2>${piodalanHtml}</section>` : ""}
${astronomicalLunarContext(iso)}
${wariga ? `<section><h2>Ingkel & Wariga</h2><div class="bali-wariga-strip"><div><span>Ingkel Pandakan</span><strong>${esc(p.ingkel)}</strong></div><div><span>Jejepan</span><strong>${esc(p.jejepan)}</strong></div><div><span>Mertha Yoga</span><strong>${wariga.pewiwahan.mertha_yoga ? "ya" : "tidak"}</strong></div><div><span>Pewiwahan</span><strong>${esc(wariga.pewiwahan.saptawara.source_summary)}</strong></div></div><p class="note">${wariga.pitra.restricted ? `Pantangan Pitra: ${esc(wariga.pitra.reasons.join(", "))}.` : "Tidak ada pantangan Pitra khusus yang tercatat untuk kombinasi hari ini."} <a href="${BP}/padewasan?tanggal=${iso}">Lihat Padewasan hari ini →</a></p></section>` : ""}
<section><h2>Navigasi tradisional</h2><div class="bali-traditional-nav">
<a href="${BP}/${addDaysIso(iso, -7)}">← 1 Wuku</a><a href="${BP}/${addDaysIso(iso, 7)}">+1 Wuku →</a>
<a href="${BP}/${addDaysIso(iso, -210)}">← 1 Oton</a><a href="${BP}/${addDaysIso(iso, 210)}">+1 Oton →</a>
${nextTumpek ? `<a href="${BP}/${nextTumpek.date}">Tumpek berikutnya · ${esc(nextTumpek.name)}</a>` : ""}
${nextKajeng ? `<a href="${BP}/${nextKajeng.date}">Kajeng Kliwon berikutnya</a>` : ""}
</div></section>
<section><h2>Hari raya berikutnya</h2>${upcomingBali(iso)}<p><a href="${BP}/hari-raya/${iso.slice(0, 4)}">Semua hari raya ${iso.slice(0, 4)}</a></p></section>
<section><p><a href="${BP}/${addDaysIso(iso, -1)}">← ${esc(idDate(addDaysIso(iso, -1)))}</a> · <a href="${BP}/${addDaysIso(iso, 1)}">${esc(idDate(addDaysIso(iso, 1)))} →</a>${iso !== today ? ` · <a href="${BP}">Hari ini</a>` : ""}</p></section>
<section><h2>Kalkulator Otonan</h2>${otonanForm()}</section>`;
}

type BaliMode = "pawukon" | "palelintangan" | "sasih" | "gregorian";

function baliModeNav(active: BaliMode, iso: string): string {
  const month = iso.slice(0, 7), q = "?tanggal=" + encodeURIComponent(iso);
  const items: Array<[BaliMode, string, string]> = [
    ["pawukon", active === "pawukon" ? BP : `${BP}/${iso}`, "Pawukon / Tika"],
    ["palelintangan", `${BP}/palelintangan${q}`, "Palelintangan"],
    ["sasih", `${BP}/sasih-saka${q}`, "Sasih / Saka"],
    ["gregorian", `${BP}/bulan/${month}`, "Gregorian"],
  ];
  return `<nav class="bali-mode-nav" aria-label="Mode Kalender Bali">${items.map(([key, href, label]) =>
    `<a href="${href}"${key === active ? ` aria-current="page" class="active"` : ""}>${esc(label)}</a>`
  ).join("")}</nav>`;
}

function tikaMatrix(iso: string): string {
  const currentJdn = isoToJdn(iso);
  const current = pawukon(currentJdn);
  const cycleStart = currentJdn - current.day;
  const cycleEnd = cycleStart + PAWUKON_CYCLE_DAYS - 1;
  const headers = `<div class="tika-corner">Sapta ↓<br>Wuku →</div>${WUKU.map((name) =>
    `<a class="tika-wuku" href="${BP}/wuku/${slug(name)}">${esc(name)}</a>`
  ).join("")}`;
  const rows = SAPTAWARA.map((saptawara, row) => {
    let cells = `<div class="tika-row-label">${esc(saptawara)}</div>`;
    for (let col = 0; col < WUKU.length; col++) {
      const day = col * 7 + row;
      const jdn = cycleStart + day;
      const date = jdnToIso(jdn);
      const pw = pawukon(jdn);
      const events = pawukonEvents(jdn);
      const saka = sakaFacts(date);
      const piodalan = piodalanForDate(date);
      const isCurrent = day === current.day;
      const isMajor = events.some((name) => /Galungan|Kuningan|Saraswati|Pagerwesi|Banyu Pinaruh|Tumpek/.test(name));
      const hasLunar = saka.some((name) => name === "Purnama" || name === "Tilem");
      const hasPiodalan = piodalan.length > 0;
      const titleParts = [pw.combination, idDate(date), ...events, ...saka, ...(hasPiodalan ? [`${piodalan.length} Piodalan bersumber`] : [])];
      const title = titleParts.join(" · ");
      cells += `<a class="tika-cell${isCurrent ? " is-today" : ""}${isMajor ? " has-major" : ""}${hasLunar ? " has-lunar" : ""}${hasPiodalan ? " has-piodalan" : ""}" href="${BP}/${date}" title="${esc(title)}" aria-label="${esc(title)}"><span>${esc(pw.pancawara)}</span><small>${esc(date.slice(5).replace("-", "/"))}</small><b class="tika-markers" aria-hidden="true">${isMajor ? `<i class="marker-rerainan"></i>` : ""}${hasLunar ? `<i class="marker-lunar"></i>` : ""}${hasPiodalan ? `<i class="marker-piodalan"></i>` : ""}</b></a>`;
    }
    return cells;
  }).join("");
  return `<div class="tika-meta"><span>Siklus ini: <b>${esc(idDate(jdnToIso(cycleStart)))}</b> → <b>${esc(idDate(jdnToIso(cycleEnd)))}</b></span><span>Hari ini berada pada posisi <b>${current.cycleDay}/210</b></span></div>
<div class="tika-scroll" tabindex="0" aria-label="Tika Pawukon 30 Wuku kali 7 hari"><div class="tika-grid">${headers}${rows}</div></div>
<fieldset class="tika-overlays"><legend>Lapisan kalender</legend><label><input id="tika-overlay-rerainan" type="checkbox" checked> Hari Raya / Tumpek</label><label><input id="tika-overlay-lunar" type="checkbox" checked> Purnama / Tilem</label><label><input id="tika-overlay-piodalan" type="checkbox" checked> Piodalan bersumber</label></fieldset>
<div class="tika-legend"><span><i class="today"></i>hari dipilih</span><span><i class="major"></i>hari raya/Tumpek</span><span><i class="lunar"></i>Purnama/Tilem</span><span><i class="piodalan"></i>Piodalan</span><span>Isi sel: Pancawara + tanggal Gregorian</span></div>`;
}

function baliAppFace(ctx: Ctx, iso: string): string {
  return renderTraditionalWorkspace(ctx, iso);
}

function selectedBaliDate(ctx: Ctx): string {
  const q = ctx.url.searchParams.get("tanggal") || "";
  return parseIso(q) && inBaliRange(q) ? q : todayIn(BALI_TZ, ctx.now);
}

function baliPalelintanganPage(ctx: Ctx): Rendered {
  const today = selectedBaliDate(ctx);
  const p = pawukon(isoToJdn(today));
  const matrix = palelintanganMatrix();
  const selected = matrix.find((x) => x.saptawara === p.saptawara && x.pancawara === p.pancawara)!;
  const headers = `<div class="pal-corner"><span>PALĚLINTANGAN</span><small>Sapta × Panca</small></div>${PANCAWARA.map((name) => `<div class="pal-head"><span>${esc(name)}</span><small>Pancawara</small></div>`).join("")}`;
  const rows = SAPTAWARA.map((sapta) => {
    const cells = PANCAWARA.map((panca) => {
      const cell = matrix.find((x) => x.saptawara === sapta && x.pancawara === panca)!;
      const current = p.saptawara === sapta && p.pancawara === panca;
      return `<article class="pal-cell${current ? " is-current" : ""}" aria-label="${esc(cell.lintang)} · ${esc(sapta)} ${esc(panca)}">
        <div class="pal-stars" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="pal-cell-top"><span>${esc(panca)}</span><b>Urip ${cell.urip}</b></div>
        <a class="pal-lintang-name" href="${BP}/palelintangan/${slug(cell.lintang)}" style="text-decoration:none">${esc(cell.lintang)}</a>
        <em class="pal-lintang-aksara" lang="ban-Bali">${esc(cell.lintangAksara)}</em>
        <span class="pal-combination">${esc(sapta)} · ${esc(panca)}</span>
        <small class="pal-patron">${esc(cell.patron)}</small>
        ${current ? `<span class="pal-current-mark">Tanggal dipilih</span>` : ""}
      </article>`;
    }).join("");
    return `<div class="pal-row-head"><strong>${esc(sapta)}</strong><small lang="ban-Bali">${esc(SAPTAWARA_AKSARA[sapta])}</small><span>Saptawara</span></div>${cells}`;
  }).join("");
  return {
    status: 200, maxAge: "midnight", tz: BALI_TZ, indexable: true,
    html: page({
      site: ctx.site, path: `${BP}/palelintangan`, lang: "id",
      title: `Palelintangan Bali hari ini — 35 Lintang Saptawara × Pancawara`,
      description: `Palelintangan Bali untuk ${idDate(today)}: Lintang ${selected.lintang}, kombinasi ${p.saptawara} ${p.pancawara}, dengan bagan lengkap 35 Lintang dalam Aksara Bali.`,
      h1: "Palelintangan Bali · Bagan 35 Lintang",
      sub: `${idDate(today)} · ${selected.lintang} · ${p.saptawara} ${p.pancawara}`,
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/palelintangan`, label: "Palelintangan" }],
      indexable: true,
      body: `${baliModeNav("palelintangan", today)}
<section class="pal-hero">
  <div class="pal-hero-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
  <div class="pal-hero-copy"><span class="bali-face-kicker">Lintang untuk tanggal dipilih</span><h2>${esc(selected.lintang)}</h2><p><a href="${BP}/palelintangan/${slug(selected.lintang)}" style="color:#f9dc96;font-weight:800">Jelajahi kisah Lintang ${esc(selected.lintang)} →</a></p><div class="pal-hero-aksara" lang="ban-Bali">${esc(selected.lintangAksara)}</div><p>${esc(p.saptawara)} × ${esc(p.pancawara)} · Wuku ${esc(p.wuku.name)}</p></div>
  <div class="pal-hero-facts"><div><span>Urip</span><strong>${selected.urip}</strong></div><div><span>Saptawara</span><strong>${esc(p.saptawara)}</strong><small lang="ban-Bali">${esc(SAPTAWARA_AKSARA[p.saptawara])}</small></div><div><span>Pancawara</span><strong>${esc(p.pancawara)}</strong></div><div><span>Pelindung</span><strong>${esc(selected.patron)}</strong></div></div>
</section>
<form class="bali-date-jump pal-date-jump" method="get" action="${BP}/palelintangan"><label><span>Lihat Palelintangan tanggal lain</span><input type="date" name="tanggal" min="1929-01-01" max="2129-12-31" value="${esc(today)}" required></label><button type="submit">Lihat Lintang</button></form>
<section class="palelintangan-intro"><div><span class="bali-face-kicker">35 Lintang</span><h2>Cara membaca Palelintangan Bali</h2></div><p>Palelintangan mempertemukan <b>7 Saptawara</b> dengan <b>5 Pancawara</b>, menghasilkan 35 kombinasi Lintang. Cari baris Saptawara dan kolom Pancawara untuk menemukan Lintang suatu hari.</p><p>Bagan ini menampilkan nama Lintang dalam huruf Latin dan Aksara Bali, Urip serta pelindung Saptawara. Wuku dan Wewaran lain tetap dapat dilihat pada <a href="${BP}/${today}">halaman hari Bali</a>.</p></section>
<section class="pal-chart-section"><div class="pal-chart-title"><span>Bagan Palelintangan</span><strong>7 Saptawara × 5 Pancawara</strong></div><div class="pal-grid">${headers}${rows}</div></section>
<section class="pal-seo-story"><h2>Palelintangan dalam Kalender Bali</h2><p>Setiap Lintang mempunyai halaman khusus tentang motif budaya, ragam nama pada naskah, Aksara Bali dan tanggal berikutnya. Pilih nama Lintang pada bagan untuk membaca ceritanya.</p><p>Palelintangan adalah salah satu cara tradisional membaca pertemuan hari dalam Kalender Bali. Setiap kombinasi Saptawara dan Pancawara memiliki nama Lintang. Karena siklus 7 hari dan 5 hari bertemu kembali setiap 35 hari, susunan ini membentuk bagan 35 Lintang.</p><div class="bali-quick-grid"><a href="${BP}/${today}"><strong>Tika Pawukon</strong><span>Lihat Wuku dan Wewaran tanggal ini</span></a><a href="${BP}/otonan"><strong>Otonan</strong><span>Hitung siklus 210 hari kelahiran</span></a><a href="${BP}/sasih-saka?tanggal=${encodeURIComponent(today)}"><strong>Sasih / Saka</strong><span>Lihat Purnama, Tilem dan kalender bulan Bali</span></a></div></section>
<details class="bali-about-data"><summary>Tentang nama 35 Lintang</summary><div><p>Nama Lintang dan bentuk Aksara Bali dapat memiliki variasi ejaan pada naskah dan koleksi yang berbeda. AafnaiPatro menampilkan bentuk yang digunakan pada tabel Palelintangan yang dibandingkan dengan koleksi Museum Bali.</p><p><a href="https://ase.exopla.net/index.php/Balinese_(All_Terms)" rel="nofollow noopener">Lihat catatan nama Lintang ↗</a></p></div></details>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function baliSasihSakaPage(ctx: Ctx): Rendered {
  const today = selectedBaliDate(ctx);
  const year = Number(today.slice(0, 4));
  const readiness = annualSasihReadiness(year);
  const source = readiness.source;
  const mappings = source?.mappings || [];
  const anchors = source?.anchors || [];
  const pt = PURNAMA_TILEM[year];
  const annual = readiness.ready
    ? `<div class="tw"><table><thead><tr><th>Sasih</th><th>Purnama</th><th>Tilem</th></tr></thead><tbody>${mappings.map((m) => `<tr><th>${esc(m.sasih)}</th><td>${m.purnama ? `<a href="${BP}/${m.purnama}">${esc(m.purnama)}</a>` : "—"}</td><td>${m.tilem ? `<a href="${BP}/${m.tilem}">${esc(m.tilem)}</a>` : "—"}</td></tr>`).join("")}</tbody></table></div>`
    : `<div class="bali-calendar-unavailable"><strong>Kalender Sasih lengkap ${year} belum tersedia.</strong><p>AafnaiPatro hanya menampilkan tanggal Sasih, Purnama dan Tilem yang sudah tersedia untuk tahun tersebut.</p></div>${anchors.length ? `<div class="tw"><table><thead><tr><th>Tanggal</th><th>Rahina</th><th>Sasih</th></tr></thead><tbody>${anchors.map((a) => `<tr><td><a href="${BP}/${a.date}">${esc(a.date)}</a></td><td>${esc(a.lunar_day)}</td><td>${esc(a.sasih)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  const sourceDetails = `<details class="bali-about-data"><summary>Tentang kalender Sasih ${year}</summary><div>${source ? `<p>Kalender tahunan: ${esc(source.version)} · ${esc(source.publication_authority)}.</p><p><a href="${esc(source.source_url)}" rel="nofollow noopener">Lihat penerbit kalender ↗</a></p>` : "<p>Belum ada kalender tahunan lengkap yang tercatat untuk tahun ini.</p>"}</div></details>`;
  return {
    status: 200, maxAge: 86400, indexable: false,
    html: page({
      site: ctx.site, path: `${BP}/sasih-saka`, lang: "id",
      title: `Kalender Sasih dan Saka Bali ${year} — Purnama, Tilem & Nyepi`,
      description: `Kalender Sasih dan Saka Bali ${year}: lihat Purnama, Tilem, Nyepi, fase Bulan dan tanggal Sasih yang tersedia.`,
      h1: "Kalender Sasih dan Saka Bali",
      sub: `${idDate(today)} · ${year}`,
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/sasih-saka`, label: "Sasih / Saka" }],
      indexable: false,
      body: `${baliModeNav("sasih", today)}<section><h2>Sasih, Purnama dan Tilem ${year}</h2><p>Gunakan halaman ini untuk melihat kalender bulan Bali pada tahun ${year}. Pawukon tetap dapat dibuka melalui mode Tika.</p>${annual}</section>
<section><h2>Purnama & Tilem ${year}</h2>${pt ? `<p><b>Purnama:</b> ${pt.purnama.map((d) => `<a class="chip" href="${BP}/${d}">${esc(d)}</a>`).join(" ")}</p><p><b>Tilem:</b> ${pt.tilem.map((d) => `<a class="chip" href="${BP}/${d}">${esc(d)}</a>`).join(" ")}</p>` : `<p>Belum ada daftar Purnama dan Tilem lengkap untuk tahun ini.</p>`}</section>
${astronomicalLunarContext(today)}<section><h2>Nyepi ${year}</h2><p>${NYEPI[year] ? `<a href="${BP}/${NYEPI[year].date}">${esc(idDate(NYEPI[year].date))}</a>` : "Tanggal Nyepi belum tersedia untuk tahun ini."}</p></section>${sourceDetails}`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function baliToday(ctx: Ctx): Rendered {
  const today = todayIn(BALI_TZ, ctx.now);
  const p = pawukon(isoToJdn(today));
  return {
    status: 200, maxAge: "midnight", tz: BALI_TZ, indexable: true,
    html: page({
      site: ctx.site, path: BP, lang: "id",
      title: `Kalender Bali Tika Pawukon hari ini — ${p.saptawara} ${p.pancawara} ${p.wuku.name}`,
      description: `Tika Pawukon 210 hari: posisi hari ini ${p.cycleDay}/210, ${p.saptawara} ${p.pancawara}, Wuku ${p.wuku.name}; Palelintangan, Sasih/Saka, Otonan, Piodalan dan hari raya.`,
      h1: "Kalender Bali Hari Ini · Tika Pawukon, Wuku & Wewaran",
      sub: `${esc(idDate(today))} · ${esc(p.combination)}`,
      crumbs: [{ href: BP, label: "Kalender Bali" }],
      indexable: true,
      body: baliAppFace(ctx, today) + baliDayBody(ctx, today, today) + baliSubscriptionSection(ctx, Number(today.slice(0, 4))),
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function baliDate(ctx: Ctx, iso: string): Rendered | null {
  if (!parseIso(iso) || !inBaliRange(iso)) return null;
  const today = todayIn(BALI_TZ, ctx.now);
  const p = pawukon(isoToJdn(iso));
  const ix = indexableDate(iso, today);
  const ring = baliHero(iso);
  return {
    status: 200, maxAge: 86400 * 7, indexable: ix,
    html: page({
      site: ctx.site, path: `${BP}/${iso}`, lang: "id",
      title: `Kalender Bali ${idDate(iso)}: ${p.saptawara} ${p.pancawara} ${p.wuku.name}`,
      description: `${idDate(iso)} dalam Kalender Bali: ${p.saptawara} ${p.pancawara}, Wuku ${p.wuku.name}, posisi ${p.cycleDay}/210${pawukonEvents(isoToJdn(iso)).length ? ", " + pawukonEvents(isoToJdn(iso)).join(", ") : ""}.`,
      h1: esc(`Hari Bali · ${p.combination}`),
      sub: esc(idDate(iso)),
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/${iso}`, label: iso }],
      indexable: ix,
      body: `${baliModeNav("pawukon", iso)}${baliDayBody(ctx, iso, today)}<details class="bali-cycle-explainer"><summary>Lihat diagram pendidikan siklus 30 Wuku</summary><div class="bali-small-ring">${ring.art}</div><p>${ring.lede}</p></details>${baliSubscriptionSection(ctx, Number(iso.slice(0, 4)))}`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function baliSubscriptionSection(ctx: Ctx, year: number): string {
  if (!(ctx.flags.baliSubscriptionUi && ctx.flags.baliIcsFeeds)) return "";
  const holidays = `${BP}/feed/hari-raya/${year}.ics`;
  const moon = `${BP}/feed/purnama-tilem/${year}.ics`;
  const webcal = (path: string) => ctx.site.replace(/^https?:/, "webcal:") + path;
  return `<section><h2>Tambahkan ke kalender</h2>
<p><a href="${holidays}">Hari raya Bali ${year} (.ics)</a> · <a href="${webcal(holidays)}">Berlangganan hari raya</a></p>
<p><a href="${moon}">Purnama & Tilem ${year} (.ics)</a> · <a href="${webcal(moon)}">Berlangganan Purnama & Tilem</a></p>
<p class="note">Untuk Google Calendar, salin URL kalender lalu pilih Tambahkan kalender → Dari URL. Pembaruan jadwal akan mengikuti feed yang sama.</p></section>`;
}

function baliHolidays(ctx: Ctx, gy: number): Rendered | null {
  if (gy < BALI_RANGE.minYear || gy > BALI_RANGE.maxYear) return null;
  const rows = pawukonHolidaysInYear(gy).map((h) => `<tr><td><a href="${BP}/${jdnToIso(h.jdn)}">${esc(idDate(jdnToIso(h.jdn)))}</a></td><td>${esc(h.names.join(", "))}</td></tr>`).join("");
  const ny = NYEPI[gy];
  const pt = PURNAMA_TILEM[gy];
  const ix = gy >= HOLIDAY_YEARS.min && gy <= HOLIDAY_YEARS.max;
  return {
    status: 200, maxAge: 86400 * 7, indexable: ix,
    html: page({
      site: ctx.site, path: `${BP}/hari-raya/${gy}`, lang: "id", title: `Hari raya Hindu Bali ${gy}: Galungan, Kuningan, Saraswati, Pagerwesi, Tumpek, Nyepi`,
      description: `Jadwal hari raya Bali ${gy} menurut Pawukon: Galungan, Kuningan, Saraswati, Pagerwesi, Banyu Pinaruh dan semua Tumpek${ny ? `, serta Nyepi ${idDate(ny.date)}` : ""}.`,
      h1: `Hari raya Bali ${gy}`, crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/hari-raya/${gy}`, label: `Hari raya ${gy}` }], indexable: ix,
      body: `<section><h2>Nyepi</h2><p>${ny ? `${esc(idDate(ny.date))} <span class="note">(${ny.status === "official" ? "resmi" : ny.status === "published" ? "Kalender Bali" : "perkiraan"} — ${esc(ny.source)})</span>${ctx.flags.provenanceUi ? " " + sourceBadge(ny.status, ny.source) : ""}` : "Belum diterbitkan."}</p></section>
<section><h2>Hari raya Pawukon</h2><table><tbody>${rows}</tbody></table><p class="note">${gy > 2026 ? "Dihitung dengan rumus Pawukon; cocokkan dengan Kalender Bali tahun ini setelah terbit." : "Dicocokkan dengan Kalender Bali yang diterbitkan."}${ctx.flags.provenanceUi ? " " + sourceBadge("calculated", "Reingold–Dershowitz Pawukon calculation") : ""}</p></section>
<section><h2>Purnama dan Tilem</h2>${pt ? `<p><b>Purnama:</b> ${pt.purnama.map((d) => esc(d.slice(5))).join(", ")}</p><p><b>Tilem:</b> ${pt.tilem.map((d) => esc(d.slice(5))).join(", ")}</p><p class="note">Sumber: ${esc(pt.source)}${ctx.flags.provenanceUi ? " " + sourceBadge("published", pt.source) : ""}</p>` : `<p>Tabel purnama/tilem ${gy} belum dimasukkan; tanggal ini mengikuti Kalender Bali yang diterbitkan.</p>`}</section>
<section><p><a href="${BP}/hari-raya/${gy - 1}">← ${gy - 1}</a> · <a href="${BP}/hari-raya/${gy + 1}">${gy + 1} →</a></p></section>${baliSubscriptionSection(ctx, gy)}`, footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

export type OtonanPossibility = {
  assumption: "before" | "after";
  birth_jdn: number;
  saptawara: string;
  pancawara: string;
  wuku: string;
  next_dates: string[];
};

export function otonanPossibilities(lahir: string, today: string): OtonanPossibility[] {
  const p = parseIso(lahir);
  if (!p || !inBaliRange(lahir) || !parseIso(today)) return [];
  return ([true, false] as const).map((beforeSunrise) => {
    const birthJdn = gregorianToJdn(p.y, p.m, p.d) - (beforeSunrise ? 1 : 0);
    const pw = pawukon(birthJdn);
    return {
      assumption: beforeSunrise ? "before" : "after",
      birth_jdn: birthJdn,
      saptawara: pw.saptawara,
      pancawara: pw.pancawara,
      wuku: pw.wuku.name,
      next_dates: otonanDates(birthJdn, isoToJdn(today), 6).map(jdnToIso),
    };
  });
}

function otonanVariant(lahir: string, p: NonNullable<ReturnType<typeof parseIso>>, beforeSunrise: boolean, today: string, ctx: Ctx): string {
  const birthJdn = gregorianToJdn(p.y, p.m, p.d) - (beforeSunrise ? 1 : 0);
  const pw = pawukon(birthJdn);
  const next = otonanDates(birthJdn, isoToJdn(today), 6);
  const feedPath = `${BP}/feed/otonan.ics?lahir=${encodeURIComponent(lahir)}${beforeSunrise ? "&sebelum_subuh=1" : ""}`;
  const subscribe = ctx.flags.baliSubscriptionUi && ctx.flags.baliIcsFeeds
    ? `<p><a href="${feedPath}">Unduh / buka kalender Otonan (.ics)</a> · <a href="${ctx.site.replace(/^https?:/, "webcal:")}${feedPath}">Berlangganan di aplikasi kalender</a></p>`
    : "";
  return `<section><h2>${beforeSunrise ? "Kemungkinan A — lahir sebelum matahari terbit" : "Kemungkinan B — lahir saat/setelah matahari terbit"}</h2>
<p class="big">${esc(pw.saptawara)} ${esc(pw.pancawara)} ${esc(pw.wuku.name)}</p>
<p class="note">${beforeSunrise ? "Hari Bali memakai hari kalender sebelumnya untuk kelahiran antara tengah malam dan matahari terbit." : "Hari Bali memakai tanggal sipil yang dipilih jika kelahiran terjadi saat atau setelah matahari terbit."}</p>
<table><tbody>${next.map((j, i) => `<tr><td>${i === 0 ? "Berikutnya" : ""}</td><td><a href="${BP}/${jdnToIso(j)}">${esc(idDate(jdnToIso(j)))}</a></td><td>umur ${Math.round((j - birthJdn) / 210)} oton</td></tr>`).join("")}</tbody></table>${subscribe}</section>`;
}

function otonan(ctx: Ctx): Rendered {
  const lahir = ctx.url.searchParams.get("lahir") || "";
  const legacyBefore = ctx.url.searchParams.get("sebelum_subuh") === "1";
  let waktu = ctx.url.searchParams.get("waktu") || (legacyBefore ? "before" : "unknown");
  if (!["before", "after", "unknown"].includes(waktu)) waktu = "unknown";
  const today = todayIn(BALI_TZ, ctx.now);
  let result = "";
  const p = parseIso(lahir);
  if (p && inBaliRange(lahir)) {
    if (waktu === "unknown" && ctx.flags.baliOtonanDualResult) {
      result = `<section><h2>Dua kemungkinan karena waktu lahir tidak diketahui</h2><p>Dalam perhitungan yang dipakai AafnaiPatro, pergantian hari Bali terjadi saat matahari terbit. Karena jam lahir belum diketahui, jangan pilih satu hasil secara diam-diam: bandingkan kedua kemungkinan di bawah dan konfirmasi dengan catatan keluarga/pemangku bila diperlukan.</p></section>` +
        otonanVariant(lahir, p, true, today, ctx) + otonanVariant(lahir, p, false, today, ctx);
    } else {
      const beforeSunrise = waktu === "before";
      result = `<section><h2>Otonan untuk kelahiran ${esc(idDate(lahir))}</h2></section>` + otonanVariant(lahir, p, beforeSunrise, today, ctx);
    }
  }
  const isResult = Boolean(lahir);
  return {
    status: 200, maxAge: isResult ? 3600 : 86400, indexable: !isResult,
    html: page({
      site: ctx.site, path: `${BP}/otonan`, lang: "id", title: "Kalkulator otonan Bali — hitung hari otonan setiap 210 hari",
      description: "Hitung otonan menurut Pawukon Bali dari tanggal lahir, termasuk dua kemungkinan bila waktu lahir terhadap matahari terbit tidak diketahui.",
      h1: "Kalkulator otonan", sub: "Otonan berulang setiap 210 hari; kelahiran sebelum matahari terbit memakai hari Bali sebelumnya.", crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/otonan`, label: "Otonan" }],
      indexable: !isResult, body: `<section>${otonanForm(lahir, waktu)}</section>${result}`, footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function wukuPage(ctx: Ctx, wslug: string): Rendered | null {
  const wi = WUKU.findIndex((w) => slug(w) === wslug);
  if (wi < 0) return null;
  const today = todayIn(BALI_TZ, ctx.now);
  const tj = isoToJdn(today);
  const offset = (wi * 7 - pawukonDay(tj) + 210) % 210;
  const starts = [0, 1, 2].map((k) => tj + offset + 210 * k);
  const days = Array.from({ length: 7 }, (_, i) => starts[0] + i).map((j) => {
    const p = pawukon(j);
    return `<tr><td><a href="${BP}/${jdnToIso(j)}">${esc(idDate(jdnToIso(j)))}</a></td><td>${esc(p.saptawara)} ${esc(p.pancawara)}</td><td>${esc(pawukonEvents(j).join(", "))}</td></tr>`;
  }).join("");
  const w = WUKU[wi];
  return {
    status: 200, maxAge: "midnight", tz: BALI_TZ, indexable: true,
    html: page({
      site: ctx.site, path: `${BP}/wuku/${wslug}`, lang: "id", title: `Wuku ${w}: kapan berikutnya, hari dan hari raya dalam wuku ${w}`,
      description: `Wuku ${w} adalah wuku ke-${wi + 1} dari 30 dalam Pawukon Bali. Wuku ${w} berikutnya mulai ${idDate(jdnToIso(starts[0]))}.`,
      h1: `Wuku ${esc(w)}`, sub: `Wuku ke-${wi + 1} dari 30`, hero: pawukonRing(wi * 7, WUKU, RING_HOLIDAYS, { big: w, small: `wuku ke-${wi + 1}` }), crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/wuku/${wslug}`, label: `Wuku ${w}` }], indexable: true,
      body: `<section><h2>Wuku ${esc(w)} berikutnya</h2><table><tbody>${days}</tbody></table><p>Berikutnya lagi: ${starts.slice(1).map((j) => esc(idDate(jdnToIso(j)))).join(" · ")}</p></section>
${ctx.flags.baliLearningGuides ? `<section><h2>Urutan wuku</h2><p><a href="${BP}/wuku/${slug(WUKU[(wi + 29) % 30])}">← ${esc(WUKU[(wi + 29) % 30])}</a> · <strong>${esc(w)}</strong> · <a href="${BP}/wuku/${slug(WUKU[(wi + 1) % 30])}">${esc(WUKU[(wi + 1) % 30])} →</a></p><p><a href="${BP}/wewaran">Panduan Wewaran Ekawara–Dasawara</a></p></section>` : ""}
<section><h2>Semua wuku</h2><p>${WUKU.map((x, i) => `<a class="chip" href="${BP}/wuku/${slug(x)}">${i + 1}. ${esc(x)}</a>`).join(" ")}</p></section>`, footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}


export function padewasanReferenceModel(iso: string, sasih: number | null, phase: "penanggal" | "pangelong") {
  if (!parseIso(iso)) return null;
  const j = isoToJdn(iso);
  const p = pawukon(j);
  const year = Number(iso.slice(0, 4));
  const lunar = PURNAMA_TILEM[year];
  const isTilem = Boolean(lunar?.tilem.includes(iso));
  const isPurnama = Boolean(lunar?.purnama.includes(iso));
  const isPurwaniPurnama = Boolean(lunar?.purnama.includes(addDaysIso(iso, 1)));
  const pitra = pitraImmediateRestrictions({
    triwara: p.triwara,
    saptawara: p.saptawara,
    pancawara: p.pancawara,
    events: pawukonEvents(j),
    is_tilem: isTilem,
    is_purwani_purnama: isPurwaniPurnama,
  });
  const marriage = PEWIWAHAN_SAPTAWARA[p.saptawara];
  return {
    date: iso,
    pawukon: p,
    lunar: { evaluated: Boolean(lunar), is_purnama: isPurnama, is_tilem: isTilem, is_purwani_purnama: isPurwaniPurnama, source: lunar?.source || null },
    sasih: sasih ? sasihReference(sasih) : null,
    pitra,
    pewiwahan: { saptawara: marriage, mertha_yoga: merthaYoga(p) },
    asta_dauh: astaDauh(p.saptawara),
    panca_dauh: pancaDauh(p.urip, phase),
    phase,
    source: WARIGA_DAUH_SOURCE,
  };
}

function piodalanIndex(ctx: Ctx): Rendered {
  const q = (ctx.url.searchParams.get("q") || "").trim().toLocaleLowerCase("id");
  const rows = BALI_PIODALAN.filter((x) => !q || (x.name + " " + x.locality + " " + (x.rule.type === "pawukon" ? [x.rule.saptawara, x.rule.pancawara, x.rule.wuku].join(" ") : [x.rule.lunar_day, x.rule.sasih].join(" "))).toLocaleLowerCase("id").includes(q));
  const body = rows.map((x) => {
    const rule = x.rule.type === "pawukon"
      ? `${x.rule.saptawara} ${x.rule.pancawara}, Wuku ${x.rule.wuku} · berulang 210 hari`
      : x.rule.type === "sasih"
        ? `${x.rule.lunar_day} Sasih ${x.rule.sasih} · kalender Sasih tahunan`
        : `${x.rule.rahina} · ${x.rule.date}`;
    return `<tr><td><a href="${BP}/piodalan/${x.slug}">${esc(x.name)}</a></td><td>${esc(x.locality)}</td><td>${esc(rule)}</td></tr>`;
  }).join("");
  return {
    status: 200, maxAge: 86400, indexable: true,
    html: page({
      site: ctx.site, path: `${BP}/piodalan`, lang: "id",
      title: "Kalender Piodalan Pura Bali — Jadwal Pawukon & Sasih",
      description: "Cari jadwal Piodalan Pura di Bali berdasarkan Pawukon atau Sasih, lihat hari Piodalan berikutnya, Wuku, Saptawara dan Pancawara.",
      h1: "Kalender Piodalan Pura Bali",
      sub: "Cari Pura, rahina atau kombinasi Pawukon untuk melihat jadwal Piodalan.",
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/piodalan`, label: "Piodalan" }],
      indexable: true,
      body: `<section class="bali-seo-story"><div class="bali-section-heading"><div><span class="bali-face-kicker">Piodalan Bali</span><h2>Cari jadwal Piodalan Pura</h2></div><p>Piodalan adalah hari peringatan Pura. Sebagian mengikuti kombinasi Pawukon dan berulang dalam siklus 210 hari; sebagian lain mengikuti Purnama, Tilem atau Sasih.</p></div><form class="inline" method="get" action="${BP}/piodalan"><label>Cari Pura atau rahina<input name="q" value="${esc(q)}" placeholder="Batukaru, Buda Wage, Kuningan…"></label><button>Cari Piodalan</button></form></section>
<section><h2>${rows.length} Pura dalam kalender</h2><div class="tw"><table><thead><tr><th>Pura</th><th>Lokasi</th><th>Hari Piodalan</th></tr></thead><tbody>${body}</tbody></table></div></section>
<section><h2>Memahami jadwal Piodalan</h2><p><b>Piodalan Pawukon</b> mengikuti pertemuan Saptawara, Pancawara dan Wuku sehingga pola harinya kembali setiap 210 hari. <b>Piodalan Sasih</b> mengikuti kalender bulan Bali; tanggal Gregorian ditampilkan ketika kalender tahun tersebut tersedia.</p><p><a href="${BP}">Buka Kalender Bali</a> · <a href="${BP}/palelintangan">Palelintangan</a> · <a href="${BP}/sasih-saka">Sasih & Saka</a></p></section>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function piodalanDetail(ctx: Ctx, slugValue: string): Rendered | null {
  const item = BALI_PIODALAN.find((x) => x.slug === slugValue);
  if (!item) return null;
  const today = todayIn(BALI_TZ, ctx.now);
  let schedule = "";
  if (item.rule.type === "pawukon") {
    const next = nextPawukonPiodalan(item.rule, isoToJdn(today), 6);
    schedule = `<section><h2>Piodalan berikutnya</h2><table><tbody>${next.map((j, i) => `<tr><td>${i === 0 ? "Berikutnya" : ""}</td><td><a href="${BP}/${jdnToIso(j)}">${esc(idDate(jdnToIso(j)))}</a></td><td>${esc(item.rule.saptawara)} ${esc(item.rule.pancawara)} · Wuku ${esc(item.rule.wuku)}</td></tr>`).join("")}</tbody></table><p class="note">Jadwal berulang mengikuti kombinasi Pawukon yang tercatat untuk Pura ini.</p></section>`;
  } else if (item.rule.type === "sasih") {
    const known = (item.known_occurrences || []).slice().sort().reverse();
    const year = Number(today.slice(0, 4));
    const candidates = [year, year + 1].map((y) => {
      const readiness = annualSasihReadiness(y);
      const date = sasihGregorianDate(item.rule, y);
      return { year:y, readiness, date };
    });
    const next = candidates.find((x) => x.date && x.date >= today);
    const annual = next?.readiness.source || candidates[0].readiness.source;
    const mapped = next?.date
      ? `<p><b>Tanggal yang tersedia:</b> <a href="${BP}/${next.date}">${esc(idDate(next.date))}</a>.</p>`
      : `<p class="note">Tanggal berikutnya belum ditampilkan karena kalender Sasih untuk tahun ${year}${candidates[1].readiness.source ? `/${year + 1}` : ""} belum tersedia lengkap.</p>`;
    const annualSource = annual
      ? `<details class="bali-about-data"><summary>Tentang kalender tahunan</summary><div><p>${esc(annual.version)} · ${esc(annual.publication_authority)}.</p><p><a href="${esc(annual.source_url)}" rel="nofollow noopener">Lihat penerbit ↗</a></p></div></details>`
      : "";
    schedule = `<section><h2>Jadwal berdasarkan Sasih</h2><p><b>${esc(item.rule.lunar_day)} Sasih ${esc(item.rule.sasih)}</b>.</p>${known.length ? `<p>Tanggal yang pernah tercatat: ${known.map((d) => `<a href="${BP}/${d}">${esc(idDate(d))}</a>`).join(" · ")}.</p>` : ""}${mapped}${annualSource}</section>`;
  } else {
    schedule = `<section><h2>Tanggal Piodalan yang tercatat</h2><p><a href="${BP}/${item.rule.date}">${esc(idDate(item.rule.date))}</a> · <b>${esc(item.rule.rahina)}</b>.</p><p class="note">Belum ada pola berulang yang cukup jelas untuk menampilkan tanggal berikutnya.</p></section>`;
  }
  const ruleText = item.rule.type === "pawukon"
    ? `${item.rule.saptawara} ${item.rule.pancawara}, Wuku ${item.rule.wuku}`
    : item.rule.type === "sasih"
      ? `${item.rule.lunar_day} Sasih ${item.rule.sasih}`
      : `${item.rule.rahina} pada ${item.rule.date} (occurrence-only)`;
  const favoriteAction = ctx.flags.baliPwa && item.rule.type === "pawukon"
    ? (() => { const next = nextPawukonPiodalan(item.rule, isoToJdn(today) + 1, 1)[0], feed=`${BP}/feed/piodalan/${item.slug}.ics`, webcal=ctx.site.replace(/^https?:/,"webcal:")+feed; return `<div class="bali-day-actions"><button type="button" class="bali-save-pura" data-bali-save-pura="${esc(item.slug)}" data-bali-pura-name="${esc(item.name)}" data-bali-pura-locality="${esc(item.locality)}" data-bali-pura-next="${esc(jdnToIso(next))}">Simpan ke My Pura</button><a href="${feed}">Piodalan .ics</a><a href="${esc(webcal)}">Berlangganan</a><a href="${BP}#my-bali">Lihat My Bali Calendar</a></div>`; })()
    : "";
  return {
    status: 200, maxAge: 86400 * 7, indexable: true,
    html: page({
      site: ctx.site, path: `${BP}/piodalan/${item.slug}`, lang: "id",
      title: `${item.name} — Jadwal Piodalan, Rahina & Tanggal Berikutnya`,
      description: `Jadwal Piodalan ${item.name} di ${item.locality}: ${ruleText}, tanggal berikutnya, rahina dan hubungan dengan Kalender Bali.`,
      h1: esc(item.name), sub: esc(item.locality),
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/piodalan`, label: "Piodalan" }, { href: `${BP}/piodalan/${item.slug}`, label: item.name }],
      indexable: true,
      body: `<section class="bali-day-snapshot"><div class="bali-snapshot-head"><div><span class="bali-face-kicker">Hari Piodalan</span><h2>${esc(ruleText)}</h2><p>${esc(item.locality)}</p></div></div>${favoriteAction}</section>${schedule}
<section><h2>Tentang Piodalan di Pura ini</h2><p>Jadwal di atas membantu menemukan rahina dan tanggal Piodalan. Waktu serta tata upacara tetap mengikuti desa, kala, patra dan arahan pengempon, pemangku atau sulinggih setempat.</p></section>
<details class="bali-about-data"><summary>Tentang catatan Piodalan</summary><div><p>${esc(item.source.authority)}${item.source.published_date ? ` · ${esc(item.source.published_date)}` : ""}.</p><p><a href="${esc(item.source.url)}" rel="nofollow noopener">Lihat catatan asal ↗</a></p>${item.note ? `<p>${esc(item.note)}</p>` : ""}</div></details>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

const BALI_DAUH_REFERENCE = { lat: -8.65, lon: 115.2167, tz: BALI_TZ, height: 0 };

const baliClock = (d: Date) => new Intl.DateTimeFormat("id-ID", {
  timeZone: BALI_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).format(d);

function splitInstantWindow(start: Date, end: Date, count: 5 | 8) {
  const span = end.getTime() - start.getTime();
  if (!(span > 0)) throw new Error("invalid solar Dauh interval");
  return Array.from({ length: count }, (_, i) => {
    const a = new Date(start.getTime() + span * i / count);
    const b = new Date(start.getTime() + span * (i + 1) / count);
    return { dauh: i + 1, start: a, end: b, start_text: baliClock(a), end_text: baliClock(b) };
  });
}

export function solarDauhWindows(iso: string, lat = BALI_DAUH_REFERENCE.lat, lon = BALI_DAUH_REFERENCE.lon) {
  if (!parseIso(iso)) throw new RangeError("invalid ISO date");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -9.2 || lat > -7.8 || lon < 114.3 || lon > 116.2) {
    throw new RangeError("Dauh coordinates must be within the Bali reference bounds");
  }
  const loc = { lat, lon, tz: BALI_TZ, height: 0 };
  const { sunrise, sunset } = sunriseSunset(iso, loc);
  const nextSunrise = sunriseSunset(addDaysIso(iso, 1), loc).sunrise;
  return {
    location: { lat, lon, tz: BALI_TZ },
    sunrise, sunset, next_sunrise: nextSunrise,
    panca: { day: splitInstantWindow(sunrise, sunset, 5), night: splitInstantWindow(sunset, nextSunrise, 5) },
    asta: { day: splitInstantWindow(sunrise, sunset, 8), night: splitInstantWindow(sunset, nextSunrise, 8) },
  };
}

function dauhAyuPage(ctx: Ctx): Rendered {
  const today = todayIn(BALI_TZ, ctx.now);
  const tanggal = parseIso(ctx.url.searchParams.get("tanggal") || "") ? String(ctx.url.searchParams.get("tanggal")) : today;
  const phase = ctx.url.searchParams.get("fase") === "pangelong" ? "pangelong" : "penanggal";
  const rawSasih = Number(ctx.url.searchParams.get("sasih") || 0);
  const sasih = rawSasih >= 1 && rawSasih <= 12 ? rawSasih : null;
  const rawLat = ctx.url.searchParams.has("lat") ? Number(ctx.url.searchParams.get("lat")) : BALI_DAUH_REFERENCE.lat;
  const rawLon = ctx.url.searchParams.has("lon") ? Number(ctx.url.searchParams.get("lon")) : BALI_DAUH_REFERENCE.lon;
  const lat = Number.isFinite(rawLat) && rawLat >= -9.2 && rawLat <= -7.8 ? rawLat : BALI_DAUH_REFERENCE.lat;
  const lon = Number.isFinite(rawLon) && rawLon >= 114.3 && rawLon <= 116.2 ? rawLon : BALI_DAUH_REFERENCE.lon;
  const model = padewasanReferenceModel(tanggal, sasih, phase)!;
  const solar = solarDauhWindows(tanggal, lat, lon);
  const p = model.pawukon;
  const astaRows = model.asta_dauh.map((x, i) => `<tr><td>${x.dauh}</td><td><b>${x.quality === "ayu" ? "Ayu" : "Ala"}</b></td><td>${solar.asta.day[i].start_text}–${solar.asta.day[i].end_text}</td><td>${solar.asta.night[i].start_text}–${solar.asta.night[i].end_text}</td></tr>`).join("");
  const pancaRows = model.panca_dauh.map((x, i) => `<tr><td>${x.dauh}</td><td>${esc(x.name)}</td><td>${x.quality === "ayu" ? "Ayu" : x.quality === "madya" ? "Madya" : "Ala"}</td><td>${solar.panca.day[i].start_text}–${solar.panca.day[i].end_text}</td><td>${solar.panca.night[i].start_text}–${solar.panca.night[i].end_text}</td></tr>`).join("");
  return {
    status: 200, maxAge: 3600, indexable: false,
    html: page({
      site: ctx.site, path: `${BP}/dauh-ayu`, lang: "id",
      title: "Dauh Ayu Bali — Panca Dauh Sukaranti dan Asta Dauh dengan jam matahari",
      description: "Referensi Dauh Ayu dari tabel Padewasan Kemdikbud dengan interval nyata matahari terbit–terbenam dan terbenam–terbit berikutnya untuk lokasi di Bali.",
      h1: "Dauh Ayu — Panca & Asta Dauh astronomis",
      sub: "Klasifikasi mengikuti tabel Kemdikbud; batas jam dibagi dari matahari terbit/terbenam yang dihitung untuk lokasi Bali.",
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/dauh-ayu`, label: "Dauh Ayu" }],
      indexable: false,
      body: `<section><form class="inline" method="get" action="${BP}/dauh-ayu"><label>Tanggal<input type="date" name="tanggal" value="${esc(tanggal)}"></label><label>Fase<select name="fase"><option value="penanggal"${phase === "penanggal" ? " selected" : ""}>Penanggal</option><option value="pangelong"${phase === "pangelong" ? " selected" : ""}>Pangelong</option></select></label><label>Latitude Bali<input type="number" name="lat" min="-9.2" max="-7.8" step="0.0001" value="${lat}"></label><label>Longitude Bali<input type="number" name="lon" min="114.3" max="116.2" step="0.0001" value="${lon}"></label><label>Sasih (opsional)<select name="sasih"><option value="">tidak dinilai</option>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${sasih === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("")}</select></label><button>Hitung</button></form></section>
<section><h2>Dasar hari ${esc(idDate(tanggal))}</h2><p>${esc(p.saptawara)} ${esc(p.pancawara)} · Wuku ${esc(p.wuku.name)} · urip <b>${p.urip}</b>.</p><p>Matahari terbit <b>${baliClock(solar.sunrise)}</b> · terbenam <b>${baliClock(solar.sunset)}</b> · terbit berikutnya <b>${baliClock(solar.next_sunrise)}</b> WITA, pada ${lat.toFixed(4)}, ${lon.toFixed(4)}.</p></section>
<section><h2>Asta Dauh — ${esc(p.saptawara)}</h2><p class="note">Sesuai teks sumber, delapan bagian siang membagi matahari terbit→terbenam dan delapan bagian malam membagi terbenam→terbit berikutnya. Jam di bawah dihitung astronomis, bukan tabel jam tetap.</p><div class="tw"><table><thead><tr><th>Dauh</th><th>Klasifikasi</th><th>Siang</th><th>Malam</th></tr></thead><tbody>${astaRows}</tbody></table></div></section>
<section><h2>Panca Dauh / Sukaranti — urip ${p.urip}, ${phase}</h2><div class="tw"><table><thead><tr><th>Dauh</th><th>Nama</th><th>Klasifikasi</th><th>Siang</th><th>Malam</th></tr></thead><tbody>${pancaRows}</tbody></table></div><p class="note">Lima bagian siang dan lima bagian malam mempunyai panjang yang menyesuaikan musim/lokasi. Pada Pangelong urutan klasifikasi 1–5 dibalik sesuai catatan sumber.</p></section>
<section><h2>Sumber & batas penggunaan</h2><p><a href="${esc(WARIGA_DAUH_SOURCE.url)}" rel="nofollow noopener">${esc(WARIGA_DAUH_SOURCE.name)} ↗</a>. Matahari terbit/terbenam dihitung dengan astronomy-engine yang juga dipakai oleh alat astronomi AafnaiPatro. Penyusunan TIKA Bali tetap melibatkan keputusan keagamaan dan lokal; gunakan hasil ini sebagai referensi Wariga yang dapat diaudit, bukan jaminan hasil upacara.</p></section>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function padewasanPage(ctx: Ctx): Rendered {
  const today = todayIn(BALI_TZ, ctx.now);
  const tanggal = parseIso(ctx.url.searchParams.get("tanggal") || "") ? String(ctx.url.searchParams.get("tanggal")) : today;
  const rawSasih = Number(ctx.url.searchParams.get("sasih") || 0);
  const sasih = rawSasih >= 1 && rawSasih <= 12 ? rawSasih : null;
  const model = padewasanReferenceModel(tanggal, sasih, "penanggal")!;
  const p = model.pawukon;
  const marriage = model.pewiwahan.saptawara;
  const sasihHtml = model.sasih ? `<table><tbody><tr><th>Sasih</th><td>${model.sasih.sasih}. ${esc(model.sasih.name)}</td></tr>
<tr><th>Dewa Yajña</th><td>${model.sasih.dewa_yajna ? "Ayu" : "Tidak ditandai Ayu"}</td></tr>
<tr><th>Pitra Yajña</th><td>${model.sasih.pitra_yajna ? "Ayu" : "Tidak ditandai Ayu"}</td></tr>
<tr><th>Manusa Yajña</th><td>${model.sasih.manusa_yajna ? "Ayu" : "Tidak ditandai Ayu"}</td></tr>
<tr><th>Bhuta Yajña</th><td>${model.sasih.bhuta_yajna ? "Ayu" : "Tidak ditandai Ayu"}</td></tr>
<tr><th>Wiwaha</th><td>${model.sasih.wiwaha_yajna ? "Ayu" : "Tidak ditandai Ayu"}</td></tr>
<tr><th>Memukur</th><td>${model.sasih.memukur ? "Kedasa disebut baik untuk memukur" : "Tidak ditandai khusus"}</td></tr></tbody></table>
<p class="note">Sumber matriks Sasih: ${esc(model.sasih.source.name)}.</p>` : '<p class="note">Pilih Sasih bila ingin menambahkan pertimbangan Sasih pada tanggal ini.</p>';
  const lunarText = model.lunar.evaluated
    ? [model.lunar.is_purnama ? "Purnama" : "", model.lunar.is_tilem ? "Tilem" : "", model.lunar.is_purwani_purnama ? "Purwani Purnama" : ""].filter(Boolean).join(", ") || "Bukan Purnama/Tilem/Purwani Purnama pada tabel terbitan tahun ini"
    : "Daftar Purnama/Tilem untuk tahun ini belum tersedia.";
  return {
    status: 200, maxAge: 3600, indexable: false,
    html: page({
      site: ctx.site, path: `${BP}/padewasan`, lang: "id",
      title: "Padewasan Bali — Panduan Hari Baik, Pewiwahan, Pitra & Wariga",
      description: "Lihat Padewasan Bali untuk tanggal pilihan: Wuku, Wewaran, Pitra Yajña, Pewiwahan, Mertha Yoga, Sasih dan Dauh Ayu dalam satu halaman.",
      h1: "Padewasan Bali · Panduan Membaca Hari",
      sub: "Lihat unsur Wariga yang berkaitan dengan hari pilihanmu.",
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/padewasan`, label: "Padewasan" }],
      indexable: false,
      body: `<section><form class="inline" method="get" action="${BP}/padewasan"><label>Tanggal<input type="date" name="tanggal" value="${esc(tanggal)}"></label><label>Sasih (opsional)<select name="sasih"><option value="">tidak dinilai</option>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${sasih === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("")}</select></label><button>Evaluasi</button></form></section>
<section><h2>Pawukon</h2><p>${esc(p.saptawara)} ${esc(p.pancawara)} · Triwara ${esc(p.triwara)} · Wuku ${esc(p.wuku.name)} · urip ${p.urip}.</p></section>
<section><h2>Pitra Yajña</h2><p>${model.pitra.restricted ? `Pantangan yang perlu diperhatikan: <b>${esc(model.pitra.reasons.join(", "))}</b>.` : "Tidak ada pantangan Pitra khusus yang tercatat pada kombinasi hari ini."}</p><p class="note">Konteks bulan: ${esc(lunarText)}</p></section>
<section><h2>Pewiwahan / Manusa Yajña</h2><table><tbody><tr><th>Saptawara</th><td>${esc(p.saptawara)} — <b>${marriage.quality === "ayu" ? "Ayu" : "Ala"}</b> (${esc(marriage.source_summary)})</td></tr><tr><th>Mertha Yoga</th><td>${model.pewiwahan.mertha_yoga ? "<b>Termasuk kombinasi Mertha Yoga.</b>" : "Tidak termasuk kombinasi Mertha Yoga pada panduan ini."}</td></tr></tbody></table></section>
<section><h2>Lapisan Sasih</h2>${sasihHtml}</section>
<section><h2>Dauh</h2><p><a href="${BP}/dauh-ayu?tanggal=${encodeURIComponent(tanggal)}">Buka Panca & Asta Dauh untuk tanggal ini →</a></p></section>
<section><h2>Cara membaca hasil Padewasan</h2><p>Hari baik tidak selalu ditentukan oleh satu tanda. Wewaran, Wuku, Penanggal/Pangelong, Sasih, Dauh dan kebutuhan upacara dapat dipertimbangkan bersama. Gunakan halaman ini sebagai panduan awal dan sesuaikan dengan desa, kala, patra serta arahan keluarga atau pemangku.</p></section><details class="bali-about-data"><summary>Tentang panduan Wariga</summary><div><p><a href="${esc(WARIGA_DAUH_SOURCE.url)}" rel="nofollow noopener">Lihat rujukan Wariga / Dauh ↗</a></p></div></details>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function baliEnglishGuide(ctx: Ctx): Rendered {
  return {
    status: 200, maxAge: 86400 * 7, indexable: false,
    html: page({
      site: ctx.site, path: `${BP}/guide`, lang: "en",
      title: "Balinese Calendar Guide — Pawukon, Wewaran, Otonan, Piodalan & Sasih",
      description: "A clear introduction to the Balinese calendar: the 210-day Pawukon, Wuku and Wewaran cycles, Otonan, Piodalan, Sasih, Purnama, Tilem and choosing days.",
      h1: "A practical guide to the Balinese calendar",
      sub: "Understand the cycles behind dates, ceremonies and family observances.",
      crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/guide`, label: "English guide" }],
      indexable: false,
      body: `<section><h2>Pawukon: the 210-day cycle</h2><p>Pawukon is made of 30 Wuku, each lasting seven days. It runs independently of the Gregorian year, so the same Pawukon pattern returns every 210 days.</p></section>
<section><h2>Wewaran: several day cycles at once</h2><p>A Balinese day can belong to several named cycles at the same time. Saptawara has seven days, Pancawara has five, Triwara has three, and other Wewaran add more layers. <a href="${BP}/wewaran">Open the Wewaran guide.</a></p></section>
<section><h2>Otonan</h2><p>Otonan follows the 210-day Pawukon cycle and is commonly used for a person’s recurring birth-day observance. If a birth happened around sunrise, the traditional day boundary can matter, so the calculator can show both possibilities when the time is uncertain.</p><p><a href="${BP}/otonan">Calculate an Otonan →</a></p></section>
<section><h2>Piodalan</h2><p>Piodalan is a temple anniversary. Some Piodalan dates follow a Pawukon combination and repeat every 210 days; others follow a Sasih or lunar date. <a href="${BP}/piodalan">Browse the Piodalan calendar.</a></p></section>
<section><h2>Sasih, Purnama and Tilem</h2><p>Sasih belongs to the lunar side of the Balinese calendar. Purnama marks the full-moon observance and Tilem the dark-moon observance. Their civil dates are shown from the Balinese calendar available for the selected year.</p></section>
<section><h2>Palelintangan</h2><p>Palelintangan combines seven Saptawara days with five Pancawara days to form 35 Lintang. The chart shows the Lintang names in Latin script and Aksara Bali.</p><p><a href="${BP}/palelintangan">Explore the 35 Lintang →</a></p></section>
<section><h2>Padewasan and Dauh Ayu</h2><p>Choosing a suitable day or time can involve several calendar factors rather than one universal score. AafnaiPatro presents the available Wewaran, Wuku, Ingkel, Pitra, Pewiwahan and Dauh information together so the reader can understand the day in context.</p></section>`,
      footer: BALI_NOTE, ...baliPwaConfig(ctx),
    }),
  };
}

function baliJump(ctx: Ctx): Rendered {
  const tanggal = ctx.url.searchParams.get("tanggal") || "";
  return parseIso(tanggal) && inBaliRange(tanggal)
    ? { status: 302, location: `${BP}/${tanggal}` }
    : { status: 302, location: BP };
}

export function baliRoute(ctx: Ctx, rest: string[]): Rendered | null {
  if (!rest.length) return baliToday(ctx);
  if (rest.length === 1 && rest[0] === "go") return baliJump(ctx);
  if (rest.length === 1 && rest[0] === "palelintangan") return baliPalelintanganPage(ctx);
  if (rest.length === 2 && rest[0] === "palelintangan") return lintangProfile(ctx, rest[1]);
  if (rest.length === 1 && rest[0] === "sasih-saka") return baliSasihSakaPage(ctx);
  if (rest.length === 1 && rest[0] === "hari-raya") return baliHolidays(ctx, Number(todayIn(BALI_TZ, ctx.now).slice(0, 4)));
  if (ctx.flags.baliIcsFeeds && rest[0] === "feed") return baliFeedRoute(ctx, rest);
  if (ctx.flags.baliRerainanSearch && rest.length === 1 && rest[0] === "cari") return baliRerainanSearch(ctx);
  if (ctx.flags.baliLearningGuides && rest.length === 1 && rest[0] === "wewaran") return wewaranGuide(ctx);
  if (ctx.flags.baliPiodalan && rest.length === 1 && rest[0] === "piodalan") return piodalanIndex(ctx);
  if (ctx.flags.baliPiodalan && rest.length === 2 && rest[0] === "piodalan") return piodalanDetail(ctx, rest[1]);
  if (ctx.flags.baliDauhAyu && rest.length === 1 && rest[0] === "dauh-ayu") return dauhAyuPage(ctx);
  if (ctx.flags.baliPadewasan && rest.length === 1 && rest[0] === "padewasan") return padewasanPage(ctx);
  if (ctx.flags.baliEnglishGuide && rest.length === 1 && rest[0] === "guide") return baliEnglishGuide(ctx);
  if (rest.length === 1 && rest[0] === "otonan") return otonan(ctx);
  if (ctx.flags.baliMonthGrid && rest.length === 2 && rest[0] === "bulan") return baliMonth(ctx, rest[1]);
  if (rest.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(rest[0])) return baliDate(ctx, rest[0]);
  if (rest.length === 2 && rest[0] === "hari-raya" && /^\d{4}$/.test(rest[1])) return baliHolidays(ctx, Number(rest[1]));
  if (rest.length === 2 && rest[0] === "wuku") return wukuPage(ctx, rest[1]);
  return null;
}

// ---------------- Weton ----------------

function wetonForm(): string {
  return `<form class="inline" method="get" action="${WP}/hitung"><label>Tanggal lahir<input type="date" name="lahir" required></label><button>Cek weton</button></form>`;
}
function jodohForm(a = "", b = ""): string {
  return `<form class="inline" method="get" action="${WP}/jodoh"><label>Tanggal lahir pertama<input type="date" name="a" value="${esc(a)}" required></label><label>Tanggal lahir kedua<input type="date" name="b" value="${esc(b)}" required></label><button>Hitung</button></form>`;
}
const wetonSlug = (hari: string, pasaran: string) => `${hari.toLowerCase()}-${pasaran.toLowerCase()}`;

function wetonDayBody(iso: string, today: string): string {
  const j = isoToJdn(iso);
  const w = weton(j), after = weton(j, true);
  const hi = HARI_JAWA.indexOf(w.hari), pi = PASARAN.indexOf(w.pasaran);
  return `<section><h2><a href="${WP}/${wetonSlug(w.hari, w.pasaran)}">${esc(w.hari)} ${esc(w.pasaran)}</a></h2>
<table><tbody><tr><th>Neptu hari</th><td>${esc(w.hari)} = ${NEPTU_HARI[hi]}</td></tr><tr><th>Neptu pasaran</th><td>${esc(w.pasaran)} = ${NEPTU_PASARAN[pi]}</td></tr><tr><th>Jumlah neptu</th><td><b>${w.neptu}</b></td></tr>
<tr><th>Wuku</th><td><a href="${BP}/wuku/${slug(w.wuku)}">${esc(w.wuku)}</a></td></tr><tr><th>Lahir setelah maghrib</th><td><a href="${WP}/${wetonSlug(after.hari, after.pasaran)}">${esc(after.hari)} ${esc(after.pasaran)}</a> (neptu ${after.neptu})</td></tr></tbody></table>
<p class="muted">Kalender Bali: <a href="${BP}/${iso}">${esc(pawukon(j).saptawara)} ${esc(pawukon(j).pancawara)} ${esc(pawukon(j).wuku.name)}</a></p></section>
<section><h2>Cek weton dari tanggal lahir</h2>${wetonForm()}</section><section><h2>Hitung weton jodoh</h2>${jodohForm()}</section>
<section><p><a href="${WP}/${addDaysIso(iso, -1)}">← ${esc(idDate(addDaysIso(iso, -1)))}</a> · <a href="${WP}/${addDaysIso(iso, 1)}">${esc(idDate(addDaysIso(iso, 1)))} →</a>${iso !== today ? ` · <a href="${WP}">Hari ini</a>` : ""}</p></section>`;
}

function wetonToday(ctx: Ctx): Rendered {
  const today = todayIn(JAVA_TZ, ctx.now);
  const w = weton(isoToJdn(today));
  return {
    status: 200, maxAge: "midnight", tz: JAVA_TZ, indexable: true,
    html: page({
      site: ctx.site, path: WP, lang: "id", title: `Weton hari ini: ${w.hari} ${w.pasaran} (neptu ${w.neptu}) — cek weton dan weton jodoh`,
      description: `Weton hari ini ${idDate(today)} adalah ${w.hari} ${w.pasaran} dengan neptu ${w.neptu}, wuku ${w.wuku}. Cek weton dari tanggal lahir dan hitung weton jodoh.`,
      h1: "Weton hari ini", sub: esc(idDate(today)), hero: wetonHero(today).art, lede: wetonHero(today).lede, crumbs: [{ href: WP, label: "Weton" }], indexable: true, body: wetonDayBody(today, today), footer: WETON_NOTE,
    }),
  };
}

function wetonDate(ctx: Ctx, iso: string): Rendered | null {
  if (!parseIso(iso) || !inWetonRange(iso)) return null;
  const today = todayIn(JAVA_TZ, ctx.now);
  const w = weton(isoToJdn(iso));
  // Birth dates are searched far into the past, so weton date pages are indexable from 1940 to the future window.
  const ix = Number(iso.slice(0, 4)) >= 1940 && isoToJdn(iso) - isoToJdn(today) <= INDEX_WINDOW.futureDays;
  return {
    status: 200, maxAge: 86400 * 7, indexable: ix,
    html: page({
      site: ctx.site, path: `${WP}/${iso}`, lang: "id", title: `Weton ${idDate(iso)}: ${w.hari} ${w.pasaran}, neptu ${w.neptu}`,
      description: `Orang yang lahir ${idDate(iso)} memiliki weton ${w.hari} ${w.pasaran} dengan neptu ${w.neptu} (wuku ${w.wuku}).`,
      h1: esc(`Weton ${idDate(iso)}`), hero: wetonHero(iso).art, lede: wetonHero(iso).lede, crumbs: [{ href: WP, label: "Weton" }, { href: `${WP}/${iso}`, label: iso }], indexable: ix, body: wetonDayBody(iso, today), footer: WETON_NOTE,
    }),
  };
}

function wetonType(ctx: Ctx, ws: string): Rendered | null {
  const [h, p] = ws.split("-");
  const hi = HARI_JAWA.findIndex((x) => x.toLowerCase() === h), pi = PASARAN.findIndex((x) => x.toLowerCase() === p);
  if (hi < 0 || pi < 0) return null;
  const today = todayIn(JAVA_TZ, ctx.now);
  const next: number[] = [];
  for (let j = isoToJdn(today); next.length < 6; j++) { const w = weton(j); if (w.hari === HARI_JAWA[hi] && w.pasaran === PASARAN[pi]) next.push(j); }
  const neptu = NEPTU_HARI[hi] + NEPTU_PASARAN[pi];
  const name = `${HARI_JAWA[hi]} ${PASARAN[pi]}`;
  return {
    status: 200, maxAge: "midnight", tz: JAVA_TZ, indexable: true,
    html: page({
      site: ctx.site, path: `${WP}/${ws}`, lang: "id", title: `Weton ${name}: neptu ${neptu} dan tanggal ${name} berikutnya`,
      description: `${name} memiliki neptu ${neptu} (${HARI_JAWA[hi]} ${NEPTU_HARI[hi]} + ${PASARAN[pi]} ${NEPTU_PASARAN[pi]}). ${name} berikutnya: ${idDate(jdnToIso(next[0]))}. Weton berulang setiap 35 hari.`,
      h1: `Weton ${esc(name)}`, hero: wetonGrid(HARI_JAWA, PASARAN, NEPTU_HARI, NEPTU_PASARAN, hi, pi), lede: `<span class="neptu">${neptu}</span><br>neptu ${esc(name)}`, crumbs: [{ href: WP, label: "Weton" }, { href: `${WP}/${ws}`, label: name }], indexable: true,
      body: `<section><p>Neptu ${esc(HARI_JAWA[hi])} = ${NEPTU_HARI[hi]}, neptu ${esc(PASARAN[pi])} = ${NEPTU_PASARAN[pi]}, jumlah <b>${neptu}</b>. Weton yang sama berulang setiap 35 hari (selapan).</p></section>
<section><h2>${esc(name)} berikutnya</h2><table><tbody>${next.map((j) => `<tr><td><a href="${WP}/${jdnToIso(j)}">${esc(idDate(jdnToIso(j)))}</a></td><td>wuku ${esc(weton(j).wuku)}</td></tr>`).join("")}</tbody></table></section>
<section><h2>Semua weton</h2><p>${HARI_JAWA.flatMap((hh) => PASARAN.map((pp) => `<a class="chip" href="${WP}/${wetonSlug(hh, pp)}">${hh} ${pp}</a>`)).join(" ")}</p></section>`, footer: WETON_NOTE,
    }),
  };
}

function hitung(ctx: Ctx): Rendered {
  const lahir = ctx.url.searchParams.get("lahir") || "";
  return parseIso(lahir) && inWetonRange(lahir) ? { status: 302, location: `${WP}/${lahir}` } : { status: 302, location: WP };
}

function jodoh(ctx: Ctx): Rendered {
  const a = ctx.url.searchParams.get("a") || "", b = ctx.url.searchParams.get("b") || "";
  let result = "";
  if (parseIso(a) && parseIso(b) && inWetonRange(a) && inWetonRange(b)) {
    const wa = weton(isoToJdn(a)), wb = weton(isoToJdn(b));
    const r = wetonJodoh(wa.neptu, wb.neptu);
    result = `<section><h2>Hasil menurut tradisi primbon Jawa</h2><table><tbody><tr><th>Pertama</th><td>${esc(wa.hari)} ${esc(wa.pasaran)} (neptu ${wa.neptu})</td></tr><tr><th>Kedua</th><td>${esc(wb.hari)} ${esc(wb.pasaran)} (neptu ${wb.neptu})</td></tr>
<tr><th>Jumlah neptu</th><td>${r.total}</td></tr><tr><th>Hitungan 8 (Pegat–Pesthi)</th><td><b>${esc(r.name)}</b> — ${esc(r.meaning)}</td></tr></tbody></table>
<p class="note">Hanya tradisi budaya. Keputusan berjodoh tidak ditentukan oleh hitungan weton.</p></section>`;
  }
  const isResult = Boolean(a || b);
  const table = JODOH.map((j, i) => `<tr><td>${esc(j.name)}</td><td>${[1, 2, 3, 4, 5].map((k) => i + 1 + 8 * (k - 1)).filter((x) => x <= 36).join(", ")}</td><td>${esc(j.meaning)}</td></tr>`).join("");
  return {
    status: 200, maxAge: isResult ? 3600 : 86400, indexable: !isResult,
    html: page({
      site: ctx.site, path: `${WP}/jodoh`, lang: "id", title: "Hitung weton jodoh — neptu pasangan menurut primbon Jawa (Pegat sampai Pesthi)",
      description: "Hitung weton jodoh dari dua tanggal lahir: jumlah neptu kedua pasangan dan hitungan delapan Pegat, Ratu, Jodoh, Topo, Tinari, Padu, Sujanan, Pesthi menurut tradisi primbon.",
      h1: "Hitung weton jodoh", crumbs: [{ href: WP, label: "Weton" }, { href: `${WP}/jodoh`, label: "Weton jodoh" }], indexable: !isResult,
      body: `<section>${jodohForm(a, b)}</section>${result}<section><h2>Tabel hitungan delapan</h2><table><thead><tr><th>Hasil</th><th>Jumlah neptu</th><th>Makna menurut primbon</th></tr></thead><tbody>${table}</tbody></table></section>`, footer: WETON_NOTE,
    }),
  };
}

export function wetonRoute(ctx: Ctx, rest: string[]): Rendered | null {
  if (!rest.length) return wetonToday(ctx);
  if (rest.length !== 1) return null;
  if (rest[0] === "jodoh") return jodoh(ctx);
  if (rest[0] === "hitung") return hitung(ctx);
  if (/^\d{4}-\d{2}-\d{2}$/.test(rest[0])) return wetonDate(ctx, rest[0]);
  if (/^[a-z]+-[a-z]+$/.test(rest[0])) return wetonType(ctx, rest[0]);
  return null;
}

export function baliUrls(now: Date, flags = ROADMAP_FLAGS): string[] {
  const out = [BP, `${BP}/palelintangan`, ...palelintanganMatrix().map((x) => `${BP}/palelintangan/${slug(x.lintang)}`), `${BP}/otonan`, ...WUKU.map((w) => `${BP}/wuku/${slug(w)}`)];
  if (flags.baliRerainanSearch) out.push(`${BP}/cari`);
  if (flags.baliLearningGuides) out.push(`${BP}/wewaran`);
  if (flags.baliPiodalan) out.push(`${BP}/piodalan`, ...BALI_PIODALAN.map((x) => `${BP}/piodalan/${x.slug}`));
  if (flags.baliDauhAyu) out.push(`${BP}/dauh-ayu`);
  if (flags.baliPadewasan) out.push(`${BP}/padewasan`);
  if (flags.baliEnglishGuide) out.push(`${BP}/guide`);
  if (flags.baliMonthGrid) {
    const t0 = todayIn(BALI_TZ, now);
    const y = Number(t0.slice(0, 4)), m = Number(t0.slice(5, 7));
    for (let d = -12; d <= 24; d++) {
      const shifted = ymShift(y, m, d);
      out.push(`${BP}/bulan/${shifted.year}-${String(shifted.month).padStart(2, "0")}`);
    }
  }
  for (let y = HOLIDAY_YEARS.min; y <= HOLIDAY_YEARS.max; y++) out.push(`${BP}/hari-raya/${y}`);
  const t = isoToJdn(todayIn(BALI_TZ, now));
  for (let j = t - INDEX_WINDOW.pastDays; j <= t + INDEX_WINDOW.futureDays; j++) out.push(`${BP}/${jdnToIso(j)}`);
  return out;
}
export function wetonUrls(now: Date): string[] {
  const out = [WP, `${WP}/jodoh`, ...HARI_JAWA.flatMap((h) => PASARAN.map((p) => `${WP}/${wetonSlug(h, p)}`))];
  const t = isoToJdn(todayIn(JAVA_TZ, now));
  for (let j = gregorianToJdn(1940, 1, 1); j <= t + INDEX_WINDOW.futureDays; j++) out.push(`${WP}/${jdnToIso(j)}`);
  return out;
}
