/**
 * Balinese Pawukon (210-day cycle) and Javanese weton.
 *
 * Formulas from Reingold & Dershowitz, Calendrical Calculations (calendar.l, Apache-2.0):
 *   day = (JDN − 146) mod 210, day 0 = Redite Paing Sinta (Banyu Pinaruh).
 * Verified against the R&D/hexdocs test vector (2001-09-11) and published 2026 Balinese holiday lists
 * (detikBali, Katadata, Liputan6) — see docs/worldcal/RESEARCH.md.
 */
import { amod, gregorianToJdn, jdnToGregorian, mod } from "../dates";

export const PAWUKON_EPOCH_OFFSET = 146;

export const WUKU = [
  "Sinta", "Landep", "Ukir", "Kulantir", "Tolu", "Gumbreg", "Wariga", "Warigadean", "Julungwangi", "Sungsang",
  "Dungulan", "Kuningan", "Langkir", "Medangsia", "Pujut", "Pahang", "Krulut", "Merakih", "Tambir", "Medangkungan",
  "Matal", "Uye", "Menail", "Prangbakat", "Bala", "Ugu", "Wayang", "Klawu", "Dukut", "Watugunung",
] as const;

export const DWIWARA = ["Menga", "Pepet"] as const;
export const TRIWARA = ["Pasah", "Beteng", "Kajeng"] as const;
export const CATURWARA = ["Sri", "Laba", "Jaya", "Menala"] as const;
export const PANCAWARA = ["Umanis", "Paing", "Pon", "Wage", "Kliwon"] as const;
export const SADWARA = ["Tungleh", "Aryang", "Urukung", "Paniron", "Was", "Maulu"] as const;
export const SAPTAWARA = ["Redite", "Soma", "Anggara", "Buda", "Wraspati", "Sukra", "Saniscara"] as const;
export const ASTAWARA = ["Sri", "Indra", "Guru", "Yama", "Ludra", "Brahma", "Kala", "Uma"] as const;
export const SANGAWARA = ["Dangu", "Jangur", "Gigis", "Nohan", "Ogan", "Erangan", "Urungan", "Tulus", "Dadi"] as const;
export const DASAWARA = ["Pandita", "Pati", "Suka", "Duka", "Sri", "Manuh", "Manusa", "Raja", "Dewa", "Raksasa"] as const;

/** Urip / neptu values (identical in Bali and Java). */
export const URIP_PANCA = [5, 9, 7, 4, 8]; // Umanis/Legi, Paing/Pahing, Pon, Wage, Kliwon
export const URIP_SAPTA = [5, 4, 3, 7, 8, 6, 9]; // Redite/Minggu … Saniscara/Sabtu

export type Pawukon = {
  day: number; // 0..209
  wuku: { index: number; name: (typeof WUKU)[number] };
  ekawara: "Luang" | null;
  dwiwara: (typeof DWIWARA)[number];
  triwara: (typeof TRIWARA)[number];
  caturwara: (typeof CATURWARA)[number];
  pancawara: (typeof PANCAWARA)[number];
  sadwara: (typeof SADWARA)[number];
  saptawara: (typeof SAPTAWARA)[number];
  astawara: (typeof ASTAWARA)[number];
  sangawara: (typeof SANGAWARA)[number];
  dasawara: (typeof DASAWARA)[number];
  urip: number; // pancawara urip + saptawara urip
};

export const pawukonDay = (jdn: number) => mod(jdn - PAWUKON_EPOCH_OFFSET, 210);

export function pawukon(jdn: number): Pawukon {
  const day = pawukonDay(jdn);
  const sapta = 1 + mod(day, 7);
  const panca = amod(day + 2, 5);
  const asta = 1 + mod(Math.max(6, 4 + mod(day - 70, 210)), 8);
  const catur = amod(asta, 4);
  const sanga = 1 + mod(Math.max(0, day - 3), 9);
  const dasa = mod(1 + URIP_PANCA[panca - 1] + URIP_SAPTA[sapta - 1], 10);
  return {
    day,
    wuku: { index: 1 + Math.floor(day / 7), name: WUKU[Math.floor(day / 7)] },
    ekawara: dasa % 2 === 0 ? "Luang" : null,
    dwiwara: DWIWARA[amod(dasa, 2) - 1],
    triwara: TRIWARA[mod(day, 3)],
    caturwara: CATURWARA[catur - 1],
    pancawara: PANCAWARA[panca - 1],
    sadwara: SADWARA[mod(day, 6)],
    saptawara: SAPTAWARA[sapta - 1],
    astawara: ASTAWARA[asta - 1],
    sangawara: SANGAWARA[sanga - 1],
    dasawara: DASAWARA[dasa],
    urip: URIP_PANCA[panca - 1] + URIP_SAPTA[sapta - 1],
  };
}

