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
