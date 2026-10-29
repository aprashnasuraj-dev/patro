import { readFileSync, writeFileSync } from "node:fs";
const routes = ["nepalmap","bali-calendar"];
const output = { generated_at: new Date().toISOString(), profile: { cpu_slowdown: 4, lighthouse_default_network: "slow 4G simulation" }, routes: {} };
for (const route of routes) {
  const report = JSON.parse(readFileSync("docs/perf/" + route + "-lighthouse.json", "utf8"));
  const a = report.audits;
  output.routes[route] = {
    performance: report.categories.performance.score,
    first_contentful_paint_ms: a["first-contentful-paint"]?.numericValue ?? null,
    largest_contentful_paint_ms: a["largest-contentful-paint"]?.numericValue ?? null,
    total_blocking_time_ms: a["total-blocking-time"]?.numericValue ?? null,
    cumulative_layout_shift: a["cumulative-layout-shift"]?.numericValue ?? null,
    speed_index_ms: a["speed-index"]?.numericValue ?? null,
  };
}
writeFileSync("docs/perf/after.json", JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify(output, null, 2));
