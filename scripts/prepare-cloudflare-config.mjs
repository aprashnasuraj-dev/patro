import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const basePath = resolve(root, "wrangler.jsonc");
const outputPath = resolve(root, "wrangler.generated.jsonc");
const base = JSON.parse(await readFile(basePath, "utf8"));
const splitPagesWorker = process.env.CF_DEPLOY_MODE?.trim() === "pages-worker";
if (splitPagesWorker) delete base.assets;

const configuredD1 = Array.isArray(base.d1_databases) ? base.d1_databases.find((row) => row?.binding === "DB") : null;
const d1Id = process.env.CF_D1_DATABASE_ID?.trim() || configuredD1?.database_id;
const d1Name = process.env.CF_D1_DATABASE_NAME?.trim() || configuredD1?.database_name || "patro";
const kvId = process.env.CF_KV_NAMESPACE_ID?.trim();
const d1PreviewId = process.env.CF_D1_PREVIEW_DATABASE_ID?.trim();
const kvPreviewId = process.env.CF_KV_PREVIEW_NAMESPACE_ID?.trim();

if (!d1Id) {
  throw new Error("Cloudflare D1 DB binding is missing. Configure DB in wrangler.jsonc or set CF_D1_DATABASE_ID.");
}

base.d1_databases = [{
  binding: "DB",
  database_name: d1Name,
  database_id: d1Id,
  migrations_dir: "cloudflare/d1/schema-migrations",
  ...(d1PreviewId ? { preview_database_id: d1PreviewId } : {})
}];

if (kvId) {
  base.kv_namespaces = [{
    binding: "CACHE",
    id: kvId,
    ...(kvPreviewId ? { preview_id: kvPreviewId } : {})
  }];
} else {
  delete base.kv_namespaces;
}

await writeFile(outputPath, JSON.stringify(base, null, 2) + "\n", "utf8");
console.log(`Generated wrangler.generated.jsonc with D1=${d1Name}; KV cache ${kvId ? "enabled" : "optional/not configured"} (${splitPagesWorker ? "optional Pages + API Worker" : "default single Worker + Static Assets"} mode).`);
