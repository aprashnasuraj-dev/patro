import { copyFile, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
const root=process.cwd(),dist=resolve(root,"dist"),index=resolve(dist,"index.html");
await access(index);
const nativeShellRoutes=["tools","settings/community","admin/community-suites","jyotish/janma-patro","jyotish/matchmaking"];
for(const route of nativeShellRoutes){const dir=resolve(dist,...route.split("/"));await mkdir(dir,{recursive:true});await copyFile(index,resolve(dir,"index.html"));}
console.log("Emitted static SPA shells from root index.html.");
