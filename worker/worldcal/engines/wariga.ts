/**
 * Source-transparent Balinese Dauh reference calculations.
 *
 * Primary source: Indonesia, Kementerian Pendidikan dan Kebudayaan,
 * Pendidikan Agama Hindu dan Budi Pekerti SMA/SMK Kelas X (2014),
 * ISBN 978-602-282-426-8, Padewasan/Dauh section.
 * https://repositori.kemendikdasmen.go.id/11632/1/Pendidikan%20Agama%20Hindu%20dan%20Budi%20Pekerti%20Kelas%20X.pdf
 *
 * These tables are educational/reference Wariga. They are not labelled as
 * annual official TIKA determinations and do not replace local religious advice.
 */
export const WARIGA_DAUH_SOURCE = {
  name: "Kemdikbud, Pendidikan Agama Hindu dan Budi Pekerti SMA/SMK Kelas X (2014)",
  isbn: "978-602-282-426-8",
  url: "https://repositori.kemendikdasmen.go.id/11632/1/Pendidikan%20Agama%20Hindu%20dan%20Budi%20Pekerti%20Kelas%20X.pdf",
  status: "published" as const,
};

export type DauhCode = "Kr" | "Ke" | "Pe" | "Pa" | "Su";
export type DauhQuality = "ayu" | "madya" | "ala";

export const DAUH_CODE: Record<DauhCode, { name: string; quality: DauhQuality }> = {
  Kr: { name: "Kerta", quality: "ayu" },
  Ke: { name: "Ketara", quality: "ayu" },
  Pe: { name: "Peta", quality: "madya" },
  Pa: { name: "Pati", quality: "ala" },
  Su: { name: "Sunia", quality: "ala" },
};

/** Columns are urip 7..18; rows are T1/p5 through T5/p1. */
const PANCA_DAUH: DauhCode[][] = [
  ["Kr","Kr","Pe","Pa","Su","Pa","Kr","Pe","Pa","Su","Pe","Kr"],
  ["Pa","Pa","Su","Ke","Kr","Ke","Pa","Pa","Ke","Kr","Ke","Pa"],
  ["Su","Pe","Kr","Pe","Pa","Pe","Ke","Kr","Pe","Ke","Su","Pe"],
  ["Ke","Ke","Pa","Su","Ke","Su","Pe","Su","Kr","Pe","Pa","Ke"],
  ["Pe","Su","Ke","Kr","Pa","Kr","Su","Ke","Su","Pa","Kr","Su"],
];

/** Rows Dauh I..VIII; columns Redite..Saniscara. */
const ASTA_DAUH: DauhQuality[][] = [
  ["ala","ala","ayu","ayu","ayu","ayu","ayu"],
  ["ayu","ala","ala","ayu","ayu","ala","ayu"],
  ["ayu","ala","ala","ala","ala","ayu","ayu"],
  ["ayu","ala","ayu","ala","ala","ayu","ala"],
  ["ayu","ala","ala","ayu","ayu","ayu","ayu"],
  ["ayu","ala","ayu","ala","ayu","ala","ayu"],
  ["ala","ala","ayu","ayu","ala","ala","ala"],
  ["ala","ala","ala","ala","ala","ayu","ala"],
];

export const SAPTA_INDEX = {
  Redite: 0, Soma: 1, Anggara: 2, Buda: 3, Wraspati: 4, Sukra: 5, Saniscara: 6,
} as const;

export function astaDauh(saptawara: keyof typeof SAPTA_INDEX) {
  const col = SAPTA_INDEX[saptawara];
  return ASTA_DAUH.map((quality, i) => ({ dauh: i + 1, quality: quality[col] }));
}

export function pancaDauh(urip: number, phase: "penanggal" | "pangelong") {
  if (!Number.isInteger(urip) || urip < 7 || urip > 18) throw new RangeError("Panca Dauh urip must be 7..18");
  const col = urip - 7;
  return PANCA_DAUH.map((row, i) => {
    const sourceSlot = phase === "pangelong" ? 4 - i : i;
    const code = PANCA_DAUH[sourceSlot][col];
    return { dauh: i + 1, source_slot: sourceSlot + 1, code, ...DAUH_CODE[code] };
  });
}

