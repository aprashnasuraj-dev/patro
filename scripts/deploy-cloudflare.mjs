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

if (!d1 && !kv) {
  console.log("Cloudflare binding IDs are not set; deploying compatibility/bootstrap Worker without D1/KV.");
  run("npx", ["wrangler", "deploy", "--config", "wrangler.jsonc"]);
  process.exit(0);
}

run("node", ["scripts/generate-d1-migrations.mjs"]);
run("node", ["scripts/prepare-cloudflare-config.mjs"]);
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", "wrangler.generated.jsonc"]);
run("npx", ["wrangler", "deploy", "--config", "wrangler.generated.jsonc"]);
