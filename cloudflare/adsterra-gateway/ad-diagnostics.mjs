// Site-side diagnostics only: never invoke an ad URL or change navigation.
// The ad network remains the authority for billable impressions and clicks.
export const AD_DIAGNOSTICS_VERSION = '2026-11-06-v1';
export const AD_DIAGNOSTICS_JS = `(()=>{
  'use strict';
  const pending=[];
  const knownScripts=new Set(['popunder','social','native-loader','native-second-loader']);
  const seenScripts=new Set();
  const smartlinks=new Set([
    'https://asiafilm.org/4/b1871169a9878fda2bc2de21a208995a',
    'https://araplhn.org/4/c752b529eb7d6d4ebf1096d225dfb10a'
  ]);
  function allowed(){
    // Several tools have a stricter, explicit opt-in. Respect it, including
    // when the Google tag has been initialized in advanced consent mode.
    try { if(window.aafnaiAnalytics && typeof window.aafnaiAnalytics.enabled==='function' && !window.aafnaiAnalytics.enabled()) return false; } catch { return false; }
    let fallback, update;
    const layer=window.dataLayer;
    if(Array.isArray(layer)) for(const item of layer){
      if(item && item[0]==='consent' && item[2] && item[2].analytics_storage){
        if(item[1]==='default') fallback=item[2].analytics_storage;
        if(item[1]==='update') update=item[2].analytics_storage;
      }
    }
    return (update||fallback)!=='denied';
  }
  function send(name,params){
    if(!allowed()) return;
    const payload=Object.assign({send_to:'G-KWLDWTSK14'},params);
    if(typeof window.gtag==='function'){
      try { window.gtag('event',name,payload); } catch {}
    } else if(window.aafnaiAnalytics && typeof window.aafnaiAnalytics.enabled==='function' && Array.isArray(window.dataLayer)){
      // Some tools keep gtag module-local but publish their consent accessor.
      try { (function(){window.dataLayer.push(arguments);})('event',name,payload); } catch {}
    } else if(pending.length<12) pending.push([name,params]);
  }
  function flush(){
    if(!allowed()){pending.length=0;return;}
    if(typeof window.gtag!=='function' && !(window.aafnaiAnalytics && typeof window.aafnaiAnalytics.enabled==='function' && Array.isArray(window.dataLayer))) return;
    for(const item of pending.splice(0)) send(item[0],item[1]);
  }
  function onResource(event){
    const node=event.target;
    if(!node || node.tagName!=='SCRIPT' || !node.getAttribute) return;
    const kind=node.getAttribute('data-patro-adsterra');
    if(!knownScripts.has(kind)) return;
    const status=event.type==='load'?'loaded':'error', key=kind+':'+status;
    if(seenScripts.has(key)) return;
    seenScripts.add(key);
    send('adsterra_script_status',{ad_format:kind,status});
  }
  window.addEventListener('load',onResource,true);
  window.addEventListener('error',onResource,true);
  function onInteraction(event){
    // A trusted user gesture is observed without intercepting or delaying it.
    if(!event.isTrusted || (event.type==='click' && event.button!==0) || (event.type==='auxclick' && event.button!==1)) return;
    const target=event.target;
    if(!target || typeof target.closest!=='function') return;
    const anchor=target.closest('a[href]');
    if(!anchor) return;
    const slot=anchor.closest('[data-patro-adsterra]');
    const kind=slot && slot.getAttribute('data-patro-adsterra');
    if(kind && kind.startsWith('smartlink-')){
      let url;
      try { url=new URL(anchor.getAttribute('href'),location.href); } catch { return; }
      if(!smartlinks.has(url.href)) return;
      const position=kind.slice('smartlink-'.length);
      if(!['top','bottom','inline','tool-after'].includes(position)) return;
      send('adsterra_smartlink_click',{ad_format:'smartlink',ad_position:position});
      return;
    }
    // Cross-origin iframe interactions are intentionally not inferred.
    const native=anchor.closest('#container-b86f7b1b852ea7f8de7539079e6e7816');
    if(native) send('adsterra_native_interaction',{ad_format:'native'});
  }
  document.addEventListener('click',onInteraction,true);
  document.addEventListener('auxclick',onInteraction,true);
  function observeSlot(){
    flush();
    const slot=document.getElementById('patro-native-ad-slot');
    if(!slot || typeof IntersectionObserver!=='function') return;
    let visible=false,timer=null,reported=false;
    function clear(){if(timer!==null){clearTimeout(timer);timer=null;}}
    function start(){
      if(reported || !visible || document.visibilityState==='hidden' || timer!==null) return;
      timer=setTimeout(()=>{timer=null;if(!reported && visible && document.visibilityState!=='hidden'){
        reported=true; send('adsterra_native_slot_viewable',{ad_format:'native'}); observer.disconnect();
      }},1000);
    }
    const observer=new IntersectionObserver(entries=>{
      const entry=entries[entries.length-1];
      visible=!!entry && entry.isIntersecting && entry.intersectionRatio>=0.5;
      if(visible) start(); else clear();
    },{threshold:[0,0.5]});
    observer.observe(slot);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden') clear();else start();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',observeSlot,{once:true});else observeSlot();
  window.addEventListener('load',flush,{once:true});
})();`;

