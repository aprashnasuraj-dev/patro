const { chromium } = require("playwright");

const tools = [
  "astro","nepali-typing","preeti-converter","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","units","words","incometax","landconverter","nepaliqr","fuelprice","tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"
];

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
    await page.waitForTimeout(450);
    const metrics=await page.evaluate(()=>({
      title:document.title.trim(),
      bodyText:(document.body?.innerText||"").trim(),
      interactive:document.querySelectorAll("button,input,textarea,select,a[href]").length,
      scrollWidth:document.documentElement.scrollWidth,
      innerWidth:window.innerWidth
    }));
    page.off("pageerror",onPageError);
    if(!response || !response.ok()) throw new Error(`${route} HTTP ${response?.status() ?? "no-response"}`);
    if(!metrics.title) throw new Error(`${route} has no document title`);
    if(metrics.bodyText.length<40) throw new Error(`${route} rendered too little content (${metrics.bodyText.length} chars)`);
    if(/coming soon|integration phase|placeholder|लोड हुँदै|loading\.\.\./i.test(metrics.bodyText)) throw new Error(`${route} rendered a terminal placeholder`);
    if(metrics.interactive<1) throw new Error(`${route} exposes no interactive control or navigation`);
    if(metrics.scrollWidth>metrics.innerWidth+2) throw new Error(`${route} horizontal overflow ${metrics.scrollWidth}>${metrics.innerWidth}`);
    if(errors.length) throw new Error(`${route} browser errors: ${errors.join(" | ")}`);
    results.push({slug,status:response.status(),title:metrics.title,interactive:metrics.interactive});
  }

  await browser.close();
  console.log(JSON.stringify({ok:true,count:results.length,tools:results},null,2));
})().catch(async(error)=>{console.error(error);process.exit(1);});
