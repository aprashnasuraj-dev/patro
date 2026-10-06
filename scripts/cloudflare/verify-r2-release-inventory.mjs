import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const read=(path)=>JSON.parse(readFileSync(resolve(root,path),"utf8"));
const fail=(message)=>{throw new Error(`R2 release inventory verification failed: ${message}`)};
const expect=(condition,message)=>{if(!condition)fail(message)};

const history=read(".cloudflare/history-r2/manifest.json");
const calendar=read(".cloudflare/calendar-r2/manifest.json");
const community=read(".cloudflare/community-r2/manifest.json");

expect(history.row_count===5454,`history row_count ${history.row_count} != 5454`);
expect(calendar.row_count===77070,`calendar row_count ${calendar.row_count} != 77070`);
expect(calendar.ad_start==="1826-04-11"&&calendar.ad_end==="2037-04-13",`calendar coverage ${calendar.ad_start}..${calendar.ad_end}`);
expect(/^sha256:[a-f0-9]{64}$/.test(String(calendar.source_version||"")),"calendar source_version is not deterministic sha256");
expect(Array.isArray(calendar.ad_years)&&calendar.ad_years.length>200,"calendar AD year inventory incomplete");
expect(Array.isArray(calendar.bs_years)&&calendar.bs_years.length>200,"calendar BS year inventory incomplete");
expect(Array.isArray(calendar.files)&&calendar.files.length===calendar.ad_years.length+calendar.bs_years.length,"calendar manifest file/year coverage mismatch");
for(const file of calendar.files){
  expect(file?.key?.startsWith("datasets/calendar/v1/"),`invalid calendar key ${file?.key}`);
  const rel=String(file.key).replace(/^datasets\/calendar\/v1\//,"");
  expect(existsSync(resolve(root,".cloudflare/calendar-r2",rel)),`missing generated calendar shard ${rel}`);
}
const requiredFamilies=["nepal-sambat","lhosar","tharu","mithila","kirat","hijri"];
expect(JSON.stringify(community.primary_families)===JSON.stringify(requiredFamilies),`community primary families mismatch: ${JSON.stringify(community.primary_families)}`);
expect(/^sha256:[a-f0-9]{64}$/.test(String(community.source_version||"")),"community source_version is not deterministic sha256");
expect(Array.isArray(community.files)&&community.files.length===community.archive_route_count,"community manifest route/file count mismatch");
for(const family of requiredFamilies){
  const files=community.files.filter((row)=>row.family===family);
  expect(files.length>0,`no R2 archive files for ${family}`);
}
expect(!community.primary_families.includes("chakra"),"samudaya/chakra must not become a seventh archive family");
expect(!existsSync(resolve(root,"dist/data/calendar")),"bulk calendar archive leaked into dist/data/calendar");

const archive=readFileSync(resolve(root,"worker/public-archive-pages.ts"),"utf8");
const fast=readFileSync(resolve(root,"worker/calendar-fast.ts"),"utf8");
const source=readFileSync(resolve(root,"worker/patro-source.ts"),"utf8");
const data=readFileSync(resolve(root,"worker/data-export.ts"),"utf8");
expect(archive.includes('"x-patro-backend":"cloudflare-r2-public-archive"'),"public archive renderer lacks R2 backend header");
expect(archive.includes('"x-patro-backend":"r2-required"'),"public archive renderer does not fail closed when R2 is unavailable");
expect(!archive.includes("env.DB"),"public archive renderer still references D1");
expect(fast.includes("D1 is deliberately not a normal fallback"),"calendar fast path does not encode fail-closed policy");
expect(!fast.includes("cloudflare-d1-calendar"),"calendar fast path still contains a D1 backend");
expect(source.includes("createArchivePatroSource"),"canonical runtime source lacks R2 archive adapter");
expect(data.includes("datasets/calendar/v1"),"calendar export is not R2-backed");

console.log(JSON.stringify({
  ok:true,
  history_rows:history.row_count,
  calendar_rows:calendar.row_count,
  calendar_ad_start:calendar.ad_start,
  calendar_ad_end:calendar.ad_end,
  calendar_ad_year_shards:calendar.ad_years.length,
  calendar_bs_year_shards:calendar.bs_years.length,
  calendar_source_version:calendar.source_version,
  community_archive_routes:community.archive_route_count,
  community_families:community.primary_families,
  community_source_version:community.source_version,
  dist_bulk_calendar:false
},null,2));
