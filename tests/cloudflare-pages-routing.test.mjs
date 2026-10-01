import test from "node:test";
import assert from "node:assert/strict";
import { routeMode } from "../functions/[[path]].js";

const workerRoutes = [
  "/api/v1/health",
  "/api/jyotish-chat",
  "/api/rashifal_engine.py",
  "/fm-v2-stream/station",
  "/fm-stream/station"
];

const staticRoutes = [
  "/",
  "/convert",
  "/rashifal",
  "/samachar",
  "/fm",
  "/tv",
  "/tools",
  "/tools/astro",
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
  "/me",
  "/me/diary",
  "/me/reminders",
  "/calendar/2083/06",
  "/date/2026-09-30",
  "/festival/dashain",
  "/time-machine",
  "/on-this-day",
  "/jyotish/china",
  "/jyotish/matchmaking",
  "/samudaya",
  "/samudaya/lhosar",
  "/nepal-sambat/mandala",
  "/explore",
  "/about",
  "/sources",
  "/privacy",
  "/terms",
  "/contact",
  "/developers",
  "/offline",
  "/assets/app.js",
  "/sw.js",
  "/manifest.webmanifest",
  "/icon.svg",
  "/robots.txt",
  "/sitemap.xml"
];

const redirectRoutes = [
  "/aaja",
  "/astro",
  "/my-diary",
  "/notes",
  "/planner",
  "/family",
  "/family/join",
  "/tools/family",
  "/settings/notifications",
  "/tools/tithi",
  "/card",
  "/tools/card",
  "/settings",
  "/settings/holidays",
  "/my-data",
  "/tools/my-data",
  "/diaspora",
  "/jyotish/rashifal",
  "/jyotish/china/rashi",
  "/jyotish/janma-patro"
];

test("Pages bridge forwards only API and stream routes to the API Worker", () => {
  for (const path of workerRoutes) assert.equal(routeMode(path), "worker", path);
});

test("Pages bridge keeps the React SPA, community pages and static assets on Pages", () => {
  for (const path of staticRoutes) assert.equal(routeMode(path), "static", path);
});

test("legacy public routes remain explicit redirects", () => {
  for (const path of redirectRoutes) assert.equal(routeMode(path), "redirect", path);
});

test("unknown extensionless routes are true 404s", () => {
  for (const path of ["/search","/feedback","/definitely-missing"]) assert.equal(routeMode(path), "not_found", path);
});
