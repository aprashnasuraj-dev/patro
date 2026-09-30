import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const basePath = resolve(root, "wrangler.jsonc");
const outputPath = resolve(root, "wrangler.generated.jsonc");
const base = JSON.parse(await readFile(basePath, "utf8"));
const splitPagesWorker = process.env.CF_DEPLOY_MODE?.trim() === "pages-worker";
if (splitPagesWorker) delete base.assets;

const d1Id = process.env.CF_D1_DATABASE_ID?.trim();
const kvId = process.env.CF_KV_NAMESPACE_ID?.trim();
const d1PreviewId = process.env.CF_D1_PREVIEW_DATABASE_ID?.trim();
const kvPreviewId = process.env.CF_KV_PREVIEW_NAMESPACE_ID?.trim();

if (!d1Id || !kvId) {
  const missing = [
    !d1Id && "CF_D1_DATABASE_ID",
    !kvId && "CF_KV_NAMESPACE_ID"
  ].filter(Boolean).join(", ");
  throw new Error(`Missing required Cloudflare binding IDs: ${missing}. The base wrangler.jsonc remains usable for compatibility/bootstrap deploys.`);
}

base.d1_databases = [{
  binding: "DB",
  database_name: process.env.CF_D1_DATABASE_NAME?.trim() || "mero-patro",
  database_id: d1Id,
  migrations_dir: "cloudflare/d1/schema-migrations",
  ...(d1PreviewId ? { preview_database_id: d1PreviewId } : {})
}];

base.kv_namespaces = [{
  binding: "CACHE",
  id: kvId,
  ...(kvPreviewId ? { preview_id: kvPreviewId } : {})
}];

await writeFile(outputPath, JSON.stringify(base, null, 2) + "\n", "utf8");
console.log(`Generated wrangler.generated.jsonc with D1/KV bindings and schema-only migrations (${splitPagesWorker ? "optional Pages + API Worker" : "default single Worker + Static Assets"} mode).`);
