(function (global) {
  "use strict";
  var protocol = null;

  function ensureProtocol() {
    if (protocol) return protocol;
    if (!global.pmtiles || !global.maplibregl) throw new Error("PMTiles and MapLibre runtimes are required");
    protocol = new global.pmtiles.Protocol();
    global.maplibregl.addProtocol("pmtiles", protocol.tile);
    return protocol;
  }

  async function attach(map, options) {
    options = options || {};
    var p = ensureProtocol();
    var result = { places: null, roads: null, timings_ms: {} };
    if (options.places) {
      var t0 = performance.now();
      var places = new global.pmtiles.PMTiles(options.places);
      p.add(places);
      var header = await places.getHeader();
      result.timings_ms.places_header = Math.round((performance.now() - t0) * 10) / 10;
      result.places = header;
      if (!map.getSource("np-pmtiles-places")) {
        map.addSource("np-pmtiles-places", { type: "vector", url: "pmtiles://" + options.places, attribution: "© OpenStreetMap contributors" });
        map.addLayer({
          id: "np-pmtiles-places-poc", type: "circle", source: "np-pmtiles-places", "source-layer": "places",
          layout: { visibility: options.renderPlaces ? "visible" : "none" },
          paint: { "circle-radius": 3, "circle-opacity": 0.65, "circle-color": "#334155" }
        });
      }
    }
    if (options.roads) {
      var t1 = performance.now();
      var roads = new global.pmtiles.PMTiles(options.roads);
      p.add(roads);
      var roadHeader = await roads.getHeader();
      result.timings_ms.roads_header = Math.round((performance.now() - t1) * 10) / 10;
      result.roads = roadHeader;
      if (!map.getSource("np-pmtiles-roads")) {
        map.addSource("np-pmtiles-roads", { type: "vector", url: "pmtiles://" + options.roads, attribution: "© OpenStreetMap contributors" });
        map.addLayer({
          id: "np-pmtiles-roads-meta", type: "line", source: "np-pmtiles-roads", "source-layer": "roads",
          layout: { visibility: (options.renderRoads || options.loadRoadsForMetadata) ? "visible" : "none" },
          paint: { "line-width": 2, "line-opacity": options.renderRoads ? 0.45 : 0, "line-color": "#475569" }
        });
      }
    }
    return result;
  }

  function loadedRoadMetadata(map) {
    if (!map.getSource("np-pmtiles-roads")) return [];
    try { return map.querySourceFeatures("np-pmtiles-roads", { sourceLayer: "roads" }); }
    catch (_) { return []; }
  }

  global.AafnaiPmtiles = { attach: attach, loadedRoadMetadata: loadedRoadMetadata };
})(typeof window !== "undefined" ? window : globalThis);
