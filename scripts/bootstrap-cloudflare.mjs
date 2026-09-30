import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const d1 = process.env.CF_D1_DATABASE_ID?.trim();
const kv = process.env.CF_KV_NAMESPACE_ID?.trim();
if (!d1 || !kv) {
  console.error("First native Cloudflare deployment requires CF_D1_DATABASE_ID and CF_KV_NAMESPACE_ID.");
  process.exit(2);
}

run("npm", ["run", "build"]);
run("node", ["scripts/generate-d1-migrations.mjs"]);
run("node", ["scripts/prepare-cloudflare-config.mjs"]);

// First native deployment is ordered deliberately: schema -> content -> inspection -> Worker.
// Cloudflare D1 bulk import can be safely retried if an import fails.
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", "wrangler.generated.jsonc"]);
run("npx", [
  "wrangler", "d1", "execute", "DB", "--remote",
  "--file=.cloudflare/d1-import/content-snapshot.sql",
  "--yes",
  "--config", "wrangler.generated.jsonc"
]);
run("node", ["scripts/verify-d1-remote.mjs"]);
run("npx", ["wrangler", "deploy", "--config", "wrangler.generated.jsonc"]);
