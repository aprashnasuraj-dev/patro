const { spawnSync } = require("node:child_process");

for (const script of [
  "scripts/check-tool-actions-core.cjs",
  "scripts/check-voice-dictation-action.cjs",
  "scripts/check-pwa-install-ui.cjs"
]) {
  const run = spawnSync(process.execPath, [script], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
  if (run.status !== 0) {
    console.error(`Primary interaction gate failed in ${script} with status ${run.status}`);
    process.exit(run.status || 1);
  }
}
console.log("Primary interaction gate passed, including bilingual voice dictation and PWA install UI.");
