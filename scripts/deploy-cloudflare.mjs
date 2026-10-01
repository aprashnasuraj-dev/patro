import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);

// `_redirects` is a Cloudflare Pages routing artifact. The production target is a
// Worker with native route handling in worker/index.ts, and Workers Static Assets
// rejects the Pages SPA catch-all (`/* /index.html 200`) as an infinite loop.
// Keep the source file for Pages compatibility, but never upload it with Worker assets.
rmSync("dist/_redirects", { force: true });

// D1 is committed in wrangler.jsonc as the single production DB. KV is optional.
// Normal deploys apply schema migrations only; they never bulk-reseed the 77k+ reference dataset.
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

// Safe routine order: schema first, Worker/assets second.
// Full reference-data import remains an explicit one-time recovery/bootstrap operation.
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", config]);
run("npx", ["wrangler", "deploy", "--config", config]);
