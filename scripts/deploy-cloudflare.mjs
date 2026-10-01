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

// `_redirects` is retained in source for Pages/static-host parity, but Workers Static Assets
// interprets the file itself. The Worker owns SPA routing and real 404s, so do not upload it.
rmSync("dist/_redirects", { force: true });

// D1 is committed in wrangler.jsonc as the single production DB. KV is optional.
// Normal deploys apply schema migrations only; they never bulk-reseed the reference dataset.
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
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", config]);
run("npx", ["wrangler", "deploy", "--config", config]);
