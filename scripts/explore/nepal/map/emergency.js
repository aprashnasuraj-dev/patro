(function(global){
  "use strict";
  var KINDS=["incident","alert","earthquake","fire","openspace","rain","river"],loaded=false,visible=false,lastStatus=null;

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
    return row.title||row.name||row.station?.title||row.station?.name||row.event||row.hazard?.title||row.hazard?.name||row.incident_type||kind;
  }
  function when(row){
    return row.event_on||row.occurred_on||row.observed_at||row.modified_on||row.created_on||row.created_at||row.datetime||row.date||"";
  }
  function first(row,keys){
    for(var i=0;i<keys.length;i++){var v=row&&row[keys[i]];if(v!==undefined&&v!==null&&v!=="")return v;}
    return null;
  }
  function stationMeta(row,kind){
    if(kind!=="rain"&&kind!=="river")return {};
    var station=row.station||row;
    var status=first(row,["status","status_name","warning_status"])||first(station,["status","status_name"]);
    var basin=first(row,["basin","basin_name","river_basin"])||first(station,["basin","basin_name","river_basin"]);
    var value=kind==="rain"
      ? first(row,["rainfall","value","amount","rainfall_value"])
      : first(row,["water_level","level","value","waterLevel"]);
    var warning=first(row,["warning_level","warningLevel","warning_threshold"]);
    var danger=first(row,["danger_level","dangerLevel","danger_threshold"]);
    var unit=first(row,["unit","units"])||first(station,["unit","units"]);
    return {status:status==null?"":String(status),basin:basin==null?"":String(basin),value:value==null?"":String(value),warning:warning==null?"":String(warning),danger:danger==null?"":String(danger),unit:unit==null?"":String(unit)};
  }
  async function fetchKind(kind){
    var r=await fetch("/api/nepal/v1/emergency?kind="+encodeURIComponent(kind)+"&limit=50",{credentials:"same-origin"});
    if(!r.ok) throw new Error(kind+" "+r.status);
    var payload=await r.json();
    var features=records(payload).map(function(row,i){
      var ll=coords(row);if(!ll)return null;
      var meta=stationMeta(row,kind);
      return {type:"Feature",geometry:{type:"Point",coordinates:ll},properties:{
        kind:kind,title:String(title(row,kind)).slice(0,140),when:String(when(row)).slice(0,80),
        status:meta.status||"",basin:meta.basin||"",value:meta.value||"",warning:meta.warning||"",danger:meta.danger||"",unit:meta.unit||"",
        source:"BIPAD Portal",source_url:payload.source_url||"",retrieved_at:payload.fetched_at||"",index:i
      }};
    }).filter(Boolean);
    return {kind:kind,features:features,retrieved_at:payload.fetched_at||null};
  }
  function ensure(map){
    if(map.getSource("np-emergency"))return;
    map.addSource("np-emergency",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
    map.addLayer({id:"np-emergency-points",type:"circle",source:"np-emergency",
      paint:{"circle-radius":["interpolate",["linear"],["zoom"],5,5,12,9],"circle-color":[
        "match",["get","kind"],"alert","#b91c1c","incident","#dc2626","fire","#ea580c","earthquake","#7c3aed","openspace","#15803d","rain","#0284c7","river","#0369a1","#334155"
      ],"circle-stroke-color":"#fff","circle-stroke-width":2}});
    map.on("click","np-emergency-points",function(e){
      var p=e.features[0].properties;
      new maplibregl.Popup({maxWidth:"300px"}).setLngLat(e.features[0].geometry.coordinates).setHTML(
        '<div class="np-pop"><strong>'+esc(p.title)+'</strong><div class="np-kind">'+esc(p.kind)+(p.when?" · "+esc(p.when):"")+'</div>'+
        (p.basin?'<div>River basin: '+esc(p.basin)+'</div>':"")+
        (p.status?'<div>Status: <b>'+esc(p.status)+'</b></div>':"")+
        (p.value?'<div>Observed value: '+esc(p.value)+(p.unit?" "+esc(p.unit):" <span class=\"np-note\">(unit not declared in this response)</span>")+'</div>':"")+
        (p.warning?'<div>Warning threshold: '+esc(p.warning)+(p.unit?" "+esc(p.unit):"")+'</div>':"")+
        (p.danger?'<div>Danger threshold: '+esc(p.danger)+(p.unit?" "+esc(p.unit):"")+'</div>':"")+
        '<p class="np-note">Source: BIPAD Portal; BIPAD integrates rain/river data from DHM. Live data can be delayed or incomplete; follow DHM/NDRRMA/local instructions.</p></div>'
      ).addTo(map);
    });
  }
  async function load(map){
    ensure(map);
    var settled=await Promise.allSettled(KINDS.map(fetchKind));
    var all=[],successfulKinds=[],failedKinds=[],retrieved=[];
    settled.forEach(function(x,i){
      if(x.status==="fulfilled"){
        all=all.concat(x.value.features);
        successfulKinds.push(x.value.kind);
        if(x.value.retrieved_at) retrieved.push(x.value.retrieved_at);
      }else failedKinds.push(KINDS[i]);
    });
    map.getSource("np-emergency").setData({type:"FeatureCollection",features:all});
    var latest=retrieved.sort().slice(-1)[0]||null;
    var age=latest?Math.max(0,Math.round((Date.now()-Date.parse(latest))/1000)):null;
    loaded=true;
    lastStatus={
      features:all.length,total_feeds:KINDS.length,successful:successfulKinds.length,failed:failedKinds.length,
      successful_kinds:successfulKinds,failed_kinds:failedKinds,retrieved_at:latest,retrieval_age_seconds:Number.isFinite(age)?age:null,
      degraded:failedKinds.length>0,complete:failedKinds.length===0
    };
    return lastStatus;
  }
  async function setVisible(map,on){
    ensure(map);visible=!!on;
    map.setLayoutProperty("np-emergency-points","visibility",visible?"visible":"none");
    if(visible&&!loaded)return load(map);
    return lastStatus||{features:0,total_feeds:KINDS.length,successful:0,failed:0,successful_kinds:[],failed_kinds:[],retrieved_at:null,retrieval_age_seconds:null,degraded:false,complete:false};
  }
  global.AafnaiEmergency={load:load,setVisible:setVisible,get status(){return lastStatus;},get visible(){return visible;}};
})(typeof window!=="undefined"?window:globalThis);
