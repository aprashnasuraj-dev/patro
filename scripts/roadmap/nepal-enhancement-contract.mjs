import { readFileSync } from "node:fs";

const read=(p)=>readFileSync(p,"utf8");
const app=read("scripts/explore/nepal/map/app.js");
const build=read("scripts/explore/nepal/build-map.mjs");
const offline=read("scripts/explore/nepal/map/offline-sw.js");
const offlineClient=read("scripts/explore/nepal/map/offline.js");
const embed=read("scripts/explore/nepal/map/embed.js");
const migration=read("cloudflare/d1/schema-migrations/0008_nepal_map_corrections.sql");
const api=read("worker/nepal-api.ts");
const routing=read("scripts/explore/nepal/map/routing-v2.js");
const terrain=read("scripts/explore/nepal/map/terrain.js");
const flags=read("worker/roadmap/flags.ts");

const fail=(m)=>{throw new Error(m);};

if(build.includes("<script>window.NEPALMAP=")) fail("Nepal Map executable inline config returned");
if(!build.includes('meta name="aafnaipatro-nepalmap-config"')) fail("inert Nepal Map config meta missing");
if(!app.includes('meta[name="aafnaipatro-nepalmap-config"]')) fail("app does not read inert config meta");

if(/openfreemap|routing\.openstreetmap|google\.com\/maps/i.test(offline)) fail("offline service worker references a third-party map/routing resource");
if(!offline.includes('url.origin!==self.location.origin')) fail("offline service worker same-origin guard missing");
if(offlineClient.includes("location.pathname+location.search")) fail("offline shell cache persists route/deep-link query state");

if(/geolocation|routing\.openstreetmap|np-me-from|computeRoute/i.test(embed)) fail("read-only embed gained geolocation/routing behavior");
if(!embed.includes("OpenStreetMap contributors")) fail("embed attribution missing");

const migrationSql = migration.replace(/--.*$/gm, "");
for(const sensitive of ["email","ip_address","user_agent","latitude","longitude"]){
  if(new RegExp("\\b"+sensitive+"\\b","i").test(migrationSql)) fail("correction storage contains sensitive field: "+sensitive);
}
if(!api.includes("same_origin_required")) fail("correction same-origin guard missing");
if(!api.includes("too_many_reports_for_place")) fail("correction per-place throttle missing");

if(!routing.includes("extra_seconds")||!routing.includes('bucket: detourClass')) fail("true routed detour model missing");
if(!routing.includes("routeWithStops")) fail("multi-stop routing missing");
if(!terrain.includes("queryTerrainElevation")) fail("terrain route elevation sampling missing");
if(!build.includes('NEPALMAP_POI_PAGES=1 requires NEPALMAP_STABLE_IDS=1')) fail("selective POI stable-ID hard gate missing");

const requiredFlags=[
  "nepalBoundaryConfidence","nepalDetourRouting","nepalRoadSafety","nepalTerrain","nepalOfflinePacks",
  "nepalExports","nepalPoiPages","nepalMobileSheetV2","nepalEmergency","nepalItinerary","nepalCorrectionsUi",
  "nepalApi","nepalEmbeds","nepalPmtiles","roadmapSlo","roadmapCostMetrics","baliOtonanDualResult","baliSubscriptionUi"
];
for(const flag of requiredFlags) if(!new RegExp("\\b"+flag+"\\s*:\\s*false\\b").test(flags)) fail("feature does not default OFF: "+flag);

console.log("Nepal/Bali enhancement static contracts: pass");
