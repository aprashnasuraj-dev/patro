import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { generateKeyPairSync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import vm from "node:vm";
import { build } from "esbuild";
const dir=mkdtempSync(resolve(tmpdir(),"patro-morning-test-"));
async function load(file){const out=resolve(dir,file.split("/").at(-1)+".mjs");await build({entryPoints:[file],outfile:out,bundle:true,platform:"node",format:"esm",logLevel:"silent"});return import(pathToFileURL(out));}
const message=await load("lib/morning-message.ts"),conversion=await load("worker/conversion-page.ts"),push=await load("worker/morning-push.ts");
const clientMorning=await load("src/localMorning.ts");
const origin="https://aafnaipatro.com";
test("morning greeting has real date, weekday, tithi, deduplicated events and शुभ दिन",()=>{
 const value=message.morningMessage("2026-10-07",{bs:{year:2083,month:6,day:21},panchang:{tithi:{ne:"एकादशी"}}},["एकादशी","एकादशी"],"सुरज");
 assert.equal(value.title,"शुभ प्रभात सुरज!");assert.match(value.body,/२०८३ साल असोज २१ गते, बुधबार/);assert.match(value.body,/तिथि: एकादशी/);assert.match(value.body,/आज: एकादशी। शुभ दिन।$/);
 assert.equal(message.nextNepalMorning(Date.parse("2026-10-06T23:30:00Z")),"2026-10-07T00:15:00.000Z");
 assert.equal(message.nextNepalMorning(Date.parse("2026-10-07T00:15:00Z")),"2026-10-08T00:15:00.000Z");
});
test("conversion pages render correct answers; normalize aliases; reject invalid dates",async()=>{
 const r=await conversion.conversionPageResponse(new Request(origin+"/bs-to-ad/2083-baisakh-1"),{});assert.equal(r.status,200);const html=await r.text();assert.match(html,/2026-04-14/);assert.match(html,/rel="canonical" href="https:\/\/aafnaipatro.com\/bs-to-ad\/2083-baisakh-1"/);
 const alias=await conversion.conversionPageResponse(new Request(origin+"/bs-to-ad/2083-baishakh-01"),{});assert.equal(alias.status,301);assert.equal(alias.headers.get("location"),origin+"/bs-to-ad/2083-baisakh-1");
 for(const path of ["/ad-to-bs/2026-02-30","/bs-to-ad/2083-baisakh-32"]){assert.equal((await conversion.conversionPageResponse(new Request(origin+path),{})).status,404);}
 assert.equal((await conversion.conversionPageResponse(new Request(origin+"/bs-to-ad/2095-baisakh-1"),{})).headers.get("x-robots-tag"),"noindex, follow");
});
test("declined permission is remembered; startup and reload scheduling never ask again",async()=>{
 const values=new Map(),backups=new Map(),names=["window","Notification","navigator","localStorage","document"];
 for(const name of names)backups.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
 let requests=0;
 const notification={permission:"default",async requestPermission(){requests++;return "default"}};
 const globals={window:{Notification:notification},Notification:notification,navigator:{serviceWorker:{}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},document:{addEventListener(){},visibilityState:"visible"}};
 for(const name of names)Object.defineProperty(globalThis,name,{value:globals[name],configurable:true});
 try{
  assert.equal(clientMorning.morningOfferSeen(),false);
  assert.equal((await clientMorning.enableLocalMorningGreeting("सुरज")).ok,false);
  assert.equal(clientMorning.morningOfferSeen(),true);
  clientMorning.startLocalMorningScheduler();clientMorning.startLocalMorningScheduler();
  assert.equal(requests,1);
 }finally{for(const name of names){const descriptor=backups.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
});
function database(){
 const db=new DatabaseSync(":memory:");db.exec(readFileSync("cloudflare/d1/schema-migrations/0004_morning_push.sql","utf8"));db.exec(readFileSync("cloudflare/d1/schema-migrations/0002_runtime_rate_limits.sql","utf8"));
 return { raw:db, prepare(sql) {
   return { bind(...args) {
     const stmt=db.prepare(sql);
     return {
       async first(){return stmt.get(...args)||null},
       async all(){return {results:stmt.all(...args)}},
       async run(){const r=stmt.run(...args);return {meta:{changes:r.changes}}}
     };
   }};
 }};
}
function keys(){const {privateKey}=generateKeyPairSync("ec",{namedCurve:"prime256v1"});const j=privateKey.export({format:"jwk"});return{private:j.d,public:Buffer.concat([Buffer.from([4]),Buffer.from(j.x,"base64url"),Buffer.from(j.y,"base64url")]).toString("base64url")};}
test("guest push is consented, device-authorized, encrypted, recurring and deduplicated",async()=>{
 const DB=database(),v=keys(),client=keys();const env={DB,VAPID_PUBLIC_KEY:v.public,VAPID_PRIVATE_KEY:v.private,VAPID_SUBJECT:origin+"/contact",ASSETS:{async fetch(req){if(req.url.includes("festival-index"))return Response.json({festivals:{ekadashi:{name:"एकादशी",years:{2083:{dates:["2026-10-07"]}}}}});return Response.json({schema:1,calendar:"ad",year:2026,rows:[{ad:"2026-10-07",bs:{year:2083,month:6,day:21},panchang:{tithi:{ne:"एकादशी"}}}]});}}};
 const body={device_id:"test_device_123456789",device_secret:"s".repeat(40),name:"सुरज",consent:true,subscription:{endpoint:"https://fcm.googleapis.com/fcm/send/test",keys:{p256dh:client.public,auth:Buffer.alloc(16,7).toString("base64url")}}};
 const request=(b,method="POST")=>new Request(origin+"/api/push/morning",{method,headers:{origin,"content-type":"application/json"},body:JSON.stringify(b)});
 assert.equal((await push.morningPushResponse(request({...body,consent:false}),env)).status,400);
 assert.equal((await push.morningPushResponse(request(body),env)).status,200);
 assert.equal((await push.morningPushResponse(request({...body,device_secret:"x".repeat(40)}),env)).status,403);
 assert.equal((await push.morningPushResponse(request({...body,subscription:{...body.subscription,endpoint:"https://127.0.0.1/private"}}),env)).status,400);
 DB.raw.prepare("UPDATE morning_subscriptions SET next_due_at=?").run("2026-10-07T00:15:00.000Z");
 const previous=globalThis.fetch;let sends=0;
 globalThis.fetch=async(url,options)=>{assert.equal(url,body.subscription.endpoint);assert.equal(options.redirect,"error");assert.ok(options.body);sends++;return new Response(null,{status:201})};
 try{assert.equal((await push.dispatchMorningPush(env,200,Date.parse("2026-10-07T00:15:00Z"))).sent,1);assert.equal((await push.dispatchMorningPush(env,200,Date.parse("2026-10-07T00:20:00Z"))).sent,0);assert.equal(sends,1);assert.equal(DB.raw.prepare("SELECT next_due_at FROM morning_subscriptions").get().next_due_at,"2026-10-08T00:15:00.000Z");}finally{globalThis.fetch=previous;}
 assert.equal((await push.morningPushResponse(request(body,"DELETE"),env)).status,200);assert.equal(DB.raw.prepare("SELECT count(*) c FROM morning_subscriptions").get().c,0);
});
test("service worker accepts push and preserves personal config across updates",()=>{
 const s=readFileSync("public/sw.js","utf8");assert.ok(s.includes('self.addEventListener("push"'));assert.ok(s.includes("self.registration.showNotification"));assert.ok(s.includes("target.origin===self.location.origin"));assert.ok(s.includes("LOCAL_CONFIG_CACHE"));
});
test("offline snapshot supplies a full BS month and Tithi; push receipt displays the message",async()=>{
 const stores=new Map(),events=new Map(),notifications=[];
 const key=value=>typeof value==="string"?new URL(value,origin).href:value.url;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return{async put(k,v){map.set(key(k),v.clone())},async match(k){return map.get(key(k))?.clone()},async keys(){return [...map.keys()].map(k=>new Request(k))},async delete(k){return map.delete(key(k))}}}};
 const context=vm.createContext({Request,Response,Headers,URL,Date,Intl,Set,Map,Promise,console,caches,fetch:async()=>{throw new Error("offline")},self:{location:{origin},addEventListener(name,fn){events.set(name,fn)},registration:{async showNotification(title,options){notifications.push({title,...options})}}}});
 vm.runInContext(readFileSync("public/sw.js","utf8"),context);
 const snapshot={start:"2026-09-17",end:"2026-10-17",month_days:31,days:Array.from({length:31},(_,i)=>({ad:new Date(Date.UTC(2026,8,17+i)).toISOString().slice(0,10),bs:{year:2083,month:6,day:i+1},panchang:{tithi:{ne:"एकादशी"}}})),events:[{ad_date:"2026-10-07",name_ne:"एकादशी"}]};
 const store=await caches.open("aafnai-calendar-v4");await store.put("/data/calendar/offline-window.json",Response.json(snapshot));
 const offline=vm.runInContext("offlineCalendarResponse",context);
 assert.equal((await (await offline(new Request(origin+"/api/v1/calendar/2083/6?calendar=bs"))).json()).days.length,31);
 const today=await (await offline(new Request(origin+"/api/v1/sync?date=2026-10-07"))).json();assert.equal(today.archive_panchang.tithi.ne,"एकादशी");
 assert.equal(await offline(new Request(origin+"/api/v1/sync?date=2030-01-01")),null);
 let done;events.get("push")({data:{json:()=>({title:"शुभ प्रभात सुरज!",body:"शुभ दिन।",url:"https://attacker.example/",date:"2026-10-07",category:"morning"})},waitUntil(p){done=p}});await done;
 assert.equal(notifications[0].title,"शुभ प्रभात सुरज!");assert.equal(notifications[0].data.url,"/today");
});
