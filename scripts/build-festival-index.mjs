import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadCalendarSnapshot, loadHolidayMap } from "./calendar-snapshot.mjs";
import { SITE, isIndexableRoute } from "./seo-config.mjs";
import { BUILD_DATE, snapshotDate, updateSitemapIndex, urlsetXml } from "./sitemap-utils.mjs";

const root=process.cwd();
const outDir=resolve(root,"public/data");
const rows=await loadCalendarSnapshot();
const holidays=await loadHolidayMap();
const byAd=new Map(rows.map((row)=>[String(row?.ad||row?.ad_date||"").slice(0,10),row]));

const festivalMap=new Map();
for(const [ad,items] of holidays.entries()){
  const day=byAd.get(ad);
  const bsYear=Number(day?.bs?.year);
  if(!day||!Number.isInteger(bsYear))continue;
  for(const item of items){
    const slug=String(item?.slug||"").trim();
    if(!slug)continue;
    const festival=festivalMap.get(slug)||{
      slug,
      names:new Set(),
      names_en:new Set(),
      aliases:new Set([slug]),
      years:new Map(),
    };
    if(item?.name)festival.names.add(String(item.name));
    if(item?.nameEn)festival.names_en.add(String(item.nameEn));
    for(const alias of item?.aliases||[])if(alias)festival.aliases.add(String(alias));
    const occurrence=festival.years.get(bsYear)||{
      year:bsYear,
      dates:new Set(),
      effects:new Set(),
      sources:new Set(),
      source_urls:new Set(),
      verified_at:new Set(),
      record_ids:new Set(),
      records:[],
    };
    occurrence.dates.add(ad);
    if(item?.effect)occurrence.effects.add(String(item.effect));
    if(item?.source)occurrence.sources.add(String(item.source));
    if(item?.sourceUrl)occurrence.source_urls.add(String(item.sourceUrl));
    if(item?.verifiedAt)occurrence.verified_at.add(String(item.verifiedAt));
    if(item?.recordId)occurrence.record_ids.add(String(item.recordId));
    const record={
      date:ad,
      record_id:String(item?.recordId||""),
      kind:String(item?.kind||""),
      key:String(item?.key||""),
      name:String(item?.name||""),
      name_en:String(item?.nameEn||""),
      effect:String(item?.effect||""),
      source:String(item?.source||""),
      source_url:String(item?.sourceUrl||""),
      verified_at:String(item?.verifiedAt||""),
      value:item?.factValue&&typeof item.factValue==="object"?item.factValue:null,
    };
    const recordKey=`${record.date}|${record.record_id}|${record.kind}|${record.key}|${record.name}`;
    if(!occurrence.records.some((row)=>`${row.date}|${row.record_id}|${row.kind}|${row.key}|${row.name}`===recordKey))occurrence.records.push(record);
    festival.years.set(bsYear,occurrence);
    festivalMap.set(slug,festival);
  }
}

const aliases={};
const festivals={};
// /festivals is already published by the core sitemap. Keep this sitemap
// limited to festival identity/year detail routes so every canonical URL
// appears in exactly one sitemap.
const routes=[];
let occurrenceCount=0;
for(const festival of [...festivalMap.values()].sort((a,b)=>a.slug.localeCompare(b.slug))){
  const years={};
  for(const [year,occurrence] of [...festival.years.entries()].sort(([a],[b])=>a-b)){
    years[String(year)]={
      year,
      dates:[...occurrence.dates].sort(),
      effects:[...occurrence.effects].sort(),
      sources:[...occurrence.sources].sort(),
      source_urls:[...occurrence.source_urls].sort(),
      verified_at:[...occurrence.verified_at].sort(),
      record_ids:[...occurrence.record_ids].sort(),
      records:[...occurrence.records].sort((a,b)=>`${a.date}|${a.key}|${a.record_id}`.localeCompare(`${b.date}|${b.key}|${b.record_id}`)),
    };
    const route=`/festivals/${festival.slug}/${year}`;
    if(isIndexableRoute(route))routes.push(route);
    occurrenceCount++;
  }
  const aliasList=[...festival.aliases].filter(Boolean).sort();
  for(const alias of aliasList)aliases[alias]=festival.slug;
  festivals[festival.slug]={
    slug:festival.slug,
    name:[...festival.names][0]||[...festival.names_en][0]||festival.slug.replace(/-/g," "),
    name_en:[...festival.names_en][0]||null,
    aliases:aliasList,
    years,
  };
  const identity=`/festivals/${festival.slug}`;
  if(isIndexableRoute(identity))routes.push(identity);
}

if(Object.keys(festivals).length<10||occurrenceCount<10)throw new Error(`Festival runtime index unexpectedly small: ${Object.keys(festivals).length} identities / ${occurrenceCount} occurrences`);
const lastmod=(await snapshotDate("migration/data/public/holidays.json","migration/data/public/official_panchang_facts.json"))||BUILD_DATE;
await mkdir(outDir,{recursive:true});
await writeFile(resolve(outDir,"festival-index.json"),JSON.stringify({schema:1,count:Object.keys(festivals).length,occurrence_count:occurrenceCount,source_date:lastmod,aliases,festivals})+"\n","utf8");
await writeFile(resolve(root,"public/sitemap-festivals.xml"),urlsetXml([...new Set(routes)].map((route)=>({route,lastmod}))),"utf8");
await updateSitemapIndex(resolve(root,"public/sitemap.xml"),[{file:"sitemap-festivals.xml",lastmod}]);

const manifestPath=resolve(root,"public/seo-manifest.json");
const manifest=JSON.parse(await readFile(manifestPath,"utf8"));
manifest.sitemap_files=[...new Set([...(manifest.sitemap_files||[]),"sitemap-festivals.xml"])];
manifest.indexed_festival_route_count=[...new Set(routes)].length;
manifest.festival_identity_count=Object.keys(festivals).length;
manifest.festival_occurrence_count=occurrenceCount;
manifest.festival_index=`${SITE}/data/festival-index.json`;
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n","utf8");

console.log(`Festival runtime index: ${Object.keys(festivals).length} identities, ${occurrenceCount} year occurrences, ${[...new Set(routes)].length} sitemap routes.`);
