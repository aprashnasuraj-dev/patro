(function(){
"use strict";
var ROOT="/bali-calendar",LAST_KEY="bali-calendar:last-path",REV="bali-calendar-pwa-v3";
var DB_NAME="aafnai-bali-calendar",DB_VERSION=1,STORE="state",FALLBACK_KEY="bali-calendar:memory-v1";
function safeStorageGet(k){try{return localStorage.getItem(k)}catch{return null}}
function safeStorageSet(k,v){try{localStorage.setItem(k,v)}catch{}}
function safeJson(s,fallback){try{return JSON.parse(s)}catch{return fallback}}
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

function initInstall(){
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
}

function blankState(){return{key:"main",version:1,people:[],savedDates:[],puras:[],lastVisit:null}}
function normalizeState(x){if(!x||!Array.isArray(x.people)||!Array.isArray(x.savedDates))return blankState();if(!Array.isArray(x.puras))x.puras=[];return x}
function openMemoryDb(){
  if(!("indexedDB" in window))return Promise.resolve(null);
  return new Promise(function(resolve){
    var req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"key"})};
    req.onsuccess=function(){resolve(req.result)};
    req.onerror=function(){resolve(null)};
  });
}
function fallbackLoad(){return normalizeState(safeJson(safeStorageGet(FALLBACK_KEY)||"",null))}
function fallbackSave(state){safeStorageSet(FALLBACK_KEY,JSON.stringify(state));return Promise.resolve()}
async function loadState(db){
  if(!db)return fallbackLoad();
  return new Promise(function(resolve){
    var tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).get("main");
    req.onsuccess=function(){resolve(normalizeState(req.result))};
    req.onerror=function(){resolve(fallbackLoad())};
  });
}
async function saveState(db,state){
  state.key="main";state.version=1;
  if(!db)return fallbackSave(state);
  return new Promise(function(resolve){
    var tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(state);
    tx.oncomplete=function(){resolve()};tx.onerror=function(){fallbackSave(state).then(resolve)};
  });
}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function dayNumber(iso){var n=Date.parse(iso+"T00:00:00Z");return Number.isFinite(n)?Math.floor(n/86400000):null}
function isoDay(n){return new Date(n*86400000).toISOString().slice(0,10)}
function nextOton(date,boundary,today){
  var d=dayNumber(date),t=dayNumber(today);if(d===null||t===null)return[];
  function one(before){var base=d-(before?1:0),k=Math.max(1,Math.ceil((t-base)/210));return isoDay(base+210*k)}
  if(boundary==="before")return[one(true)];
  if(boundary==="after")return[one(false)];
  var a=one(true),b=one(false);return a===b?[a]:[a,b];
}
function daysUntil(iso,today){var a=dayNumber(iso),b=dayNumber(today);return a===null||b===null?null:a-b}
function baliIsoFromMs(ms){try{var parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(ms)),o={};parts.forEach(function(p){o[p.type]=p.value});return o.year+"-"+o.month+"-"+o.day}catch{return new Date(ms).toISOString().slice(0,10)}}
function relationLabel(x){return({self:"Saya",parent:"Orang tua",partner:"Pasangan",child:"Anak",family:"Keluarga",other:"Lainnya"})[x]||"Keluarga"}
function node(tag,cls,text){var el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el}
function button(text,action){var b=node("button","bali-memory-remove",text);b.type="button";b.dataset.action=action;return b}

