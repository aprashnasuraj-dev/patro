import { access, copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const shell = resolve(root, "dist/index.html");
const toolsDir = resolve(root, "dist/tools");
const nativeShellRoutes = [
  "settings/community",
  "admin/community-suites",
  "jyotish/janma-patro",
  "jyotish/matchmaking",
];

await access(shell);
await mkdir(toolsDir, { recursive: true });
await copyFile(shell, resolve(toolsDir, "index.html"));

const publicToolWorker = resolve(root, "public/astro/sw.js");
try {
  await access(publicToolWorker);
  await copyFile(publicToolWorker, resolve(toolsDir, "sw.js"));
} catch {
  // Tool service worker is optional for the root SPA; do not fabricate one.
}

for (const route of nativeShellRoutes) {
  const routeDir = resolve(root, "dist", ...route.split("/"));
  await mkdir(routeDir, { recursive: true });
  await copyFile(shell, resolve(routeDir, "index.html"));
}

console.log("Emitted root SPA compatibility shells for /tools and native React routes.");
