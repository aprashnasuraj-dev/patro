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
export const PAWUKON_CYCLE_DAYS = 210;
export const WUKU_DAYS = 7;

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
export const SAPTAWARA_AKSARA = {
  Redite: "ᬭᬤᬶᬢᬾ",
  Soma: "ᬲᭀᬫ",
  Anggara: "ᬅᬗ᭄ᬕᬭ",
  Buda: "ᬩᬸᬤ᭄ᬥ",
  Wraspati: "ᬯᬺᬳᬲ᭄ᬧᬢᬶ",
  Sukra: "ᬰᬸᬓ᭄ᬭ",
  Saniscara: "ᬰᬦᬶᬰ᭄ᬘᬭ",
} as const;
export const ASTAWARA = ["Sri", "Indra", "Guru", "Yama", "Ludra", "Brahma", "Kala", "Uma"] as const;
export const SANGAWARA = ["Dangu", "Jangur", "Gigis", "Nohan", "Ogan", "Erangan", "Urungan", "Tulus", "Dadi"] as const;
export const DASAWARA = ["Pandita", "Pati", "Suka", "Duka", "Sri", "Manuh", "Manusa", "Raja", "Dewa", "Raksasa"] as const;
export const INGKEL = ["Wong", "Sato", "Mina", "Manuk", "Taru", "Buku"] as const;
export const JEJEPAN = ["Mina", "Taru", "Sato", "Patra", "Wong", "Paksi"] as const;

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
  ingkel: (typeof INGKEL)[number]; // weekly pandakan cycle, derived from Wuku number mod 6
  jejepan: (typeof JEJEPAN)[number]; // daily 6-day paringkelan cycle
};

export type PawukonDay = Pawukon & {
  cycleDay: number; // 1..210
  dayInWuku: number; // 1..7
  combination: string; // Saptawara + Pancawara + Wuku
};

export type PalelintanganCell = {
  saptawara: (typeof SAPTAWARA)[number];
  pancawara: (typeof PANCAWARA)[number];
  saptawaraUrip: number;
  pancawaraUrip: number;
  urip: number;
  lintang: string;
  patron: string;
  key: string;
};

export const PALELINTANGAN_LINTANG = [
  ["Kala Sungsang", "Kelapa Sunda", "Kuda", "Tangis", "Sangkal Tikel", "Banyak Angrem", "Depat"],
  ["Gajah", "Dupa", "Yuyu", "Gajahmina", "Salah Ukur", "Bubu Bosor", "Ru"],
  ["Patrem", "Hulanjar", "Asu", "Lumbung", "Bade", "Prau Pegat", "Srengenge"],
  ["Tenggala", "Lembu", "Perahu Sarat", "Kartika", "Kumba", "Rebut Utang", "Puwuh Atarung"],
  ["Laweyan", "Pedati Suung", "Sidamalung", "Atiwa-tiwa", "Naga", "Udang", "Larung Paglangan"],
] as const;

export const PALELINTANGAN_PATRON = {
  Redite: "Bhatara Indra",
  Soma: "Bhatara Sri",
  Anggara: "Bhatara Brahma",
  Buda: "Bhatara Wisnu",
  Wraspati: "Bhatara Guru / Sang Hyang Siwa",
  Sukra: "Bhatari Uma",
  Saniscara: "Bhatari Durga",
} as const;

/** Canonical 0..209 position of a civil JDN inside the Pawukon cycle. */
export const pawukonDay = (jdn: number) => mod(jdn - PAWUKON_EPOCH_OFFSET, PAWUKON_CYCLE_DAYS);

/**
 * Resolve a canonical Pawukon position without going through Gregorian time.
 *
 * Caturwara follows Astawara rather than day%4, and Astawara/Sangawara keep
 * the traditional exceptional/repeated positions encoded by the
 * Reingold-Dershowitz formulas. This function is therefore the single source
 * for every Tika cell, date page, holiday rule and Otonan calculation.
 */
