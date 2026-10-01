import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relative) {
  return readFile(path.join(root, relative), "utf8");
}

async function json(relative) {
  return JSON.parse(await read(relative));
}

test("documented Cloudflare lifecycle commands exist", async () => {
  const pkg = await json("package.json");
  const required = [
    "build",
    "cloudflare:validate",
    "cloudflare:verify-snapshot",
    "cloudflare:verify-d1-remote",
    "cloudflare:verify-inventory",
    "cloudflare:smoke",
    "deploy:cloudflare:bootstrap",
    "deploy:cloudflare",
    "deploy:pages"
  ];
  for (const name of required) {
    assert.equal(typeof pkg.scripts?.[name], "string", `missing package script: ${name}`);
    assert.ok(pkg.scripts[name].trim(), `empty package script: ${name}`);
  }
  assert.equal(pkg.cloudflare?.deploy_command, "npm run deploy:cloudflare");
});

test("script files referenced by lifecycle commands exist", async () => {
  const expected = [
    "scripts/deploy-cloudflare.mjs",
    "scripts/bootstrap-cloudflare.mjs",
    "scripts/validate-cloudflare.mjs",
    "scripts/generate-d1-migrations.mjs",
    "scripts/verify-d1-remote.mjs",
    "scripts/verify-migration-inventory.mjs",
    "scripts/cutover-smoke.mjs"
  ];
  for (const relative of expected) {
    await assert.doesNotReject(access(path.join(root, relative)), relative);
  }
});

test("migration handoff documents exist", async () => {
  const docs = [
    "docs/INVENTORY.md",
    "PLAN.md",
    "DEPLOY.md",
    "CHANGELOG.md",
    "docs/CLOUDFLARE_GIT_DEPLOY.md",
    "docs/CLOUDFLARE_MIGRATION_PARITY.md",
    "cloudflare/migration-manifest.json",
    "cloudflare/source-runtime-manifest.json"
  ];
  for (const relative of docs) {
    await assert.doesNotReject(access(path.join(root, relative)), relative);
  }
});

test("production Worker owns the canonical custom domain and does not require preview URLs", async () => {
  const config = await json("wrangler.jsonc");
  assert.equal(config.name, "patro");
  assert.equal(config.main, "worker/connected-entry.ts");
  assert.equal(config.preview_urls, false, "production deploy must not depend on Worker preview creation");
  const route = (config.routes || []).find((entry) => entry.pattern === "aafnaipatro.com");
  assert.ok(route, "canonical production custom-domain route is missing");
  assert.equal(route.custom_domain, true);
});

test("default Wrangler TOML cannot drift from production Worker routing", async () => {
  const toml = await read("wrangler.toml");
  assert.match(toml,/^name\s*=\s*"patro"/m);
  assert.match(toml,/^main\s*=\s*"worker\/connected-entry\.ts"/m);
  assert.match(toml,/^preview_urls\s*=\s*false/m);
  assert.match(toml,/\[\[routes\]\][\s\S]*pattern\s*=\s*"aafnaipatro\.com"[\s\S]*custom_domain\s*=\s*true/);
  assert.match(toml,/\[assets\][\s\S]*not_found_handling\s*=\s*"none"/);
  assert.match(toml,/run_worker_first\s*=\s*\["\/\*",\s*"!\/assets\/\*"\]/);
});

test("Pages configuration keeps the internal API service binding", async () => {
  const config = await json("wrangler.pages.jsonc");
  assert.equal(config.pages_build_output_dir, "./dist");
  const binding = (config.services || []).find((entry) => entry.binding === "PATRO_API");
  assert.ok(binding, "PATRO_API service binding is missing");
  assert.equal(binding.service, "mero-patro");
});

test("README and runbook only document lifecycle commands that package.json exposes", async () => {
  const [pkg, readme, runbook] = await Promise.all([
    json("package.json"),
    read("README.md"),
    read("docs/CLOUDFLARE_GIT_DEPLOY.md")
  ]);
  for (const command of [
    "deploy:cloudflare:bootstrap",
    "deploy:cloudflare",
    "cloudflare:validate",
    "cloudflare:verify-d1-remote",
    "cloudflare:smoke",
    "deploy:pages"
  ]) {
    const marker = `npm run ${command}`;
    if (readme.includes(marker) || runbook.includes(marker)) {
      assert.equal(typeof pkg.scripts?.[command], "string", `documented command has no package script: ${marker}`);
    }
  }
});
