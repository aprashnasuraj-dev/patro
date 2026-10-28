import{readFile}from"node:fs/promises";
import{resolve}from"node:path";
export const CLIENT_TOOL_CATALOG_FILES=["client-tools/tools.json","client-tools/audit200-tools-1.json","client-tools/audit200-tools-2.json","client-tools/audit200-tools-3.json","client-tools/audit200-tools-4.json"];
export async function loadClientTools(root=process.cwd()){const out=[];for(const file of CLIENT_TOOL_CATALOG_FILES){const rows=JSON.parse(await readFile(resolve(root,file),"utf8"));if(!Array.isArray(rows))throw new Error(file+" must contain a JSON array");out.push(...rows)}return out}
