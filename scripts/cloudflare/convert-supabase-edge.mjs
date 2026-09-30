import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SOURCE_ROOT = join(ROOT, "migration/cloudflare/supabase/function-source");
const ARCHIVE_ROOT = join(ROOT, "migration/cloudflare/supabase/function-archive/by-sha");
const OUT_ROOT = join(ROOT, "cloudflare/converted-functions");

const NPM_MAP = new Map([
  ["npm:@supabase/supabase-js@2", "@supabase/supabase-js"],
  ["npm:astronomy-engine@2.1.19", "astronomy-engine"],
  ["npm:hono@4.7.2", "hono"],
  ["npm:hono@4.7.2/cors", "hono/cors"],
  ["npm:zod@4.1.12", "zod"],
]);

function sharedImport(filePath) {
  const depth = relative(OUT_ROOT, dirname(filePath)).split(/[\\/]/).filter(Boolean).length;
  return "../".repeat(Math.max(0, depth - 1)) + "_shared/env";
}

function normalizeImports(source) {
  let out = source.replace(/^\s*import\s+["']jsr:@supabase\/functions-js\/edge-runtime\.d\.ts["'];?\s*$/gm, "");
  for (const [from, to] of NPM_MAP) out = out.split(from).join(to);
  return out;
}

function convertTs(source, targetPath) {
  let out = normalizeImports(source);
  const usesEnv = out.includes("Deno.env.get");
  const isEntry = out.includes("Deno.serve(");
  if (usesEnv) out = out.replaceAll("Deno.env.get", "envGet");
  if (isEntry) out = out.replace("Deno.serve(", "const __edgeHandler = (");

  const imports = [];
  if (usesEnv) imports.push(`import { envGet } from "${sharedImport(targetPath)}";`);
  if (imports.length) out = imports.join("\n") + "\n" + out.trimStart();

  if (isEntry) {
    out += `

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    void env;
    void ctx;
    return await __edgeHandler(request);
  },
};
`;
  }
  return out;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

async function writeConverted(baseName, files) {
  for (const file of files) {
    const rel = file.name.replace(/^\/+/, "");
    if (rel === "deno.json" || rel === "import_map.json") continue;
    const target = join(OUT_ROOT, baseName, rel);
    await mkdir(dirname(target), { recursive: true });
    const converted = rel.endsWith(".ts") ? convertTs(file.content, target) : file.content;
    await writeFile(target, converted);
  }
}

await mkdir(join(OUT_ROOT, "_shared"), { recursive: true });

for (const dir of await readdir(SOURCE_ROOT, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const root = join(SOURCE_ROOT, dir.name);
  const files = (await walk(root)).map(async (path) => ({
    name: relative(root, path),
    content: await readFile(path, "utf8"),
  }));
  await writeConverted(dir.name, await Promise.all(files));
}

for (const name of await readdir(ARCHIVE_ROOT).catch(() => [])) {
  if (!name.endsWith(".json")) continue;
  const archive = JSON.parse(await readFile(join(ARCHIVE_ROOT, name), "utf8"));
  const hash = archive.bundle_sha256 || name.replace(/\.json$/, "");
  await writeConverted(join("archive", hash), archive.files || []);
}

console.log("Converted archived Supabase Edge Functions to Cloudflare module Workers.");
