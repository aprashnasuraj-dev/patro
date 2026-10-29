(function (global) {
  "use strict";

  function hav(a, b) {
    var p = Math.PI / 180;
    var x = 0.5 - Math.cos((b[1] - a[1]) * p) / 2 +
      Math.cos(a[1] * p) * Math.cos(b[1] * p) * (1 - Math.cos((b[0] - a[0]) * p)) / 2;
    return 12742 * Math.asin(Math.sqrt(x));
  }

  function setup(map, config) {
    if (!config || !config.tilejson) return false;
    if (!String(config.tilejson).startsWith("/")) throw new Error("Nepal terrain TileJSON must be same-origin");
    if (!map.getSource("np-dem")) {
      map.addSource("np-dem", { type: "raster-dem", url: config.tilejson, tileSize: 256, attribution: config.attribution || "" });
    }
    if (!map.getLayer("np-hillshade")) {
      map.addLayer({ id: "np-hillshade", type: "hillshade", source: "np-dem", paint: {
        "hillshade-exaggeration": 0.35,
        "hillshade-shadow-color": "#263238",
        "hillshade-highlight-color": "#f5f5f0"
      }});
    }
    map.setTerrain({ source: "np-dem", exaggeration: 1 });
    return true;
  }

  function setEnabled(map, enabled) {
    if (!map.getSource("np-dem")) return false;
    map.setTerrain(enabled ? { source: "np-dem", exaggeration: 1 } : null);
    if (map.getLayer("np-hillshade")) map.setLayoutProperty("np-hillshade", "visibility", enabled ? "visible" : "none");
    return true;
  }

  function routeSamples(coords, maxSamples) {
    if (!coords || coords.length < 2) return [];
    var seg = [], total = 0;
    for (var i = 1; i < coords.length; i++) {
      var d = hav(coords[i - 1], coords[i]);
      seg.push(d); total += d;
    }
    var n = Math.max(2, Math.min(maxSamples || 120, Math.ceil(total / 0.25) + 1));
    var out = [];
    for (var s = 0; s < n; s++) {
      var target = total * s / (n - 1), acc = 0, idx = 0;
      while (idx < seg.length - 1 && acc + seg[idx] < target) { acc += seg[idx]; idx++; }
      var a = coords[idx], b = coords[idx + 1], den = seg[idx] || 1;
      var t = Math.max(0, Math.min(1, (target - acc) / den));
      out.push({ km: target, lng: a[0] + (b[0] - a[0]) * t, lat: a[1] + (b[1] - a[1]) * t });
    }
    return out;
  }

  function sampleProfile(map, coords, maxSamples) {
    var points = routeSamples(coords, maxSamples);
    var values = points.map(function (p) {
      var e = map.queryTerrainElevation([p.lng, p.lat], { exaggerated: false });
      return { km: p.km, elevation_m: Number.isFinite(e) ? Math.round(e) : null };
    });
    var valid = values.filter(function (x) { return x.elevation_m != null; });
    if (valid.length < Math.max(2, Math.floor(values.length * 0.6))) return null;
    var ascent = 0, descent = 0;
    for (var i = 1; i < valid.length; i++) {
      var d = valid[i].elevation_m - valid[i - 1].elevation_m;
      if (d > 0) ascent += d; else descent += -d;
    }
    var elevs = valid.map(function (x) { return x.elevation_m; });
    return {
      points: valid,
      distance_km: valid[valid.length - 1].km,
      min_m: Math.min.apply(Math, elevs),
      max_m: Math.max.apply(Math, elevs),
      ascent_m: Math.round(ascent),
      descent_m: Math.round(descent),
      start_m: valid[0].elevation_m,
      end_m: valid[valid.length - 1].elevation_m,
      coverage: valid.length / values.length
    };
  }

  function renderProfile(profile) {
    if (!profile || !profile.points.length) return "";
    var w = 560, h = 120, pad = 8, min = profile.min_m, max = profile.max_m, span = Math.max(1, max - min), dist = Math.max(0.001, profile.distance_km);
    var pts = profile.points.map(function (p) {
      var x = pad + (w - pad * 2) * (p.km / dist);
      var y = h - pad - (h - pad * 2) * ((p.elevation_m - min) / span);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    return '<div class="np-elev-summary"><b>Elevation profile</b> · ' + profile.min_m.toLocaleString("en-IN") + "–" + profile.max_m.toLocaleString("en-IN") +
      " m · ascent " + profile.ascent_m.toLocaleString("en-IN") + " m · descent " + profile.descent_m.toLocaleString("en-IN") + ' m</div>' +
      '<svg class="np-elev-chart" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Route elevation profile from ' + profile.start_m + " metres to " + profile.end_m + ' metres"><polyline fill="none" stroke="currentColor" stroke-width="2" points="' + pts + '"/></svg>' +
      '<p class="np-note">Elevation is sampled from the configured DEM and is approximate; it does not represent trail difficulty or current conditions.</p>';
  }

  global.AafnaiTerrain = { setup: setup, setEnabled: setEnabled, sampleProfile: sampleProfile, renderProfile: renderProfile };
})(typeof window !== "undefined" ? window : globalThis);
