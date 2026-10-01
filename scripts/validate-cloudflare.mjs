import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);
run("node", ["scripts/verify-migration-inventory.mjs"]);
run("node", ["scripts/generate-d1-migrations.mjs", "--verify-only"]);

const hasOverrides = Boolean(
  process.env.CF_D1_DATABASE_ID?.trim() ||
  process.env.CF_D1_DATABASE_NAME?.trim() ||
  process.env.CF_D1_PREVIEW_DATABASE_ID?.trim() ||
  process.env.CF_KV_NAMESPACE_ID?.trim() ||
  process.env.CF_KV_PREVIEW_NAMESPACE_ID?.trim() ||
  process.env.CF_DEPLOY_MODE?.trim()
);

let config = "wrangler.jsonc";
if (hasOverrides) {
  run("node", ["scripts/prepare-cloudflare-config.mjs"]);
  config = "wrangler.generated.jsonc";
}

run("npx", ["wrangler", "deploy", "--dry-run", "--outdir", ".cloudflare/dry-run", "--config", config]);

// A fresh Cloudflare Git import can discover wrangler.toml before the explicit deploy command runs.
// Keep that discovery path deployable and in lock-step with the canonical JSON configuration.
if (!hasOverrides) {
  run("npx", ["wrangler", "deploy", "--dry-run", "--outdir", ".cloudflare/dry-run-toml", "--config", "wrangler.toml"]);
}
