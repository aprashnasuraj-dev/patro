import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve("data/provenance");
const required = ["dataset_id","product","source","snapshot_date","build_date","transformation_version","status","confidence","correction_route"];
let failures = 0;
for (const name of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(readFileSync(resolve(dir, name), "utf8"));
  const missing = required.filter((k) => !(k in m));
  if (missing.length) { console.error(name, "missing", missing.join(",")); failures++; }
  if (!["official","published","calculated","provisional"].includes(m.status)) { console.error(name, "bad status"); failures++; }
  if (!(typeof m.confidence === "number" && m.confidence >= 0 && m.confidence <= 1)) { console.error(name, "bad confidence"); failures++; }
  if (!m.source?.name || !m.source?.url || !m.source?.license || !m.source?.license_url || !m.source?.attribution) { console.error(name, "incomplete source"); failures++; }
}
if (failures) process.exit(1);
console.log("roadmap manifests: valid");
