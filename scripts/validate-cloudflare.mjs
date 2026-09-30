import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);

const d1 = process.env.CF_D1_DATABASE_ID?.trim();
const kv = process.env.CF_KV_NAMESPACE_ID?.trim();

if (Boolean(d1) !== Boolean(kv)) {
  console.error("CF_D1_DATABASE_ID and CF_KV_NAMESPACE_ID must either both be set or both be absent.");
  process.exit(2);
}

let config = "wrangler.jsonc";
if (d1 && kv) {
  run("node", ["scripts/prepare-cloudflare-config.mjs"]);
  config = "wrangler.generated.jsonc";
}
run("npx", ["wrangler", "deploy", "--dry-run", "--outdir", ".cloudflare/dry-run", "--config", config]);