const DIAGNOSTICS_HTML = `<script data-patro-ad-diagnostics>${AD_DIAGNOSTICS_JS}</script>`;
export const AD_DIAGNOSTICS_HASH = "'sha256-TuXcaD4KS4TzzG7Xud7yn5B5jBNSSHuXi7utr6ymd/U='";

// A hash makes 'unsafe-inline' ineffective in CSP3. Add ours only where a
// nonce or hash already has that effect, so existing scripts are unaffected.
export function adDiagnosticsCsp(policy) {
  const directives=policy.split(';');
  const indexOf=name=>directives.findIndex(d=>d.trim().toLowerCase().startsWith(name+' '));
  let index=indexOf('script-src-elem');
  if(index<0) index=indexOf('script-src');
  if(index<0) index=indexOf('default-src');
  if(index<0 || !/'(?:nonce-|sha(?:256|384|512)-)[^']+'/i.test(directives[index]) || directives[index].includes(AD_DIAGNOSTICS_HASH)) return policy;
  directives[index] += ' '+AD_DIAGNOSTICS_HASH;
  return directives.join(';');
}

// Run after the existing ad decorator, so this does not change its markup.
export function addAdDiagnostics(request, response) {
  if (request.method !== 'GET' || response.status !== 200 ||
      !response.headers.has('x-patro-adsterra') ||
      !(response.headers.get('content-type') || '').toLowerCase().includes('text/html') ||
      !globalThis.HTMLRewriter) return response;
  if (response.headers.get('x-patro-ad-diagnostics') === AD_DIAGNOSTICS_VERSION) return response;
  const headers = new Headers(response.headers);
  headers.set('x-patro-ad-diagnostics', AD_DIAGNOSTICS_VERSION);
  const csp=headers.get('content-security-policy');
  if(csp) headers.set('content-security-policy',adDiagnosticsCsp(csp));
  headers.delete('content-length'); headers.delete('etag'); headers.delete('content-md5');
  const result = new Response(response.body, {status:response.status,statusText:response.statusText,headers});
  return new HTMLRewriter()
    .on('script[data-patro-ad-diagnostics]', {element(el){el.remove();}})
    .on('meta[http-equiv]', {element(el){if((el.getAttribute('http-equiv')||'').toLowerCase()==='content-security-policy') el.setAttribute('content',adDiagnosticsCsp(el.getAttribute('content')||''));}})
    .on('head', {element(el){el.prepend(DIAGNOSTICS_HTML,{html:true});}})
    .transform(result);
}
