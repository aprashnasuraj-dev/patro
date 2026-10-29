(function(global){
  "use strict";
  var INDEX="/nepalmap/offline/index.json";
  var memo={};

  async function register(){
    if(!("serviceWorker" in navigator)) return null;
    return navigator.serviceWorker.register("/nepalmap/offline-sw.js",{scope:"/nepalmap/"});
  }
  async function index(){
    var r=await fetch(INDEX,{credentials:"same-origin"});
    if(!r.ok) throw new Error("offline pack index "+r.status);
    return r.json();
  }
  function message(worker,data){
    return new Promise(function(resolve,reject){
      var ch=new MessageChannel(),timer=setTimeout(function(){reject(new Error("offline worker timeout"));},15000);
      ch.port1.onmessage=function(e){clearTimeout(timer);e.data&&e.data.ok?resolve(e.data):reject(new Error(e.data&&e.data.error||"offline worker failed"));};
      worker.postMessage(data,[ch.port2]);
    });
  }
  async function saveDistrict(slug,version){
    var reg=await register(),idx=await index();
    if(!reg) throw new Error("Service Worker unavailable");
    var d=idx.districts.find(function(x){return x.slug===slug;});
    if(!d) throw new Error("district pack not found");
    var worker=reg.active||reg.waiting||reg.installing;
    if(!worker){ await navigator.serviceWorker.ready; worker=(await navigator.serviceWorker.ready).active; }
    var urls=[
      d.url,INDEX,location.pathname,
      "/nepalmap/style.css?v="+version,"/nepalmap/app.js?v="+version
    ];
    await message(worker,{type:"cache-pack",urls:urls});
    memo[slug]=null;
    return d;
  }
  async function pack(slug){
    if(memo[slug]) return memo[slug];
    var idx=await index(),d=idx.districts.find(function(x){return x.slug===slug;});
    if(!d) return null;
    var r=await fetch(d.url,{credentials:"same-origin"});
    if(!r.ok) return null;
    memo[slug]=await r.json();
    return memo[slug];
  }
  async function dataFallback(file,slug){
    if(!slug) return null;
    var p=await pack(slug);
    if(!p) return null;
    if(String(file).replace(/\?.*$/,"")==="admin.json") return p.admin||null;
    var cat=String(file).replace(/\.json(?:\?.*)?$/,"");
    return p.categories&&p.categories[cat]||null;
  }
  global.AafnaiOffline={register:register,index:index,saveDistrict:saveDistrict,pack:pack,dataFallback:dataFallback};
})(typeof window!=="undefined"?window:globalThis);