async function initMemory(){
  var hub=document.getElementById("my-bali"),saveDayButtons=[].slice.call(document.querySelectorAll("[data-bali-save-date]"));
  if(!hub&&!saveDayButtons.length)return;
  var db=await openMemoryDb(),state=await loadState(db),recentEvents=hub?safeJson(hub.dataset.baliRecent||"[]",[]):[];
  var today=hub&&hub.dataset.baliToday?hub.dataset.baliToday:(location.pathname.match(/\/(\d{4}-\d{2}-\d{2})$/)||[])[1]||new Date().toISOString().slice(0,10);
  var peopleList=document.getElementById("bali-people-list"),dateList=document.getElementById("bali-saved-dates"),puraList=document.getElementById("bali-pura-list"),summary=document.getElementById("bali-return-summary");

  async function persist(){await saveState(db,state);render()}
  function render(){
    if(summary){
      summary.innerHTML="";
      var parts=[];
      if(state.lastVisit){var diff=Math.max(0,Math.floor((Date.now()-state.lastVisit)/86400000));parts.push(diff===0?"Dibuka lagi hari ini":"Terakhir dibuka "+diff+" hari lalu")}
      parts.push(state.people.length+" orang tersimpan");parts.push(state.savedDates.length+" hari tersimpan");parts.push(state.puras.length+" Pura tersimpan");
      var soon=[];
      state.people.forEach(function(p){nextOton(p.birthDate,p.boundary,today).forEach(function(d){var du=daysUntil(d,today);if(du!==null)soon.push({name:p.name,date:d,days:du})})});
      soon.sort(function(a,b){return a.days-b.days});
      var top=node("strong","",parts.join(" · "));summary.appendChild(top);
      if(soon.length){var p=node("p","");p.appendChild(document.createTextNode("Otonan terdekat: "));var a=node("a","",soon[0].name+" · "+soon[0].date+" ("+soon[0].days+" hari)");a.href=ROOT+"/"+soon[0].date;p.appendChild(a);summary.appendChild(p)}
      if(state.lastVisit&&Array.isArray(recentEvents)){var lastIso=baliIsoFromMs(state.lastVisit),passed=recentEvents.filter(function(x){return x&&x.date>lastIso&&x.date<today}).slice(-4);if(passed.length){var box=node("div","bali-since-last"),label=node("strong","","Sejak kunjungan terakhir");box.appendChild(label);passed.forEach(function(x){var a=node("a","",x.date.slice(5)+" · "+x.name);a.href=ROOT+"/"+x.date;box.appendChild(a)});summary.appendChild(box)}}
    }
    if(peopleList){
      peopleList.innerHTML="";
      if(!state.people.length)peopleList.appendChild(node("p","muted","Belum ada orang tersimpan."));
      state.people.slice().sort(function(a,b){var an=nextOton(a.birthDate,a.boundary,today)[0]||"9999",bn=nextOton(b.birthDate,b.boundary,today)[0]||"9999";return an.localeCompare(bn)}).forEach(function(p){
        var card=node("article","bali-memory-card"),head=node("div","bali-memory-card-head"),info=node("div","");
        info.appendChild(node("strong","",p.name));info.appendChild(node("small","",relationLabel(p.relation)+" · lahir "+p.birthDate));
        head.appendChild(info);var del=button("Hapus","person");del.dataset.id=p.id;head.appendChild(del);card.appendChild(head);
        var dates=nextOton(p.birthDate,p.boundary,today),line=node("p","bali-otonan-next");
        line.textContent=dates.length>1?"Dua kemungkinan Otonan berikutnya: "+dates.join(" / "):"Otonan berikutnya: "+(dates[0]||"—");card.appendChild(line);
        var links=node("div","bali-memory-links"),calc=node("a","","Buka Otonan");calc.href=ROOT+"/otonan?lahir="+encodeURIComponent(p.birthDate)+"&waktu="+encodeURIComponent(p.boundary);links.appendChild(calc);
        if(p.boundary!=="unknown"){var feed=node("a","","Kalender reminder (.ics)");feed.href=ROOT+"/feed/otonan.ics?lahir="+encodeURIComponent(p.birthDate)+(p.boundary==="before"?"&sebelum_subuh=1":"");links.appendChild(feed)}
        card.appendChild(links);peopleList.appendChild(card);
      });
    }
    if(dateList){
      dateList.innerHTML="";
      if(!state.savedDates.length)dateList.appendChild(node("p","muted","Belum ada tanggal tersimpan."));
      state.savedDates.slice().sort(function(a,b){return a.date.localeCompare(b.date)}).forEach(function(x){
        var card=node("article","bali-memory-card"),head=node("div","bali-memory-card-head"),info=node("div","");
        var a=node("a","",x.label||x.date);a.href=ROOT+"/"+x.date;info.appendChild(a);info.appendChild(node("small","",x.date));
        head.appendChild(info);var del=button("Hapus","date");del.dataset.id=x.id;head.appendChild(del);card.appendChild(head);dateList.appendChild(card);
      });
    }
    if(puraList){
      puraList.innerHTML="";
      if(!state.puras.length)puraList.appendChild(node("p","muted","Belum ada Pura tersimpan."));
      state.puras.slice().sort(function(a,b){return String(a.nextDate||"9999").localeCompare(String(b.nextDate||"9999"))}).forEach(function(x){
        var option=document.querySelector('#bali-pura-form option[value="'+CSS.escape(x.slug)+'"]');
        if(option){x.name=option.dataset.name||x.name;x.locality=option.dataset.locality||x.locality;x.nextDate=option.dataset.next||x.nextDate}
        var card=node("article","bali-memory-card"),head=node("div","bali-memory-card-head"),info=node("div","");
        var a=node("a","",x.name||x.slug);a.href=ROOT+"/piodalan/"+encodeURIComponent(x.slug);info.appendChild(a);
        info.appendChild(node("small","",(x.locality||"Bali")+(x.nextDate?" · berikutnya "+x.nextDate:"")));
        head.appendChild(info);var del=button("Hapus","pura");del.dataset.id=x.id;head.appendChild(del);card.appendChild(head);puraList.appendChild(card);
      });
    }
  }

  var personForm=document.getElementById("bali-person-form");
  if(personForm)personForm.addEventListener("submit",async function(e){
    e.preventDefault();var fd=new FormData(personForm),name=String(fd.get("name")||"").trim(),birthDate=String(fd.get("birthDate")||""),relation=String(fd.get("relation")||"family"),boundary=String(fd.get("boundary")||"unknown");
    if(!name||dayNumber(birthDate)===null)return;
    state.people.push({id:id(),name:name,birthDate:birthDate,relation:relation,boundary:["before","after","unknown"].includes(boundary)?boundary:"unknown",createdAt:Date.now()});
    personForm.reset();await persist();
  });
  var dateForm=document.getElementById("bali-date-form");
  if(dateForm)dateForm.addEventListener("submit",async function(e){
    e.preventDefault();var fd=new FormData(dateForm),date=String(fd.get("date")||""),label=String(fd.get("label")||"").trim();
    if(dayNumber(date)===null)return;
    var existing=state.savedDates.find(function(x){return x.date===date});
    if(existing)existing.label=label||existing.label;else state.savedDates.push({id:id(),date:date,label:label||"Hari Bali tersimpan",createdAt:Date.now()});
    await persist();
  });
  var puraForm=document.getElementById("bali-pura-form");
  if(puraForm)puraForm.addEventListener("submit",async function(e){
    e.preventDefault();var select=puraForm.querySelector('select[name="slug"]'),option=select&&select.selectedOptions&&select.selectedOptions[0];if(!option||!option.value)return;
    var slug=option.value,existing=state.puras.find(function(x){return x.slug===slug});
    if(existing){existing.name=option.dataset.name||existing.name;existing.locality=option.dataset.locality||existing.locality;existing.nextDate=option.dataset.next||existing.nextDate}
    else state.puras.push({id:id(),slug:slug,name:option.dataset.name||option.textContent||slug,locality:option.dataset.locality||"Bali",nextDate:option.dataset.next||"",createdAt:Date.now()});
    select.value="";await persist();
  });
  document.addEventListener("click",async function(e){
    var target=e.target&&e.target.closest?e.target.closest("[data-action]"):null;if(!target)return;
    if(target.dataset.action==="person")state.people=state.people.filter(function(x){return x.id!==target.dataset.id});
    if(target.dataset.action==="date")state.savedDates=state.savedDates.filter(function(x){return x.id!==target.dataset.id});
    if(target.dataset.action==="pura")state.puras=state.puras.filter(function(x){return x.id!==target.dataset.id});
    await persist();
  });
  saveDayButtons.forEach(function(b){b.addEventListener("click",async function(){
    var date=b.dataset.baliSaveDate,label=b.dataset.baliSaveLabel||"Hari Bali tersimpan";if(!date)return;
    var existing=state.savedDates.find(function(x){return x.date===date});
    if(!existing)state.savedDates.push({id:id(),date:date,label:label,createdAt:Date.now()});
    b.textContent="Tersimpan";b.disabled=true;await persist();
  })});
  var exp=document.getElementById("bali-export-memory");
  if(exp)exp.addEventListener("click",function(){
    var payload={format:"aafnai-bali-calendar",version:1,exportedAt:new Date().toISOString(),people:state.people,savedDates:state.savedDates,puras:state.puras};
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aafnai-bali-calendar-backup.json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
  });
  var imp=document.getElementById("bali-import-memory");
  if(imp)imp.addEventListener("change",function(){
    var file=imp.files&&imp.files[0];if(!file)return;var reader=new FileReader();
    reader.onload=async function(){var x=safeJson(String(reader.result||""),null);if(!x||x.format!=="aafnai-bali-calendar"||!Array.isArray(x.people)||!Array.isArray(x.savedDates)){alert("Backup My Bali tidak valid.");return}if(!Array.isArray(x.puras))x.puras=[]
      var byId={};state.people.concat(x.people).forEach(function(v){if(v&&v.id)byId[v.id]=v});state.people=Object.keys(byId).map(function(k){return byId[k]});
      byId={};state.savedDates.concat(x.savedDates).forEach(function(v){if(v&&v.id)byId[v.id]=v});state.savedDates=Object.keys(byId).map(function(k){return byId[k]});
      byId={};state.puras.concat(x.puras).forEach(function(v){if(v&&v.id)byId[v.id]=v});state.puras=Object.keys(byId).map(function(k){return byId[k]});await persist();imp.value="";
    };reader.readAsText(file);
  });
  var clear=document.getElementById("bali-clear-memory");
  if(clear)clear.addEventListener("click",async function(){if(confirm("Hapus semua orang, tanggal dan Pura dari My Bali Calendar di browser ini?")){state=blankState();await persist()}});
  render();state.lastVisit=Date.now();await saveState(db,state);
}

function boot(){initInstall();initMemory()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();