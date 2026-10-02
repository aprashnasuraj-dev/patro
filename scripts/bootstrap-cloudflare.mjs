import { spawnSync } from "node:child_process";
import { ensureRemoteD1Content } from "./ensure-d1-content.mjs";

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

// Ordered deliberately: schema -> inspect -> seed only if empty -> verify -> Worker/assets.
// An existing populated D1 is never bulk-reseeded. Verification fails closed if required
// canonical data is incomplete.
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", "wrangler.generated.jsonc"]);
try {
  ensureRemoteD1Content({ config: "wrangler.generated.jsonc" });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
run("node", ["scripts/verify-d1-remote.mjs", "wrangler.generated.jsonc"]);
run("npx", ["wrangler", "deploy", "--config", "wrangler.generated.jsonc"]);
