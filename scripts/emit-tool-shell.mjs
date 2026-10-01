import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const astroDir = resolve(root, "dist/astro");
const toolsDir = resolve(root, "dist/tools");
const nativeShellRoutes = [
  "settings/community",
  "admin/community-suites",
  "jyotish/janma-patro",
  "jyotish/matchmaking",
];

await mkdir(toolsDir, { recursive: true });
await copyFile(resolve(astroDir, "index.html"), resolve(toolsDir, "index.html"));
await copyFile(resolve(astroDir, "sw.js"), resolve(toolsDir, "sw.js"));

for (const route of nativeShellRoutes) {
  const routeDir = resolve(root, "dist", ...route.split("/"));
  await mkdir(routeDir, { recursive: true });
  await copyFile(resolve(astroDir, "index.html"), resolve(routeDir, "index.html"));
}

console.log("Emitted static SPA shells for /tools and native React routes.");
