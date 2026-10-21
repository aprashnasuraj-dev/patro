import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function walk(path) {
  let entries;
  try { entries = await readdir(path, { withFileTypes: true }); } catch { return []; }
  const files = [];
  for (const entry of entries) {
    const next = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(next));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(next);
  }
  return files;
}

const files = await walk(".lighthouseci");
let reports = 0;
for (const file of files) {
  let parsed;
  try { parsed = JSON.parse(await readFile(file, "utf8")); } catch { continue; }
  const lhr = parsed?.lhr ?? parsed;
  if (!lhr?.categories || !lhr?.audits) continue;
  reports++;
  const best = lhr.categories["best-practices"];
  console.log(`\\nLighthouse diagnostics: ${lhr.finalDisplayedUrl ?? lhr.requestedUrl ?? file}`);
  console.log(`Best Practices score: ${best?.score == null ? "n/a" : Math.round(best.score * 100)}`);
  for (const ref of best?.auditRefs ?? []) {
    if (!Number.isFinite(ref.weight) || ref.weight <= 0) continue;
    const audit = lhr.audits[ref.id];
    if (!audit || audit.score === 1 || audit.score === null) continue;
    console.log(`FAILED ${ref.id} | score=${audit.score} | ${audit.title ?? "Untitled audit"}`);
    if (audit.displayValue) console.log(`  value: ${audit.displayValue}`);
    if (audit.description) console.log(`  guidance: ${audit.description.replace(/\\s+/g, " ").slice(0, 600)}`);
    const items = audit.details?.items;
    if (Array.isArray(items) && items.length) {
      console.log(`  details: ${JSON.stringify(items.slice(0, 5)).slice(0, 1800)}`);
    }
  }
}
if (!reports) {
  console.log("No local Lighthouse result JSON found under .lighthouseci; use the report URLs emitted by LHCI.");
}
