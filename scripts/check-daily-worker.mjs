import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const port = Number(process.env.PATRO_WORKER_TEST_PORT || 8790);
const origin = `http://127.0.0.1:${port}`;
const processHandle = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--config", "wrangler.jsonc"], { stdio: ["ignore", "pipe", "pipe"] });
let diagnostics = "";
for (const stream of [processHandle.stdout, processHandle.stderr]) stream.on("data", data => { diagnostics = (diagnostics + data).slice(-8000); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (processHandle.exitCode !== null) throw Error(`Local Worker exited: ${diagnostics}`);
    try { await fetch(origin + "/robots.txt", {signal: AbortSignal.timeout(1000)}); ready = true; break; } catch { await delay(500); }
  }
  assert.ok(ready, `Local Worker did not start: ${diagnostics}`);
  const today = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  for (const path of ["/", "/today"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-patro-day"), today);
    const html = await response.text();
    assert.match(html, /id="rh-today-title"/);
    const bootstrap = html.match(/<script[^>]*id="patro-today-data"[^>]*>(.*?)<\/script>/s);
    assert.ok(bootstrap, "Daily facts must exist before JavaScript runs");
    const facts = JSON.parse(bootstrap[1]);
    assert.equal(facts.date, today); assert.ok(facts.view.bs.year); assert.ok(facts.view.panchang.tithi);
    assert.equal((html.match(/id="rh-today-title"/g) || []).length, 1, "one daily hero");
    assert.ok(Number(response.headers.get("cache-control").match(/s-maxage=(\d+)/)?.[1]) <= 86400);
    const head = await fetch(origin + path, {method:"HEAD"});
    assert.equal(head.status,200); assert.equal(head.headers.get("x-patro-day"),today); assert.equal(await head.text(), "");
  }
  const rashifal = await fetch(origin + "/rashifal?sign=aries");
  assert.equal(rashifal.status, 200);
  const horoscope = await rashifal.text();
  assert.equal((horoscope.match(/id="rashi-[^"]+"/g) || []).length, 12, "all 12 readings remain in raw HTML");
  const conversion = await fetch(origin + "/bs-to-ad/2083-baisakh-1");
  assert.equal(conversion.status,200); assert.match(await conversion.text(), /2026-04-14/);
  const invalid = await fetch(origin + "/bs-to-ad/2083-baisakh-99"); assert.equal(invalid.status,404);
  console.log("Local Cloudflare Worker verified: daily raw HTML, bootstrap, HEAD, all 12 readings, valid/invalid conversions.");
} finally { processHandle.kill("SIGTERM"); }