export function equalDauhWindows(startMinutes: number, endMinutes: number, count: 5 | 8) {
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) throw new TypeError("Dauh boundaries must be finite minutes");
  let end = endMinutes;
  while (end <= startMinutes) end += 1440;
  const size = (end - startMinutes) / count;
  return Array.from({ length: count }, (_, i) => ({
    dauh: i + 1,
    start_minute: startMinutes + size * i,
    end_minute: startMinutes + size * (i + 1),
  }));
}

export function formatDauhMinute(value: number) {
  const dayOffset = Math.floor(value / 1440);
  const m = ((Math.round(value) % 1440) + 1440) % 1440;
  return {
    time: String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"),
    day_offset: dayOffset,
  };
}


export const SASIH_NAMES = ["Kasa","Karo","Ketiga","Kapat","Kalima","Kanem","Kapitu","Kawulu","Kasanga","Kadasa","Jyestha","Sadha"] as const;

export const WARIGA_SASIH_SOURCE = {
  name: "Kemdikbud, Pendidikan Agama Hindu dan Budi Pekerti SMA/SMK Kelas X, Edisi Revisi 2017",
  isbn: "978-602-427-067-4",
  url: "https://buku.kemendikdasmen.go.id/katalog/Pendidikan-Agama-Hindu-Dan-Budi-Pekerti-Kelas-X",
  status: "published" as const,
};

type SasihActivity = "dewa" | "pitra" | "manusa" | "bhuta" | "wiwaha";
type SasihMark = "ayu" | "not_marked";

/** Exact Ala-Ayuning Sasih matrix from the revised government textbook. */
const SASIH_ACTIVITY_MATRIX: Record<number, Record<SasihActivity, SasihMark>> = {
  1:  { dewa:"ayu",        pitra:"ayu",        manusa:"ayu",        bhuta:"not_marked", wiwaha:"not_marked" },
  2:  { dewa:"not_marked", pitra:"ayu",        manusa:"not_marked", bhuta:"not_marked", wiwaha:"not_marked" },
  3:  { dewa:"not_marked", pitra:"ayu",        manusa:"not_marked", bhuta:"ayu",        wiwaha:"not_marked" },
  4:  { dewa:"ayu",        pitra:"not_marked", manusa:"ayu",        bhuta:"not_marked", wiwaha:"ayu" },
  5:  { dewa:"ayu",        pitra:"ayu",        manusa:"ayu",        bhuta:"not_marked", wiwaha:"ayu" },
  6:  { dewa:"not_marked", pitra:"not_marked", manusa:"not_marked", bhuta:"not_marked", wiwaha:"not_marked" },
  7:  { dewa:"ayu",        pitra:"ayu",        manusa:"ayu",        bhuta:"not_marked", wiwaha:"ayu" },
  8:  { dewa:"not_marked", pitra:"not_marked", manusa:"not_marked", bhuta:"ayu",        wiwaha:"not_marked" },
  9:  { dewa:"not_marked", pitra:"not_marked", manusa:"not_marked", bhuta:"ayu",        wiwaha:"not_marked" },
  10: { dewa:"ayu",        pitra:"ayu",        manusa:"ayu",        bhuta:"not_marked", wiwaha:"ayu" },
  11: { dewa:"not_marked", pitra:"not_marked", manusa:"not_marked", bhuta:"not_marked", wiwaha:"not_marked" },
  12: { dewa:"not_marked", pitra:"not_marked", manusa:"not_marked", bhuta:"not_marked", wiwaha:"not_marked" },
};

