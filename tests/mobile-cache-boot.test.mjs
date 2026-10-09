import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");

test("daily HTML cache keys include both Nepal date and deployed build", () => {
  const worker = read("worker/daily-html.tsx");
  const prepare = read("scripts/prepare-cloudflare-config.mjs");
  assert.match(worker, /daily-html-v3/);
  assert.match(worker, /date:boundary\.date,build:buildId/);
  assert.match(worker, /if\(buildId&&typeof caches/);
  assert.match(worker, /x-patro-html-build/);
  assert.match(prepare, /dist\/index\.html/);
  assert.match(prepare, /createHash\("sha256"\)/);
  assert.match(prepare, /PATRO_HTML_BUILD_ID:htmlBuildId/);
});

test("active service worker and page code agree on revisions and cache names", () => {
  const sw = read("public/sw.js");
  const client = read("src/pwa.ts");
  const revision = sw.match(/const VERSION = "(.*?)"/)?.[1];
  const cache = sw.match(/const SHELL_CACHE = "(.*?)"/)?.[1];
  assert.ok(revision && client.includes('const SW_REVISION = "' + revision + '"'));
  assert.ok(cache && client.includes('"' + cache + '"'));
  assert.match(client, /!ACTIVE_RUNTIME_CACHES\.has\(name\)/);
});

function simulatedBoot(reactRunning, hasPlaceholder = true) {
  const added = [], elements = [];
  const root = {
    querySelector(selector) {
      if (selector === ".ap-shell") return reactRunning ? {} : null;
      if (selector === "[data-seo-prerender]") return hasPlaceholder ? {} : null;
      return null;
    },
    append(element) { added.push(element); }
  };
  const body = { style: {} };
  const document = {
    readyState: "complete", body,
    getElementById(id) { return id === "root" ? root : (id === "patro-boot-recovery" ? added[0] : null); },
    createElement(tag) {
      const el = { tag, style: {}, append(...children) { el.children = children; },
        setAttribute(k, v) { el[k] = v; }, addEventListener(name, cb) { el[name] = cb; } };
      elements.push(el);
      return el;
    }
  };
  let reloaded = "";
  const location = { href: "https://aafnaipatro.com/", replace(url) { reloaded = url; } };
  const window = { setTimeout(cb) { cb(); } };
  runInNewContext(read("public/patro-boot-recovery.js"), { document, window, location, URL, Date });
  return { added, elements, body, get reloaded() { return reloaded; } };
}

test("healthy React UI stays untouched, failed startup shows a user-controlled recovery", () => {
  const healthy = simulatedBoot(true);
  assert.equal(healthy.added.length, 0);
  const failed = simulatedBoot(false);
  assert.equal(failed.added.length, 1);
  assert.equal(failed.added[0].id, "patro-boot-recovery");
  assert.equal(failed.body.style.backgroundColor, "#f5f7f4");
  const button = failed.elements.find((el) => el.tag === "button");
  assert.equal(failed.reloaded, "");
  button.click();
  assert.match(failed.reloaded, /patro_refresh=/);
  assert.equal(simulatedBoot(false, false).added.length, 0);
});

test("recovery script is included in HTML and optional services cannot block main render", () => {
  assert.match(read("index.html"), /<script defer src="\/patro-boot-recovery\.js"><\/script>/);
  const main = read("src/main.tsx");
  const createIndex = main.indexOf("createRoot(root).render(");
  const optionalIndex = main.indexOf("for (const initialize of [registerPatroServiceWorker");
  assert.ok(createIndex > 0 && optionalIndex > createIndex);
});
