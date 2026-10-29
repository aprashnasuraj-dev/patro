import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node --experimental-strip-types scripts/reports/phase1.ts <events.ndjson>");
  process.exit(2);
}
const events = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const count = (name: string) => events.filter((e) => e.event === name).length;
const ratio = (a: number, b: number) => b ? a / b : null;
const countries = new Map<string, number>();
const devices = new Map<string, number>();
for (const e of events) {
  const country = e.country_code || "unknown";
  const device = e.device_class || "unknown";
  countries.set(country, (countries.get(country) || 0) + 1);
  devices.set(device, (devices.get(device) || 0) + 1);
}
const searches = count("nepalmap.search.started");
const routes = count("nepalmap.route.requested");
const output = {
  total_events: events.length,
  countries: Object.fromEntries([...countries].sort((a,b)=>b[1]-a[1])),
  device_classes: Object.fromEntries([...devices].sort((a,b)=>b[1]-a[1])),
  nepal_search: {
    started: searches,
    selected: count("nepalmap.search.result_selected"),
    zero_result: count("nepalmap.search.zero_result"),
    selection_rate: ratio(count("nepalmap.search.result_selected"), searches),
    zero_result_rate: ratio(count("nepalmap.search.zero_result"), searches),
  },
  nepal_route: {
    requested: routes,
    succeeded: count("nepalmap.route.succeeded"),
    failed: count("nepalmap.route.failed"),
    success_rate: ratio(count("nepalmap.route.succeeded"), routes),
  },
  bali_tasks: {
    date_navigation: count("bali.date.navigated"),
    month_navigation: count("bali.month.navigated"),
    otonan: count("bali.otonan.calculated"),
    rerainan_search: count("bali.rerainan.searched"),
    feed_subscriptions: count("bali.feed.subscribed"),
  },
  returning_user_rate: null,
  returning_user_note: "Not measurable from memory-scoped tab sessions without adding a persistent identifier. This report refuses to infer cross-session retention.",
};
console.log(JSON.stringify(output, null, 2));
