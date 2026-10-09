import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import worker,{route,sitemap,dateIndex,dateAt,facts,midnight,TOTAL,SHARD,foldIcs} from './worker.mjs';
import {POLICY,INDEX_TOTAL,indexedPath,inWindow,indexDate,WINDOW_DAYS,CANONICAL_DAYS} from './indexing.mjs';
import {panchang,tithiAt} from './panchang.mjs';
import cities from './cities.json' with {type:'json'};
const city=s=>cities.find(c=>c.slug===s),request=p=>new Request('https://aafnaipatro.com'+p);
assert.equal(TOTAL,2000000);assert.equal(INDEX_TOTAL,104429);
assert.equal(dateIndex('2026-02-29'),-1);assert.equal(dateIndex('2024-02-29'),dateIndex('2024-02-28')+1);
assert.equal(dateIndex('1927-10-08'),-1);assert.equal(dateIndex('2037-04-14'),-1);
assert.equal((midnight('2026-03-09',city('new-york').tz)-midnight('2026-03-08',city('new-york').tz))/3600000,23);
assert.equal((midnight('2026-11-02',city('new-york').tz)-midnight('2026-11-01',city('new-york').tz))/3600000,25);
const unique=new Set();let cityCount=0,dateCount=0;
for(let n=0;n<Math.ceil(INDEX_TOTAL/SHARD);n++){
  const urls=[...sitemap(n).matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
  assert.equal(urls.length,Math.min(SHARD,INDEX_TOTAL-n*SHARD));
  for(let j=0;j<urls.length;j++){
    const path=urls[j].replace('https://aafnaipatro.com','');assert.equal(path,indexedPath(n*SHARD+j));assert.ok(!unique.has(path));unique.add(path);
    const d=path.slice(-10);assert.ok(dateIndex(d)>=0);
    if(path.startsWith('/date/')){dateCount++;assert.ok(indexDate(d));}
    else{cityCount++;assert.ok(inWindow(d));assert.ok(!path.includes('/kathmandu/'));}
  }
}
assert.equal(cityCount,49*WINDOW_DAYS);assert.equal(dateCount,CANONICAL_DAYS);assert.equal(unique.size,INDEX_TOTAL);
// Independent, timestamped Drik Panchang fixtures; times are factual samples.
const fixtures=[
 {city:city('kathmandu'),date:'2026-10-10',tithi:30,end:'2026-10-10T15:49:00Z',source:'https://www.drikpanchang.com/vrats/amavasyadates.html?geoname-id=1283240'},
 {city:city('tokyo'),date:'2026-10-09',tithi:29,end:'2026-10-09T16:05:00Z',rahu:['2026-10-09T01:02:00Z','2026-10-09T02:28:00Z'],source:'https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1850147&date=09%2F10%2F2026'},
 {city:city('sydney'),date:'2026-10-10',tithi:30,end:'2026-10-10T15:49:00Z',rahu:['2026-10-09T22:32:00Z','2026-10-10T00:07:00Z'],source:'https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=2147714&date=10%2F10%2F2026'},
 {city:{name:'San Jose',lat:37.3394,lon:-121.895,tz:'America/Los_Angeles'},date:'2026-10-10',tithi:30,end:'2026-10-10T15:49:00Z',source:'https://www.drikpanchang.com/panchang/day-panchang.html?date=10%2F10%2F2026'}
];
const referenceResults=[];
for(const x of fixtures){const p=panchang(x.city,x.date,facts(x.city,x.date));assert.equal(p.tithi.index,x.tithi);const delta=(p.tithi.end-Date.parse(x.end))/60000;assert.ok(Math.abs(delta)<2);if(x.rahu)for(const [i,event] of ['start','end'].entries())assert.ok(Math.abs(p.rahu[event]-Date.parse(x.rahu[i]))<120000);referenceResults.push({city:x.city.name,date:x.date,tithi:p.tithi.index,endDeltaMinutes:delta,source:x.source});}
let samples=0,differenceFound=false;
const times=[];
for(const c of cities)for(const d of ['1940-01-01','2000-02-29','2026-03-08','2026-10-09','2026-11-01','2029-10-10']){
 const start=performance.now(),f=facts(c,d),p=panchang(c,d,f);times.push(performance.now()-start);samples++;
 if(f.rise){assert.ok(p.tithi.index>=1&&p.tithi.index<=30);assert.ok(p.tithi.end>f.rise);assert.ok(p.tithi.end-f.rise<3*86400000);const after=tithiAt(new Date(p.tithi.end.getTime()+1000));assert.equal(after.index,p.tithi.index%30+1);}
 if(p.rahu){assert.ok(p.rahu.start>=f.rise&&p.rahu.end<=f.set);assert.ok(Math.abs((p.rahu.end-p.rahu.start)-(f.set-f.rise)/8)<2);}
 if(c.slug==='tokyo'&&p.tithi?.index!==panchang(city('kathmandu'),d,facts(city('kathmandu'),d)).tithi?.index)differenceFound=true;
}
const polar=facts({name:'Tromso',lat:69.6492,lon:18.9553,tz:'Europe/Oslo'},'2026-06-21');assert.equal(polar.rise,null);assert.equal(panchang({tz:'Europe/Oslo'},'2026-06-21',polar).tithi,null);
for(const p of ['/atlas/','/atlas/publishers','/atlas/dictionary','/atlas/tokyo','/atlas/tokyo/year/1931','/atlas/tokyo/month/1931-10','/atlas/tokyo/1931-10-09','/atlas/tokyo/2026-10-10','/atlas/kathmandu/2026-10-10','/atlas/widget/tokyo','/sitemap-atlas.xml','/sitemap-atlas-104.xml'])assert.equal((await route(request(p))).status,200);
assert.equal((await route(request('/sitemap-atlas-1999.xml'))).status,410);
assert.equal((await route(request('/atlas/tokyo/2026-02-29'))).status,404);
for(const d of ['1927-10-09','2025-10-09','2029-10-11','2037-04-13']){const r=await route(request('/atlas/tokyo/'+d));assert.equal(r.status,200);assert.equal(r.headers.get('x-robots-tag'),'noindex,follow');assert.ok((await r.text()).includes('content="noindex,follow"'));}
for(const d of [POLICY.from,POLICY.to])assert.equal((await route(request('/atlas/tokyo/'+d))).headers.get('x-robots-tag'),'index,follow');
const ktmHtml=await(await route(request('/atlas/kathmandu/2026-10-10'))).text();assert.ok(ktmHtml.includes('rel="canonical" href="https://aafnaipatro.com/date/2026-10-10"'));
const tokyoHtml=await(await route(request('/atlas/tokyo/2026-10-10'))).text();for(const s of ['Tithi at local sunrise','Paksha','Rahu Kaal','Tithi ends','Time difference'])assert.ok(tokyoHtml.includes(s));for(const s of ['On this calendar date across history','Nepali calendar vocabulary','Nobel'])assert.ok(!tokyoHtml.includes(s));
const original=readFileSync(new URL('./fixtures/date-current.html',import.meta.url),'utf8');
const env={ORIGIN:{fetch:async r=>new Response(new URL(r.url).pathname==='/date/2026-10-10'?original:'original-file',{headers:{'content-type':'text/html; charset=utf-8','x-core-test':'preserved','etag':'old'}})}};
const enriched=await route(request('/date/2026-10-10'),env),html=await enriched.text();assert.ok(html.includes('id="local-panchang"'));assert.equal(enriched.headers.get('x-core-test'),'preserved');assert.equal(enriched.headers.get('etag'),null);
const section=html.slice(html.indexOf('<section id="local-panchang"'),html.indexOf('</section>',html.indexOf('<section id="local-panchang"'))+10);
assert.equal(html.replace(section,''),original.replace(/<meta\s+name=["']robots["'][^>]*>/i,'<meta name="robots" content="index,follow,max-snippet:-1">'));
for(const path of ['/robots.txt','/sitemap.xml','/date/2026-8-06'])assert.equal(await(await route(request(path),env)).text(),'original-file');
const unavailable={ORIGIN:{fetch:async()=>new Response('archive unavailable',{status:503})}};assert.equal((await route(request('/date/2026-10-10'),unavailable)).status,503);
const head=await worker.fetch(new Request('https://aafnaipatro.com/date/2026-10-10',{method:'HEAD'}),env);assert.equal(await head.text(),'');assert.equal(head.headers.get('x-atlas-version'),'3.0.0');
const csv=await route(request('/atlas/tokyo/2026-10-10/data.csv'));assert.ok(csv.headers.get('link').includes('licenses/by/4.0'));const data=await csv.text();for(const s of ['tithi_at_sunrise','tithi_end_utc','rahu_start_local','moonrise_local','source_url','license'])assert.ok(data.includes(s));
const annual=await(await route(request('/atlas/sydney/tithi-calendar/2026.ics'))).text();const events=[...annual.matchAll(/BEGIN:VEVENT/g)].length;assert.ok(events>40&&events<60);for(const line of annual.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);assert.ok(annual.includes('END:VCALENDAR'));
for(const line of foldIcs(['औंसी'.repeat(50)]).split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
const widget=await route(request('/atlas/widget/tokyo'));assert.ok(widget.headers.get('content-security-policy').includes('frame-ancestors *'));
times.sort((a,b)=>a-b);
const report={verifiedAt:new Date().toISOString(),liveAtlasInventory:TOTAL,sitemapUrls:unique.size,sitemapShards:105,otherCityUrls:cityCount,canonicalDateUrls:dateCount,policy:POLICY,astronomySamples:samples,independentPanchangChecks:referenceResults,medianComputeMs:times[Math.floor(times.length/2)],p95ComputeMs:times[Math.floor(times.length*.95)],bundleBytes:statSync(new URL('./bundle.mjs',import.meta.url)).size,coreHtmlPreserved:true,dstAndPolarTestsPassed:true,festivalAssignments:'not inferred from sunrise; pending authoritative rules'};
writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
