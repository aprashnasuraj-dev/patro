import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { initialUiLanguage } from "../src/ui-language";
import { HomeToolDirectory } from "../src/components/HomeToolDirectory";
import { HomeReading } from "../src/components/HomeReading";
import { SiteFooter } from "../src/components/SiteFooter";
import { TodayHero } from "../src/components/TodayHero";
import { ReferenceHomePage } from "../src/HomePageCurrent";
import guides from "../seo/guides.json";
import { readFileSync } from "node:fs";

afterEach(()=>vi.unstubAllGlobals());
describe("homepage product and language contract",()=>{
 it("defaults to Nepali regardless of browser locale; honours saved and URL choices",()=>{
   vi.stubGlobal("navigator",{language:"en-US",languages:["en-US"]});
   vi.stubGlobal("location",{search:""});vi.stubGlobal("localStorage",{getItem:()=>null});
   expect(initialUiLanguage()).toBe("ne");
   vi.stubGlobal("localStorage",{getItem:()=>"en"});expect(initialUiLanguage()).toBe("en");
   vi.stubGlobal("location",{search:"?lang=ne"});expect(initialUiLanguage()).toBe("ne");
   vi.stubGlobal("localStorage",{getItem:()=>{throw Error("blocked")}});vi.stubGlobal("location",{search:""});expect(initialUiLanguage()).toBe("ne");
 });
 it("retains all 29 canonical tool links in the grouped directory",()=>{
   const html=renderToStaticMarkup(<HomeToolDirectory language="en"/>);
   const routes=["astro","nepali-typing","preeti-converter","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","incometax","landconverter","units","fuelprice","nepaliqr","words","tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"];
   for(const slug of routes)expect(html).toContain(`href="/tools/${slug}"`);
   expect((html.match(/<details/g)||[]).length).toBe(6);
   expect(html).not.toContain("64 available");expect(html).not.toContain('/tools/api');
 });
 it("reading links point to published guide entries, with no fabricated blog routes",()=>{
   const html=renderToStaticMarkup(<HomeReading language="en"/>);
   const hrefs=[...html.matchAll(/href="\/guides\/([^\"]+)"/g)].map(m=>m[1]);
   expect(hrefs.length).toBe(3);for(const slug of hrefs)expect(guides.some(guide=>guide.slug===slug)).toBe(true);
   expect(html).toContain("Guide text is currently in Nepali.");
 });
 it("footer groups have unique destinations and exactly one install slot",()=>{
   for(const language of ["ne","en"] as const){const html=renderToStaticMarkup(<SiteFooter language={language}/>);const hrefs=[...html.matchAll(/href="([^\"]+)"/g)].map(m=>m[1]);expect(new Set(hrefs).size).toBe(hrefs.length);expect((html.match(/id="home-install-entry"/g)||[]).length).toBe(1);expect(html).toContain('<select');}
 });
 it("Nepali hero localizes time and Sambat digits while retaining the source date",()=>{
   const html=renderToStaticMarkup(<TodayHero language="ne" date="2026-10-24" bsLabel="७ कात्तिक २०८३" adLabel="२४ अक्टोबर २०२६" ns="ने.सं. 1146 कौला थ्वः झिंस्वमिला" panchang={{sunrise:"06:09",sunset:"17:26",tithi:{ne:"त्रयोदशी",en:"Trayodashi"},tithi_transition:{time:"13:52",next_ne:"चतुर्दशी"}}} events={[]}/>);
   expect(html).toContain("११४६");expect(html).toContain("०६:०९");expect(html).toContain("१३:५२");expect(html).toContain('/date/2026-10-24');
 });
 it("calendar renders complete grid semantics, one tab stop and five layers without API data",()=>{
   vi.stubGlobal("navigator",{onLine:false});vi.stubGlobal("location",{search:""});vi.stubGlobal("localStorage",{getItem:()=>null});
   const html=renderToStaticMarkup(<ReferenceHomePage calendarYear={2083} calendarMonth={7}/>);
   expect((html.match(/role="grid"/g)||[]).length).toBe(1);expect((html.match(/role="columnheader"/g)||[]).length).toBe(7);
   expect((html.match(/data-ad="/g)||[]).length).toBe(30);expect((html.match(/tabindex="0"/g)||[]).length).toBe(1);
   expect((html.match(/type="checkbox"/g)||[]).length).toBe(5);expect(html).toContain("तपाईं अफलाइन हुनुहुन्छ");
 });
 it("all defined foreground tokens meet AA on each declared homepage surface",()=>{
   const css=readFileSync(new URL('../src/homepage-redesign.css',import.meta.url),'utf8');
   const blocks=[...css.matchAll(/:root(?:\[data-theme="dark"\])?\{([^}]+)\}/g)].map(m=>Object.fromEntries([...m[1].matchAll(/--home-([\w-]+):(#\w+)/g)].map(x=>[x[1],x[2]])));
   const luminance=(hex:string)=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(c=>c+c).join('');const rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
   expect(blocks.length).toBe(2);
   for(const tokens of blocks)for(const fg of ['ink','muted','green','red','gold','moon'])for(const bg of ['paper','surface','soft']){const a=luminance(tokens[fg]),b=luminance(tokens[bg]);expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05),`${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);}
 });
});
