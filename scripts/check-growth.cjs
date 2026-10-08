const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.GROWTH_CHROMIUM_PATH?{executablePath:process.env.GROWTH_CHROMIUM_PATH}:{channel:'chromium'}),args:['--no-sandbox','--disable-webgl','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:async data=>{window.__growthShared=data},configurable:true})});
  const origin=process.env.GROWTH_TEST_ORIGIN||'http://127.0.0.1:4173';
  for(const route of ['/','/tools','/fm']){
   await page.goto(origin+route);
   await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('index,follow'));
   assert.equal(await page.locator('meta[name=robots]').count(),1);
  }
  await page.goto(origin+'/guides');
  await page.locator('.ap-guides').waitFor();
  await page.locator('.ap-guides h2 a').filter({hasText:'Preeti'}).click();
  await page.waitForURL('**/guides/preeti-unicode-conversion');
  await page.waitForFunction(()=>document.title.includes('Preeti'));
  if(process.env.GROWTH_SCREENSHOT)await page.screenshot({path:process.env.GROWTH_SCREENSHOT,fullPage:true});
  assert.equal(await page.locator('link[rel=canonical]').count(),1);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://aafnaipatro.com/guides/preeti-unicode-conversion');
  await page.locator('.ap-guides > a').click();
  await page.waitForURL('**/tools/preeti-converter');
  await page.locator('.ap-discovery').waitFor();
  await page.evaluate(()=>history.replaceState(null,'',location.pathname+'?birth_date=2000-01-01&name=private'));
  await page.getByRole('button',{name:'लिङ्क साझा गर्नुहोस्',exact:true}).click();
  const shared=await page.evaluate(()=>window.__growthShared);
  assert.equal(new URL(shared.url).pathname,'/tools/preeti-converter');
  assert.equal(new URL(shared.url).searchParams.get('utm_source'),'share');
  assert.equal(new URL(shared.url).searchParams.has('birth_date'),false);
  assert.equal(new URL(shared.url).searchParams.has('name'),false);
  await page.evaluate(()=>{
    Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__growthCopied=text}},configurable:true});
  });
  await page.getByRole('button',{name:'लिङ्क साझा गर्नुहोस्',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__growthCopied),shared.url);
  await page.getByRole('button',{name:'यो उपकरण सुरक्षित गर्नुहोस्',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('aafnai.shortcuts.v1'))),['/tools/preeti-converter']);
  await page.locator('.ap-discovery a[href="/today"]').first().click();
  await page.waitForURL('**/today');
  await page.waitForFunction(()=>document.querySelector('link[rel=canonical]')?.href==='https://aafnaipatro.com/today');
  await page.goBack();
  await page.waitForFunction(()=>document.querySelector('link[rel=canonical]')?.href==='https://aafnaipatro.com/tools/preeti-converter');
  await page.locator('.ap-discovery').waitFor();
  await page.getByRole('button',{name:'सुरक्षितबाट हटाउनुहोस्',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('aafnai.shortcuts.v1'))),[]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,'mobile horizontal overflow');
  await page.goto(origin+'/me/notes');
  await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content.startsWith('noindex'));
  assert.equal(await page.locator('.ap-discovery').count(),0);
  console.log('Growth mobile browser checks passed: guide navigation, metadata, back button, saved shortcuts, native/copy sharing without private inputs, private boundary, overflow.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
