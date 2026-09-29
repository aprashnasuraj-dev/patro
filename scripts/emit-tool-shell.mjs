import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const astroDir = resolve(root, "dist/astro");
const toolsDir = resolve(root, "dist/tools");

await mkdir(toolsDir, { recursive: true });
await copyFile(resolve(astroDir, "index.html"), resolve(toolsDir, "index.html"));
await copyFile(resolve(astroDir, "sw.js"), resolve(toolsDir, "sw.js"));

console.log("Emitted static /tools shell from the verified /astro build.");
