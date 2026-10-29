(function(){
"use strict";
var ROOT="/bali-calendar",LAST_KEY="bali-calendar:last-path",REV="bali-calendar-pwa-v2";
function safeStorageGet(k){try{return localStorage.getItem(k)}catch{return null}}
function safeStorageSet(k,v){try{localStorage.setItem(k,v)}catch{}}
var url=new URL(location.href),fromPwa=url.searchParams.get("source")==="pwa";
if(fromPwa&&location.pathname===ROOT){
  var last=safeStorageGet(LAST_KEY);
  if(last&&last!==ROOT&&last.indexOf(ROOT+"/")===0){location.replace(last);return;}
}
if(location.pathname.indexOf(ROOT)===0&&location.pathname!==ROOT){
  var saved=location.pathname+location.search.replace(/([?&])source=pwa(&|$)/,"$1").replace(/[?&]$/,"");
  safeStorageSet(LAST_KEY,saved);
}else if(!safeStorageGet(LAST_KEY)){safeStorageSet(LAST_KEY,ROOT)}
if("serviceWorker" in navigator){
  var register=function(){
    navigator.serviceWorker.register("/bali-calendar-sw.js?rev="+REV,{scope:"/bali-calendar",updateViaCache:"none"})
      .then(function(reg){return navigator.serviceWorker.ready.then(function(ready){var worker=navigator.serviceWorker.controller||ready.active||reg.active;if(worker)worker.postMessage({type:"WARM_BALI_PWA"})})})
      .catch(function(){});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",register,{once:true});else register();
}
var button=document.getElementById("bali-install");if(!button)return;
var status=document.getElementById("bali-install-status"),guide=document.getElementById("bali-install-guide"),media=window.matchMedia("(display-mode: standalone)"),promptEvent=window.__aafnaiInstallPrompt||null,busy=false;
function installed(){return Boolean(navigator.standalone===true||media.matches)}
function setStatus(t){if(status)status.textContent=t||""}
function sync(){if(installed()){button.disabled=true;button.textContent="Bali Calendar terpasang";if(guide)guide.hidden=true;setStatus("Aplikasi dibuka dalam mode standalone.")}else{button.disabled=false;button.textContent="Install Bali Calendar"}}
function capture(){promptEvent=window.__aafnaiInstallPrompt||promptEvent;if(promptEvent&&!installed())setStatus("Siap dipasang di perangkat ini.")}
window.addEventListener("patro:install-prompt-ready",capture);
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();promptEvent=e;window.__aafnaiInstallPrompt=e;capture()});
window.addEventListener("appinstalled",function(){promptEvent=null;window.__aafnaiInstallPrompt=null;sync();setStatus("Bali Calendar berhasil dipasang.")});
if(media.addEventListener)media.addEventListener("change",sync);
button.addEventListener("click",async function(){
  if(installed()||busy)return;capture();
  if(!promptEvent){if(guide)guide.hidden=false;setStatus("Gunakan menu browser → Install app / Add to Home Screen.");return;}
  busy=true;button.disabled=true;setStatus("Membuka dialog instalasi…");
  try{await promptEvent.prompt();var choice=await promptEvent.userChoice;if(choice&&choice.outcome==="accepted")setStatus("Instalasi dikonfirmasi.");else{setStatus("Instalasi dibatalkan.");if(guide)guide.hidden=false}}
  catch{setStatus("Dialog instalasi tidak tersedia. Gunakan menu browser.");if(guide)guide.hidden=false}
  finally{promptEvent=null;window.__aafnaiInstallPrompt=null;busy=false;if(!installed())button.disabled=false}
});
sync();capture();
})();
