import test from "node:test";
import assert from "node:assert/strict";
import { routeMode } from "../functions/[[path]].js";

const workerRoutes = [
  "/",
  "/convert",
  "/search",
  "/notes",
  "/planner",
  "/settings",
  "/feedback",
  "/developers",
  "/data-trust",
  "/nepal-sambat",
  "/on-this-day",
  "/astrology",
  "/widget/today",
  "/calendar/2083/06",
  "/date/2026-09-30",
  "/festival/dashain",
  "/time-machine",
  "/samachar",
  "/api/v1/health",
  "/api/jyotish-chat",
  "/api/rashifal_engine.py",
  "/fm-v2-stream/station",
  "/fm-stream/station",
  "/tools/tithi",
  "/tools/diaspora",
  "/tools/card",
  "/tools/family",
  "/tools/api",
  "/tools/my-data"
];

const staticRoutes = [
  "/news",
  "/history",
  "/astro",
  "/astro/",
  "/astro/assets/app.js",
  "/fm",
  "/tv",
  "/tools",
  "/tools/",
  "/tools/nepali-typing",
  "/tools/unicode-to-preeti",
  "/tools/preeti-to-unicode",
  "/tools/fuelprice",
  "/tools/nepaliqr",
  "/tools/incometax",
  "/tools/landconverter",
  "/tools/adtobs",
  "/tools/bstoad",
  "/tools/unicodetopreeti",
  "/tools/preetitounicode",
  "/tools/preeti-converter",
  "/tools/typingtools",
  "/tools/sw.js",
  "/samudaya",
  "/samudaya/lhosar",
  "/nepal-sambat/mandala",
  "/settings/community",
  "/admin/community-suites",
  "/explore",
  "/my-diary",
  "/about",
  "/sources",
  "/privacy",
  "/terms",
  "/contact",
  "/404",
  "/sw.js",
  "/manifest.webmanifest",
  "/icon.svg",
  "/robots.txt",
  "/sitemap.xml"
];

test("Pages bridge forwards current dynamic/protected routes to the API Worker", () => {
  for (const path of workerRoutes) {
    assert.equal(routeMode(path), "worker", path);
  }
});

test("Pages bridge keeps current SPA/static routes on Pages", () => {
  for (const path of staticRoutes) {
    assert.equal(routeMode(path), "static", path);
  }
});
