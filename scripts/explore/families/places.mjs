// Places family: province → district → local level (palika) pages for all of Nepal.
// Source: data/explore/places/source — the open "local-states-nepal" dataset (MIT licence, vendored at commit
// 035cb3d2ce2420ad04d7aac1d0ce4d08960c57f0). Every fact on a page comes from that dataset; nothing is invented.
//
// Ward pages are intentionally NOT generated yet: the dataset only gives a ward count, so a ward page would
// repeat its palika page. Add them when ward-level data (census 2021 ward population, ward office contact)
// is vendored — see scripts/explore/README.md.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const id = "places";

const SOURCE_DIR = "data/explore/places/source";
const SOURCE_NAME = "local-states-nepal open dataset (MIT licence)";
const SOURCE_URL = "https://github.com/sagautam5/local-states-nepal/tree/035cb3d2ce2420ad04d7aac1d0ce4d08960c57f0/dataset";
const LASTMOD = "2026-10-09"; // date this snapshot was vendored; bump only when the source data changes

const CATEGORY_SLUG = { 1: "metropolitan-city", 2: "sub-metropolitan-city", 3: "municipality", 4: "rural-municipality" };

export const slugify = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// The source writes कोशी with a split vowel sign (ा + े); join it so search engines see the normal spelling.
const fixNe = (value) => String(value || "").replace(/ाे/g, "ो").trim();
const num = (value) => Number(String(value).replace(/,/g, ""));
const fmt = (value) => num(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const NE_DIGITS = "०१२३४५६७८९";
const neNum = (value) => String(value).replace(/[0-9]/g, (d) => NE_DIGITS[Number(d)]);

async function load(root, name) {
  const read = async (lang) => JSON.parse(await readFile(resolve(root, SOURCE_DIR, name, `${lang}.json`), "utf8"));
  const [en, ne] = await Promise.all([read("en"), read("np")]);
  const neById = new Map(ne.map((row) => [row.id, row]));
  return en.map((row) => ({ ...row, ne: neById.get(row.id) || {} }));
}

export async function* records({ root = process.cwd() } = {}) {
  const [provinces, districts, palikas, categories] = await Promise.all(["provinces", "districts", "municipalities", "categories"].map((n) => load(root, n)));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const districtsOf = (pid) => districts.filter((d) => d.province_id === pid);
  const palikasOf = (did) => palikas.filter((p) => p.district_id === did);
  const wardsOf = (list) => list.reduce((sum, p) => sum + num(p.wards), 0);
  const source = { source_name: SOURCE_NAME, source_url: SOURCE_URL, lastmod: LASTMOD };

  const provincePath = (p) => `/place/${slugify(p.name.replace(/\s+province$/i, ""))}`;
  const districtPath = (d) => `${provincePath(provinces.find((p) => p.id === d.province_id))}/${slugify(d.name)}`;
  const palikaPath = (m) => `${districtPath(districts.find((d) => d.id === m.district_id))}/${slugify(m.name)}-${CATEGORY_SLUG[m.category_id]}`;

  const totalWards = wardsOf(palikas);
  yield {
    path: "/place",
    parent: null,
    sort: 0,
    title: "Places in Nepal",
    title_ne: "नेपालका स्थानहरू",
    description: `All ${provinces.length} provinces, ${districts.length} districts and ${palikas.length} local levels of Nepal with area, wards, headquarters and official websites.`,
    summary: `Nepal is divided into ${provinces.length} provinces, ${districts.length} districts and ${palikas.length} local levels (palikas), which together have ${fmt(totalWards)} wards. Choose a province to see its districts and local governments.`,
    summary_ne: `नेपालमा ${neNum(provinces.length)} प्रदेश, ${neNum(districts.length)} जिल्ला र ${neNum(palikas.length)} स्थानीय तह छन्, जसमा जम्मा ${neNum(totalWards)} वडा छन्।`,
    facts: [
      { label: "Provinces", label_ne: "प्रदेश", value: String(provinces.length), value_ne: neNum(provinces.length) },
      { label: "Districts", label_ne: "जिल्ला", value: String(districts.length), value_ne: neNum(districts.length) },
      { label: "Local levels", label_ne: "स्थानीय तह", value: String(palikas.length), value_ne: neNum(palikas.length) },
      { label: "Wards", label_ne: "वडा", value: fmt(totalWards), value_ne: neNum(totalWards) },
    ],
    child_heading: "Provinces",
    child_heading_ne: "प्रदेशहरू",
    ...source,
  };

  for (const p of provinces) {
    const ds = districtsOf(p.id);
    const ms = ds.flatMap((d) => palikasOf(d.id));
    const nameNe = fixNe(p.ne.name);
    yield {
      path: provincePath(p),
      parent: "/place",
      sort: p.id,
      title: p.name,
      title_ne: nameNe,
      description: `${p.name}, Nepal: capital ${p.headquarter}, ${fmt(p.area_sq_km)} km² area, ${ds.length} districts, ${ms.length} local levels and ${fmt(wardsOf(ms))} wards.`,
      summary: `${p.name} is one of Nepal's seven provinces. Its capital is ${p.headquarter}. It covers ${fmt(p.area_sq_km)} km² and has ${ds.length} districts, ${ms.length} local levels and ${fmt(wardsOf(ms))} wards.`,
      summary_ne: `${nameNe}को राजधानी ${fixNe(p.ne.headquarter)} हो। यसको क्षेत्रफल ${fixNe(p.ne.area_sq_km)} वर्ग किमी छ र यसमा ${neNum(ds.length)} जिल्ला, ${neNum(ms.length)} स्थानीय तह तथा ${neNum(wardsOf(ms))} वडा छन्।`,
      facts: [
        { label: "Capital", label_ne: "राजधानी", value: p.headquarter, value_ne: fixNe(p.ne.headquarter) },
        { label: "Area", label_ne: "क्षेत्रफल", value: `${fmt(p.area_sq_km)} km²`, value_ne: `${fixNe(p.ne.area_sq_km)} वर्ग किमी` },
        { label: "Districts", label_ne: "जिल्ला", value: String(ds.length), value_ne: neNum(ds.length) },
        { label: "Local levels", label_ne: "स्थानीय तह", value: String(ms.length), value_ne: neNum(ms.length) },
        { label: "Wards", label_ne: "वडा", value: fmt(wardsOf(ms)), value_ne: neNum(wardsOf(ms)) },
        ...(p.website ? [{ label: "Official website", label_ne: "आधिकारिक वेबसाइट", value: p.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: p.website }] : []),
      ],
      website: p.website,
      child_heading: `Districts of ${p.name}`,
      child_heading_ne: `${nameNe}का जिल्लाहरू`,
      ...source,
    };
  }

  for (const d of districts) {
    const p = provinces.find((row) => row.id === d.province_id);
    const ms = palikasOf(d.id);
    const nameNe = fixNe(d.ne.name);
    const provinceNe = fixNe(p.ne.name);
    yield {
      path: districtPath(d),
      parent: provincePath(p),
      sort: d.id,
      title: `${d.name} District`,
      title_ne: `${nameNe} जिल्ला`,
      description: `${d.name} District, ${p.name}: headquarters ${d.headquarter}, ${fmt(d.area_sq_km)} km², ${ms.length} local levels and ${fmt(wardsOf(ms))} wards, with links to each palika.`,
      summary: `${d.name} is a district in ${p.name}, Nepal, with its headquarters in ${d.headquarter}. It covers ${fmt(d.area_sq_km)} km² and has ${ms.length} local levels with ${fmt(wardsOf(ms))} wards.`,
      summary_ne: `${nameNe} ${provinceNe}मा पर्ने जिल्ला हो, जसको सदरमुकाम ${fixNe(d.ne.headquarter)} हो। यसको क्षेत्रफल ${fixNe(d.ne.area_sq_km)} वर्ग किमी छ र यसमा ${neNum(ms.length)} स्थानीय तह तथा ${neNum(wardsOf(ms))} वडा छन्।`,
      facts: [
        { label: "Province", label_ne: "प्रदेश", value: p.name, value_ne: provinceNe, href: provincePath(p) },
        { label: "Headquarters", label_ne: "सदरमुकाम", value: d.headquarter, value_ne: fixNe(d.ne.headquarter) },
        { label: "Area", label_ne: "क्षेत्रफल", value: `${fmt(d.area_sq_km)} km²`, value_ne: `${fixNe(d.ne.area_sq_km)} वर्ग किमी` },
        { label: "Local levels", label_ne: "स्थानीय तह", value: String(ms.length), value_ne: neNum(ms.length) },
        { label: "Wards", label_ne: "वडा", value: fmt(wardsOf(ms)), value_ne: neNum(wardsOf(ms)) },
        ...(d.website ? [{ label: "District Coordination Committee", label_ne: "जिल्ला समन्वय समिति", value: d.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: d.website }] : []),
      ],
      website: d.website,
      child_heading: `Local levels in ${d.name}`,
      child_heading_ne: `${nameNe}का स्थानीय तहहरू`,
      ...source,
    };
  }

  for (const m of palikas) {
    const d = districts.find((row) => row.id === m.district_id);
    const p = provinces.find((row) => row.id === d.province_id);
    const category = categoryById.get(m.category_id);
    const nameNe = fixNe(m.ne.name);
    const typeNe = fixNe(category.ne.name);
    const title = `${m.name} ${category.name}`;
    yield {
      path: palikaPath(m),
      parent: districtPath(d),
      // Cities first, then municipalities, then rural municipalities; alphabetical inside each group.
      sort: m.category_id,
      title,
      title_ne: `${nameNe} ${typeNe}`,
      description: `${title}, ${d.name} District, ${p.name}: ${num(m.wards)} wards, ${fmt(m.area_sq_km)} km² area, official website and nearby local levels.`,
      summary: `${title} is a ${category.name.toLowerCase()} (local government) in ${d.name} District of ${p.name}, Nepal. It covers ${fmt(m.area_sq_km)} km² and is divided into ${num(m.wards)} wards.`,
      summary_ne: `${nameNe} ${typeNe} ${fixNe(p.ne.name)}को ${fixNe(d.ne.name)} जिल्लामा पर्छ। यसको क्षेत्रफल ${fixNe(m.ne.area_sq_km)} वर्ग किमी छ र यसमा ${fixNe(m.ne.wards)} वडा छन्।`,
      facts: [
        { label: "Type", label_ne: "किसिम", value: category.name, value_ne: typeNe },
        { label: "District", label_ne: "जिल्ला", value: `${d.name} District`, value_ne: `${fixNe(d.ne.name)} जिल्ला`, href: districtPath(d) },
        { label: "Province", label_ne: "प्रदेश", value: p.name, value_ne: fixNe(p.ne.name), href: provincePath(p) },
        { label: "Wards", label_ne: "वडा संख्या", value: String(num(m.wards)), value_ne: fixNe(m.ne.wards) },
        { label: "Area", label_ne: "क्षेत्रफल", value: `${fmt(m.area_sq_km)} km²`, value_ne: `${fixNe(m.ne.area_sq_km)} वर्ग किमी` },
        ...(m.website ? [{ label: "Official website", label_ne: "आधिकारिक वेबसाइट", value: m.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: m.website }] : []),
      ],
      website: m.website,
      ...source,
    };
  }
}
