import { readFileSync, writeFileSync } from "node:fs";
const out = { generated_at: new Date().toISOString(), wcag_target: "WCAG 2.2 AA", routes: {} };
for (const route of ["nepalmap","bali-calendar"]) {
  const report = JSON.parse(readFileSync("docs/perf/" + route + "-a11y-lighthouse.json", "utf8"));
  out.routes[route] = { accessibility: report.categories.accessibility.score };
}
writeFileSync("docs/perf/a11y.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
