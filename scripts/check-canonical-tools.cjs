const { chromium } = require("playwright");

const tools = [
  "astro","nepali-typing","preeti-converter","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","units","words","incometax","landconverter","nepaliqr","fuelprice","tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"
];

const terminalPlaceholder=/coming soon|integration phase|placeholder/i;

(async()=>{
  if(tools.length!==29 || new Set(tools).size!==29) throw new Error("canonical tool browser inventory must stay exactly 29 unique tools");
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
  const page=await context.newPage();
  const results=[];

  for(const slug of tools){
    const route=`/tools/${slug}`;
    const errors=[];
    const onPageError=(error)=>errors.push(String(error));
    page.on("pageerror",onPageError);
    const response=await page.goto("http://127.0.0.1:4173"+route,{waitUntil:"domcontentloaded",timeout:30000});
    if(!response || !response.ok()) throw new Error(`${route} HTTP ${response?.status() ?? "no-response"}`);

    await page.waitForFunction(() => {
      const text=(document.body?.innerText||"").trim();
      const main=document.querySelector("main");
      const heading=main?.querySelector("h1,h2,[role=heading]");
      const interactive=main?.querySelectorAll("button,input,textarea,select,a[href]").length||0;
      return Boolean(main&&heading&&text.length>=80&&interactive>=1);
    },{timeout:20000}).catch(async()=>{
      const text=(await page.locator("body").innerText()).trim();
      throw new Error(`${route} did not render a substantive interactive tool surface: ${text.slice(0,300)}`);
    });

    const metrics=await page.evaluate(()=>{
      const main=document.querySelector("main");
      return {
        title:document.title.trim(),
        bodyText:(document.body?.innerText||"").trim(),
        mainText:(main?.innerText||"").trim(),
        heading:(main?.querySelector("h1,h2,[role=heading]")?.textContent||"").trim(),
        interactive:main?.querySelectorAll("button,input,textarea,select,a[href]").length||0,
        scrollWidth:document.documentElement.scrollWidth,
        innerWidth:window.innerWidth
      };
    });
    page.off("pageerror",onPageError);
    if(!metrics.title) throw new Error(`${route} has no document title`);
    if(!metrics.heading) throw new Error(`${route} has no visible tool heading`);
    if(metrics.mainText.length<40) throw new Error(`${route} rendered too little tool content (${metrics.mainText.length} chars)`);
    if(terminalPlaceholder.test(metrics.mainText)) throw new Error(`${route} rendered a terminal placeholder`);
    if(metrics.interactive<1) throw new Error(`${route} exposes no interactive control or navigation`);
    if(metrics.scrollWidth>metrics.innerWidth+2) throw new Error(`${route} horizontal overflow ${metrics.scrollWidth}>${metrics.innerWidth}`);
    if(errors.length) throw new Error(`${route} browser errors: ${errors.join(" | ")}`);
    results.push({slug,status:response.status(),title:metrics.title,heading:metrics.heading,interactive:metrics.interactive});
  }

  await browser.close();
  console.log(JSON.stringify({ok:true,count:results.length,tools:results},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
