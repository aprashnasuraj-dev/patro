import { readFileSync, writeFileSync } from "node:fs";

const path = "public/_headers";
const text = readFileSync(path, "utf8");
const start = text.indexOf("# Nepal map ");
const end = text.indexOf("/data/nepalmap/*", start);
if (start < 0 || end < 0) throw new Error("Nepal Map header block not found");
const before = text.slice(0, start);
let block = text.slice(start, end);
const after = text.slice(end);

block = block
  .replaceAll(" https://cdn.jsdelivr.net", "")
  .replaceAll("script-src 'self' 'unsafe-inline'", "script-src 'self'")
  .replaceAll("worker-src 'self' blob:;", "worker-src 'self';")
  .replaceAll("worker-src 'self' blob: https://cdn.jsdelivr.net;", "worker-src 'self';");

if (process.argv.includes("--check")) {
  if (block.includes("cdn.jsdelivr.net")) throw new Error("Nepal Map CSP still permits jsDelivr");
  if (/worker-src[^;]*blob:/.test(block)) throw new Error("Nepal Map CSP still permits blob workers");
  if (/script-src[^;]*unsafe-inline/.test(block)) throw new Error("Nepal Map executable script policy still permits unsafe-inline");
  console.log("Nepal Map CSP is same-origin-runtime compatible");
  process.exit(0);
}
if (!process.argv.includes("--write")) {
  console.log(block);
  process.exit(0);
}
writeFileSync(path, before + block + after);
console.log("Updated Nepal Map CSP: jsDelivr removed and worker-src restricted to self");
