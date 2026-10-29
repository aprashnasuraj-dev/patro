(function (global) {
  "use strict";

  var SEV = {
    restricted_access: 4,
    poor_smoothness: 4,
    ford: 3,
    seasonal: 3,
    mountain_hiking_scale: 3,
    unpaved_surface: 2,
    trail_or_track: 2,
    tunnel: 1,
    bridge: 1
  };

  function splitWarnings(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function assessFeature(props) {
    props = props || {};
    var warnings = splitWarnings(props.warnings);
    var worst = warnings.reduce(function (m, w) { return Math.max(m, SEV[w] || 0); }, 0);
    var confidence = /^(high|medium|low)$/.test(props.metadata_confidence || "") ? props.metadata_confidence : "low";
    var label = worst >= 4 ? "high-caution" : worst === 3 ? "caution" : worst === 2 ? "limited-surface-info" : "no-tagged-warning";
    return {
      label: label,
      metadata_confidence: confidence,
      warnings: warnings,
      highway: props.highway || null,
      surface: props.surface || null,
      smoothness: props.smoothness || null,
      sac_scale: props.sac_scale || null
    };
  }

  function summarize(features) {
    var seen = {}, warnings = {}, confidence = { high: 0, medium: 0, low: 0 }, assessed = [];
    (features || []).forEach(function (f) {
      var p = f.properties || {};
      var key = p.osm_id || p.id || JSON.stringify([p.highway,p.name,p.ref,p.surface,p.smoothness]);
      if (seen[key]) return;
      seen[key] = true;
      var a = assessFeature(p);
      assessed.push(a);
      confidence[a.metadata_confidence] = (confidence[a.metadata_confidence] || 0) + 1;
      a.warnings.forEach(function (w) { warnings[w] = (warnings[w] || 0) + 1; });
    });
    var total = assessed.length;
    return {
      segment_count: total,
      confidence: confidence,
      warnings: warnings,
      coverage: total ? (confidence.high + confidence.medium) / total : 0,
      disclaimer: "OSM road/trail tags are incomplete and may be stale. This is route metadata, not a safety guarantee; check closures, weather, landslides and local advice."
    };
  }


  function norm(v) {
    return String(v || "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function havKm(a,b) {
    var p=Math.PI/180;
    var x=0.5-Math.cos((b[1]-a[1])*p)/2+
      Math.cos(a[1]*p)*Math.cos(b[1]*p)*(1-Math.cos((b[0]-a[0])*p))/2;
    return 12742*Math.asin(Math.sqrt(Math.max(0,x)));
  }

  function routeSamples(route, spacingKm) {
    var coords=route&&route.geometry&&route.geometry.type==="LineString"&&route.geometry.coordinates;
    if(!Array.isArray(coords)||coords.length<2) return [];
    var spacing=Math.max(0.1,Number(spacingKm)||0.25), out=[coords[0]];
    for(var i=1;i<coords.length;i++){
      var a=coords[i-1],b=coords[i],d=havKm(a,b),n=Math.max(1,Math.ceil(d/spacing));
      for(var j=1;j<=n;j++){
        var t=j/n;
        out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
      }
    }
    return out;
  }

  function geometryPoints(geometry) {
    var out=[];
    function walk(v){
      if(!Array.isArray(v)) return;
      if(v.length>=2&&Number.isFinite(Number(v[0]))&&Number.isFinite(Number(v[1]))&&typeof v[0]!=="object"){
        out.push([Number(v[0]),Number(v[1])]);return;
      }
      v.forEach(walk);
    }
    if(geometry) walk(geometry.coordinates);
    return out;
  }

  function routeGrid(samples) {
    var grid={},cell=0.01;
    samples.forEach(function(p){
      var x=Math.floor(p[0]/cell),y=Math.floor(p[1]/cell),key=x+":"+y;
      (grid[key]=grid[key]||[]).push(p);
    });
    return {cell:cell,cells:grid};
  }

  function featureNearRoute(feature, grid, maxKm) {
    var pts=geometryPoints(feature&&feature.geometry);
    if(!pts.length) return false;
    var cell=grid.cell,cells=grid.cells,r=Math.max(1,Math.ceil((maxKm/111)/cell));
    for(var p=0;p<pts.length;p++){
      var pt=pts[p],x=Math.floor(pt[0]/cell),y=Math.floor(pt[1]/cell);
      for(var dx=-r;dx<=r;dx++)for(var dy=-r;dy<=r;dy++){
        var list=cells[(x+dx)+":"+(y+dy)];
        if(!list) continue;
        for(var q=0;q<list.length;q++) if(havKm(pt,list[q])<=maxKm) return true;
      }
    }
    return false;
  }

  function routeStepKeys(route) {
    var rows=[];
    (((route||{}).legs)||[]).forEach(function(leg){
      (leg.steps||[]).forEach(function(step){
        var keys=[norm(step.name),norm(step.ref)].filter(Boolean);
        if(keys.length) rows.push(keys);
      });
    });
    return rows;
  }

  function summarizeForRoute(features, route) {
    var steps=routeStepKeys(route),wanted={};
    steps.forEach(function(keys){keys.forEach(function(k){wanted[k]=true;});});
    var samples=routeSamples(route,0.25),hasGeometry=samples.length>0;
    var grid=hasGeometry?routeGrid(samples):null;
    var corridor=hasGeometry
      ? (features||[]).filter(function(f){return featureNearRoute(f,grid,0.5);})
      : (features||[]);
    var candidates=corridor.filter(function(f){
      var p=f.properties||{};
      return wanted[norm(p.name)]||wanted[norm(p.ref)];
    });
    var matchedKeys={};
    candidates.forEach(function(f){
      var p=f.properties||{};
      [p.name,p.ref].forEach(function(v){var k=norm(v);if(k)matchedKeys[k]=true;});
    });
    var matchedSteps=steps.filter(function(keys){return keys.some(function(k){return matchedKeys[k];});}).length;
    var base=summarize(candidates.length?candidates:(hasGeometry?corridor:[]));
    base.route_step_match={
      eligible_steps:steps.length,
      matched_steps:matchedSteps,
      rate:steps.length?matchedSteps/steps.length:0
    };
    base.corridor_feature_count=corridor.length;
    base.spatial_tolerance_m=hasGeometry?500:null;
    if(candidates.length&&hasGeometry){
      base.match_mode="route-step-name-ref-and-proximity";
      base.matched_feature_count=candidates.length;
      base.disclaimer="Warnings summarize OSM-tagged road/trail features matching a route-step name/ref and lying within 500 m of the routed geometry. Tags and names can still be incomplete or stale; this is metadata, not a safety guarantee.";
    }else if(candidates.length){
      base.match_mode="route-step-name-ref-no-geometry";
      base.matched_feature_count=candidates.length;
      base.disclaimer="Road names/refs match route steps, but routed geometry was unavailable for a spatial cross-check. Treat this as unverified route metadata, not a safety guarantee.";
    }else if(hasGeometry&&corridor.length){
      base.match_mode="route-corridor-nearby-metadata";
      base.matched_feature_count=0;
      base.disclaimer="No road feature matched a route-step name/ref. These features are only within 500 m of the routed geometry: nearby metadata, not a claim about the exact route or traveled road.";
    }else{
      base.match_mode=hasGeometry?"no-route-metadata":"viewport-near-route";
      base.matched_feature_count=0;
      base.disclaimer=hasGeometry
        ?"No loaded OSM road/trail feature could be spatially tied to this route. No route-specific road warning is claimed."
        :"Routed geometry is unavailable, so loaded road/trail metadata cannot be spatially tied to the route.";
    }
    return base;
  }

  function renderSummary(summary) {
    if (!summary || !summary.segment_count) return '<p class="np-note">No route-specific OSM road/trail metadata is available in the loaded tiles.</p>';
    var labels = Object.keys(summary.warnings).sort(function (a, b) { return (SEV[b] || 0) - (SEV[a] || 0); });
    var warnings = labels.length ? labels.map(function (w) { return w.replace(/_/g, " ") + " (" + summary.warnings[w] + ")"; }).join(" · ") : "No tagged warning in matched metadata";
    var match = summary.route_step_match && summary.route_step_match.eligible_steps
      ? " · route-step match " + Math.round(summary.route_step_match.rate * 100) + "% (" + summary.route_step_match.matched_steps + "/" + summary.route_step_match.eligible_steps + ")"
      : "";
    return '<div><b>Road/trail metadata</b> · ' + Math.round(summary.coverage * 100) + '% has medium/high metadata completeness' + match + ' · ' + warnings + '</div><p class="np-note">' + summary.disclaimer + '</p>';
  }

  global.AafnaiRoadSafety = { assessFeature: assessFeature, summarize: summarize, summarizeForRoute: summarizeForRoute, renderSummary: renderSummary };
})(typeof window !== "undefined" ? window : globalThis);
