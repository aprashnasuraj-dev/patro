import type { SasihPiodalanRule } from "./bali-piodalan";

export type AnnualSasihSourceStatus = "official" | "published" | "official-process" | "provisional";
export type AnnualSasihMonth = {
  sasih: string;
  purnama?: string;
  tilem?: string;
};
export type AnnualSourceAnchor = {
  date: string;
  lunar_day: "Purnama" | "Tilem";
  sasih: string;
  authority: string;
  source_url: string;
  source_status: "official" | "published";
  note?: string;
};
export type AnnualSasihSource = {
  year: number;
  version: string;
  publication_authority: string;
  published_date: string;
  effective_from: string;
  effective_to: string;
  source_url: string;
  source_status: AnnualSasihSourceStatus;
  mapping_complete: boolean;
  mappings: AnnualSasihMonth[];
  anchors: AnnualSourceAnchor[];
  conflict_history: Array<{
    recorded_date: string;
    status: "open" | "resolved";
    description: string;
    sources?: string[];
  }>;
  note: string;
};

const SASIH_ALIASES: Record<string, string> = {
  kasa: "Kasa",
  karo: "Karo",
  katiga: "Ketiga",
  ketiga: "Ketiga",
  kapat: "Kapat",
  kalima: "Kelima",
  kelima: "Kelima",
  kanem: "Kenam",
  kenam: "Kenam",
  kepitu: "Kepitu",
  kapitu: "Kepitu",
  kaulu: "Kewulu",
  kewulu: "Kewulu",
  kasanga: "Kesanga",
  kesanga: "Kesanga",
  kadasa: "Kedasa",
  kedasa: "Kedasa",
  jiyestha: "Jiyestha",
  jyestha: "Jiyestha",
  sadha: "Sadha",
};

export function canonicalSasih(value: string): string {
  const key=String(value||"").trim().toLocaleLowerCase("id-ID");
  return SASIH_ALIASES[key] || String(value||"").trim();
}

/**
 * A mapping is usable for date projection only when the source itself publishes
 * a complete annual Sasih/Purnama/Tilem table. Process reports and isolated
 * occurrence anchors are preserved but deliberately fail closed.
 */
export const BALI_ANNUAL_SASIH_SOURCES: AnnualSasihSource[] = [
  {
    year: 2025,
    version: "bimas-hindu-purnama-tilem-2025-v1",
    publication_authority: "Direktorat Jenderal Bimbingan Masyarakat Hindu, Kementerian Agama RI",
    published_date: "2025-06-16",
    effective_from: "2025-01-01",
    effective_to: "2025-12-31",
    source_url: "https://bimashindu.kemenag.go.id/index.php/berita-pusat/mengenal-lebih-dekat-hari-raya-purnama-dan-tilem-dalam-tradisi-umat-hindu-dan-jadwal-2025-3TER3",
    source_status: "published",
    mapping_complete: true,
    mappings: [
      { sasih:"Kepitu", purnama:"2025-01-14", tilem:"2025-01-28" },
      { sasih:"Kewulu", purnama:"2025-02-12", tilem:"2025-02-27" },
      { sasih:"Kesanga", purnama:"2025-03-14", tilem:"2025-03-28" },
      { sasih:"Kedasa", purnama:"2025-04-12", tilem:"2025-04-27" },
      { sasih:"Jiyestha", purnama:"2025-05-12", tilem:"2025-05-27" },
      { sasih:"Sadha", purnama:"2025-06-10", tilem:"2025-06-25" },
      { sasih:"Kasa", purnama:"2025-07-10", tilem:"2025-07-25" },
      { sasih:"Karo", purnama:"2025-08-08", tilem:"2025-08-23" },
      { sasih:"Ketiga", purnama:"2025-09-03", tilem:"2025-09-22" },
      { sasih:"Kapat", purnama:"2025-10-06", tilem:"2025-10-21" },
      { sasih:"Kelima", purnama:"2025-11-05", tilem:"2025-11-20" },
      { sasih:"Kenam", purnama:"2025-12-04", tilem:"2025-12-19" },
    ],
    anchors: [],
    conflict_history: [],
    note: "Bimas Hindu describes this published 2025 schedule as a general reference for Hindu communities in Indonesia. AafnaiPatro therefore labels the dates published, not an inferred SKHDN/TIKA decision.",
  },
  {
    year: 2026,
    version: "bali-tika-2026-process-and-anchors-v1",
    publication_authority: "Kanwil Kementerian Agama Provinsi Bali / Ditjen Bimas Hindu",
    published_date: "2026-05-22",
    effective_from: "2026-01-01",
    effective_to: "2026-12-31",
    source_url: "https://bimashindu.kemenag.go.id/berita-daerah/jaga-kesucian-dharma-dan-kearifan-leluhur-kanwil-kemenag-bali-hadiri-pasamuhan-alit-skhdn-penyusunan-tika-2026-uTZu2",
    source_status: "official-process",
    mapping_complete: false,
    mappings: [],
    anchors: [
      {
        date:"2026-04-02", lunar_day:"Purnama", sasih:"Kedasa",
        authority:"Direktorat Jenderal Bimbingan Masyarakat Hindu, Kementerian Agama RI",
        source_url:"https://bimashindu.kemenag.go.id/berita-pusat/dari-besakih-untuk-semesta-makna-pengorbanan-suci-dalam-tawur-agung-kesanga-fJY11",
        source_status:"official",
        note:"The Besakih report states the puncak karya is scheduled for Purnama Sasih Kedasa on 2 April 2026.",
      },
      {
        date:"2026-08-12", lunar_day:"Tilem", sasih:"Karo",
        authority:"Pemerintah Provinsi Bali",
        source_url:"https://baliprov.go.id/web/perkuat-pembangunan-sekala-niskala-pemprov-bali-ngaturang-pekeling-di-pura-agung-besakih",
        source_status:"official",
        note:"Provincial-government event record explicitly identifies 12 August 2026 as Tilem Sasih Karo.",
      },
    ],
    conflict_history: [],
    note: "The 22 May 2026 source documents the SKHDN TIKA deliberation process, not a complete published annual Sasih mapping. Isolated official anchors are stored for provenance/cross-checking but cannot unlock arbitrary Sasih-based future dates.",
  },
];

