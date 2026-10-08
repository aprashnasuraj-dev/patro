import {describe,it,expect} from "vitest";
import {resolveRouteSeo,isPublicPreviewHost} from "../src/seo";
import {connectedRouteMeta} from "../worker/connected-seo";
import guides from "../seo/guides.json";
import {readFileSync} from "node:fs";

import {comparePublishedUrls} from "../scripts/verify-url-preservation.mjs";

describe("search navigation and guide discovery",()=>{
 it("keeps public previews noindex while loopback audits use production route directives",()=>{
  for(const host of ["aafnaipatro.com","localhost","127.0.0.1","[::1]"])expect(isPublicPreviewHost(host),host).toBe(false);
  for(const host of ["patro-preview.pages.dev","patro.workers.dev","example.com"])expect(isPublicPreviewHost(host),host).toBe(true);
 });
 it("catches replacements even when the total URL count stays constant",()=>{
  const result=comparePublishedUrls(["/today","/date/2026-10-08"],["/today","/guides"]);
  expect(result.removed).toEqual(["/date/2026-10-08"]);
  expect(result.added).toEqual(["/guides"]);
 });
 it("retains the entire captured live URL cohort",()=>{
  const baseline=JSON.parse(readFileSync("seo/published-url-baseline.json","utf8"));
  const report=JSON.parse(readFileSync("reports/url-preservation-dist.json","utf8"));
  expect(baseline.url_count).toBeGreaterThanOrEqual(22000);
  expect(report.baseline_count).toBe(baseline.url_count);
  expect(report.removed).toEqual([]);
 });
 it("does not reuse a calendar title for a utility route",()=>{
  const typing=resolveRouteSeo("/tools/nepali-typing"),age=resolveRouteSeo("/tools/age"),converter=resolveRouteSeo("/convert");
  expect(new Set([typing.title,age.title,converter.title]).size).toBe(3);
  expect(age.canonical).toBe("https://aafnaipatro.com/tools/age");
  expect(age.index).toBe(true);
 });
 it("preserves private and intentional noindex boundaries",()=>{
  for(const path of ["/me","/me/notes","/auth/callback","/admin","/tools/family","/samachar","/developers","/offline","/on-this-day/10-08","/calendar/1900/01"]){expect(resolveRouteSeo(path).index,path).toBe(false)}
  for(const path of ["/contact","/tools/voice-typing","/calendar/2083/06"]){expect(resolveRouteSeo(path).index,path).toBe(true)}
 });
 it("normalizes aliases to the Worker canonical",()=>{
  for(const path of ["/jyotish/rashifal","/jyotish/china","/jyotish/matchmaking","/astro"]){expect(resolveRouteSeo(path).canonical).toBe("https://aafnaipatro.com"+connectedRouteMeta(path).canonicalPath)}
 });
 it("serves complete guide content and canonical metadata without JavaScript",()=>{
  const sitemap=readFileSync("dist/sitemap-guides.xml","utf8");
  for(const guide of guides){
   const route="/guides/"+guide.slug,html=readFileSync("dist"+route+"/index.html","utf8");
   expect(html).toContain(`<link rel="canonical" href="https://aafnaipatro.com${route}">`);
   expect(html).toContain(`<h1>${guide.title}</h1>`);
   for(const [heading,paragraph] of guide.sections){expect(html).toContain(heading);expect(html).toContain(paragraph)}
   expect(html).toContain(`href="${guide.tool}"`);
   expect(sitemap).toContain("https://aafnaipatro.com"+route);
   expect(resolveRouteSeo(route).title).toBe(guide.title);
   expect((html.match(/rel="canonical"/g)||[]).length).toBe(1);
   for(const slug of guide.related)expect(guides.some(row=>row.slug===slug)).toBe(true);
  }
 });
});
