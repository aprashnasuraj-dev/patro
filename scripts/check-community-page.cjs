const { chromium } = require("playwright");

const route=process.argv[2];
if(!route){console.error("Usage: node scripts/check-community-page.cjs /route/");process.exit(2);}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:360,height:800},reducedMotion:"reduce"});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",(error)=>errors.push(String(error)));
  page.on("console",(msg)=>{if(msg.type()==="error")errors.push("console: "+msg.text());});
  const response=await page.goto("http://127.0.0.1:4173"+route,{waitUntil:"networkidle"});
  if(!response||!response.ok())throw new Error(route+" returned HTTP "+(response?.status()??"no response"));

  await page.waitForFunction(()=>{
    const stamp=document.querySelector("#today");
    return !stamp||Boolean(stamp.textContent?.trim());
  },{timeout:8000});

  const metrics=await page.evaluate(()=>{
    const visible=(node)=>{
      if(!(node instanceof HTMLElement||node instanceof SVGElement))return false;
      const style=getComputedStyle(node);
      const rect=node.getBoundingClientRect();
      return style.display!=="none"&&style.visibility!=="hidden"&&rect.width>0&&rect.height>0;
    };
    const interactive=[...document.querySelectorAll("button,input,select,textarea,a[href],[role=button],[tabindex='0']")].filter(visible).length;
    const loading=[...document.querySelectorAll("#loading,[role=status]")].filter(visible).map(node=>(node.textContent||"").trim()).filter(Boolean);
    const bodyText=(document.body?.innerText||"").replace(/\s+/g," ").trim();
    return {
      scrollWidth:document.documentElement.scrollWidth,
      innerWidth:window.innerWidth,
      bodyWidth:document.body?.scrollWidth||0,
      title:document.title,
      h1:document.querySelectorAll("h1").length,
      interactive,
      bodyTextLength:bodyText.length,
      today:(document.querySelector("#today")?.textContent||"").trim(),
      loading,
      hasFallback:/404|पृष्ठ भेटिएन|community_data_unavailable|लोड हुन सकेन/i.test(bodyText)
    };
  });
  console.log(JSON.stringify({route,metrics,errors},null,2));
  await browser.close();
  if(metrics.scrollWidth>metrics.innerWidth+1)throw new Error(route+" horizontal overflow "+metrics.scrollWidth+">"+metrics.innerWidth);
  if(metrics.h1<1)throw new Error(route+" has no page heading");
  if(metrics.bodyTextLength<200)throw new Error(route+" rendered too little community content");
  if(metrics.interactive<1)throw new Error(route+" has no interactive community surface");
  if(metrics.hasFallback)throw new Error(route+" rendered a fallback/error surface");
  if(metrics.loading.some(text=>/हुँदैछ|loading/i.test(text)))throw new Error(route+" remained stuck in loading state: "+metrics.loading.join(" | "));
  if(errors.length)throw new Error(route+" browser errors: "+errors.join(" | "));
})().catch(error=>{console.error(error);process.exit(1);});
