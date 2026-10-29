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

  global.AafnaiRoadSafety = { assessFeature: assessFeature, summarize: summarize };
})(typeof window !== "undefined" ? window : globalThis);
