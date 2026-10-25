import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { GOOGLE_TAG_ID, installGoogleTag, googleTagCsp } from "../shared/google-tag.ts";

export async function installGoogleTagInBuild(root) {
  let count = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!["admin", "admin-console"].includes(entry.name)) await walk(path);
      } else if (entry.name.endsWith(".html")) {
        const before = await readFile(path, "utf8");
        const after = installGoogleTag(before);
        if (after !== before) await writeFile(path, after);
        if (after.includes("data-patro-google-tag")) count++;
      }
    }
  }
  await walk(root);
  const headersPath = join(root, "_headers");
  const headers = await readFile(headersPath, "utf8");
  await writeFile(headersPath, headers.replace(/^(\s+Content-Security-Policy:\s*)(.+)$/gmi, (_, prefix, policy) => prefix + googleTagCsp(policy)));

  // The downloadable module stays unchanged. Its deployed manifest must describe
  // the actual tagged HTML bytes, rather than the portable bundle's originals.
  const manifestPath = join(root, "advancetools/module-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  let bytes = 0;
  for (const file of Object.keys(manifest.hashes)) {
    const data = await readFile(join(root, "advancetools", file));
    manifest.hashes[file] = createHash("sha256").update(data).digest("hex");
    bytes += data.byteLength;
  }
  // The module's byte count excludes its own manifest, as in its generator.
  manifest.bytes = bytes;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  if (!count || !(await stat(join(root, "index.html"))).size) throw new Error("Google tag build: missing HTML output");
  console.log(`Google tag ${GOOGLE_TAG_ID} installed once in ${count} static HTML pages; CSP and module hashes updated.`);
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await installGoogleTagInBuild(resolve(process.argv[2] || "dist"));
}
