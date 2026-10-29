(function(){
  "use strict";
  var C=window.NEPAL_EMBED||{},DATA=C.data||"/data/nepalmap/v1/";
  var q=new URLSearchParams(location.search),cat=q.get("c")||"worship",district=q.get("d")||"";
  if(!C.categories||!C.categories.some(function(x){return x.id===cat;}))cat=(C.categories&&C.categories[0]&&C.categories[0].id)||"worship";
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  Promise.all([
    fetch(DATA+"admin.json?v="+C.version).then(function(r){if(!r.ok)throw new Error("admin");return r.json();}),
    fetch(DATA+cat+".json?v="+C.version).then(function(r){if(!r.ok)throw new Error(cat);return r.json();})
  ]).then(function(parts){
    var admin=parts[0],layer=parts[1],cfg=C.categories.find(function(x){return x.id===cat;});
    var idx=Object.fromEntries(layer.fields.map(function(f,i){return [f,i];}));
    var did=0,d=admin.districts.find(function(x){return x.slug===district;});if(d)did=d.id;
    var features=[];
    layer.rows.forEach(function(r,i){
      if(did&&r[idx.district_id]!==did)return;
      features.push({type:"Feature",geometry:{type:"Point",coordinates:[r[idx.lng],r[idx.lat]]},properties:{i:i,name:r[idx.name]||r[idx.name_ne]||"",name_ne:r[idx.name_ne]||""}});
    });
    if(C.maplibreWorker)maplibregl.workerUrl=C.maplibreWorker;
    var map=new maplibregl.Map({container:"map",style:C.style||"https://tiles.openfreemap.org/styles/liberty",bounds:d&&d.bbox?[[d.bbox[0],d.bbox[1]],[d.bbox[2],d.bbox[3]]]:[[80,26.3],[88.25,30.5]],fitBoundsOptions:{padding:25},attributionControl:false});
    map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'Places © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://openfreemap.org">OpenFreeMap</a>'}));
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
    map.on("load",function(){
      map.addSource("places",{type:"geojson",data:{type:"FeatureCollection",features:features},cluster:true,clusterRadius:50,clusterMaxZoom:12});
      map.addLayer({id:"clusters",type:"circle",source:"places",filter:["has","point_count"],paint:{"circle-color":cfg.color||"#334155","circle-radius":["step",["get","point_count"],11,25,14,200,18],"circle-stroke-color":"#fff","circle-stroke-width":2}});
      map.addLayer({id:"points",type:"circle",source:"places",filter:["!",["has","point_count"]],paint:{"circle-color":cfg.color||"#334155","circle-radius":6,"circle-stroke-color":"#fff","circle-stroke-width":1.5}});
      map.on("click","clusters",function(e){var f=e.features[0],src=map.getSource("places"),p=src.getClusterExpansionZoom(f.properties.cluster_id);Promise.resolve(p).then(function(z){map.easeTo({center:f.geometry.coordinates,zoom:z+.2});});});
      map.on("click","points",function(e){var p=e.features[0].properties,ll=e.features[0].geometry.coordinates;new maplibregl.Popup({maxWidth:"260px"}).setLngLat(ll).setHTML('<b>'+esc(p.name)+'</b>'+(p.name_ne?' <span lang="ne">'+esc(p.name_ne)+'</span>':"")+'<p><a target="_blank" rel="noopener" href="/nepalmap?c='+encodeURIComponent(cat)+'&ll='+ll[1]+','+ll[0]+',15">Open in AafnaiPatro Nepal Map</a></p>').addTo(map);});
    });
    document.getElementById("status").textContent=(d?d.name+" · ":"")+features.length.toLocaleString("en-IN")+" "+(cfg.label||cat).toLowerCase();
  }).catch(function(e){document.getElementById("status").textContent="Map data unavailable";console.error(e);});
})();
