const origin = String(process.env.SEO_LIVE_ORIGIN || "https://aafnaipatro.com").replace(/\/+$/, "");
const agents = ["Googlebot", "OAI-SearchBot", "PerplexityBot", "Claude-SearchBot"];
const paths = ["/today", "/methodology", "/calendar/2083", "/tools/bstoad"];

const normalized = (html) => ({
  hasH1: /<h1[\s>]/i.test(html),
  hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(html),
  hasJsonLd: /application\/ld\+json/i.test(html),
  rootOnly: /<div\s+id=["']root["']\s*><\/div>/i.test(html) && !/<main[\s>]/i.test(html),
  brand: /आफ्नै पात्रो|Aafnai Patro/i.test(html)
});

let failures = 0;
for (const path of paths) {
  let baseline = null;
  for (const agent of agents) {
    const response = await fetch(origin + path, { headers: { "user-agent": agent, accept: "text/html" }, redirect: "manual" });
    const text = await response.text();
    const shape = normalized(text);
    if (response.status !== 200) { console.error(`${agent} ${path}: HTTP ${response.status}`); failures++; continue; }
    if (!shape.hasH1 || !shape.hasCanonical || !shape.brand || shape.rootOnly) {
      console.error(`${agent} ${path}: incomplete crawlable HTML`, shape); failures++;
    }
    if (!baseline) baseline = shape;
    else if (JSON.stringify(shape) !== JSON.stringify(baseline)) {
      console.error(`${agent} ${path}: bot-visible HTML shape differs from baseline`, { baseline, shape }); failures++;
    }
    console.log(`${agent.padEnd(18)} ${path.padEnd(24)} 200 h1=${shape.hasH1} canonical=${shape.hasCanonical} jsonld=${shape.hasJsonLd}`);
  }
}
if (failures) throw new Error(`Live crawler verification failed with ${failures} finding(s)`);
console.log(`Live crawler verification passed for ${agents.length} crawler identities across ${paths.length} public routes at ${origin}.`);
