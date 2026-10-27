// Production-only, fail-closed mount and action sweep. Never infer functional PASS from HTTP 200.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd(),base=process.env.MM530_BASE_URL||'http://127.0.0.1:4173';
const registry=JSON.parse(await fs.readFile(path.join(root,'src/mm530/mm530-registry.json'),'utf8')).tools;
const reportPath=path.join(root,'reports/mm530-functional-gate.json');
await fs.mkdir(path.dirname(reportPath),{recursive:true});
const knownPlaceholder=/the local browser workspace will load|source is prepared for local browser execution|no product tests executed|interactive tool will appear|source preparation only|mission mangal|test_pending/i;
const actionable='button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[role=button]';
const primarySelectors=[
 'button.mm-primary','#primary','#run','#execute','#generate','#calculate','#start','#parse',
 '#enc','#gen','#def','#load','#decode','#primary-action','button.primary-action',
 'button.primary','button[data-action=run]','button[type=submit]','form button:not([type=button])'
];
const harSample={log:{version:'1.2',entries:[{
 startedDateTime:'2026-10-26T00:00:00Z',time:30,
 request:{method:'GET',url:'https://example.com/private?token=secret',headers:[{name:'Authorization',value:'Bearer secret'}],cookies:[{name:'session',value:'secret'}],postData:{text:'private payload'}},
 response:{status:200,headers:[{name:'Set-Cookie',value:'session=secret'}],cookies:[{name:'session',value:'secret'}],content:{text:'sensitive response',size:100}},
 timings:{wait:22,receive:8}}]}};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const records=new Array(registry.length);
