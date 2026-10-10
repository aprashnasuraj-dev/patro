// Dev tool: render explore pages from a local build without a Worker.
//   node scripts/explore/build.mjs --out /tmp/ex && node scripts/explore/preview.mjs /tmp/ex /nepal/bajhang /bhajang
// Prints status/redirect/robots per path and writes the HTML to /tmp/claude-0/preview/.
import { build } from "esbuild";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const out = await build({ entryPoints: ["worker/explore/index.ts"], bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "error" });
const mod = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
const dir = process.argv[2];
const bucket = { async get(key) { const f = join(dir, key.replace("explore/v1/", "")); if (!existsSync(f)) return null; const t = readFileSync(f, "utf8"); return { body: new Response(t).body, httpEtag: '"x"', text: async () => t }; } };
mkdirSync("/tmp/claude-0/preview", { recursive: true });
for (const p of process.argv.slice(3)) {
  const res = await mod.exploreResponse(new Request("https://aafnaipatro.com" + p), { ARCHIVE: bucket, PUBLIC_SITE_URL: "https://aafnaipatro.com" });
  if (!res) { console.log(p, "null"); continue; }
  const html = await res.text();
  console.log(p, res.status, res.headers.get("location") || "", res.headers.get("x-robots-tag") || "", html.length);
  if (res.status === 200) writeFileSync("/tmp/claude-0/preview/" + p.replace(/\//g, "_") + ".html", html);
}
