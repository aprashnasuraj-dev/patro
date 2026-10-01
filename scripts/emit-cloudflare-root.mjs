import { access } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const shell = resolve(root, "dist/index.html");

try {
  await access(shell);
} catch {
  throw new Error("cloudflare emit: dist/index.html is missing; the main SPA must build at the site root");
}

console.log("Cloudflare root SPA shell verified at dist/index.html.");
