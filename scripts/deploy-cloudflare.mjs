import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { ensureRemoteD1Content } from "./ensure-d1-content.mjs";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);
run("node", ["scripts/generate-d1-migrations.mjs"]);

// Workers Static Assets does not use Pages redirects. The Worker owns SPA routing and real 404s.
rmSync("dist/_redirects", { force: true });

// D1 is committed in wrangler.jsonc as the single production DB. KV is optional.
const hasOverrides = Boolean(
  process.env.CF_D1_DATABASE_ID?.trim() ||
  process.env.CF_D1_DATABASE_NAME?.trim() ||
  process.env.CF_D1_PREVIEW_DATABASE_ID?.trim() ||
  process.env.CF_KV_NAMESPACE_ID?.trim() ||
  process.env.CF_KV_PREVIEW_NAMESPACE_ID?.trim() ||
  process.env.CF_DEPLOY_MODE?.trim()
);

const config = hasOverrides ? "wrangler.generated.jsonc" : "wrangler.jsonc";
if (hasOverrides) run("node", ["scripts/prepare-cloudflare-config.mjs"]);

// Safe production order: schema -> inspect -> seed only a truly empty D1 -> count/parity verify -> deploy.
// Populated databases never enter the bulk-import path.
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", config]);
try {
  ensureRemoteD1Content({ config });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
run("node", ["scripts/verify-d1-remote.mjs", config]);
run("npx", ["wrangler", "deploy", "--config", config]);

// Search discovery is post-deploy so the public IndexNow key and changed URLs are already live.
// The submitter is non-fatal by default; set INDEXNOW_STRICT=1 for a release gate.
if (process.env.SKIP_INDEXNOW !== "1") run("node", ["scripts/indexnow.mjs"]);