/** Pawukon-day holidays (recur every 210 days). */
export const PAWUKON_HOLIDAYS: { day: number; key: string; id: string; en: string }[] = [
  { day: 0, key: "banyu-pinaruh", id: "Banyu Pinaruh", en: "Banyu Pinaruh (purification after Saraswati)" },
  { day: 3, key: "pagerwesi", id: "Pagerwesi", en: "Pagerwesi" },
  { day: 70, key: "penyekeban", id: "Penyekeban Galungan", en: "Penyekeban (Galungan preparations begin)" },
  { day: 71, key: "penyajaan", id: "Penyajaan Galungan", en: "Penyajaan (Galungan cakes)" },
  { day: 72, key: "penampahan", id: "Penampahan Galungan", en: "Penampahan (eve of Galungan)" },
  { day: 73, key: "galungan", id: "Hari Raya Galungan", en: "Galungan" },
  { day: 74, key: "umanis-galungan", id: "Umanis Galungan", en: "Umanis Galungan" },
  { day: 82, key: "penampahan-kuningan", id: "Penampahan Kuningan", en: "Eve of Kuningan" },
  { day: 83, key: "kuningan", id: "Hari Raya Kuningan", en: "Kuningan" },
  { day: 209, key: "saraswati", id: "Hari Raya Saraswati", en: "Saraswati (day of knowledge)" },
];
export const TUMPEK = [
  { day: 13, id: "Tumpek Landep" }, { day: 48, id: "Tumpek Wariga (Uduh/Bubuh)" }, { day: 83, id: "Tumpek Kuningan" },
  { day: 118, id: "Tumpek Krulut" }, { day: 153, id: "Tumpek Kandang (Uye)" }, { day: 188, id: "Tumpek Wayang" },
];

export function pawukonEvents(jdn: number): string[] {
  const p = pawukon(jdn);
  const out: string[] = [];
  for (const h of PAWUKON_HOLIDAYS) if (h.day === p.day) out.push(h.id);
  for (const t of TUMPEK) if (t.day === p.day && !out.includes(t.id)) out.push(t.id);
  if (p.triwara === "Kajeng" && p.pancawara === "Kliwon") out.push("Kajeng Kliwon");
  if (p.saptawara === "Anggara" && p.pancawara === "Kliwon") out.push("Anggara Kasih");
  if (p.saptawara === "Buda" && p.pancawara === "Wage") out.push("Buda Cemeng");
  return out;
}

/** Holidays (by Gregorian date) in Gregorian year gy. */
export function pawukonHolidaysInYear(gy: number): { jdn: number; names: string[] }[] {
  const out: { jdn: number; names: string[] }[] = [];
  for (let j = gregorianToJdn(gy, 1, 1), end = gregorianToJdn(gy, 12, 31); j <= end; j++) {
    const names = pawukonEvents(j).filter((n) => n !== "Kajeng Kliwon" && n !== "Anggara Kasih" && n !== "Buda Cemeng");
    if (names.length) out.push({ jdn: j, names });
  }
  return out;
}

/** Next otonan dates (every 210 days from birth). */
export function otonanDates(birthJdn: number, fromJdn: number, count = 6): number[] {
  const out: number[] = [];
  let k = Math.max(1, Math.ceil((fromJdn - birthJdn) / 210));
  while (out.length < count) out.push(birthJdn + 210 * k++);
  return out;
}

// ---------- Javanese weton ----------

export const PASARAN = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"] as const;
export const HARI_JAWA = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
export const NEPTU_HARI = [5, 4, 3, 7, 8, 6, 9];
export const NEPTU_PASARAN = [5, 9, 7, 4, 8];

export type Weton = { hari: (typeof HARI_JAWA)[number]; pasaran: (typeof PASARAN)[number]; neptu: number; wuku: (typeof WUKU)[number] };

/** Weton of a civil date. bornAfterMaghrib → the Javanese day has already turned, so use the next day. */
export function weton(jdn: number, bornAfterMaghrib = false): Weton {
  const j = bornAfterMaghrib ? jdn + 1 : jdn;
  const p = pawukon(j);
  const hariIdx = SAPTAWARA.indexOf(p.saptawara);
  const pasIdx = PANCAWARA.indexOf(p.pancawara);
  return { hari: HARI_JAWA[hariIdx], pasaran: PASARAN[pasIdx], neptu: NEPTU_HARI[hariIdx] + NEPTU_PASARAN[pasIdx], wuku: p.wuku.name };
}

/** Weton jodoh (8-step, primbon Jawa): (total neptu − 1) mod 8. Only this table is shipped; other methods disagree between sources. */
export const JODOH = [
  { key: "pegat", name: "Pegat", meaning: "menurut primbon: rawan perpisahan dan masalah" },
  { key: "ratu", name: "Ratu", meaning: "menurut primbon: dihormati dan disegani" },
  { key: "jodoh", name: "Jodoh", meaning: "menurut primbon: cocok dan saling menerima" },
  { key: "topo", name: "Topo", meaning: "menurut primbon: susah di awal, bahagia kemudian" },
  { key: "tinari", name: "Tinari", meaning: "menurut primbon: mudah rezeki dan bahagia" },
  { key: "padu", name: "Padu", meaning: "menurut primbon: sering berselisih tetapi tidak sampai berpisah" },
  { key: "sujanan", name: "Sujanan", meaning: "menurut primbon: rawan cemburu dan godaan" },
  { key: "pesthi", name: "Pesthi", meaning: "menurut primbon: rukun, tenteram dan langgeng" },
] as const;
export const wetonJodoh = (neptuA: number, neptuB: number) => ({ total: neptuA + neptuB, ...JODOH[mod(neptuA + neptuB - 1, 8)] });

export const jdnToIsoDate = (jdn: number) => {
  const g = jdnToGregorian(jdn);
  return `${g.y}-${String(g.m).padStart(2, "0")}-${String(g.d).padStart(2, "0")}`;
};
