/* Anonymous analytics only; async and independent of the settings applier. */
(function () {
  'use strict';
  if (window.__aapAnalytics) return;
  window.__aapAnalytics = true;
  var cfg, lastPath = null;
  try { cfg = JSON.parse(document.getElementById('aap-config').textContent || '{}'); } catch (_) { return; }
  function beacon(kind) {
    if (!cfg.analytics || cfg.preview) return;
    var body = JSON.stringify({t:kind,p:location.pathname,r:kind==='pv'&&lastPath===null?document.referrer:''});
    try { if(navigator.sendBeacon && navigator.sendBeacon('/api/aap/hit',new Blob([body],{type:'application/json'})))return; } catch (_) {}
    try { fetch('/api/aap/hit',{method:'POST',body:body,keepalive:true,headers:{'content-type':'application/json'}}).catch(function(){}); } catch (_) {}
  }
  function route() { if (location.pathname !== lastPath) { beacon('pv'); lastPath = location.pathname; } }
  ['pushState','replaceState'].forEach(function (name) { var original=history[name];history[name]=function(){var result=original.apply(this,arguments);route();return result;}; });
  window.addEventListener('popstate',route);
  if(document.readyState==='complete')route();else window.addEventListener('load',route,{once:true});
  setInterval(function(){if(document.visibilityState==='visible')beacon('hb');},60000);
})();
