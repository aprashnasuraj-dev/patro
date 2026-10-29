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

export type OccurrenceOnlyPiodalanRule = {
  type: "occurrence";
  date: string;
  rahina: string;
};

export type PiodalanRecord = {
  slug: string;
  name: string;
  locality: string;
  rule: PawukonPiodalanRule | SasihPiodalanRule | OccurrenceOnlyPiodalanRule;
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

  // Awig-Awig Desa Adat Denpasar — legal/customary record hosted by JIDHAT Bali.
  {
    slug: "pura-desa-bale-agung-desa-adat-denpasar",
    name: "Pura Desa / Bale Agung Desa Adat Denpasar",
    locality: "Wangaya Kelod, Denpasar, Bali",
    rule: { type: "pawukon", saptawara: "Anggara", pancawara: "Kliwon", wuku: "Tambir" },
    source: { authority: "JIDHAT / Majelis Desa Adat Bali — Awig-Awig Desa Adat Denpasar", url: "https://jidhat.baliprov.go.id/storage/awig/4zFUiqwUkNRvqHtnRRhTnuLsUW3qys0HuEL2A06d.pdf", status: "official" },
  },
  {
    slug: "pura-puseh-desa-adat-denpasar",
    name: "Pura Puseh Desa Adat Denpasar",
    locality: "Jematang, Denpasar, Bali",
    rule: { type: "pawukon", saptawara: "Redite", pancawara: "Umanis", wuku: "Langkir" },
    source: { authority: "JIDHAT / Majelis Desa Adat Bali — Awig-Awig Desa Adat Denpasar", url: "https://jidhat.baliprov.go.id/storage/awig/4zFUiqwUkNRvqHtnRRhTnuLsUW3qys0HuEL2A06d.pdf", status: "official" },
  },
  {
    slug: "pura-dalem-kahyangan-desa-adat-denpasar",
    name: "Pura Dalem Kahyangan Desa Adat Denpasar",
    locality: "Gelogor, Denpasar, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Umanis", wuku: "Medangsia" },
    source: { authority: "JIDHAT / Majelis Desa Adat Bali — Awig-Awig Desa Adat Denpasar", url: "https://jidhat.baliprov.go.id/storage/awig/4zFUiqwUkNRvqHtnRRhTnuLsUW3qys0HuEL2A06d.pdf", status: "official" },
  },

  // Desa Pakraman Buleleng Awig-Awig.
  {
    slug: "pura-segara-desa-pakraman-buleleng",
    name: "Pura Segara Desa Pakraman Buleleng",
    locality: "Buleleng, Bali",
    rule: { type: "pawukon", saptawara: "Sukra", pancawara: "Kliwon", wuku: "Sungsang" },
    source: { authority: "JIDHAT / Awig-Awig Desa Pakraman Buleleng", url: "https://jidhat.baliprov.go.id/storage/awig/RoqxqQkOdJ68OStKCz58pIKg6YzNwOZzjxM2TUkz.pdf", status: "official" },
  },
  {
    slug: "pura-desa-desa-pakraman-buleleng",
    name: "Pura Desa Desa Pakraman Buleleng",
    locality: "Buleleng, Bali",
    rule: { type: "pawukon", saptawara: "Wraspati", pancawara: "Umanis", wuku: "Dungulan" },
    source: { authority: "JIDHAT / Awig-Awig Desa Pakraman Buleleng", url: "https://jidhat.baliprov.go.id/storage/awig/RoqxqQkOdJ68OStKCz58pIKg6YzNwOZzjxM2TUkz.pdf", status: "official" },
  },
  {
    slug: "pura-dalem-desa-pakraman-buleleng",
    name: "Pura Dalem Desa Pakraman Buleleng",
    locality: "Buleleng, Bali",
    rule: { type: "pawukon", saptawara: "Redite", pancawara: "Umanis", wuku: "Langkir" },
    source: { authority: "JIDHAT / Awig-Awig Desa Pakraman Buleleng", url: "https://jidhat.baliprov.go.id/storage/awig/RoqxqQkOdJ68OStKCz58pIKg6YzNwOZzjxM2TUkz.pdf", status: "official" },
  },
  {
    slug: "pura-dalem-surya-sembung-sobangan",
    name: "Pura Dalem Surya",
    locality: "Sembung Sobangan, Mengwi, Badung, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Kliwon", wuku: "Sinta" },
    source: { authority: "Dinas Kebudayaan Kabupaten Badung", url: "https://disbud.badungkab.go.id/pura-dalem-surya-260716140820", status: "official" },
    note: "The official cultural-office profile states the Piodalan falls on Pagerwesi (Buda Kliwon Sinta) every 210 days.",
  },

  // Desa Adat Tumbakbayuh — official Awig-Awig schedule.
  {
    slug: "pura-gunung-sari-tumbakbayuh",
    name: "Pura Gunung Sari",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Anggara", pancawara: "Kliwon", wuku: "Dukut" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },
  {
    slug: "pura-batu-ngaus-tumbakbayuh",
    name: "Pura Batu Ngaus",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Wage", wuku: "Warigadean" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
    note: "Source spelling 'Warigadian' is normalized to the engine's canonical Wuku Warigadean.",
  },
  {
    slug: "pura-gede-luhur-tumbakbayuh",
    name: "Pura Gede Luhur",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Wage", wuku: "Menail" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },
  {
    slug: "pura-merajan-agung-tumbakbayuh",
    name: "Pura Merajan Agung",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Kliwon", wuku: "Sinta" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },
  {
    slug: "pura-wangaya-tumbakbayuh",
    name: "Pura Wangaya",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Anggara", pancawara: "Kliwon", wuku: "Prangbakat" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },
  {
    slug: "pura-batur-tumbakbayuh",
    name: "Pura Batur",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Wage", wuku: "Menail" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },
  {
    slug: "pura-catur-sari-tumbakbayuh",
    name: "Pura Catur Sari",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Anggara", pancawara: "Kliwon", wuku: "Prangbakat" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },
  {
    slug: "pura-batan-buah-tumbakbayuh",
    name: "Pura Batan Buah",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Anggara", pancawara: "Kliwon", wuku: "Prangbakat" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },
  {
    slug: "pura-panti-bandesa-mas-tumbakbayuh",
    name: "Pura Panti Bandesa Mas",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Anggara", pancawara: "Kliwon", wuku: "Prangbakat" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
    note: "The same Awig-Awig table contains a second similarly named Pura Panti Bandesa Mas row with a different rahina; that ambiguous duplicate is not projected until disambiguated.",
  },
  {
    slug: "pura-panti-pasek-kerandan-tumbakbayuh",
    name: "Pura Panti Pasek Kerandan",
    locality: "Desa Adat Tumbakbayuh, Bali",
    rule: { type: "pawukon", saptawara: "Buda", pancawara: "Wage", wuku: "Klawu" },
    source: { authority: "JIDHAT / Awig-Awig Desa Adat Tumbakbayuh", url: "https://jidhat.baliprov.go.id/storage/awig/2aHkDxzLso1yuYaEbmu1MAoUuxa9JBTKRjDDxxB8.pdf", status: "official" },
  },

  // Official occurrence evidence that does not, by itself, establish a recurrence rule.
  {
    slug: "pura-gede-pemayun-banyuning",
    name: "Pura Gede Pemayun Banyuning",
    locality: "Banyuning, Buleleng, Bali",
    rule: { type: "occurrence", date: "2025-08-08", rahina: "Buda Kliwon Ugu, Purnama Sasih Karo" },
    source: { authority: "Kecamatan Buleleng, Pemerintah Kabupaten Buleleng", url: "https://buleleng.bulelengkab.go.id/informasi/detail/berita/89_camat-buleleng-hadiri-persembahyangan-di-pura-gede-pemayun-banyuning-dampingi-wakil-bupati-buleleng", published_date: "2025-08-08", status: "official" },
    known_occurrences: ["2025-08-08"],
    note: "Occurrence-only record: the article establishes the 2025 piodalan date/rahina but is not used to infer a 210-day recurrence.",
  },
  {
    slug: "pura-swagina-dpmd-dukcapil-bali",
    name: "Pura Swagina DPMD Dukcapil Provinsi Bali",
    locality: "Bali",
    rule: { type: "occurrence", date: "2026-10-25", rahina: "Purnama Kalima" },
    source: { authority: "DPMD Dukcapil Provinsi Bali", url: "https://dpmddukcapil.baliprov.go.id/piodalan-di-pura-swagina-dinas-pemberdayaan-masyarakat-desa-kependudukan-dan-pencatatan-sipil-provinsi-bali-1", published_date: "2026-10-25", status: "official" },
    known_occurrences: ["2026-10-25"],
    note: "Occurrence-only record: the current government article is preserved without assuming an annual recurrence.",
  },
];


const TRUSTED_PIODALAN_HOSTS = new Set([
  "www.baliprov.go.id","baliprov.go.id","bapenda.baliprov.go.id","bmc.baliprov.go.id",
  "rsjiwa.baliprov.go.id","bali.kemenag.go.id","bali.bpk.go.id","dpma.baliprov.go.id",
  "jidhat.baliprov.go.id","disbud.badungkab.go.id","buleleng.bulelengkab.go.id","dpmddukcapil.baliprov.go.id",
]);

export function validatePiodalanRegistry(records: PiodalanRecord[] = BALI_PIODALAN) {
  const slugs = new Set<string>();
  const errors: string[] = [];
  for (const r of records) {
    if (slugs.has(r.slug)) errors.push(`duplicate slug: ${r.slug}`);
    slugs.add(r.slug);
    let host = "";
    try { host = new URL(r.source.url).hostname; } catch { errors.push(`invalid source URL: ${r.slug}`); }
    if (host && !TRUSTED_PIODALAN_HOSTS.has(host)) errors.push(`unapproved source host ${host}: ${r.slug}`);
    if (r.rule.type === "pawukon") {
      const hit = nextPawukonPiodalan(r.rule, 2415021, 1)[0];
      if (!Number.isFinite(hit)) errors.push(`unresolvable Pawukon rule: ${r.slug}`);
    }
    if (r.rule.type === "occurrence" && !/^\d{4}-\d{2}-\d{2}$/.test(r.rule.date)) errors.push(`invalid occurrence date: ${r.slug}`);
  }
  return { ok: errors.length === 0, errors, count: records.length };
}

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
