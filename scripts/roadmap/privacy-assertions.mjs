import { readFileSync } from "node:fs";
const telemetry = readFileSync("worker/roadmap/telemetry.ts", "utf8");
for (const token of ["latitude","longitude","bbox","ip_?address","user_?agent","referrer","query","address"]) {
  if (!telemetry.includes(token)) throw new Error("telemetry forbidden-field guard missing token: " + token);
}
const app = readFileSync("scripts/explore/nepal/map/app.js", "utf8");
if (!app.includes("confirmLocationDisclosure")) throw new Error("near-me disclosure guard missing");
if (!app.includes("external FOSSGIS routing service")) throw new Error("route disclosure missing");
console.log("roadmap privacy assertions: pass");
