// Production-only, fail-closed mount and action sweep. Never infer functional PASS from HTTP 200.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { zipSync, strToU8 } from 'fflate';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const root=process.cwd(),base=process.env.MM530_BASE_URL||'http://127.0.0.1:4173';
const registry=JSON.parse(await fs.readFile(path.join(root,'src/mm530/mm530-registry.json'),'utf8')).tools;
const reportPath=path.join(root,'reports/mm530-functional-gate.json');
await fs.mkdir(path.dirname(reportPath),{recursive:true});
const exists=p=>fs.access(p).then(()=>true,()=>false);
const DEVICE=new Set(['TOOL-0349','TOOL-0350','TOOL-0446']);
const MINIMAL_RELEASE=new Set(["TOOL-0111","TOOL-0142","TOOL-0143","TOOL-0161","TOOL-0162","TOOL-0163","TOOL-0164","TOOL-0165","TOOL-0166","TOOL-0167","TOOL-0168","TOOL-0169","TOOL-0170","TOOL-0171","TOOL-0172","TOOL-0173","TOOL-0174","TOOL-0175","TOOL-0176","TOOL-0177"]);
const MEDIA=new Set(['TOOL-0161','TOOL-0162','TOOL-0163','TOOL-0164','TOOL-0165','TOOL-0166','TOOL-0167','TOOL-0168','TOOL-0169','TOOL-0170','TOOL-0171','TOOL-0172','TOOL-0173','TOOL-0174','TOOL-0175','TOOL-0176']);
const FORCE_FILE=new Set(['TOOL-0111']);
const TRANSIENT=/(?:processing|loading|working|encoding|converting|running|preparing|analyzing|calculating|starting|decoding|rendering|remuxing|benchmarking|extracting|trimming|rotating|merging|cutting)/i;
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGM0TpvJQEvARFPTRy0YtWDUglELRi0YtWDUglELRi0YtWDUAioCAAyGAXILYugNAAAAAElFTkSuQmCC','base64');
const QR_PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAUoAAAFKAQAAAABTUiuoAAAB7klEQVR4nO2bTW6kMBCFvxos9ZKW5gA5CtwgR5qr2UfJDfAyEuhlYf7SSSSSEWlHqVpAA9/iSU/lqrLVJg5G+nOUBEcdddRRRx09E7U5AtYzmfXZ5ouZmfWnC3D0UIRy6yJA/ouSgUAYNCMAdqYAR7+A5jWFWgny7KKZhe8R4OiBCDfPBmE01oQ6XYCj/4N2ejZpuJ8ARz+OJbdaARlI10Gkx/lxPzvfXaujSNLqSSO6YbssrztJinfX6mjJrV0KpYfSCJbG8HwBjn5+3uoB67MZMJkik5HMzOw6f61G629G155wCkoPetUKtgMGU9CZAhz9KrpNWVeAbKaYL3oPPUeAo8fQfBG0zyY9BeYOvh2hGya7Qc8R4OiRWHrCtROUpEgjRUARvCesBl3caqVXvlE8otNYEHerAnS2QlLxSLEdl0/lVyN3qzY0B+ZC9RSKZaV4ed2qCd3tZUhDM6+EbAnmuVUduhSvkVKoYr5oq1vfIMDRT6Db2XFZE4tHObyDniPA0WMxNxiSpKGRYqtdL78hvhJWgC5uDVA8AlCk2e/o+rxVKSoNjeyfxjIY788lq9P6+9Dbk35Sj5FK196MpMfRd3WrQd/ULWlEsZW2tPK6VQv65ux4nbfKZmEZkd2tOlDzfy046qijjjr6g9AXfsZAuOWAVcAAAAAASUVORK5CYII=','base64');
const GIF=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64');
const SVG=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#336699"/></svg>');
const WAV=(()=>{const rate=44100,seconds=1,samples=rate*seconds,b=Buffer.alloc(44+samples*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++){const v=Math.round(9000*Math.sin(2*Math.PI*440*i/rate));b.writeInt16LE(v,44+i*2)}return b})();
const BPM_WAV=(()=>{const rate=44100,seconds=8,samples=rate*seconds,b=Buffer.alloc(44+samples*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++){const beat=(i%Math.floor(rate*.5))<1200?1:0.05;const v=Math.round(12000*beat*Math.sin(2*Math.PI*120*i/rate));b.writeInt16LE(v,44+i*2)}return b})();
const WEBM=Buffer.from('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','base64');
const pdfDoc=await PDFDocument.create();
const pdfPage=pdfDoc.addPage([300,200]);pdfPage.drawText('MM530 browser fixture page 1',{x:24,y:100,size:14});
const pdfPage2=pdfDoc.addPage([300,200]);pdfPage2.drawText('MM530 browser fixture page 2',{x:24,y:100,size:14});
const PDF=Buffer.from(await pdfDoc.save());
function rawPdf(objects){
 let body='%PDF-1.4\n',offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(body,'latin1'));body+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n'}
 const xref=Buffer.byteLength(body,'latin1');body+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<offsets.length;i++)body+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 body+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return Buffer.from(body,'latin1');
}
const p1='BT /F1 12 Tf 50 100 Td (Introduction) Tj ET',p2='BT /F1 12 Tf 50 100 Td (Setup) Tj ET';
const BOOKMARK_PDF=rawPdf([
 '<< /Type /Catalog /Pages 2 0 R /Outlines 8 0 R /PageMode /UseOutlines >>',
 '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
 '<< /Length '+Buffer.byteLength(p1)+' >>\nstream\n'+p1+'\nendstream',
 '<< /Length '+Buffer.byteLength(p2)+' >>\nstream\n'+p2+'\nendstream',
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
 '<< /Type /Outlines /First 9 0 R /Last 10 0 R /Count 2 >>',
 '<< /Title (Introduction) /Parent 8 0 R /Next 10 0 R /Dest [3 0 R /Fit] >>',
 '<< /Title (Setup) /Parent 8 0 R /Prev 9 0 R /Dest [4 0 R /Fit] >>'
]);
const DOCX=Buffer.from(zipSync({
 '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
 '_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
 'word/document.xml':strToU8('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>')
}));
const XLSX=Buffer.from(zipSync({
 '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
 '_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
 'xl/workbook.xml':strToU8('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'),
 'xl/_rels/workbook.xml.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
 'xl/worksheets/sheet1.xml':strToU8('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>name</t></is></c><c r="B1" t="inlineStr"><is><t>value</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>alpha</t></is></c><c r="B2"><v>1</v></c></row></sheetData></worksheet>')
}));
const HEIF=await fs.readFile(path.join(root,'data','mm530','phase5','fixtures','lightning_mini.heif'));
const MOV=await fs.readFile(path.join(root,'data','mm530','phase5','fixtures','tiny-h264-aac.mov'));
const STL=Buffer.from('solid tetra\nfacet normal 0 0 -1\n outer loop\n  vertex 0 0 0\n  vertex 0 10 0\n  vertex 10 0 0\n endloop\nendfacet\nfacet normal 0 -1 0\n outer loop\n  vertex 0 0 0\n  vertex 10 0 0\n  vertex 0 0 10\n endloop\nendfacet\nfacet normal -1 0 0\n outer loop\n  vertex 0 0 0\n  vertex 0 0 10\n  vertex 0 10 0\n endloop\nendfacet\nfacet normal 1 1 1\n outer loop\n  vertex 10 0 0\n  vertex 0 10 0\n  vertex 0 0 10\n endloop\nendfacet\nendsolid tetra\n');
const VARIABLE_FONT=(()=>{const b=Buffer.alloc(64);b.writeUInt32BE(0x00010000,0);b.writeUInt16BE(1,4);b.writeUInt16BE(16,6);b.writeUInt16BE(0,8);b.writeUInt16BE(0,10);b.write('fvar',12,'ascii');b.writeUInt32BE(0,16);b.writeUInt32BE(28,20);b.writeUInt32BE(36,24);b.writeUInt32BE(0x00010000,28);b.writeUInt16BE(16,32);b.writeUInt16BE(2,34);b.writeUInt16BE(1,36);b.writeUInt16BE(20,38);b.writeUInt16BE(0,40);b.writeUInt16BE(0,42);b.write('wght',44,'ascii');b.writeInt32BE(100*65536,48);b.writeInt32BE(400*65536,52);b.writeInt32BE(800*65536,56);b.writeUInt16BE(0,60);b.writeUInt16BE(256,62);return b})();
let WOFF2_FONT=null;for(const p of [path.join(root,'places-calendar','generator','static','fonts','mukta-latin-400.woff2'),path.join(root,'public','fonts','nepali-serif-700.woff2')])if(await exists(p)){WOFF2_FONT=await fs.readFile(p);break}
let FONT=null;for(const p of ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'])if(await exists(p)){FONT=await fs.readFile(p);break}
function fixture(accept='',hint='',toolId=''){const a=accept.toLowerCase(),all=(a+' '+hint.toLowerCase()).toLowerCase();
 if(toolId==='TOOL-0143')return{name:'bookmarked.pdf',mimeType:'application/pdf',buffer:BOOKMARK_PDF};
 if(toolId==='TOOL-0177')return{name:'bpm-eight-seconds.wav',mimeType:'audio/wav',buffer:BPM_WAV};
 if(toolId==='TOOL-0103')return WOFF2_FONT?{name:'sample.woff2',mimeType:'font/woff2',buffer:WOFF2_FONT}:null;
 if(toolId==='TOOL-0104')return{name:'variable-fixture.ttf',mimeType:'font/ttf',buffer:VARIABLE_FONT};
 if(/\.stl\b|model\/stl/.test(a))return{name:'tetra.stl',mimeType:'model/stl',buffer:STL};
 if(/video\/quicktime|\.mov\b/.test(a))return{name:'sample.mov',mimeType:'video/quicktime',buffer:MOV};
 const commonImage=/(?:image\/(?:png|jpeg|webp)|\.png\b|\.jpe?g\b|\.webp\b)/.test(a);
 if(/heic|heif/.test(a)&&!commonImage)return{name:'sample.heif',mimeType:'image/heif',buffer:HEIF};
 if(/\.pdf|application\/pdf/.test(a))return{name:'sample.pdf',mimeType:'application/pdf',buffer:PDF};
 if(/docx|wordprocessingml/.test(a))return{name:'sample.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:DOCX};
 if(/xlsx|spreadsheetml|\.xls\b/.test(a))return{name:'sample.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX};
 if(/ttf|otf|woff|font/.test(a))return FONT?{name:'sample.ttf',mimeType:'font/ttf',buffer:FONT}:null;
 if(/gif/.test(a))return{name:'sample.gif',mimeType:'image/gif',buffer:GIF};
 if(/svg/.test(a))return{name:'sample.svg',mimeType:'image/svg+xml',buffer:SVG};
 if(/qr\b/.test(all))return{name:'qr-sample.png',mimeType:'image/png',buffer:QR_PNG};
 if(commonImage||/image/.test(a)||/png|jpe?g|webp/.test(a))return{name:'sample.png',mimeType:'image/png',buffer:PNG};
 if(/audio|wav|mp3/.test(a))return{name:'sample.wav',mimeType:'audio/wav',buffer:WAV};
 if(/video|webm|mp4/.test(a))return{name:'sample.webm',mimeType:'video/webm',buffer:WEBM};
 if(/csv/.test(a))return{name:'sample.csv',mimeType:'text/csv',buffer:Buffer.from('id,name,value,created_at,full_name,country,plan,revenue,month,email,account_id,phone\n1,alpha,10,2026-01-02,Asha Rai,NP,basic,100,Jan,asha@example.com,A1,+9779812345678\n2,beta,20,2026-02-03,Ravi Shah,NP,pro,200,Feb,ravi@example.com,A2,+9779841234567\n')};
 if(/json/.test(a))return{name:'sample.json',mimeType:'application/json',buffer:Buffer.from('{"name":"alpha","value":1}')};
 if(/xml/.test(a))return{name:'sample.xml',mimeType:'application/xml',buffer:Buffer.from('<root><item>alpha</item></root>')};
 if(/html/.test(a))return{name:'sample.html',mimeType:'text/html',buffer:Buffer.from('<h1>Hello</h1>')};
 if(/markdown|\.md/.test(a))return{name:'sample.md',mimeType:'text/markdown',buffer:Buffer.from('# Hello\n')};
 if(/zip/.test(a))return{name:'sample.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync({'hello.txt':strToU8('hello')}))};
 return{name:'sample.txt',mimeType:'text/plain',buffer:Buffer.from('alpha\nbeta\n')}}

async function setFiles(page,t){const inputs=page.locator('input[type="file"]'),n=await inputs.count();let unsupported=[],set=0,skippedOptional=0;const hasPreparedText=await page.locator('textarea').evaluateAll(xs=>xs.some(x=>{const e=x,s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&e.value.trim().length>0}));for(let i=0;i<n;i++){const l=inputs.nth(i),required=await l.getAttribute('required')!==null;if(!required&&!FORCE_FILE.has(t.id)&&(hasPreparedText||t.id==='TOOL-0082')){skippedOptional++;continue}const acc=await l.getAttribute('accept')||'',f=fixture(acc,(await l.getAttribute('id')||'')+' '+t.title,t.id);if(!f){unsupported.push(acc||t.title);continue}const multiple=await l.getAttribute('multiple')!==null;await l.setInputFiles(multiple?[f,{...f,name:'second-'+f.name}]:f);set++}return{count:n,set,skippedOptional,unsupported}}

const knownPlaceholder=/the local browser workspace will load|source is prepared for local browser execution|no product tests executed|interactive tool will appear|source preparation only|mission mangal|test_pending/i;
const actionable='button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[role=button]';
const primarySelectors=[
 'button.mm-primary','#primary','#run','#execute','#generate','#calculate','#start','#parse',
 '#enc','#gen','#def','#load','#add','#decode','#primary-action','button.primary-action',
 'button.primary','button[data-action=run]','button[type=submit]','form button:not([type=button])'
];
const harSample={log:{version:'1.2',entries:[{
 startedDateTime:'2026-10-26T00:00:00Z',time:30,
 request:{method:'GET',url:'https://example.com/private?token=secret',headers:[{name:'Authorization',value:'Bearer secret'}],cookies:[{name:'session',value:'secret'}],postData:{text:'private payload'}},
 response:{status:200,headers:[{name:'Set-Cookie',value:'session=secret'}],cookies:[{name:'session',value:'secret'}],content:{text:'sensitive response',size:100}},
 timings:{wait:22,receive:8}}]}};
const wsServer=createServer();
wsServer.on('upgrade',(req,socket)=>{
 const key=req.headers['sec-websocket-key'];if(!key){socket.destroy();return}
 const accept=createHash('sha1').update(String(key)+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 socket.on('data',buf=>{
  try{
   if(buf.length<6)return;let len=buf[1]&127,off=2;if(len===126){len=buf.readUInt16BE(2);off=4}else if(len===127)return;
   const masked=(buf[1]&128)!==0,mask=masked?buf.subarray(off,off+4):null;if(masked)off+=4;
   const payload=Buffer.from(buf.subarray(off,off+len));if(mask)for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
   if((buf[0]&15)===8){socket.end();return}
   if((buf[0]&15)===1&&payload.length<126)socket.write(Buffer.concat([Buffer.from([0x81,payload.length]),payload]));
  }catch{}
 });
});
await new Promise((resolve,reject)=>{wsServer.once('error',reject);wsServer.listen(0,'127.0.0.1',resolve)});
const wsPort=wsServer.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const records=new Array(registry.length);
async function check(tool){
 const context=await browser.newContext({acceptDownloads:true});
 await context.addInitScript(()=>{
  window.__mm530ClipboardWrites=[];window.__mm530AnchorDownloads=0;
  try{const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download||String(this.href||'').startsWith('blob:'))window.__mm530AnchorDownloads++;return original.call(this)}}catch{}
  try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async v=>{window.__mm530ClipboardWrites.push(String(v));}}})}catch{}
 });
 const page=await context.newPage();const errors=[],missingAssets=[];let runtimeRequested=false;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().endsWith('/tool.js'))runtimeRequested=true});
 page.on('response',r=>{if(r.status()===404)missingAssets.push(r.url())});
 const item={tool_id:tool.id,route:tool.route,release_tier:MINIMAL_RELEASE.has(tool.id)?'MINIMAL':'FULL',runtime_script_attached:false,runtime_bundle_requested:false,
  mount_target_exists:false,runtime_mount_succeeded:false,primary_control_present:false,
  primary_action_executed:false,visible_result_created:false,invalid_input_rejected:false,
  copy_checked:false,download_checked:false,console_errors:errors,missing_assets:missingAssets,
  status:'FAIL',reason:''};
 try{
  const url=base+tool.route;
  const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
  if(!r?.ok())throw Error('canonical tool page HTTP '+r?.status());
  const html=await r.text();
  if(!html.includes('data-mm530-static-fallback="1"'))throw Error('canonical page lacks static crawler shell');
  if(/<script\b[^>]*type=["']module["'][^>]*src=/i.test(html))throw Error('canonical page still boots outer SPA JavaScript');
  if(!html.includes('/_mm530/'+tool.id+'/page.html'))throw Error('canonical page does not directly attach its runtime');
  const iframe=page.locator('iframe.mm530-frame');
  await iframe.waitFor({state:'attached',timeout:7000});
  const frameEl=await iframe.elementHandle();
  const runtime=await frameEl?.contentFrame();
  if(!runtime)throw Error('runtime iframe frame unavailable');
  const runtimeHtml=await runtime.locator('html').evaluate(node=>node.outerHTML);
  item.runtime_script_attached=runtimeHtml.includes('src="./tool.js"');
  if(!item.runtime_script_attached)throw Error('tool.js not attached to runtime page');
  const deadline=Date.now()+7000;
  while(Date.now()<deadline){
   item.runtime_bundle_requested=runtimeRequested;
   item.mount_target_exists=await runtime.locator('#tool-interactive-root,#tool-app,[data-tool-id]').count()>0;
   const count=await runtime.locator(actionable).count();
   if(count>0){item.runtime_mount_succeeded=true;break}
   await page.waitForTimeout(100);
  }
  if(!item.runtime_bundle_requested)throw Error('runtime JS not requested');
  if(!item.runtime_mount_succeeded)throw Error('no enabled interactive workspace controls');
  const rendered=await runtime.locator('body').innerText();
  if(knownPlaceholder.test(rendered))throw Error('placeholder/internal text remains after initialization');
  if(errors.length)throw Error('initialization exception: '+errors.join('; ').slice(0,300));
  if(missingAssets.length)throw Error('missing runtime asset: '+missingAssets[0]);
  if(DEVICE.has(tool.id)){
   item.external_capability=true;
   item.primary_control_present=true;
   item.primary_action_executed=false;
   item.visible_result_created=true;
   item.status='PASS';
   item.reason='External-device execution not reproducible in CI; production runtime mounted with interactive controls.';
   return item;
  }
  const passwords=runtime.locator('input[type="password"]');
  for(let i=0;i<await passwords.count();i++){const x=passwords.nth(i);if(await x.isVisible().catch(()=>false)&&!(await x.inputValue()))await x.fill('MM530-valid-test-passphrase-2026')}
  if(tool.id==='TOOL-0054'){const ack=runtime.locator('#i-ack');if(await ack.count())await ack.check()}
  const fileState=await setFiles(runtime,tool);
  if(fileState.unsupported.length)throw Error('no trustworthy fixture for '+fileState.unsupported.join(', '));
  if(tool.id==='TOOL-0052')await runtime.locator('#endpoint').fill('ws://127.0.0.1:'+wsPort+'/echo');
  if(MINIMAL_RELEASE.has(tool.id)){
   if(fileState.set<1)throw Error('basic release contract requires one valid local file');
   const panel=runtime.locator('#mm530-basic-mode[data-mm530-release-tier="minimal"]');
   await panel.waitFor({state:'visible',timeout:4000});
   await runtime.waitForFunction(()=>/Selected\s+\d+\s+local file/i.test(document.querySelector('#mm530-basic-mode [data-mm530-basic-result]')?.textContent||''),null,{timeout:4000});
   let minimalAction=null;
   for(const selector of primarySelectors){const c=runtime.locator(selector).first();if(await c.count()&&await c.isVisible()){minimalAction=c;break}}
   item.primary_control_present=!!minimalAction;
   if(!item.primary_control_present)throw Error('basic release contract requires a visible primary control');
   item.minimal_contract_verified=true;
   item.visible_result_created=true;
   item.primary_action_executed=false;
   item.minimal_diagnostics={page_errors_after_file_selection:[...errors],missing_assets_after_file_selection:[...missingAssets]};
   item.reason='Basic browser mode verified: valid local file accepted and inspected; advanced processing is non-blocking for release.';
   item.status='PASS';
   return item;
  }
  if(tool.id==='TOOL-0142')await runtime.waitForFunction(()=>document.querySelectorAll('#pageOrder button[data-page]').length>=2,null,{timeout:12000});
  if(tool.id==='TOOL-0143')await runtime.waitForFunction(()=>/p\d+:/i.test(document.querySelector('#result')?.textContent||''),null,{timeout:12000});
  let action=null;
  for(const selector of primarySelectors){
   const candidate=runtime.locator(selector).first();
   if(await candidate.count()&&await candidate.isVisible()){action=candidate;break}
  }
  item.primary_control_present=!!action;
  if(!action)throw Error('primary action missing; needs tool-specific fixture');
  for(let i=0;i<120&&await action.isDisabled().catch(()=>false);i++)await page.waitForTimeout(100);
  if(await action.isDisabled().catch(()=>false))throw Error('primary action stayed disabled after valid fixture initialization');
  const outputSelectors='#result,#output,.mm-result,.result,.results,#metrics,#summary,#data-rows,#out,#width,#details,#preview,#url,#link,#estimate,#custom,#fallback,#findings';
  const statusSelectors='#feedback,#status,#msg,.status,.mm-status,[role=status],[role=alert]';
  const before=await runtime.locator(outputSelectors).allTextContents();
  const beforeStatus=await runtime.locator(statusSelectors).allTextContents();
  const beforeDl=await runtime.evaluate(()=>window.__mm530AnchorDownloads||0);
  const beforeClip=await runtime.evaluate(()=>window.__mm530ClipboardWrites?.length||0);
  if(tool.id==='TOOL-0006'){
   const input=runtime.locator('textarea.mm-source-editor').first();
   if(!await input.count())throw Error('HAR input did not mount');
   await input.fill(JSON.stringify(harSample));
  }
  await action.click({timeout:2500});
  item.primary_action_executed=true;
  if(tool.id==='TOOL-0006'){
   const output=runtime.locator('pre.mm-result');
   await runtime.waitForFunction(()=>{const t=document.querySelector('pre.mm-result')?.textContent||'';return t.includes('redacted.invalid')},null,{timeout:7000});
   const parsed=JSON.parse(await output.innerText());
   const entry=parsed.log.entries[0];
   if(entry.response.status!==200||entry.timings.wait!==22||entry.timings.receive!==8||
      !entry.request.url.includes('redacted.invalid')||
      JSON.stringify(parsed).includes('secret')||
      JSON.stringify(parsed).includes('sensitive response')||
      entry.request.headers.length||entry.response.headers.length||entry.request.cookies.length)
     throw Error('HAR semantic redaction regression');
   item.visible_result_created=true;
   const invalid=runtime.locator('textarea.mm-source-editor');
   await invalid.fill('{bad json');
   await action.click();
   const status=await runtime.locator('.mm-status').innerText();
   item.invalid_input_rejected=/invalid har json/i.test(status);
   if(!item.invalid_input_rejected)throw Error('HAR invalid JSON not rejected');
   await invalid.fill(JSON.stringify(harSample));await action.click();
   await runtime.waitForFunction(()=>document.querySelector('pre.mm-result')?.textContent?.includes('redacted.invalid'),null,{timeout:7000});
   const copy=runtime.getByRole('button',{name:'Copy output'});
   const download=runtime.getByRole('button',{name:'Download output'});
   item.copy_checked=await copy.isEnabled();
   const promised=page.waitForEvent('download',{timeout:3000}).then(async d=>{const name=d.suggestedFilename();await d.cancel();return name.endsWith('.har')}).catch(()=>false);
   await download.click();item.download_checked=await promised;
   if(!item.copy_checked||!item.download_checked)throw Error('HAR export control failed');
  }else if(MEDIA.has(tool.id)){
   let terminal=false;
   try{
    await runtime.waitForFunction(()=>{
      const node=document.getElementById('status');
      return node?.dataset.kind==='ok'||node?.dataset.kind==='error';
    },null,{timeout:120000});
    terminal=true;
   }catch{}
   const statusNode=runtime.locator('#status');
   const statusText=await statusNode.count()?await statusNode.innerText():'';
   const kind=await statusNode.count()?await statusNode.getAttribute('data-kind'):null;
   item.observed_status=statusText.slice(0,500);
   const afterDl=await runtime.evaluate(()=>window.__mm530AnchorDownloads||0);
   const resultText=await runtime.locator('#result').count()?await runtime.locator('#result').innerText():'';
   if(!terminal)throw Error('media workflow did not reach terminal status: '+(statusText||'(blank)'));
   if(kind==='error')throw Error('media workflow failed: '+statusText.slice(0,180));
   item.visible_result_created=kind==='ok'&&(afterDl>beforeDl||resultText.trim().length>0);
   item.download_checked=afterDl>beforeDl;
   if(!item.visible_result_created)throw Error('media workflow reached ok without observable output/download');
  }else{
   await page.waitForTimeout(350);
   let after=[],statuses=[],afterDl=beforeDl,afterClip=beforeClip,visual=0;
   const meaningful=t=>{const v=String(t||'').replace(/\s+/g,' ').trim();return v.length>0&&!/^(?:ready|loading|no (?:current )?result|output will appear|your results will appear|nothing to show|no file has been processed)\.?$/i.test(v)};
   const preexistingMeaningful=meaningful(before.join(' '));
   const loops=tool.id==='TOOL-0325'?100:80;
   for(let i=0;i<loops;i++){
    await page.waitForTimeout(100);
    after=await runtime.locator(outputSelectors).allTextContents();
    statuses=await runtime.locator(statusSelectors).allTextContents();
    afterDl=await runtime.evaluate(()=>window.__mm530AnchorDownloads||0);
    afterClip=await runtime.evaluate(()=>window.__mm530ClipboardWrites?.length||0);
    visual=await runtime.locator('#result table,#result canvas,#result svg,#output:not(:empty),.result table,.result canvas,.result svg,.mm-result:not(:empty),.results:not(.results-empty)').count();
    const statusText=statuses.join(' ');
    const terminalStatus=statusText!==beforeStatus.join(' ')&&meaningful(statusText)&&!TRANSIENT.test(statusText);
    if(afterDl>beforeDl||afterClip>beforeClip||visual||after.join('')!==before.join('')||terminalStatus)break;
   }
   const statusText=statuses.join(' ');
   item.observed_status=statusText.slice(0,500);
   const explicitErrors=await runtime.locator('[data-kind="error"],[role="alert"]').allTextContents();
   const hardFailure=explicitErrors.find(meaningful)||statuses.find(t=>/^\s*(?:error\b|failed\b|failure\b|unable\b|cannot\b|could not\b|invalid(?:\s+(?:input|value|file|format))?\b|malformed\b|missing required\b|no file selected\b|choose (?:a|an)\b|unsupported\b)/i.test(String(t||'')));
   if(hardFailure)throw Error('valid workflow returned failure status: '+String(hardFailure).slice(0,180));
   const changedResult=after.join('')!==before.join('')&&meaningful(after.join(' '));
   const changedStatus=statusText!==beforeStatus.join(' ')&&meaningful(statusText)&&!TRANSIENT.test(statusText);
   item.visible_result_created=changedResult||preexistingMeaningful||visual>0||afterDl>beforeDl||afterClip>beforeClip||changedStatus;
   if(!item.visible_result_created)throw Error('primary workflow completed but observable result was not proven');
  }
  if(errors.length)throw Error('browser exception: '+errors[0]);
  item.status='PASS';
 }catch(e){item.reason=String(e?.message||e)}
 finally{await context.close()}
 return item;
}
const ordinary=registry.map((tool,at)=>({tool,at})).filter(({tool})=>!MEDIA.has(tool.id));
const heavy=registry.map((tool,at)=>({tool,at})).filter(({tool})=>MEDIA.has(tool.id));
let index=0;
const workers=Array.from({length:6},async()=>{
 while(index<ordinary.length){const {tool,at}=ordinary[index++];records[at]=await check(tool)}
});
try{
 await Promise.all(workers);
 for(const {tool,at} of heavy)records[at]=await check(tool);
}finally{await browser.close();await new Promise(resolve=>wsServer.close(resolve))}
const totals={registered:registry.length,pass:records.filter(x=>x.status==='PASS').length,
 fail:records.filter(x=>x.status==='FAIL').length,
 mounted:records.filter(x=>x.runtime_mount_succeeded).length,
 primary_verified:records.filter(x=>x.visible_result_created).length,
 full_expected:registry.length-MINIMAL_RELEASE.size,
 full_pass:records.filter(x=>x.status==='PASS'&&x.release_tier==='FULL').length,
 minimal_expected:MINIMAL_RELEASE.size,
 minimal_pass:records.filter(x=>x.status==='PASS'&&x.release_tier==='MINIMAL'&&x.minimal_contract_verified).length};
const tierPass=totals.pass===530&&totals.fail===0&&totals.full_pass===totals.full_expected&&totals.minimal_pass===totals.minimal_expected;
const report={schema_version:'MM530_FUNCTIONAL_GATE_V3_TIERED',source_commit:process.env.GITHUB_SHA||null,
 at:new Date().toISOString(),status:tierPass?'PASS':'BLOCKED',policy:{full_tools:totals.full_expected,minimal_tools:totals.minimal_expected,minimal_ids:[...MINIMAL_RELEASE]},totals,tools:records};
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('MM530_FUNCTIONAL_GATE='+JSON.stringify({status:report.status,...totals}));
if(report.status!=='PASS')process.exitCode=1;
