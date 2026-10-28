const { chromium } = require("playwright");

(async()=>{
  const browser=await chromium.launch({channel:"chromium",headless:true,args:["--disable-dev-shm-usage"]});
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:"reduce"});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(e?.stack||String(e)));
  const response=await page.goto("http://127.0.0.1:4173/advancetools/",{waitUntil:"domcontentloaded",timeout:30000});
  if(!response||!response.ok())throw new Error("Advanced Tools dashboard HTTP "+(response?.status()??"no-response"));
  await page.locator("#search").waitFor({state:"visible",timeout:15000});
  const baseline=await page.evaluate(()=>{
    const data=JSON.parse(document.querySelector("#page-data")?.textContent||"{}");
    const cards=[...document.querySelectorAll(".web-category-card")];
    const counts=cards.map(card=>{
      const m=(card.querySelector(".category-count")?.textContent||"").match(/\((\d+) tools\)/);
      return m?Number(m[1]):NaN;
    });
    return{
      kind:data.kind,
      toolCount:data.toolCount,
      categoryCount:data.categoryCount,
      collectionCount:data.collectionCount,
      searchEntries:Array.isArray(data.tools)?data.tools.length:0,
      categoryCards:cards.length,
      categoryCounts:counts,
      nestedLinks:[...document.querySelectorAll('a[href*="/advancetools/tool"]')].map(a=>a.getAttribute("href")),
      scrollWidth:document.documentElement.scrollWidth,
      innerWidth:window.innerWidth
    };
  });
  if(baseline.kind!=="web-tools-hub")throw new Error("Advanced Tools page-data kind mismatch");
  if(baseline.toolCount!==1080)throw new Error("Expected 1080 registry tools, got "+baseline.toolCount);
  if(baseline.searchEntries!==1085)throw new Error("Expected 1085 searchable entries including specialist collections, got "+baseline.searchEntries);
  if(baseline.categoryCards<15)throw new Error("Too few visible tool categories: "+baseline.categoryCards);
  if(baseline.categoryCounts.some(n=>!Number.isFinite(n)||n<1))throw new Error("Category card missing a positive registry count");
  if(baseline.categoryCounts.reduce((a,b)=>a+b,0)!==baseline.toolCount)throw new Error("Category counts do not reconcile to registry total");
  if(baseline.nestedLinks.length)throw new Error("Nested Advanced Tools tool URL leaked: "+baseline.nestedLinks[0]);
  if(baseline.scrollWidth>baseline.innerWidth+2)throw new Error("Advanced Tools dashboard has horizontal overflow");

  const search=page.locator("#search");
  await search.fill("parquet");
  await page.waitForFunction(()=>document.querySelector("#search-count")?.textContent?.includes("matching"),{timeout:5000});
  const parquet=page.locator('#web-tool-search-results a[href="/tool/duckdb-parquet-local-query-workbench"]');
  await parquet.waitFor({state:"visible",timeout:5000});
  await parquet.click();
  await page.waitForURL("**/tool/duckdb-parquet-local-query-workbench",{timeout:10000});
  const direct=await page.evaluate(()=>({
    path:location.pathname,
    canonical:document.querySelector('link[rel="canonical"]')?.href||"",
    h1:document.querySelector("h1")?.textContent?.trim()||"",
    hasRuntime:Boolean(document.querySelector("#ct-mount")),
    nested:location.pathname.includes("/advancetools/")
  }));
  if(direct.path!=="/tool/duckdb-parquet-local-query-workbench")throw new Error("Search result did not open the direct tool URL");
  if(direct.canonical!=="https://aafnaipatro.com/tool/duckdb-parquet-local-query-workbench")throw new Error("Direct tool canonical mismatch: "+direct.canonical);
  if(!/DuckDB|Parquet/.test(direct.h1))throw new Error("Direct Parquet tool H1 missing");
  if(direct.nested)throw new Error("Direct tool was nested under Advanced Tools");

  await page.goBack({waitUntil:"domcontentloaded"});
  if(new URL(page.url()).pathname!=="/advancetools/")throw new Error("Browser Back did not restore Advanced Tools dashboard");
  await page.goForward({waitUntil:"domcontentloaded"});
  if(new URL(page.url()).pathname!=="/tool/duckdb-parquet-local-query-workbench")throw new Error("Browser Forward did not restore the direct tool");
  if(errors.length)throw new Error("Advanced Tools browser errors: "+errors.join(" | "));
  await browser.close();
  console.log(JSON.stringify({ok:true,toolCount:baseline.toolCount,searchEntries:baseline.searchEntries,categories:baseline.categoryCards,categoryTotal:baseline.categoryCounts.reduce((a,b)=>a+b,0),directRoute:direct.path,backForward:true},null,2));
})().catch(async error=>{console.error(error);process.exit(1)});
