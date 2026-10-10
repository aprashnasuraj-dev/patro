import { addDaysIso, gregorianToJdn, isoToJdn, jdnToIso, parseIso, todayIn } from "../dates";
import { esc, page } from "../html";
import { NYEPI, OTHER_BALI_DAYS, PURNAMA_TILEM } from "../data/bali-saka";
import {
  HARI_JAWA, JODOH, NEPTU_HARI, NEPTU_PASARAN, otonanDates, PASARAN, pawukon, pawukonDay, pawukonEvents, pawukonHolidaysInYear, WUKU, weton, wetonJodoh,
} from "../engines/pawukon";
import { INDEX_WINDOW } from "../config";
import { pawukonRing, wetonGrid } from "../visuals";
import { PAWUKON_HOLIDAYS, TUMPEK } from "../engines/pawukon";
import type { Ctx, Rendered } from "../types";

const BP = "/bali-calendar";
const WP = "/weton";
const BALI_TZ = "Asia/Makassar";
const JAVA_TZ = "Asia/Jakarta";
const RANGE = { minYear: 1900, maxYear: 2100 };
const HOLIDAY_YEARS = { min: 2020, max: 2032 };

const ID_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ID_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const idDate = (iso: string) => {
  const p = parseIso(iso)!;
  return `${ID_DAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]}, ${p.d} ${ID_MONTHS[p.m - 1]} ${p.y}`;
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BALI_NOTE = `<p class="note">Perhitungan Pawukon memakai rumus Reingold–Dershowitz (Calendrical Calculations) dan sudah dicocokkan dengan Kalender Bali 2026. Hari raya Pawukon berulang setiap 210 hari. Untuk waktu upacara, ikuti keluarga, pemangku, atau Kalender Bali resmi — pelaksanaan bisa berbeda antardesa. Purnama, tilem dan sasih diambil dari Kalender Bali yang diterbitkan, bukan dihitung.</p>`;
const WETON_NOTE = `<p class="note">Weton dan perhitungan neptu disajikan sebagai warisan budaya menurut tradisi primbon Jawa, bukan ramalan yang menentukan nasib. Hari Jawa berganti saat maghrib: jika lahir setelah maghrib, weton mengikuti hari berikutnya.</p>`;

function inRange(iso: string) {
  const y = Number(iso.slice(0, 4));
  return y >= RANGE.minYear && y <= RANGE.maxYear;
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

function pawukonTable(iso: string): string {
  const j = isoToJdn(iso);
  const p = pawukon(j);
  const rows: [string, string][] = [
    ["Wuku", `<a href="${BP}/wuku/${slug(p.wuku.name)}">${esc(p.wuku.name)}</a> (ke-${p.wuku.index} dari 30)`],
    ["Saptawara", p.saptawara], ["Pancawara", p.pancawara], ["Triwara", p.triwara], ["Sadwara", p.sadwara], ["Caturwara", p.caturwara],
    ["Astawara", p.astawara], ["Sangawara", p.sangawara], ["Dasawara", p.dasawara], ["Dwiwara", p.dwiwara], ["Ekawara", p.ekawara || "—"],
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

function otonanForm(): string {
  return `<form class="inline" method="get" action="${BP}/otonan"><label>Tanggal lahir<input type="date" name="lahir" required></label><label><span><input type="checkbox" name="sebelum_subuh" value="1" style="width:auto"> lahir antara tengah malam dan matahari terbit</span></label><button>Hitung otonan</button></form>`;
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

function baliDayBody(iso: string, today: string): string {
  const j = isoToJdn(iso);
  const events = [...pawukonEvents(j), ...sakaFacts(iso)];
  const p = pawukon(j);
  void events;
  return `<section><p class="muted">Weton Jawa: <a href="${WP}/${iso}">${esc(weton(j).hari)} ${esc(weton(j).pasaran)}</a> (neptu ${weton(j).neptu})</p></section>
<section><h2>Wewaran lengkap</h2>${pawukonTable(iso)}</section>
<section><h2>Hari raya berikutnya</h2>${upcomingBali(iso)}<p><a href="${BP}/hari-raya/${iso.slice(0, 4)}">Semua hari raya ${iso.slice(0, 4)}</a></p></section>
<section><p><a href="${BP}/${addDaysIso(iso, -1)}">← ${esc(idDate(addDaysIso(iso, -1)))}</a> · <a href="${BP}/${addDaysIso(iso, 1)}">${esc(idDate(addDaysIso(iso, 1)))} →</a>${iso !== today ? ` · <a href="${BP}">Hari ini</a>` : ""}</p></section>
<section><h2>Kalkulator otonan</h2>${otonanForm()}</section>`;
}

function baliToday(ctx: Ctx): Rendered {
  const today = todayIn(BALI_TZ, ctx.now);
  const p = pawukon(isoToJdn(today));
  return {
    status: 200, maxAge: "midnight", tz: BALI_TZ, indexable: true,
    html: page({
      site: ctx.site, path: BP, lang: "id", title: `Kalender Bali hari ini: ${p.saptawara} ${p.pancawara} ${p.wuku.name} — wuku, wewaran dan hari raya`,
      description: `Hari ini menurut Kalender Bali: ${p.saptawara} ${p.pancawara}, wuku ${p.wuku.name}. Wewaran lengkap, hari raya Galungan, Kuningan, Saraswati dan kalkulator otonan.`,
      h1: "Kalender Bali hari ini", sub: esc(idDate(today)), hero: baliHero(today).art, lede: baliHero(today).lede, crumbs: [{ href: BP, label: "Kalender Bali" }], indexable: true, body: baliDayBody(today, today), footer: BALI_NOTE,
    }),
  };
}

function baliDate(ctx: Ctx, iso: string): Rendered | null {
  if (!parseIso(iso) || !inRange(iso)) return null;
  const today = todayIn(BALI_TZ, ctx.now);
  const p = pawukon(isoToJdn(iso));
  const ix = indexableDate(iso, today);
  return {
    status: 200, maxAge: 86400 * 7, indexable: ix,
    html: page({
      site: ctx.site, path: `${BP}/${iso}`, lang: "id", title: `Kalender Bali ${idDate(iso)}: ${p.saptawara} ${p.pancawara} ${p.wuku.name}`,
      description: `${idDate(iso)} dalam Kalender Bali: ${p.saptawara} ${p.pancawara}, wuku ${p.wuku.name}${pawukonEvents(isoToJdn(iso)).length ? ", " + pawukonEvents(isoToJdn(iso)).join(", ") : ""}.`,
      h1: esc(`Kalender Bali ${idDate(iso)}`), hero: baliHero(iso).art, lede: baliHero(iso).lede, crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/${iso}`, label: iso }], indexable: ix, body: baliDayBody(iso, today), footer: BALI_NOTE,
    }),
  };
}

function baliHolidays(ctx: Ctx, gy: number): Rendered | null {
  if (gy < RANGE.minYear || gy > RANGE.maxYear) return null;
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
      body: `<section><h2>Nyepi</h2><p>${ny ? `${esc(idDate(ny.date))} <span class="note">(${ny.status === "official" ? "resmi" : ny.status === "published" ? "Kalender Bali" : "perkiraan"} — ${esc(ny.source)})</span>` : "Belum diterbitkan."}</p></section>
<section><h2>Hari raya Pawukon</h2><table><tbody>${rows}</tbody></table><p class="note">${gy > 2026 ? "Dihitung dengan rumus Pawukon; cocokkan dengan Kalender Bali tahun ini setelah terbit." : "Dicocokkan dengan Kalender Bali yang diterbitkan."}</p></section>
<section><h2>Purnama dan Tilem</h2>${pt ? `<p><b>Purnama:</b> ${pt.purnama.map((d) => esc(d.slice(5))).join(", ")}</p><p><b>Tilem:</b> ${pt.tilem.map((d) => esc(d.slice(5))).join(", ")}</p><p class="note">Sumber: ${esc(pt.source)}</p>` : `<p>Tabel purnama/tilem ${gy} belum dimasukkan; tanggal ini mengikuti Kalender Bali yang diterbitkan.</p>`}</section>
<section><p><a href="${BP}/hari-raya/${gy - 1}">← ${gy - 1}</a> · <a href="${BP}/hari-raya/${gy + 1}">${gy + 1} →</a></p></section>`, footer: BALI_NOTE,
    }),
  };
}

function otonan(ctx: Ctx): Rendered {
  const lahir = ctx.url.searchParams.get("lahir") || "";
  const beforeSunrise = ctx.url.searchParams.get("sebelum_subuh") === "1";
  const today = todayIn(BALI_TZ, ctx.now);
  let result = "";
  const p = parseIso(lahir);
  if (p && inRange(lahir)) {
    // The Balinese day turns at sunrise: a birth between midnight and sunrise belongs to the previous Balinese day.
    const birthJdn = gregorianToJdn(p.y, p.m, p.d) - (beforeSunrise ? 1 : 0);
    const pw = pawukon(birthJdn);
    const next = otonanDates(birthJdn, isoToJdn(today), 6);
    result = `<section><h2>Otonan untuk kelahiran ${esc(idDate(lahir))}${beforeSunrise ? " (sebelum matahari terbit)" : ""}</h2><p class="big">${esc(pw.saptawara)} ${esc(pw.pancawara)} ${esc(pw.wuku.name)}</p>
<table><tbody>${next.map((j, i) => `<tr><td>${i === 0 ? "Berikutnya" : ""}</td><td><a href="${BP}/${jdnToIso(j)}">${esc(idDate(jdnToIso(j)))}</a></td><td>umur ${Math.round((j - birthJdn) / 210)} oton</td></tr>`).join("")}</tbody></table></section>`;
  }
  const isResult = Boolean(lahir);
  return {
    status: 200, maxAge: isResult ? 3600 : 86400, indexable: !isResult,
    html: page({
      site: ctx.site, path: `${BP}/otonan`, lang: "id", title: "Kalkulator otonan Bali — hitung hari otonan setiap 210 hari",
      description: "Hitung otonan (hari kelahiran menurut Pawukon Bali) dari tanggal lahir: saptawara, pancawara dan wuku, serta tanggal otonan berikutnya.",
      h1: "Kalkulator otonan", sub: "Otonan berulang setiap 210 hari pada saptawara, pancawara dan wuku yang sama.", crumbs: [{ href: BP, label: "Kalender Bali" }, { href: `${BP}/otonan`, label: "Otonan" }],
      indexable: !isResult, body: `<section>${otonanForm()}</section>${result}`, footer: BALI_NOTE,
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
<section><h2>Semua wuku</h2><p>${WUKU.map((x, i) => `<a class="chip" href="${BP}/wuku/${slug(x)}">${i + 1}. ${esc(x)}</a>`).join(" ")}</p></section>`, footer: BALI_NOTE,
    }),
  };
}

export function baliRoute(ctx: Ctx, rest: string[]): Rendered | null {
  if (!rest.length) return baliToday(ctx);
  if (rest.length === 1 && rest[0] === "otonan") return otonan(ctx);
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
  if (!parseIso(iso) || !inRange(iso)) return null;
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
  return parseIso(lahir) && inRange(lahir) ? { status: 302, location: `${WP}/${lahir}` } : { status: 302, location: WP };
}

function jodoh(ctx: Ctx): Rendered {
  const a = ctx.url.searchParams.get("a") || "", b = ctx.url.searchParams.get("b") || "";
  let result = "";
  if (parseIso(a) && parseIso(b) && inRange(a) && inRange(b)) {
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

export function baliUrls(now: Date): string[] {
  const out = [BP, `${BP}/otonan`, ...WUKU.map((w) => `${BP}/wuku/${slug(w)}`)];
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
