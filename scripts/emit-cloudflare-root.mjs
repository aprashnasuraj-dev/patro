import { access } from "node:fs/promises";
import { resolve } from "node:path";

const index=resolve(process.cwd(),"dist/index.html");
try{await access(index);}catch{throw new Error("cloudflare emit: dist/index.html is missing");}
console.log("Cloudflare root SPA shell emitted by Vite.");
