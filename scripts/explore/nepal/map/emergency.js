(function(global){
  "use strict";
  var KINDS=["incident","alert","earthquake","fire","openspace"],loaded=false,visible=false;

  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function coords(value){
    if(!value||typeof value!=="object") return null;
    if(value.type==="Point"&&Array.isArray(value.coordinates)&&value.coordinates.length>=2){
      var x=Number(value.coordinates[0]),y=Number(value.coordinates[1]);
      if(Number.isFinite(x)&&Number.isFinite(y)) return [x,y];
    }
    for(const pair of [["longitude","latitude"],["lng","lat"],["lon","lat"]]){
      var x=Number(value[pair[0]]),y=Number(value[pair[1]]);
      if(Number.isFinite(x)&&Number.isFinite(y)) return [x,y];
    }
    for(const k of ["point","geometry","geom","location","centroid"]){
      var c=coords(value[k]);if(c)return c;
    }
    return null;
  }
  function records(payload){
    var d=payload&&payload.data;
    if(Array.isArray(d)) return d;
    if(Array.isArray(d&&d.results)) return d.results;
    if(Array.isArray(d&&d.data)) return d.data;
    return [];
  }
  function title(row,kind){
    return row.title||row.name||row.event||row.hazard?.title||row.hazard?.name||row.incident_type||kind;
  }
  function when(row){
    return row.event_on||row.occurred_on||row.created_on||row.created_at||row.datetime||row.date||"";
  }
  async function fetchKind(kind){
    var r=await fetch("/api/nepal/v1/emergency?kind="+encodeURIComponent(kind)+"&limit=50",{credentials:"same-origin"});
    if(!r.ok) throw new Error(kind+" "+r.status);
    var payload=await r.json();
    return records(payload).map(function(row,i){
      var ll=coords(row);if(!ll)return null;
      return {type:"Feature",geometry:{type:"Point",coordinates:ll},properties:{
        kind:kind,title:String(title(row,kind)).slice(0,140),when:String(when(row)).slice(0,80),
        source:"BIPAD Portal",source_url:payload.source_url||"",index:i
      }};
    }).filter(Boolean);
  }
  function ensure(map){
    if(map.getSource("np-emergency"))return;
    map.addSource("np-emergency",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
    map.addLayer({id:"np-emergency-points",type:"circle",source:"np-emergency",
      paint:{"circle-radius":["interpolate",["linear"],["zoom"],5,5,12,9],"circle-color":[
        "match",["get","kind"],"alert","#b91c1c","incident","#dc2626","fire","#ea580c","earthquake","#7c3aed","openspace","#15803d","#334155"
      ],"circle-stroke-color":"#fff","circle-stroke-width":2}});
    map.on("click","np-emergency-points",function(e){
      var p=e.features[0].properties;
      new maplibregl.Popup({maxWidth:"300px"}).setLngLat(e.features[0].geometry.coordinates).setHTML(
        '<div class="np-pop"><strong>'+esc(p.title)+'</strong><div class="np-kind">'+esc(p.kind)+(p.when?" · "+esc(p.when):"")+'</div><p class="np-note">Source: BIPAD Portal. Live/emergency data can be delayed or incomplete; follow official local instructions.</p></div>'
      ).addTo(map);
    });
  }
  async function load(map){
    ensure(map);
    var settled=await Promise.allSettled(KINDS.map(fetchKind));
    var all=[];
    settled.forEach(function(x){if(x.status==="fulfilled")all=all.concat(x.value);});
    map.getSource("np-emergency").setData({type:"FeatureCollection",features:all});
    loaded=true;return {features:all.length,failed:settled.filter(function(x){return x.status==="rejected";}).length};
  }
  async function setVisible(map,on){
    ensure(map);visible=!!on;
    map.setLayoutProperty("np-emergency-points","visibility",visible?"visible":"none");
    if(visible&&!loaded)return load(map);
    return {features:map.querySourceFeatures("np-emergency").length,failed:0};
  }
  global.AafnaiEmergency={load:load,setVisible:setVisible,get visible(){return visible;}};
})(typeof window!=="undefined"?window:globalThis);