const TRUSTED_ANNUAL_HOSTS=new Set(["bimashindu.kemenag.go.id","baliprov.go.id","www.baliprov.go.id"]);

export function annualSasihSource(year: number): AnnualSasihSource | null {
  return BALI_ANNUAL_SASIH_SOURCES.find((x)=>x.year===year) || null;
}

export function annualSasihReadiness(year: number) {
  const source=annualSasihSource(year);
  const errors:string[]=[];
  if(!source) return {ready:false,source:null,errors:["no annual source record"]};
  if(!source.mapping_complete) errors.push("annual mapping is not complete");
  if(source.conflict_history.some((x)=>x.status==="open")) errors.push("annual source has unresolved conflicts");
  if(source.mapping_complete && source.mappings.length<12) errors.push("complete mapping declares fewer than 12 Sasih rows");
  return {ready:errors.length===0,source,errors};
}

export function sasihGregorianDate(rule: SasihPiodalanRule, year: number): string | null {
  const readiness=annualSasihReadiness(year);
  if(!readiness.ready || !readiness.source) return null;
  const target=canonicalSasih(rule.sasih);
  const row=readiness.source.mappings.find((x)=>canonicalSasih(x.sasih)===target);
  if(!row) return null;
  return rule.lunar_day==="Purnama" ? row.purnama || null : row.tilem || null;
}

export function validateAnnualSasihSources(records: AnnualSasihSource[]=BALI_ANNUAL_SASIH_SOURCES) {
  const errors:string[]=[];
  const years=new Set<number>();
  for(const r of records){
    if(years.has(r.year)) errors.push(`duplicate annual year: ${r.year}`);
    years.add(r.year);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.published_date)) errors.push(`invalid published_date: ${r.year}`);
    if(r.effective_from!==`${r.year}-01-01` || r.effective_to!==`${r.year}-12-31`) errors.push(`invalid effective range: ${r.year}`);
    let host="";
    try{host=new URL(r.source_url).hostname;}catch{errors.push(`invalid annual source URL: ${r.year}`);}
    if(host&&!TRUSTED_ANNUAL_HOSTS.has(host)) errors.push(`unapproved annual source host: ${host}`);
    const seen=new Set<string>();
    for(const m of r.mappings){
      const key=canonicalSasih(m.sasih);
      if(seen.has(key)) errors.push(`duplicate Sasih ${key}: ${r.year}`);
      seen.add(key);
      for(const d of [m.purnama,m.tilem].filter(Boolean) as string[]){
        if(!d.startsWith(String(r.year)+"-")) errors.push(`date outside source year: ${r.year} ${d}`);
      }
    }
    if(r.mapping_complete && r.mappings.length!==12) errors.push(`complete mapping must have 12 rows: ${r.year}`);
    for(const a of r.anchors){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date) || !a.date.startsWith(String(r.year)+"-")) errors.push(`invalid annual anchor: ${r.year} ${a.date}`);
      let ahost="";
      try{ahost=new URL(a.source_url).hostname;}catch{errors.push(`invalid anchor URL: ${r.year} ${a.date}`);}
      if(ahost&&!TRUSTED_ANNUAL_HOSTS.has(ahost)) errors.push(`unapproved anchor host: ${ahost}`);
    }
  }
  return {ok:errors.length===0,errors,count:records.length};
}
