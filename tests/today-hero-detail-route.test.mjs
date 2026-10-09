import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("Today box retains the full Nepal Sambat year while month cells stay compact", () => {
 const hero=read("src/components/TodayHero.tsx");
 assert.ok(hero.includes('<strong lang="ne">{ns||"—"}</strong>'));
 assert.ok(!hero.includes("compactNepalSambat"));
 const home=read("src/HomePageCurrent.tsx");
 assert.ok(home.includes("compactNepalSambat(day.nepal_sambat, language)"));
});
test("full-date link avoids SPA interception and loads the server archive", () => {
 const router=read("src/PatroRouter.tsx");
 assert.ok(router.includes("u.pathname.startsWith(DATE_ROUTE_PREFIX)||!isAppPath(u.pathname)"));
 const home=read("src/components/HomePanchang.tsx");
 assert.ok(home.includes('data-full-date-navigation="server"'));
 const archive=read("worker/public-archive-pages.ts");
 assert.ok(archive.includes('if(match)return datePage(request,env,match[1])'));
});
