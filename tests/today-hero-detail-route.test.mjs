import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("large Today hero preserves the original full Nepal Sambat string", () => {
  const hero = read("src/components/TodayHero.tsx");
  assert.match(hero, /<strong lang="ne">\{ns\|\|"—"\}<\/strong>/);
  assert.doesNotMatch(hero, /compactNepalSambat/);
  const home = read("src/HomePageCurrent.tsx");
  assert.match(home, /className="pc-ns"/);
  assert.match(home, /compactNepalSambat\(day\.nepal_sambat, language\)/);
});

test("server rendered daily detail routes are never hijacked by the SPA", () => {
  const router = read("src/PatroRouter.tsx");
  assert.match(router, /u\.pathname\.startsWith\(DATE_ROUTE_PREFIX\)\|\|!isAppPath/);
  const panchang = read("src/components/HomePanchang.tsx");
  assert.match(panchang, /href=\{\x60\/date\/\$\{date\}\x60\} data-full-date-navigation="server"/);
  const archive = read("worker/public-archive-pages.ts");
  assert.match(archive, /match=path\.match\(\/\^\\\/date\\\/\(\\d\{4\}-\\d\{2\}-\\d\{2\}\)\$\//);
});
