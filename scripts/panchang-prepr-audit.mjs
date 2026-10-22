/**
 * Read-only pre-PR gate. Run manually on a complete local checkout after the build.
 * It NEVER invokes workflows, Cloudflare, deployment, migration or network APIs.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";

const BASE = process.env.PANCHANG_AUDIT_BASE || "eff3b05031cf2134731f1b57a83953bcd59d0645";
const read = (path) => readFileSync(resolve(path), "utf8");
const failures = [];
const warn = [];
const requireGate = (condition, reason) => { if (!condition) failures.push(reason); };
const diff = execFileSync("git", ["diff", "--name-only", BASE + "...HEAD"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const forbidden = [
 /^src\/features\/my-time\//, /^worker\/my-time\//, /^src\/patro-tools\/core\/my-time-/,
 /^src\/jyotish\/my-time-bridge\.ts$/, /^wrangler/, /^cloudflare\//, /^supabase\//,
 /^scripts\/cloudflare\//, /^\.github\/workflows\//, /^migration\//, /^db\//,
 /^worker\/optimized-entry\.ts$/
];
const allowedWorker = new Set(["worker/connected-entry.ts", "worker/connected-seo.ts"]);
for (const path of diff) {
  requireGate(!forbidden.some(pattern => pattern.test(path)), "Protected file changed: " + path);
  if (path.startsWith("worker/")) requireGate(allowedWorker.has(path), "Unapproved Worker source change: " + path);
}
const catalog = read("src/panchang-jyotish/catalog.ts");
const ids = [...catalog.matchAll(/feature\("(F\d{3})",/g)].map(match => match[1]);
requireGate(ids.length === 91 && new Set(ids).size === 91, "Catalog must contain exactly 91 unique features");
const router = read("src/PatroRouter.tsx");
const workerRoutes = read("worker/connected-entry.ts");
const seo = read("scripts/seo-config.mjs");
const groups = ["/panchang", "/muhurat", "/jyotish", "/planets", "/nepal-calendar"];
for (const route of groups) {
  requireGate(router.includes('path==="' + route + '"'), "SPA route missing: " + route);
  requireGate(workerRoutes.includes('"' + route + '"'), "Static route allowlist missing: " + route);
  requireGate(seo.includes('"' + route + '"'), "Sitemap core route missing: " + route);
}
requireGate(seo.includes("RAW_TOOL_ROUTES.length !== 29"), "The existing 29-tool invariant must remain intact");
requireGate(read("src/panchang-jyotish/FeatureGroupHub.tsx").includes("useUiLanguage"), "New hubs must use homepage language");
requireGate(read("src/panchang-jyotish/contract.ts").includes('PANCHANG_CONTRACT_VERSION = "1.0.0"'), "Shared Panchang contract missing");
requireGate(read("src/panchang-jyotish/archive-adapter.ts").includes('archiveDay('), "Existing static archive adapter missing");
for (const name of ["Panchang", "Muhurat", "Jyotish", "Planets", "Regional"]) {
  const code = read("src/panchang-jyotish/workspaces/" + name + "Workspace.tsx");
  requireGate(!/\bfetch\s*\(|XMLHttpRequest|\bDB\.prepare\s*\(/.test(code), "Unapproved calculation/API request in " + name);
}
const indexPath = resolve("dist/sitemap.xml");
const pagesPath = resolve("dist/sitemap-pages.xml");
if (!existsSync(indexPath) || !existsSync(pagesPath)) {
  failures.push("Build + SEO output not present: cannot certify final generated sitemap");
} else {
  const index = readFileSync(indexPath, "utf8");
  const pages = readFileSync(pagesPath, "utf8");
  requireGate(index.includes("sitemap-pages.xml"), "Master sitemap does not reference page cohort");
  for (const route of groups) requireGate(pages.includes("https://aafnaipatro.com" + route + "<"), "Generated sitemap missing " + route);
}
function htmlPaths(directory, paths = []) {
  if (!existsSync(directory)) return paths;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) htmlPaths(path, paths);
    else if (path.endsWith(".html")) paths.push(path);
  }
  return paths;
}
const html = htmlPaths(resolve("dist"));
for (const route of groups) {
  requireGate(existsSync(resolve("dist", route.slice(1), "index.html")), "Missing static HTML hub output: " + route);
}
const report = {
  mode: "read-only-prepr",
  base: BASE,
  changedFiles: diff.length,
  featureCatalogRows: ids.length,
  groups: groups.length,
  staticHtmlFiles: html.length,
  completeBuildArtifactMeasured: html.length > 0,
  failures,
  warnings: warn,
  ready: failures.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
