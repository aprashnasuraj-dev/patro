import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const graph = JSON.parse(await readFile(resolve(root, "public/publication-graph.json"), "utf8"));
const festivalRenderer = await readFile(resolve(root, "scripts/prerender-festivals.mjs"), "utf8");
const historyRenderer = await readFile(resolve(root, "scripts/prerender-history-days.mjs"), "utf8");
const historyUi = await readFile(resolve(root, "src/AafnaiDetailPages.tsx"), "utf8");
const history = (graph.entities || []).filter((entity) => entity?.type === "history-event");

if (history.length !== 5454) throw new Error(`Step 6 requires all 5,454 history records; got ${history.length}`);
if (Number(graph.counts?.historySourceBacked || 0) !== 3307) throw new Error(`Expected 3,307 source-backed history records; got ${graph.counts?.historySourceBacked}`);
if (Number(graph.counts?.historyNeedsFurtherVerification || 0) !== 2147) throw new Error(`Expected 2,147 history records needing further verification; got ${graph.counts?.historyNeedsFurtherVerification}`);
if (Number(graph.counts?.historySourceBacked || 0) + Number(graph.counts?.historyNeedsFurtherVerification || 0) !== history.length) {
  throw new Error("History verification cohorts no longer cover the full canonical archive");
}
if (graph.historyEvidencePolicy?.individualEventPagesPublished !== false) throw new Error("History classifier must not auto-publish individual event pages");

const dispositions = new Set(["publishable", "needs-source", "duplicate", "uncertain"]);
let unverified = 0;
for (const entity of history) {
  const facts = entity.facts || {};
  if (!dispositions.has(facts.evidenceDisposition)) throw new Error(`Missing/invalid history evidence disposition: ${entity.id}`);
  if (typeof facts.needsFurtherVerification !== "boolean") throw new Error(`Missing history verification flag: ${entity.id}`);
  if (facts.verificationStatus === "unverified") {
    unverified++;
    if (!facts.needsFurtherVerification || facts.evidenceDisposition !== "needs-source") {
      throw new Error(`Unverified history record is not retained as needs-source: ${entity.id}`);
    }
  }
  if (entity.indexable || entity.publicationStatus !== "candidate") throw new Error(`History evidence classification must not auto-index event detail pages: ${entity.id}`);
}
if (unverified !== 2147) throw new Error(`Expected exactly 2,147 unverified history records; got ${unverified}`);

if (!historyRenderer.includes("Needs further verification · थप प्रमाणीकरण आवश्यक")) throw new Error("Prerendered history archive lacks the explicit verification label");
if (!historyUi.includes("Needs further verification · थप प्रमाणीकरण आवश्यक")) throw new Error("Hydrated history archive lacks the explicit verification label");
if (historyUi.includes("setData(rows.filter(item=>Boolean(historySourceUrl(item))))")) throw new Error("Hydrated history archive still hides records without source_url");
if (historyRenderer.includes(".filter((entry) => entry.url && entry.title)")) throw new Error("Prerendered history archive still hides unsourced records");

// Festivals are observances celebrated by people, families and communities. They are not modeled
// as concert-style scheduled events and do not require an organizer entity.
if (!festivalRenderer.includes('"@type":"Event"') || !festivalRenderer.includes("startDate:ad")) throw new Error("Festival observance schema must use the recorded occurrence dates");
if (!festivalRenderer.includes('"@type":"CollectionPage"') || !festivalRenderer.includes('"@type":"WebPage"')) {
  throw new Error("Festival identity/year pages must use collection/web-page observance semantics");
}
if (!festivalRenderer.includes("घर, परिवार") || !festivalRenderer.includes("community/people observances")) {
  throw new Error("Festival renderer lost people/community observance semantics");
}

console.log("Steps 3 and 6 completion contract valid: festival observance semantics + all 5,454 history records retained with 2,147 verification labels.");
