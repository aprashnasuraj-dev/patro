// Install Playwright in your test environment, then serve tool-products/ on localhost.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox']});
 const base=process.env.TEST_URL||'http://127.0.0.1:8765/tool-products/TOOL-0001/page.html';
 const results={browser:await browser.version(),started_at:new Date().toISOString(),checks:[],screenshots:[]};
 const qa=path.resolve(__dirname,'../qa');
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});const page=await context.newPage();const requests=[];const errors=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>!document.getElementById('generate').disabled);
 assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex');assert.equal(await page.locator('link[rel=canonical]').count(),0);
 assert.ok(!requests.some(u=>u.endsWith('worker.js')));results.checks.push('PASS: SEO draft metadata and lazy worker');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to converter');await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Load example'}).click();await page.getByRole('button',{name:'Generate schema'}).click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Schema validated'));
 assert.match(await page.locator('#output').innerText(),/id: ID/);assert.equal(await page.locator('#columns tr').count(),5);results.checks.push('PASS: keyboard skip link, sample generation and five-field evidence');
 await page.getByLabel('Type for score',{exact:true}).selectOption('Int');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('incompatible'));assert.ok(await page.locator('#download').isDisabled());
 await page.getByLabel('Type for score',{exact:true}).selectOption('String');await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Schema validated'));results.checks.push('PASS: incompatible override blocks export; valid override recovers');
 await page.getByRole('button',{name:'Copy SDL',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await page.locator('#output').innerText());results.checks.push('PASS: clipboard exact SDL bytes');
 const d=page.waitForEvent('download');await page.getByRole('button',{name:'Download .graphql'}).click();const download=await d;assert.equal(download.suggestedFilename(),'schema.graphql');const file=await download.path();assert.equal(fs.readFileSync(file,'utf8'),await page.locator('#output').innerText());results.checks.push('PASS: downloaded SDL matches visible output');
 for(const width of [320,768,1440])for(const theme of ['light','dark']){await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}/${theme}`);const name=`desktop-${width}-${theme}.png`;await page.screenshot({path:path.join(qa,name),fullPage:true});results.screenshots.push(name);}
 results.checks.push('PASS: 320/768/1440 CSS px in light/dark; no document overflow');
 await page.setViewportSize({width:320,height:900});await page.locator('#csv').fill('"</script><img src=x onerror=alert(1)>",__proto__\nx,y');await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Schema validated'));assert.equal(await page.locator('#columns img').count(),0);assert.equal(await page.locator('script:not([src])').count(),0);results.checks.push('PASS: malicious headers rendered as text');
 await page.locator('#csv').fill('a,b\n1');await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('expected 2'));assert.ok(await page.locator('#copy').isDisabled());results.checks.push('PASS: malformed input rejects output');
 await page.locator('#file').setInputFiles({name:'sample.csv',mimeType:'text/csv',buffer:Buffer.from('id,name\n001,Asha')});await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('File loaded'));await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Schema validated'));results.checks.push('PASS: actual local-file input');
 await page.locator('#file').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from([0xff,0xfe,0])});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('UTF-8'));results.checks.push('PASS: invalid UTF-8 file rejected');
 // Cancel in the same event-loop turn, before a worker reply can race.
 await page.locator('#csv').fill('a\n'+Array(19999).fill('1').join('\n'));await page.evaluate(()=>{document.getElementById('generate').click();document.getElementById('cancel').click();});assert.match(await page.locator('#status').innerText(),/Cancelled/);assert.ok(await page.locator('#download').isDisabled());results.checks.push('PASS: cancellation invalidates result');
 await page.locator('#clear').click();assert.equal(await page.locator('#csv').inputValue(),'');assert.equal(await page.locator('#columns tr').count(),0);results.checks.push('PASS: clear resets data and results');
 assert.ok(requests.every(u=>new URL(u).origin===new URL(base).origin));assert.deepEqual(errors,[]);results.checks.push('PASS: no external network requests and no page exceptions');
 results.checks.push('NOT_RUN: Safari/Firefox, real mobile hardware, screen-reader speech, Core Web Vitals');results.finished_at=new Date().toISOString();results.status='PASS';fs.writeFileSync(path.join(qa,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
