const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { chromium } = require("playwright");

const tools = [
  "astro","nepali-typing","preeti-converter","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","units","words","incometax","landconverter","nepaliqr","fuelprice","tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"
];

const terminalPlaceholder=/coming soon|integration phase|placeholder|under development/i;

(async()=>{
  if(tools.length!==29 || new Set(tools).size!==29) throw new Error("canonical tool browser inventory must stay exactly 29 unique tools");
  const rawHome=readFileSync("dist/index.html","utf8");
  if(!rawHome.includes('class="seo-prerender ap-prerender-home"')) throw new Error("homepage first paint must use the branded calendar-first prerender shell");
  if(rawHome.includes("सम्बन्धित खोजहरू · Related searches")) throw new Error("homepage first paint must not expose the raw related-search corpus");
  if(!rawHome.includes("BS · AD · नेपाल संवत् · तिथि · चाडपर्व · बिदा")) throw new Error("homepage first paint must explain the real calendar information hierarchy");

  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
  const page=await context.newPage();

  const homeErrors=[];
  const onHomeError=(error)=>homeErrors.push(String(error));
  page.on("pageerror",onHomeError);
  const homeResponse=await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded",timeout:30000});
  if(!homeResponse || !homeResponse.ok()) throw new Error(`homepage HTTP ${homeResponse?.status() ?? "no-response"}`);
  await page.waitForSelector(".rh-page .rh-grid .rh-cell:not(.is-empty)",{state:"visible",timeout:20000});
  await page.waitForFunction(()=>document.querySelectorAll(".rh-grid .rh-cell:not(.is-empty)").length>=28,{timeout:20000});
  const home=await page.evaluate(()=>{
    const cells=[...document.querySelectorAll(".rh-grid .rh-cell:not(.is-empty)")];
    const sample=cells.find((cell)=>cell.querySelector(".pc-bs"));
    const calendar=document.querySelector(".rh-calendar");
    // Day cell (Oct 2026 layout): festival · AD date / BS day / tithi / Nepal Sambat.
    const rich=[".pc-ad",".pc-ns",".pc-bs",".pc-tithi"];
    const richMetrics=Object.fromEntries(rich.map((selector)=>{
      const node=sample?.querySelector(selector);
      if(!node)return[selector,{exists:false,visible:false,font:0}];
      const style=getComputedStyle(node),box=node.getBoundingClientRect();
      return[selector,{exists:true,visible:style.display!=="none"&&style.visibility!=="hidden"&&box.height>0,font:parseFloat(style.fontSize)||0}];
    }));
    return {
      rawSeoVisible:Boolean(document.querySelector(".seo-prerender")),
      cellCount:cells.length,
      hasAd:Boolean(sample?.querySelector(".pc-ad")),
      hasNs:Boolean(sample?.querySelector(".pc-ns")),
      hasBs:Boolean(sample?.querySelector(".pc-bs")),
      hasWeekday:document.querySelectorAll(".rh-calendar .rh-weekheads > *").length===7,
      hasTithiSlot:Boolean(sample?.querySelector(".pc-tithi")),
      hasEventSlot:Boolean(sample?.querySelector(".pc-event")),
      richMetrics,
      calendarTop:calendar?.getBoundingClientRect().top??9999,
      bodyText:(document.body?.innerText||"").trim(),
      scrollWidth:document.documentElement.scrollWidth,
      innerWidth:window.innerWidth,
    };
  });
  page.off("pageerror",onHomeError);
  if(home.rawSeoVisible) throw new Error("SEO prerender remained visible after the React homepage mounted");
  if(home.cellCount<28) throw new Error(`homepage calendar rendered too few day cells: ${home.cellCount}`);
  for(const [key,value] of Object.entries({AD:home.hasAd,NS:home.hasNs,BS:home.hasBs,weekday:home.hasWeekday,tithi:home.hasTithiSlot,event:home.hasEventSlot})) if(!value) throw new Error(`homepage rich day tile missing ${key} slot`);
  for(const [selector,metric] of Object.entries(home.richMetrics)){
    if(!metric.exists||!metric.visible)throw new Error(`homepage mobile rich field ${selector} is hidden`);
    if(metric.font<13)throw new Error(`homepage mobile rich field ${selector} is only ${metric.font}px; minimum is 13px`);
  }
  if(home.calendarTop>760) throw new Error(`homepage calendar starts too low on mobile (${Math.round(home.calendarTop)}px)`);
  if(/आजको पात्रो लोड हुन सकेन|आजको पात्रो तयार हुँदैछ/.test(home.bodyText)) throw new Error("homepage regressed to a terminal calendar failure/loading state");
  if(home.scrollWidth>home.innerWidth+2) throw new Error(`homepage horizontal overflow ${home.scrollWidth}>${home.innerWidth}`);
  if(homeErrors.length) throw new Error(`homepage browser errors: ${homeErrors.join(" | ")}`);

  const results=[];
  for(const slug of tools){
    const route=`/tools/${slug}`;
    const errors=[];
    const onPageError=(error)=>errors.push(String(error));
    page.on("pageerror",onPageError);
    const response=await page.goto("http://127.0.0.1:4173"+route,{waitUntil:"domcontentloaded",timeout:30000});
    if(!response || !response.ok()) throw new Error(`${route} HTTP ${response?.status() ?? "no-response"}`);

    await page.waitForFunction(() => {
      const host=document.querySelector("[data-nepali-tools-host]");
      if(host?.shadowRoot?.querySelector("#editor")) return true;
      if(document.querySelector("iframe[data-nepali-tools-fallback]")) return true;
      const main=document.querySelector("main");
      const heading=main?.querySelector("h1,h2,[role=heading]");
      const interactive=main?.querySelectorAll("button,input,textarea,select,a[href]").length||0;
      const text=(main?.innerText||"").trim();
      return Boolean(main&&heading&&text.length>=40&&interactive>=1);
    },{timeout:20000}).catch(async()=>{
      const text=(await page.locator("body").innerText()).trim();
      throw new Error(`${route} did not render a substantive interactive tool surface: ${text.slice(0,300)}`);
    });

    let metrics=await page.evaluate(()=>{
      const main=document.querySelector("main");
      const host=document.querySelector("[data-nepali-tools-host]");
      const shadow=host?.shadowRoot||null;
      const scope=shadow||main;
      return {
        title:document.title.trim(),
        bodyText:(document.body?.innerText||"").trim(),
        mainText:((shadow?.textContent)||(main?.innerText)||"").trim(),
        heading:((shadow?.querySelector("h1,h2,[role=heading]")?.textContent)||(main?.querySelector("h1,h2,[role=heading]")?.textContent)||"").trim(),
        interactive:scope?.querySelectorAll("button,input,textarea,select,a[href]").length||0,
        scrollWidth:document.documentElement.scrollWidth,
        innerWidth:window.innerWidth,
        fallback:Boolean(document.querySelector("iframe[data-nepali-tools-fallback]")),
        shadowEditor:Boolean(shadow?.querySelector("#editor"))
      };
    });

    if(metrics.fallback){
      const frame=page.frameLocator('iframe[data-nepali-tools-fallback]');
      await frame.locator("#editor").waitFor({state:"visible",timeout:15000});
      const frameText=(await frame.locator("main").innerText()).trim();
      const frameHeading=(await frame.locator("h1").innerText()).trim();
      const frameInteractive=await frame.locator("button,input,textarea,select,a[href]").count();
      metrics={...metrics,mainText:frameText,heading:frameHeading,interactive:frameInteractive};
    }

    page.off("pageerror",onPageError);
    if(!metrics.title) throw new Error(`${route} has no document title`);
    if(!metrics.heading) throw new Error(`${route} has no visible tool heading`);
    if(metrics.mainText.length<40) throw new Error(`${route} rendered too little tool content (${metrics.mainText.length} chars)`);
    if(terminalPlaceholder.test(metrics.mainText)) throw new Error(`${route} rendered a terminal placeholder`);
    if(metrics.interactive<1) throw new Error(`${route} exposes no interactive control or navigation`);
    if(slug==="nepali-typing"&&!metrics.shadowEditor&&!metrics.fallback) throw new Error("Nepali Typing must render either the integrated editor or its packaged fallback");
    if(metrics.scrollWidth>metrics.innerWidth+2) throw new Error(`${route} horizontal overflow ${metrics.scrollWidth}>${metrics.innerWidth}`);
    if(errors.length) throw new Error(`${route} browser errors: ${errors.join(" | ")}`);
    results.push({slug,status:response.status(),title:metrics.title,heading:metrics.heading,interactive:metrics.interactive,fallback:metrics.fallback||undefined});
  }

  await browser.close();

  const actions=spawnSync(process.execPath,["scripts/check-tool-actions.cjs"],{cwd:process.cwd(),env:process.env,stdio:"inherit"});
  if(actions.status!==0)throw new Error(`primary user-action checks failed with status ${actions.status}`);

  // Offline/PWA behavior is release-gated separately in check-offline-pwa.cjs before
  // this canonical tool/mobile suite. Running it a second time against a fresh browser
  // context introduced a nondeterministic service-worker/cache race without adding coverage.
  console.log(JSON.stringify({ok:true,homepage:{cells:home.cellCount,richTiles:true,calendarTop:home.calendarTop},primaryActions:true,count:results.length,tools:results},null,2));
})().catch(error=>{console.error(error);process.exit(1);});