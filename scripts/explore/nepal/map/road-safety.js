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

  function summarizeForRoute(features, route) {
    var wanted = {};
    (((route || {}).legs) || []).forEach(function (leg) {
      (leg.steps || []).forEach(function (step) {
        [step.name, step.ref].forEach(function (v) { var n = norm(v); if (n) wanted[n] = true; });
      });
    });
    var candidates = (features || []).filter(function (f) {
      var p = f.properties || {};
      return wanted[norm(p.name)] || wanted[norm(p.ref)];
    });
    var exact = candidates.length > 0;
    var base = summarize(exact ? candidates : (features || []));
    base.match_mode = exact ? "route-step-name-ref" : "viewport-near-route";
    base.matched_feature_count = exact ? candidates.length : 0;
    base.disclaimer = exact
      ? "Warnings summarize OSM-tagged road/trail segments whose name or ref matches route steps. Tags may be incomplete or stale and are not a safety guarantee."
      : "No loaded road feature could be tied to a route step name/ref, so this is nearby viewport metadata only—not a claim about the exact route. Check closures, weather, landslides and local advice.";
    return base;
  }

  function renderSummary(summary) {
    if (!summary || !summary.segment_count) return '<p class="np-note">No route-specific OSM road/trail metadata is available in the loaded tiles.</p>';
    var labels = Object.keys(summary.warnings).sort(function (a, b) { return (SEV[b] || 0) - (SEV[a] || 0); });
    var warnings = labels.length ? labels.map(function (w) { return w.replace(/_/g, " ") + " (" + summary.warnings[w] + ")"; }).join(" · ") : "No tagged warning in matched metadata";
    return '<div><b>Road/trail metadata</b> · ' + Math.round(summary.coverage * 100) + '% has medium/high metadata completeness · ' + warnings + '</div><p class="np-note">' + summary.disclaimer + '</p>';
  }

  global.AafnaiRoadSafety = { assessFeature: assessFeature, summarize: summarize, summarizeForRoute: summarizeForRoute, renderSummary: renderSummary };
})(typeof window !== "undefined" ? window : globalThis);
