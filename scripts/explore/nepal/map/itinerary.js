(function(global){
  "use strict";
  var KEY="aafnaipatro.nepalmap.itineraries.v1",MAX=20;

  function read(){
    try{
      var v=JSON.parse(localStorage.getItem(KEY)||'{"version":1,"items":[]}');
      return v&&v.version===1&&Array.isArray(v.items)?v:{version:1,items:[]};
    }catch{return {version:1,items:[]};}
  }
  function write(v){ localStorage.setItem(KEY,JSON.stringify(v)); }
  function id(){
    var b=new Uint8Array(8);crypto.getRandomValues(b);
    return Array.from(b,function(x){return x.toString(16).padStart(2,"0");}).join("");
  }
  function cleanPoint(p){
    if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)) return null;
    return {lat:Number(p.lat.toFixed(6)),lng:Number(p.lng.toFixed(6)),label:String(p.label||"").slice(0,100)};
  }
  function save(input){
    var data=read(),now=new Date().toISOString(),item={
      id:id(),version:1,created_at:now,updated_at:now,
      title:String(input.title||((input.from&&input.from.label)||"Trip")+" → "+((input.to&&input.to.label)||"Destination")).slice(0,120),
      from:cleanPoint(input.from),to:cleanPoint(input.to),
      stops:(input.stops||[]).map(cleanPoint).filter(Boolean).slice(0,8),
      mode:/^(car|bike|foot)$/.test(input.mode)?input.mode:"car"
    };
    if(!item.from||!item.to) throw new Error("Trip needs start and destination");
    data.items.unshift(item);data.items=data.items.slice(0,MAX);write(data);return item;
  }
  function list(){return read().items.slice();}
  function remove(itemId){var d=read();d.items=d.items.filter(function(x){return x.id!==itemId;});write(d);}
  function clear(){write({version:1,items:[]});}

  function showManager(onLoad){
    var old=document.getElementById("np-trip-dialog");if(old)old.remove();
    var dlg=document.createElement("dialog");dlg.id="np-trip-dialog";dlg.className="np-trip-dialog";
    var items=list();
    dlg.innerHTML='<form method="dialog"><button class="np-dialog-close" aria-label="Close">×</button><h2>Saved trips</h2><p class="np-note">Stored only in this browser. Clearing site data removes them.</p>'+
      (items.length?'<ol class="np-trip-list">'+items.map(function(x){return '<li><b>'+escapeHtml(x.title)+'</b><small>'+escapeHtml(x.mode)+' · '+x.stops.length+' stop'+(x.stops.length===1?"":"s")+' · '+escapeHtml(x.updated_at.slice(0,10))+'</small><div class="np-actions"><button type="button" data-load-trip="'+x.id+'">Open</button><button type="button" data-delete-trip="'+x.id+'">Delete</button></div></li>';}).join("")+'</ol>':'<p>No saved trips yet.</p>')+'</form>';
    document.body.appendChild(dlg);
    dlg.addEventListener("click",function(e){
      var load=e.target.closest("[data-load-trip]");
      if(load){var item=list().find(function(x){return x.id===load.getAttribute("data-load-trip");});if(item){dlg.close();onLoad(item);}}
      var del=e.target.closest("[data-delete-trip]");
      if(del){remove(del.getAttribute("data-delete-trip"));dlg.close();showManager(onLoad);}
    });
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute("open","");
  }
  function escapeHtml(v){return String(v||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  global.AafnaiItinerary={save:save,list:list,remove:remove,clear:clear,showManager:showManager};
})(typeof window!=="undefined"?window:globalThis);
