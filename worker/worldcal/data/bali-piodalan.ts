import { pawukon } from "../engines/pawukon";

export type PawukonPiodalanRule = {
  type: "pawukon";
  saptawara: string;
  pancawara: string;
  wuku: string;
};

export type SasihPiodalanRule = {
  type: "sasih";
  lunar_day: "Purnama" | "Tilem";
  sasih: string;
};

export type PiodalanRecord = {
  slug: string;
  name: string;
  locality: string;
  rule: PawukonPiodalanRule | SasihPiodalanRule;
  source: { authority: string; url: string; published_date?: string; status: "official" | "published" };
  known_occurrences?: string[];
  note?: string;
};

/**
 * Curated registry only: every row has a government/Kemenag/legal source.
 * Pawukon rules may be projected deterministically. Sasih rules must not be
 * projected to a Gregorian date unless that year's published Sasih table exists.
 */
export const BALI_PIODALAN: PiodalanRecord[] = [
  {
    slug: "pura-luhur-pucak-padang-dawa",
    name: "Pura Luhur Pucak Padang Dawa",
    locality: "Tabanan, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Kliwon", wuku: "Pahang" },
    source: {
      authority: "Pemerintah Provinsi Bali",
      url: "https://www.baliprov.go.id/web/hadiri-pujawali-pura-luhur-pucak-padang-dawa-tabanan-gubernur-koster-mohon-keselamatan-keharmonisan-kesejahteraan-warga-bali-dan-alam-semesta",
      status: "official",
    },
    note: "The official article describes the piodalan nadi as Buda Kliwon Pahang (Pegat Uwakan).",
  },
  {
    slug: "pura-swagina-bapenda-bali",
    name: "Pura Swagina Bapenda Provinsi Bali",
    locality: "Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Wage", wuku: "Klawu" },
    source: {
      authority: "Badan Pendapatan Daerah Provinsi Bali",
      url: "https://bapenda.baliprov.go.id/pujawali-di-pura-swagina-badan-pendapatan-daerah-provinsi-bali/",
      published_date: "2024-06-26",
      status: "official",
    },
    known_occurrences: ["2024-06-26"],
  },
  {
    slug: "pura-luhur-batukaru",
    name: "Pura Luhur Batukaru",
    locality: "Penebel, Tabanan, Bali",
    rule: { type: "pawukon", saptawara: "Wraspati", pancawara: "Umanis", wuku: "Dungulan" },
    source: {
      authority: "Bali Media Center, Pemerintah Provinsi Bali",
      url: "https://bmc.baliprov.go.id/news/title/pj-gubernur-bali-smmahendra-jaya-hadiri-piodalan-di-pura-batukaru",
      published_date: "2024-03-01",
      status: "official",
    },
    known_occurrences: ["2024-02-29"],
  },
  {
    slug: "pura-tirta-ganapati-rsj-manah-shanti",
    name: "Pura Tirta Ganapati RSJ Manah Shanti Mahottama",
    locality: "Bali",
    rule: { type: "pawukon", saptawara: "Anggara", pancawara: "Kliwon", wuku: "Prangbakat" },
    source: {
      authority: "Rumah Sakit Jiwa Manah Shanti Mahottama, Pemerintah Provinsi Bali",
      url: "https://rsjiwa.baliprov.go.id/piodalan-ring-pura-tirta-ganapati-rumah-sakit-jiwa-manah-shanti-mahottama",
      published_date: "2026-09-15",
      status: "official",
    },
    known_occurrences: ["2026-09-15"],
  },
  {
    slug: "pura-jagatnatha-jembrana",
    name: "Pura Jagatnatha Jembrana",
    locality: "Jembrana, Bali",
    rule: { type: "sasih", lunar_day: "Purnama", sasih: "Karo" },
    source: {
      authority: "Kantor Kementerian Agama Kabupaten Jembrana",
      url: "https://bali.kemenag.go.id/jembrana/berita/10672/ngayah-ring-piodalan-pura-jagatnatha-jembrana",
      published_date: "2019-09-05",
      status: "official",
    },
    known_occurrences: ["2019-08-15"],
  },
  {
    slug: "pura-bpk-perwakilan-bali",
    name: "Pura BPK Perwakilan Provinsi Bali",
    locality: "Denpasar, Bali",
    rule: { type: "sasih", lunar_day: "Purnama", sasih: "Kaulu" },
    source: {
      authority: "BPK RI Perwakilan Provinsi Bali",
      url: "https://bali.bpk.go.id/berita-utama/bpk-perwakilan-provinsi-bali-laksanakan-piodalan-pada-purnama-kaulu/",
      published_date: "2018-02-01",
      status: "official",
    },
    known_occurrences: ["2018-01-31", "2019-01-20", "2023-02-05", "2024-01-25"],
  },
  {
    slug: "pura-dalem-purwa-penglatan",
    name: "Pura Dalem Purwa, Desa Adat Penglatan",
    locality: "Penglatan, Buleleng, Bali",
    rule: { type: "sasih", lunar_day: "Purnama", sasih: "Kalima" },
    source: {
      authority: "Dinas Pemajuan Masyarakat Adat Provinsi Bali",
      url: "https://dpma.baliprov.go.id/wp-content/uploads/2022/03/37-PROFIL-DESA-ADAT-PENGLATAN.pdf",
      status: "official",
    },
  },
];

export function matchesPiodalanRule(jdn: number, rule: PawukonPiodalanRule) {
  const p = pawukon(jdn);
  return p.saptawara === rule.saptawara && p.pancawara === rule.pancawara && p.wuku.name === rule.wuku;
}

export function nextPawukonPiodalan(rule: PawukonPiodalanRule, fromJdn: number, count = 6) {
  const out: number[] = [];
  let j = fromJdn;
  for (let scanned = 0; scanned < 210 * Math.max(1, count) + 210 && out.length < count; scanned++, j++) {
    if (matchesPiodalanRule(j, rule)) out.push(j);
  }
  return out;
}
