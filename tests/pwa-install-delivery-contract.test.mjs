import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("PWA assets are static and manifest meets Chromium's declared criteria",()=>{
  const routes=JSON.parse(read("wrangler.jsonc")).assets.run_worker_first;
  for(const path of ["manifest.webmanifest","sw.js","pwa-install-early.js","icon-192.png","icon-512.png","maskable-512.png"]) {
    assert.ok(routes.includes("!/"+path),"/"+path+" must bypass the Worker");
  }
  const manifest=JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.scope,"/");
  assert.equal(manifest.prefer_related_applications,false);
  for(const size of ["192x192","512x512"])assert.ok(manifest.icons.some(icon=>icon.sizes===size));
});
test("Service worker registration does not wait for window load",()=>{
  const source=read("src/pwa.ts");
  assert.ok(source.includes('document.addEventListener("DOMContentLoaded", register'));
  assert.ok(source.includes('document.readyState'));
  assert.ok(!source.includes('window.addEventListener("load",'));
});
test("Native install CTA appears immediately on event; Android fallback is delayed",()=>{
  const source=read("src/components/PwaInstallExperience.tsx");
  assert.ok(source.includes("const INSTALL_NOTICE_DELAY_MS=32000"));
  assert.ok(source.includes("setShowNotice(true);"));
  assert.ok(source.includes("browser.android&&!browser.embedded?INSTALL_NOTICE_DELAY_MS"));
});
