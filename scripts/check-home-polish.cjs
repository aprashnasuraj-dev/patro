const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const origin=process.env.PATRO_TEST_BASE||'http://127.0.0.1:4192';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.VOICE_CHROMIUM_PATH,args:['--no-sandbox','--disable-webgl']});
 const results=[];
 try {for(const width of [380,1280]){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height:900}});
  await context.addInitScript(()=>{localStorage.setItem('aap_auth_probe_v1','1');localStorage.setItem('aafnai.shortcuts.v1',JSON.stringify(['/convert']));Math.random=()=>.99;});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  await page.route('**/data/calendar/**/*.json',async r=>{const response=await r.fetch();const doc=await response.json();for(const row of doc.rows||[]){delete row.ns;delete row.nepal_sambat;row.panchang={tithi:{}};}await r.fulfill({json:doc});});
  await page.route('**/api/v1/events?*',r=>{const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const plus=n=>new Date(Date.parse(today+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);return r.fulfill({json:{items:[{ad_date:plus(-1),name_ne:'समाप्त चाड'},{ad_date:today,name_ne:'आजको चाड'},{ad_date:plus(1),name_ne:'भोलिको चाड'},{ad_date:plus(3),name_ne:'आगामी चाड'}]}});});
  await page.goto(origin+'/?phase=night',{waitUntil:'domcontentloaded'});
  await page.locator('.ap-discovery').waitFor();
  await page.getByText('आजको चाड',{exact:true}).last().waitFor();
  const tools=await page.locator('.ap-discovery nav[aria-label="छिटो खोल्नुहोस्"] a').evaluateAll(rows=>rows.map(a=>a.getAttribute('href')));
  for(const href of ['/tools/voice-typing','/tools/patro-bot','/tools/landconverter','/tools/tithi-reminder','/tools/emi','/janmadin','/jyotish/china','/janmapatro','/fm','/tools/ocr'])assert(tools.includes(href),href);
  assert.equal(new Set(tools).size,tools.length);
  assert.equal(await page.locator('.ap-nav > a[href="/jyotish/china"]').count(),1);
  assert.match(await page.title(),/आफ्नै पात्रो/);
  assert((await page.locator('meta[name="description"]').getAttribute('content')).length>20);
  assert.equal(await page.locator('.hp-ns').count(),0);
  assert.equal(await page.locator('.rh-selected-grid').getByText('तिथि',{exact:true}).count(),0);
  assert.equal(await page.locator('.rh-selected-grid').getByText('नेपाल संवत्',{exact:true}).count(),0);
  assert.match(await page.locator('.ap-footer').innerText(),/© २०८३/);
  for(const href of ['/about','/privacy','/contact'])assert.equal(await page.locator(`.ap-footer a[href="${href}"]`).count(),1);
  assert.match(await page.getByRole('button',{name:'आफ्नै पात्रो एप इन्स्टल गर्नुहोस्'}).innerText(),/एप डाउनलोड/);
  const upcoming=await page.locator('.rh-upcoming').innerText();assert.match(upcoming,/आज/);assert.match(upcoming,/भोलि/);assert.match(upcoming,/३ दिनमा/);assert(!upcoming.includes('समाप्त चाड'));
  const visible=await page.locator('body').innerText();for(const phrase of ['API जोड्नुहोस्','API बाट','नमुना डाटा','Redesign concept','Immersive Homepage Concept','Nov 8'])assert(!visible.includes(phrase),phrase);
  assert.equal(await page.locator('a[href="#"]').count(),0);
  await page.screenshot({path:`/tmp/home-polish-${width}.png`,fullPage:true});
  const month=await page.locator('.rh-month-actions').locator('..').locator('h2').innerText();
  await page.getByRole('button',{name:'अर्को महिना',exact:true}).click();await page.waitForFunction(old=>document.querySelector('.rh-month-actions').parentElement.querySelector('h2').textContent!==old,month);
  await page.getByRole('button',{name:'अघिल्लो महिना',exact:true}).click();await page.waitForFunction(old=>document.querySelector('.rh-month-actions').parentElement.querySelector('h2').textContent===old,month);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('aafnai.shortcuts.v1'))),['/convert']);
  assert.deepEqual(errors,[]);
  results.push({width,toolLinks:tools.length,missingPanelsHidden:true,monthNavigation:true,relativeDates:true,oldShortcutsPreserved:true,pageErrors:errors});
  await context.close();
 }
 await fs.mkdir('docs/verification/home-polish',{recursive:true});await fs.writeFile('docs/verification/home-polish/browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