export function pawukonFromDay(dayInput: number): PawukonDay {
  const day = mod(dayInput, PAWUKON_CYCLE_DAYS);
  const sapta = 1 + mod(day, 7);
  const panca = amod(day + 2, 5);
  const asta = 1 + mod(Math.max(6, 4 + mod(day - 70, PAWUKON_CYCLE_DAYS)), 8);
  const catur = amod(asta, 4);
  const sanga = 1 + mod(Math.max(0, day - 3), 9);
  // R&D 12.9 yields 0..9; name position 0 represents Raksasa (10), while 1..9 map normally.
  const dasa = mod(1 + URIP_PANCA[panca - 1] + URIP_SAPTA[sapta - 1], 10);
  const saptawara = SAPTAWARA[sapta - 1];
  const pancawara = PANCAWARA[panca - 1];
  const wuku = { index: 1 + Math.floor(day / WUKU_DAYS), name: WUKU[Math.floor(day / WUKU_DAYS)] };
  return {
    day,
    cycleDay: day + 1,
    dayInWuku: 1 + mod(day, WUKU_DAYS),
    wuku,
    ekawara: dasa % 2 === 0 ? "Luang" : null,
    dwiwara: DWIWARA[amod(dasa, 2) - 1],
    triwara: TRIWARA[mod(day, 3)],
    caturwara: CATURWARA[catur - 1],
    pancawara,
    sadwara: SADWARA[mod(day, 6)],
    saptawara,
    astawara: ASTAWARA[asta - 1],
    sangawara: SANGAWARA[sanga - 1],
    dasawara: DASAWARA[amod(dasa, 10) - 1],
    urip: URIP_PANCA[panca - 1] + URIP_SAPTA[sapta - 1],
    ingkel: INGKEL[(wuku.index - 1) % INGKEL.length],
    jejepan: JEJEPAN[day % JEJEPAN.length],
    combination: `${saptawara} ${pancawara} ${wuku.name}`,
  };
}

export function pawukon(jdn: number): PawukonDay {
  return pawukonFromDay(pawukonDay(jdn));
}

/** Full canonical 210-day cycle, used by the Tika UI and whole-cycle tests. */
export function pawukonCycle(): PawukonDay[] {
  return Array.from({ length: PAWUKON_CYCLE_DAYS }, (_, day) => pawukonFromDay(day));
}

/**
 * Structural Palelintangan matrix: 7 Saptawara × 5 Pancawara = 35 intersections.
 *
 * Symbolic deity/animal/tree/wayang interpretations are deliberately not
 * invented here; those belong in a separately sourced cultural dataset.
 */
export function palelintanganMatrix(): PalelintanganCell[] {
  return SAPTAWARA.flatMap((saptawara, si) =>
    PANCAWARA.map((pancawara, pi) => ({
      saptawara,
      pancawara,
      saptawaraUrip: URIP_SAPTA[si],
      pancawaraUrip: URIP_PANCA[pi],
      urip: URIP_SAPTA[si] + URIP_PANCA[pi],
      lintang: PALELINTANGAN_LINTANG[pi][si],
      patron: PALELINTANGAN_PATRON[saptawara],
      key: `${saptawara.toLowerCase()}-${pancawara.toLowerCase()}`,
    })),
  );
}

/** Pawukon-day holidays (recur every 210 days). */
export const PAWUKON_HOLIDAYS: { day: number; key: string; id: string; en: string }[] = [
  { day: 0, key: "banyu-pinaruh", id: "Banyu Pinaruh", en: "Banyu Pinaruh (purification after Saraswati)" },
  { day: 1, key: "soma-ribek", id: "Soma Ribek", en: "Soma Ribek" },
  { day: 2, key: "sabuh-mas", id: "Sabuh Mas", en: "Sabuh Mas" },
  { day: 3, key: "pagerwesi", id: "Pagerwesi", en: "Pagerwesi" },
  { day: 67, key: "sugihan-jawa", id: "Sugihan Jawa", en: "Sugihan Jawa" },
  { day: 68, key: "sugihan-bali", id: "Sugihan Bali", en: "Sugihan Bali" },
  { day: 70, key: "penyekeban", id: "Penyekeban Galungan", en: "Penyekeban (Galungan preparations begin)" },
  { day: 71, key: "penyajaan", id: "Penyajaan Galungan", en: "Penyajaan (Galungan cakes)" },
  { day: 72, key: "penampahan", id: "Penampahan Galungan", en: "Penampahan (eve of Galungan)" },
  { day: 73, key: "galungan", id: "Hari Raya Galungan", en: "Galungan" },
  { day: 74, key: "umanis-galungan", id: "Manis Galungan", en: "Manis Galungan" },
  { day: 76, key: "pemaridan-guru", id: "Pemaridan Guru", en: "Pemaridan Guru" },
  { day: 77, key: "ulihan", id: "Ulihan", en: "Ulihan" },
  { day: 78, key: "pemacekan-agung", id: "Pemacekan Agung", en: "Pemacekan Agung" },
  { day: 80, key: "buda-pahing-kuningan", id: "Buda Pahing Kuningan", en: "Buda Pahing Kuningan" },
  { day: 82, key: "penampahan-kuningan", id: "Penampahan Kuningan", en: "Eve of Kuningan" },
  { day: 83, key: "kuningan", id: "Hari Raya Kuningan", en: "Kuningan" },
  { day: 108, key: "pegat-wakan", id: "Pegat Wakan", en: "Pegat Wakan (end of the Galungan–Kuningan sequence)" },
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
