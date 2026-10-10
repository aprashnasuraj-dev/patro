/**
 * Balinese Saka calendar facts that must come from published sources, not calculation
 * (pangalantaka arithmetic and nampih placement are set by convention / PHDI decisions).
 * Every row cites its source; years without a published table show "not yet published".
 */
export const NYEPI: Record<number, { date: string; status: "official" | "published" | "provisional"; source: string }> = {
  2025: { date: "2025-03-29", status: "official", source: "SKB 3 Menteri 2025" },
  2026: { date: "2026-03-19", status: "published", source: "detikBali Kalender Bali 2026" },
  2027: { date: "2027-03-08", status: "official", source: "SKB 3 Menteri 2027 (signed 15 Sep 2026)" },
  2028: { date: "2028-03-26", status: "provisional", source: "Wikipedia (not yet decreed)" },
  2029: { date: "2029-03-15", status: "provisional", source: "Wikipedia (not yet decreed)" },
  2030: { date: "2030-03-05", status: "provisional", source: "Wikipedia (not yet decreed)" },
};

/** Purnama (full moon) and Tilem (new moon) days as printed in the Kalender Bali. */
export const PURNAMA_TILEM: Record<number, { purnama: string[]; tilem: string[]; source: string }> = {
  2026: {
    purnama: ["2026-01-03", "2026-02-02", "2026-03-03", "2026-04-02", "2026-05-01", "2026-05-31", "2026-06-29", "2026-07-29", "2026-08-27", "2026-09-26", "2026-10-25", "2026-11-24", "2026-12-23"],
    tilem: ["2026-01-18", "2026-02-16", "2026-03-18", "2026-04-16", "2026-05-16", "2026-06-14", "2026-07-14", "2026-08-12", "2026-09-11", "2026-10-11", "2026-11-09", "2026-12-09"],
    source: "detikBali, Jadwal lengkap hari raya Hindu 2026 menurut Kalender Bali",
  },
  2027: {
    purnama: ["2027-01-22", "2027-02-20", "2027-03-22", "2027-04-20", "2027-05-20", "2027-06-19", "2027-07-18", "2027-08-17", "2027-09-15", "2027-10-15", "2027-11-13", "2027-12-13"],
    tilem: ["2027-01-07", "2027-02-06", "2027-03-07", "2027-04-06", "2027-05-05", "2027-06-04", "2027-07-03", "2027-08-02", "2027-08-31", "2027-09-30", "2027-10-29", "2027-11-28", "2027-12-28"],
    source: "Kalender Bali Digital (kalenderbali.org), Purnama-Tilem 2027; nampih sasih: Mala Jiyestha (20 May–4 Jun). Tilem Kesanga 7 Mar matches Nyepi 8 Mar in SKB 2027.",
  },
};

/** Other published Balinese Hindu days that are not Pawukon-derived. */
export const OTHER_BALI_DAYS: Record<number, { date: string; name: string; source: string }[]> = {
  2026: [{ date: "2026-01-17", name: "Siwaratri", source: "detikBali 2026" }],
};