export const YAJNA_SASIH_REFERENCE = {
  dewa: [1, 4, 5, 7, 10],
  pitra: [1, 2, 3, 5, 7, 10],
  manusa: [1, 4, 5, 7, 10],
  bhuta: [3, 8, 9],
  wiwaha: [4, 5, 7, 10],
  memukur: [10],
} as const;

export const PEWIWAHAN_SAPTAWARA = {
  Redite: { quality: "ala" as const, source_summary: "Buruk" },
  Soma: { quality: "ayu" as const, source_summary: "Baik" },
  Anggara: { quality: "ala" as const, source_summary: "Buruk" },
  Buda: { quality: "ayu" as const, source_summary: "Amat baik" },
  Wraspati: { quality: "ayu" as const, source_summary: "Baik" },
  Sukra: { quality: "ayu" as const, source_summary: "Baik" },
  Saniscara: { quality: "ala" as const, source_summary: "Sangat buruk" },
} as const;

/**
 * Exact Mertha Yoga combinations printed by the Kemdikbud textbook.
 * The source spells one Wuku "Taulu"; Pawukon's canonical list uses "Tolu".
 * We preserve that fact in source_wuku instead of silently hiding the variant.
 */
export const MERTHA_YOGA = [
  { saptawara: "Soma", pancawara: "Kliwon", wuku: "Landep", source_wuku: "Landep" },
  { saptawara: "Soma", pancawara: "Umanis", wuku: "Tolu", source_wuku: "Taulu" },
  { saptawara: "Soma", pancawara: "Wage", wuku: "Medangsia", source_wuku: "Medangsia" },
  { saptawara: "Soma", pancawara: "Umanis", wuku: "Medangkungan", source_wuku: "Medangkungan" },
  { saptawara: "Soma", pancawara: "Paing", wuku: "Menail", source_wuku: "Menail" },
  { saptawara: "Soma", pancawara: "Pon", wuku: "Ugu", source_wuku: "Ugu" },
  { saptawara: "Soma", pancawara: "Wage", wuku: "Dukut", source_wuku: "Dukut" },
] as const;

export function merthaYoga(p: { saptawara: string; pancawara: string; wuku: { name: string } | string }) {
  const wuku = typeof p.wuku === "string" ? p.wuku : p.wuku.name;
  return MERTHA_YOGA.some((x) => x.saptawara === p.saptawara && x.pancawara === p.pancawara && x.wuku === wuku);
}

export function pitraImmediateRestrictions(input: {
  triwara: string;
  saptawara: string;
  pancawara: string;
  events?: string[];
  is_tilem?: boolean;
  is_purwani_purnama?: boolean;
}) {
  const reasons: string[] = [];
  if (input.triwara === "Pasah") reasons.push("Pasah");
  if (input.saptawara === "Anggara" && input.pancawara === "Kliwon") reasons.push("Anggara Kasih");
  if (input.saptawara === "Buda" && input.pancawara === "Wage") reasons.push("Buda Wage");
  if (input.saptawara === "Buda" && input.pancawara === "Kliwon") reasons.push("Buda Kliwon");
  if ((input.events || []).some((x) => /^Tumpek\b/.test(x))) reasons.push("Tumpek");
  if (input.is_purwani_purnama) reasons.push("Purwani Purnama");
  if (input.is_tilem) reasons.push("Tilem");
  return { restricted: reasons.length > 0, reasons };
}

export function sasihReference(sasih: number) {
  if (!Number.isInteger(sasih) || sasih < 1 || sasih > 12) throw new RangeError("sasih must be 1..12");
  const row = SASIH_ACTIVITY_MATRIX[sasih];
  return {
    sasih,
    name: SASIH_NAMES[sasih - 1],
    activities: { ...row },
    dewa_yajna: row.dewa === "ayu",
    pitra_yajna: row.pitra === "ayu",
    manusa_yajna: row.manusa === "ayu",
    bhuta_yajna: row.bhuta === "ayu",
    wiwaha_yajna: row.wiwaha === "ayu",
    memukur: sasih === 10,
    source: WARIGA_SASIH_SOURCE,
  };
}