async function check(tool){
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage();const errors=[],missingAssets=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()===404)missingAssets.push(r.url())});
 const item={tool_id:tool.id,route:tool.route,runtime_script_attached:false,runtime_bundle_requested:false,
  mount_target_exists:false,runtime_mount_succeeded:false,primary_control_present:false,
  primary_action_executed:false,visible_result_created:false,invalid_input_rejected:false,
  copy_checked:false,download_checked:false,console_errors:errors,missing_assets:missingAssets,
  status:'FAIL',reason:''};
 try{
  const url=base+'/_mm530/'+tool.id+'/page.html';
  const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
  if(!r?.ok())throw Error('runtime page HTTP '+r?.status());
  const html=await r.text();
  item.runtime_script_attached=html.includes('src="./tool.js"');
  if(!item.runtime_script_attached)throw Error('tool.js not attached to runtime page');
  const deadline=Date.now()+7000;
  while(Date.now()<deadline){
   item.runtime_bundle_requested=page.frames().some(f=>f.url().includes('/tool.js'))||
     (await page.evaluate(()=>performance.getEntriesByType('resource').some(x=>x.name.endsWith('/tool.js'))));
   item.mount_target_exists=await page.locator('#tool-interactive-root,#tool-app,[data-tool-id]').count()>0;
   const count=await page.locator(actionable).count();
   if(count>0){item.runtime_mount_succeeded=true;break}
   await page.waitForTimeout(100);
  }
  if(!item.runtime_bundle_requested)throw Error('runtime JS not requested');
  if(!item.runtime_mount_succeeded)throw Error('no enabled interactive workspace controls');
  const rendered=await page.locator('body').innerText();
  if(knownPlaceholder.test(rendered))throw Error('placeholder/internal text remains after initialization');
  if(errors.length)throw Error('initialization exception: '+errors.join('; ').slice(0,300));
  if(missingAssets.length)throw Error('missing runtime asset: '+missingAssets[0]);
  let action=null;
  for(const selector of primarySelectors){
   const candidate=page.locator(selector).first();
   if(await candidate.count()&&await candidate.isVisible()&&await candidate.isEnabled()){action=candidate;break}
  }
  item.primary_control_present=!!action;
  if(!action)throw Error('primary action missing or disabled; needs tool-specific fixture');
  const outputSelectors='#result,#output,.mm-result,.result,.results,#metrics,#summary,#data-rows';
  const statusSelectors='#feedback,#status,.mm-status,[role=status],[role=alert]';
  const before=await page.locator(outputSelectors).allTextContents();
  if(tool.id==='TOOL-0006'){
   const input=page.locator('textarea.mm-source-editor').first();
   if(!await input.count())throw Error('HAR input did not mount');
   await input.fill(JSON.stringify(harSample));
  }
  await action.click({timeout:2500});
  item.primary_action_executed=true;
  if(tool.id==='TOOL-0006'){
   const output=page.locator('pre.mm-result');
   await page.waitForFunction(()=>{const t=document.querySelector('pre.mm-result')?.textContent||'';return t.includes('redacted.invalid')},null,{timeout:7000});
   const parsed=JSON.parse(await output.innerText());
   const entry=parsed.log.entries[0];
   if(entry.response.status!==200||entry.timings.wait!==22||entry.timings.receive!==8||
      !entry.request.url.includes('redacted.invalid')||
      JSON.stringify(parsed).includes('secret')||
      JSON.stringify(parsed).includes('sensitive response')||
      entry.request.headers.length||entry.response.headers.length||entry.request.cookies.length)
     throw Error('HAR semantic redaction regression');
   item.visible_result_created=true;
   const invalid=page.locator('textarea.mm-source-editor');
   await invalid.fill('{bad json');
   await action.click();
   const status=await page.locator('.mm-status').innerText();
   item.invalid_input_rejected=/invalid har json/i.test(status);
   if(!item.invalid_input_rejected)throw Error('HAR invalid JSON not rejected');
   await invalid.fill(JSON.stringify(harSample));await action.click();
   await page.waitForFunction(()=>document.querySelector('pre.mm-result')?.textContent?.includes('redacted.invalid'),null,{timeout:7000});
   const copy=page.getByRole('button',{name:'Copy output'});
   const download=page.getByRole('button',{name:'Download output'});
   item.copy_checked=await copy.isEnabled();
   const promised=page.waitForEvent('download',{timeout:3000}).then(async d=>{const name=d.suggestedFilename();await d.cancel();return name.endsWith('.har')}).catch(()=>false);
   await download.click();item.download_checked=await promised;
   if(!item.copy_checked||!item.download_checked)throw Error('HAR export control failed');
  }else{
   await page.waitForTimeout(350);
   const after=await page.locator(outputSelectors).allTextContents();
   const statuses=await page.locator(statusSelectors).allTextContents();
   if(/(?:invalid|failed|error|unable|malformed|missing required|no file selected)/i.test(statuses.join(' ')))
     throw Error('valid workflow returned error status: '+statuses.join(' ').slice(0,160));
   item.visible_result_created=after.join('')!==before.join('')&&after.join('').trim().length>0
      &&!/(?:^\s*(?:ready|loading|no result|output will appear|nothing to show)\s*$)/i.test(after.join(' '));
   if(!item.visible_result_created)throw Error('action clicked but meaningful output not proven; requires family fixture');
  }
  if(errors.length)throw Error('browser exception: '+errors[0]);
  item.status='PASS';
 }catch(e){item.reason=String(e?.message||e)}
 finally{await context.close()}
 return item;
}
let index=0;
const workers=Array.from({length:6},async()=>{
 while(index<registry.length){const at=index++;records[at]=await check(registry[at])}
});
try{await Promise.all(workers)}finally{await browser.close()}
const totals={registered:registry.length,pass:records.filter(x=>x.status==='PASS').length,
 fail:records.filter(x=>x.status==='FAIL').length,
 mounted:records.filter(x=>x.runtime_mount_succeeded).length,
 primary_verified:records.filter(x=>x.visible_result_created).length};
const report={schema_version:'MM530_FUNCTIONAL_GATE_V2',source_commit:process.env.GITHUB_SHA||null,
 at:new Date().toISOString(),status:totals.pass===530?'PASS':'BLOCKED',totals,tools:records};
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('MM530_FUNCTIONAL_GATE='+JSON.stringify({status:report.status,...totals}));
if(report.status!=='PASS')process.exitCode=1;
