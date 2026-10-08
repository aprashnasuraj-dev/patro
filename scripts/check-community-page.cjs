const { chromium } = require("playwright");

const route=process.argv[2];
if(!route){console.error("Usage: node scripts/check-community-page.cjs /route/");process.exit(2);}

(async()=>{
  const browser=await chromium.launch({channel:'chromium',headless:true,args:['--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:360,height:800},reducedMotion:"reduce"});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",(error)=>errors.push(String(error)));
  page.on("console",(msg)=>{if(msg.type()==="error")errors.push("console: "+msg.text());});
  await page.goto("http://127.0.0.1:4173"+route,{waitUntil:"networkidle"});
  const metrics=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    innerWidth:window.innerWidth,
    bodyWidth:document.body?.scrollWidth||0,
    title:document.title,
    h1:document.querySelectorAll("h1").length
  }));
  console.log(JSON.stringify({route,metrics,errors},null,2));
  await browser.close();
  if(metrics.scrollWidth>metrics.innerWidth+1)throw new Error(route+" horizontal overflow "+metrics.scrollWidth+">"+metrics.innerWidth);
  if(errors.length)throw new Error(route+" browser errors: "+errors.join(" | "));
})().catch(error=>{console.error(error);process.exit(1);});
