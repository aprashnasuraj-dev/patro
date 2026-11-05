import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {AD_DIAGNOSTICS_JS,AD_DIAGNOSTICS_HASH,AD_DIAGNOSTICS_VERSION,AD_EARLY_SCRIPT_HINTS,addAdDiagnostics,adDiagnosticsCsp} from './ad-diagnostics.mjs';

function browser({consent, globalTag=true}={}) {
  const listeners={}, events=[], timers=[];
  const add=(scope,type,fn)=>{(listeners[scope+':'+type] ||= []).push(fn);};
  const doc={readyState:'loading',visibilityState:'visible',addEventListener:(t,f)=>add('doc',t,f),getElementById:()=>null};
  const win={dataLayer:consent?[['consent','default',{analytics_storage:consent}]]:[],addEventListener:(t,f)=>add('win',t,f)};
  if(globalTag) win.gtag=(...args)=>events.push(args);
  const context={window:win,document:doc,location:{href:'https://aafnaipatro.com/'},URL,Set,Array,Object,
    setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{}};
  vm.runInNewContext(AD_DIAGNOSTICS_JS,context);
  return {win,doc,events,listeners,emit:(scope,type,event)=>{for(const fn of listeners[scope+':'+type]||[])fn({type,...event});}};
}
function smartlink(href,position='top') {
  const slot={getAttribute:()=>`smartlink-${position}`};
  const anchor={getAttribute:()=>href,closest:s=>s==='[data-patro-adsterra]'?slot:null};
  return {closest:s=>s==='a[href]'?anchor:null};
}
function nativeAnchor() {
  const slot={getAttribute:()=> 'native'};
  const anchor={closest:s=>s==='[data-patro-adsterra]'?slot:s.startsWith('#container-')?{}:null};
  return {closest:s=>s==='a[href]'?anchor:null};
}
test('records only trusted, approved voluntary smartlink interactions without changing navigation',()=>{
  const b=browser(), target=smartlink('https://asiafilm.org/4/b1871169a9878fda2bc2de21a208995a');
  b.emit('doc','click',{isTrusted:false,button:0,target});
  b.emit('doc','click',{isTrusted:true,button:2,target});
  b.emit('doc','click',{isTrusted:true,button:0,target:smartlink('https://evil.example/')});
  assert.equal(b.events.length,0);
  b.emit('doc','click',{isTrusted:true,button:0,target});
  b.emit('doc','auxclick',{isTrusted:true,button:1,target:smartlink('https://araplhn.org/4/c752b529eb7d6d4ebf1096d225dfb10a','bottom')});
  assert.deepEqual(b.events.map(e=>e[1]),['adsterra_smartlink_click','adsterra_smartlink_click']);
  assert.equal(b.events[0][2].ad_position,'top'); assert.equal(b.events[1][2].ad_position,'bottom');
});
test('records native link interactions as observations rather than paid clicks',()=>{
  const b=browser(); b.emit('doc','click',{isTrusted:true,button:0,target:nativeAnchor()});
  assert.equal(b.events[0][1],'adsterra_native_interaction');
});
test('deduplicates only matching resource statuses and ignores unrelated scripts',()=>{
  const b=browser();
  const script=kind=>({tagName:'SCRIPT',getAttribute:()=>kind});
  b.emit('win','load',{target:script('popunder')}); b.emit('win','load',{target:script('popunder')});
  b.emit('win','error',{target:script('social')}); b.emit('win','error',{target:script('other')});
  assert.equal(b.events.length,2); assert.equal(b.events[0][2].status,'loaded'); assert.equal(b.events[1][2].status,'error');
});
test('does not send when analytics is denied and resumes only after a grant',()=>{
  const b=browser({consent:'denied'}),target=smartlink('https://asiafilm.org/4/b1871169a9878fda2bc2de21a208995a');
  b.emit('doc','click',{isTrusted:true,button:0,target}); assert.equal(b.events.length,0);
  b.win.dataLayer.push(['consent','update',{analytics_storage:'granted'}]);
  b.emit('doc','click',{isTrusted:true,button:0,target}); assert.equal(b.events.length,1);
  b.win.aafnaiAnalytics={enabled:()=>false}; b.emit('doc','click',{isTrusted:true,button:0,target}); assert.equal(b.events.length,1);
});
test('buffers early script results until the existing Google tag exists',()=>{
  const b=browser({globalTag:false});
  b.emit('win','error',{target:{tagName:'SCRIPT',getAttribute:()=> 'social'}});
  b.win.gtag=(...args)=>b.events.push(args);
  b.emit('doc','DOMContentLoaded',{}); assert.equal(b.events.length,1); assert.equal(b.events[0][2].status,'error');
});
test('uses the existing data layer for opt-in tools with a module-local tag',()=>{
  const b=browser({globalTag:false}); b.win.aafnaiAnalytics={enabled:()=>true};
  b.emit('doc','click',{isTrusted:true,button:0,target:smartlink('https://asiafilm.org/4/b1871169a9878fda2bc2de21a208995a')});
  assert.equal(b.win.dataLayer.length,1); assert.equal(b.win.dataLayer[0][1],'adsterra_smartlink_click');
});
test('injects once only into eligible HTML with existing ads',()=>{
  let injected='',removed=0;
  globalThis.HTMLRewriter=class {
    on(selector,handler){if(selector==='head')this.head=handler;else if(selector.startsWith('script'))this.old=handler;return this;}
    transform(response){this.old.element({remove(){removed++;}});this.head.element({prepend(x){injected=x;}});return response;}
  };
  const req=new Request('https://aafnaipatro.com/');
  const response=new Response('<html><head></head><body></body></html>',{headers:{'content-type':'text/html','x-patro-adsterra':'v5'}});
  const result=addAdDiagnostics(req,response);
  assert.match(injected,/data-patro-ad-diagnostics/);assert.equal(removed,1);
  assert.equal(result.headers.get('x-patro-ad-diagnostics'),AD_DIAGNOSTICS_VERSION);
  assert.equal(addAdDiagnostics(req,result),result);
  const noAds=new Response('',{headers:{'content-type':'text/html'}});
  assert.equal(addAdDiagnostics(req,noAds),noAds);
  delete globalThis.HTMLRewriter;
});
test('CSP hash matches the code and is added only to an already hash-restricted script policy',()=>{
  assert.equal(AD_DIAGNOSTICS_HASH,`'sha256-${createHash('sha256').update(AD_DIAGNOSTICS_JS).digest('base64')}'`);
  const loose="default-src 'self'; script-src 'self' 'unsafe-inline'";
  assert.equal(adDiagnosticsCsp(loose),loose);
  const strict="default-src 'self'; script-src 'self' 'sha256-abc'";
  assert.match(adDiagnosticsCsp(strict),/sha256-TuXcaD4/);
  assert.equal(adDiagnosticsCsp(adDiagnosticsCsp(strict)),adDiagnosticsCsp(strict));
});
test('preloads each approved executable ad script once without triggering clicks',()=>{
  assert.equal((AD_EARLY_SCRIPT_HINTS.match(/rel="preload"/g)||[]).length,3);
  for(const path of ['/1/fe7eda2cd06bda210f4e85075df3069c','/21/b86f7b1b852ea7f8de7539079e6e7816','/14/d526bb158baa587de984d6036f99adaf'])
    assert.equal(AD_EARLY_SCRIPT_HINTS.split(path).length-1,1);
  assert.doesNotMatch(AD_EARLY_SCRIPT_HINTS,/asiafilm|araplhn|<script|javascript:/i);
});
