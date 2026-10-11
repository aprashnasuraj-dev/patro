/* Aafnai Patro — Nepal map (/nepalmap). Vanilla JS + MapLibre GL (loaded from cdn.jsdelivr.net).
 * Data: /data/nepalmap/v1/*.json, written by scripts/explore/nepal/build-map.mjs from OpenStreetMap
 * (© OpenStreetMap contributors, ODbL) and the /nepal pages' ward data. Base map: OpenFreeMap.
 */
(function () {
  "use strict";
  var CFG = window.NEPALMAP || {};
  var DATA = CFG.data || "/data/nepalmap/v1/";
  var VER = CFG.version || "1";
  var STYLE = CFG.style || "https://tiles.openfreemap.org/styles/liberty";
  var NEPAL = [[80.0, 26.3], [88.25, 30.5]];
  var CATS = CFG.categories || [];
  var CAT = {};
  CATS.forEach(function (c) { CAT[c.id] = c; });

  var state = {
    on: new Set(), // enabled category ids
    religion: new Set(), // empty = all
    minEle: 0,
    district: "",
    query: "",
    me: null,
    tab: "explore",
    from: null, // {lat, lng, label}
    to: null,
    mode: "car",
  };
  var layers = {}; // id -> {rows, loaded, loading}
  var admin = null;
  var map;
  var popup;
  var styleReady = false;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var norm = function (s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ऀ-ॿ]+/g, "");
  };
  var skel = function (s) {
    return norm(s).replace(/chh/g, "c").replace(/ch/g, "c").replace(/sh/g, "s").replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u").replace(/w/g, "b").replace(/v/g, "b").replace(/h/g, "").replace(/(.)\1+/g, "$1");
  };
  function km(a, b, c, d) {
    var p = Math.PI / 180;
    var x = 0.5 - Math.cos((c - a) * p) / 2 + (Math.cos(a * p) * Math.cos(c * p) * (1 - Math.cos((d - b) * p))) / 2;
    return 12742 * Math.asin(Math.sqrt(x));
  }
  var fmtKm = function (d) { return d < 1 ? Math.round(d * 1000) + " m" : (d < 10 ? d.toFixed(1) : Math.round(d)) + " km"; };

  // ---------- URL state ----------
  function readUrl() {
    var q = new URLSearchParams(location.search);
    var c = q.get("c");
    (c ? c.split(",") : CFG.preset && CFG.preset.categories ? CFG.preset.categories : CATS.filter(function (x) { return x.default; }).map(function (x) { return x.id; }))
      .forEach(function (id) { if (CAT[id]) state.on.add(id); });
    var r = q.get("r") || (CFG.preset && CFG.preset.religion ? CFG.preset.religion.join(",") : "");
    if (r) r.split(",").forEach(function (x) { state.religion.add(x); });
    state.district = q.get("d") || "";
    state.minEle = Number(q.get("ele") || (CFG.preset && CFG.preset.minEle) || 0);
    state.query = q.get("q") || "";
    state.from = parsePoint(q.get("from"));
    state.to = parsePoint(q.get("to"));
    if (/^(car|bike|foot)$/.test(q.get("mode") || "")) state.mode = q.get("mode");
    if (state.from || state.to) state.tab = "route";
    var ll = (q.get("ll") || "").split(",").map(Number);
    return ll.length === 3 && ll.every(isFinite) ? ll : null;
  }
  function parsePoint(v) {
    if (!v) return null;
    var m = String(v).match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(.+))?$/);
    if (!m) return null;
    var lat = Number(m[1]), lng = Number(m[2]);
    if (!(lat > 25 && lat < 31.5 && lng > 79 && lng < 89)) return null;
    return { lat: lat, lng: lng, label: (m[3] || "").slice(0, 80) || lat.toFixed(4) + ", " + lng.toFixed(4) };
  }
  var pointParam = function (p) { return p.lat.toFixed(5) + "," + p.lng.toFixed(5) + "," + p.label; };
  var urlTimer;
  function writeUrl() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () {
      var q = new URLSearchParams();
      var on = Array.from(state.on).join(",");
      var preset = CFG.preset && CFG.preset.categories ? CFG.preset.categories.join(",") : CATS.filter(function (x) { return x.default; }).map(function (x) { return x.id; }).join(",");
      if (on !== preset) q.set("c", on);
      if (state.religion.size) q.set("r", Array.from(state.religion).join(","));
      if (state.district) q.set("d", state.district);
      if (state.minEle) q.set("ele", String(state.minEle));
      if (state.from) q.set("from", pointParam(state.from));
      if (state.to) q.set("to", pointParam(state.to));
      if ((state.from || state.to) && state.mode !== "car") q.set("mode", state.mode);
      if (map) { var c = map.getCenter(); q.set("ll", c.lat.toFixed(4) + "," + c.lng.toFixed(4) + "," + map.getZoom().toFixed(1)); }
      var s = q.toString();
      history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
    }, 400);
  }

  // ---------- data ----------
  function getJson(file) {
    return fetch(DATA + file + "?v=" + VER).then(function (r) { if (!r.ok) throw new Error(file + " " + r.status); return r.json(); });
  }
  function ensure(id) {
    var L = layers[id] || (layers[id] = { rows: [], loaded: false, loading: null });
    if (L.loaded) return Promise.resolve(L);
    if (!L.loading) {
      L.loading = getJson(CAT[id].file).then(function (j) {
        L.rows = j.rows; L.loaded = true; L.fields = j.fields;
        return L;
      });
    }
    return L.loading;
  }
  // Row: [name, name_ne, lat, lng, sub, ele, palika_id, ward, district_id, village_slug, wikipedia]
  var R = { n: 0, ne: 1, lat: 2, lng: 3, sub: 4, ele: 5, pid: 6, ward: 7, did: 8, vs: 9, wiki: 10 };

  function districtId() {
    if (!state.district || !admin) return 0;
    var d = admin.districts.find(function (x) { return x.slug === state.district; });
    return d ? d.id : 0;
  }
  function passes(id, row, did) {
    if (did && row[R.did] !== did) return false;
    var c = CAT[id];
    if (c.religionFilter && state.religion.size && !state.religion.has(row[R.sub] || "other")) return false;
    if (c.eleFilter && state.minEle && !(row[R.ele] >= state.minEle)) return false;
    return true;
  }
  function geojson(id) {
    var L = layers[id];
    var did = districtId();
    var feats = [];
    for (var i = 0; i < L.rows.length; i++) {
      var row = L.rows[i];
      if (!passes(id, row, did)) continue;
      feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [row[R.lng], row[R.lat]] }, properties: { i: i, n: row[R.n] || row[R.ne] } });
    }
    L.count = feats.length;
    return { type: "FeatureCollection", features: feats };
  }

  // ---------- map layers ----------
  function addLayer(id) {
    var c = CAT[id];
    var src = "s-" + id;
    if (map.getSource(src)) { map.getSource(src).setData(geojson(id)); return; }
    map.addSource(src, { type: "geojson", data: geojson(id), cluster: true, clusterRadius: 50, clusterMaxZoom: 12 });
    map.addLayer({ id: "c-" + id, type: "circle", source: src, filter: ["has", "point_count"],
      paint: { "circle-color": c.color, "circle-opacity": 0.85, "circle-stroke-color": "#fff", "circle-stroke-width": 2,
        "circle-radius": ["step", ["get", "point_count"], 11, 25, 14, 200, 18, 1000, 23] } });
    map.addLayer({ id: "cn-" + id, type: "symbol", source: src, filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true },
      paint: { "text-color": "#fff" } });
    map.addLayer({ id: "p-" + id, type: "circle", source: src, filter: ["!", ["has", "point_count"]],
      paint: { "circle-color": c.color, "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 12, 6, 16, 9], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
    map.addLayer({ id: "t-" + id, type: "symbol", source: src, filter: ["!", ["has", "point_count"]], minzoom: 11,
      layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true },
      paint: { "text-color": "#1d2a20", "text-halo-color": "#fff", "text-halo-width": 1.4 } });
    map.on("click", "c-" + id, function (e) {
      var f = e.features[0];
      var p = map.getSource(src).getClusterExpansionZoom(f.properties.cluster_id);
      var go = function (z) { map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.3 }); };
      if (p && p.then) p.then(go); else map.getSource(src).getClusterExpansionZoom(f.properties.cluster_id, function (err, z) { if (!err) go(z); });
    });
    map.on("click", "p-" + id, function (e) { openPopup(id, e.features[0].properties.i); });
    ["c-", "p-"].forEach(function (k) {
      map.on("mouseenter", k + id, function () { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", k + id, function () { map.getCanvas().style.cursor = ""; });
    });
  }
  function setVisible(id, on) {
    ["c-", "cn-", "p-", "t-"].forEach(function (k) { if (map.getLayer(k + id)) map.setLayoutProperty(k + id, "visibility", on ? "visible" : "none"); });
  }
  function refresh() {
    var jobs = [];
    CATS.forEach(function (c) {
      if (state.on.has(c.id)) jobs.push(ensure(c.id).then(function () { if (styleReady) { addLayer(c.id); setVisible(c.id, true); } }));
      else if (map.getLayer("p-" + c.id)) setVisible(c.id, false);
    });
    renderChips();
    return Promise.all(jobs).then(function () { renderChips(); renderList(); writeUrl(); }).catch(showError);
  }

  // ---------- places, wards, links ----------
  function palikaInfo(pid) {
    var p = admin && admin.palikas[pid];
    if (!p) return null;
    var d = admin.districtById[p[3]];
    return { path: d.path + "/" + p[0], en: p[1], ne: p[2], d: d, short: p[6] || p[1] };
  }
  function placeLine(row) {
    var p = palikaInfo(row[R.pid]);
    if (p && row[R.ward]) return { href: p.path + "/ward-" + row[R.ward], text: p.short + "-" + row[R.ward] + ", " + p.d.name };
    if (p) return { href: p.path, text: p.en + ", " + p.d.name };
    var d = admin && admin.districtById[row[R.did]];
    return d ? { href: d.path, text: d.name + " District" } : null;
  }
  function kindText(id, row) {
    var c = CAT[id];
    var bits = [c.one];
    if (row[R.sub] && c.subs && c.subs[row[R.sub]]) bits[0] = c.subs[row[R.sub]];
    if (row[R.ele]) bits.push(Number(row[R.ele]).toLocaleString("en-IN") + " m");
    return bits.join(" · ");
  }
  function openPopup(id, i) {
    var row = layers[id].rows[i];
    var lat = row[R.lat], lng = row[R.lng];
    var where = placeLine(row);
    var p = palikaInfo(row[R.pid]);
    var village = id === "village" && row[R.vs] && p ? p.path + "/" + row[R.vs] : "";
    var wiki = row[R.wiki] ? "https://" + row[R.wiki].split(":")[0] + ".wikipedia.org/wiki/" + encodeURIComponent(row[R.wiki].slice(3).replace(/ /g, "_")) : "";
    var dist = state.me ? " · " + fmtKm(km(state.me[0], state.me[1], lat, lng)) + " from you" : "";
    var html = '<div class="np-pop"><strong>' + esc(row[R.n] || row[R.ne]) + "</strong>" + (row[R.n] && row[R.ne] ? ' <span lang="ne">' + esc(row[R.ne]) + "</span>" : "") +
      '<div class="np-kind">' + esc(kindText(id, row)) + esc(dist) + "</div>" +
      (where ? '<div><a href="' + esc(where.href) + '">' + esc(where.text) + "</a></div>" : "") +
      '<div class="np-actions">' +
      '<a class="np-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + "," + lng + '">Directions</a>' +
      '<a class="np-btn" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=' + lat + "&mlon=" + lng + "#map=17/" + lat + "/" + lng + '">OpenStreetMap</a>' +
      (village ? '<a class="np-btn" href="' + esc(village) + '">Village page</a>' : "") +
      (wiki ? '<a class="np-btn" target="_blank" rel="noopener" href="' + esc(wiki) + '">Wikipedia</a>' : "") +
      '<button class="np-btn" type="button" data-share="' + lat + "," + lng + '">Copy link</button></div>' +
      '<div class="np-actions np-route-actions"><button class="np-btn np-btn-a" type="button" data-route="from" data-ll="' + lat + "," + lng + '" data-name="' + esc(row[R.n] || row[R.ne]) + '">A · From here</button>' +
      '<button class="np-btn np-btn-b" type="button" data-route="to" data-ll="' + lat + "," + lng + '" data-name="' + esc(row[R.n] || row[R.ne]) + '">B · To here</button></div></div>';
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ maxWidth: "300px", offset: 10 }).setLngLat([lng, lat]).setHTML(html).addTo(map);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-share]");
    if (!b) return;
    var ll = b.getAttribute("data-share");
    var url = location.origin + location.pathname + "?" + (location.search.slice(1).replace(/(^|&)ll=[^&]*/, "") + "&ll=" + ll + ",16").replace(/^&/, "");
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = "Copied"; }, function () { prompt("Copy this link", url); });
  });

  // ---------- panel ----------
  function renderChips() {
    var box = $("#np-cats");
    if (!box) return;
    box.innerHTML = CATS.map(function (c) {
      var L = layers[c.id];
      var count = L && L.loaded ? L.count : c.total;
      return '<button type="button" class="np-chip' + (state.on.has(c.id) ? " on" : "") + '" data-cat="' + c.id + '" aria-pressed="' + state.on.has(c.id) + '"><i style="background:' + c.color + '"></i>' + esc(c.label) +
        ' <span class="np-n">' + (count == null ? "" : Number(count).toLocaleString("en-IN")) + "</span></button>";
    }).join("");
    var rel = $("#np-religion");
    if (rel) rel.hidden = !state.on.has("worship");
    var ele = $("#np-ele-wrap");
    if (ele) ele.hidden = !state.on.has("peak");
  }
  function renderList() {
    var box = $("#np-list");
    if (!box || !map) return;
    var b = map.getBounds();
    var origin = state.me || [map.getCenter().lat, map.getCenter().lng];
    var did = districtId();
    var out = [];
    state.on.forEach(function (id) {
      var L = layers[id];
      if (!L || !L.loaded) return;
      for (var i = 0; i < L.rows.length; i++) {
        var row = L.rows[i];
        if (!passes(id, row, did)) continue;
        if (row[R.lat] < b.getSouth() || row[R.lat] > b.getNorth() || row[R.lng] < b.getWest() || row[R.lng] > b.getEast()) continue;
        out.push({ id: id, i: i, d: km(origin[0], origin[1], row[R.lat], row[R.lng]) });
      }
    });
    out.sort(function (a, b2) { return a.d - b2.d; });
    var total = out.length;
    out = out.slice(0, 60);
    $("#np-list-head").textContent = total ? total.toLocaleString("en-IN") + " places in view" + (state.me ? " · nearest to you first" : " · nearest to the centre first") : "Nothing here with these filters. Zoom out or turn on more categories.";
    box.innerHTML = out.map(function (o) {
      var row = layers[o.id].rows[o.i];
      var where = placeLine(row);
      return '<li><button type="button" data-go="' + o.id + ":" + o.i + '"><i style="background:' + CAT[o.id].color + '"></i><span><b>' + esc(row[R.n] || row[R.ne]) + "</b>" + (row[R.n] && row[R.ne] ? ' <span lang="ne">' + esc(row[R.ne]) + "</span>" : "") +
        "<small>" + esc(kindText(o.id, row)) + (where ? " · " + esc(where.text) : "") + " · " + fmtKm(o.d) + "</small></span></button></li>";
    }).join("");
  }
  function go(id, i, zoom) {
    var row = layers[id].rows[i];
    map.flyTo({ center: [row[R.lng], row[R.lat]], zoom: Math.max(map.getZoom(), zoom || 14) });
    map.once("moveend", function () { openPopup(id, i); });
    closePanelOnMobile();
  }

  // ---------- search ----------
  var SEARCH_CATS = ["village", "worship", "peak", "lake", "sight", "park", "airport", "waterfall"];
  function search(q) {
    var res = [];
    var nq = norm(q), sq = skel(q);
    if (nq.length < 2) return res;
    // "jayaprithvi 11", "chainpur ward 8", "जयपृथ्वी ११"
    var wm = q.trim().match(/^(.*?)[\s-]*(?:ward|wada|वडा)?\s*(?:no\.?|नं\.?)?\s*[-\s]?([0-9०-९]{1,2})$/i);
    if (wm && wm[1]) {
      var wn = Number(wm[2].replace(/[०-९]/g, function (d) { return "०१२३४५६७८९".indexOf(d); }));
      var base = skel(wm[1]);
      Object.keys(admin.palikas).forEach(function (pid) {
        var p = admin.palikas[pid];
        if (wn >= 1 && wn <= p[4] && base.length >= 3 && (skel(p[1]).indexOf(base) === 0 || norm(p[2]).indexOf(norm(wm[1])) === 0)) {
          var info = palikaInfo(pid);
          var c = admin.wards[pid + "-" + wn];
          res.push({ score: 0, label: info.en + " ward " + wn, sub: info.d.name + " District", href: info.path + "/ward-" + wn, ll: c });
        }
      });
    }
    admin.districts.forEach(function (d) {
      if (skel(d.name).indexOf(sq) === 0 || norm(d.ne).indexOf(nq) === 0) res.push({ score: 1, label: d.name + " District", sub: d.ne, district: d.slug, href: d.path });
    });
    Object.keys(admin.palikas).forEach(function (pid) {
      var p = admin.palikas[pid];
      if (skel(p[1]).indexOf(sq) === 0 || norm(p[2]).indexOf(nq) === 0) {
        var info = palikaInfo(pid);
        res.push({ score: 2, label: info.en, sub: info.d.name + " District · " + p[4] + " wards", href: info.path, ll: p[5] });
      }
    });
    SEARCH_CATS.concat(Array.from(state.on)).forEach(function (id, k, all) {
      if (all.indexOf(id) !== k) return;
      var L = layers[id];
      if (!L || !L.loaded) return;
      for (var i = 0; i < L.rows.length && res.length < 400; i++) {
        var row = L.rows[i];
        var a = norm(row[R.n]), b = norm(row[R.ne]);
        var s = a === nq || b === nq ? 2.5 : a.indexOf(nq) === 0 || b.indexOf(nq) === 0 ? 3 : a.indexOf(nq) > 0 || b.indexOf(nq) > 0 ? 4 : skel(row[R.n]).indexOf(sq) === 0 && sq.length > 2 ? 5 : -1;
        if (s < 0) continue;
        // Well-known places first: a Wikipedia article, a Nepali name, a temple/peak/sight rather than a hamlet.
        if (row[R.wiki]) s -= 0.6;
        if (row[R.ne]) s -= 0.1;
        if (id === "village" && /hamlet|neighbourhood|locality|isolated_dwelling|quarter/.test(row[R.sub])) s += 0.4;
        if (id === "village" && /city|town/.test(row[R.sub])) s -= 0.3;
        var where = placeLine(row);
        res.push({ score: s, label: row[R.n] || row[R.ne], ne: row[R.n] ? row[R.ne] : "", sub: kindText(id, row) + (where ? " · " + where.text : ""), cat: id, i: i });
      }
    });
    res.sort(function (a, b) { return a.score - b.score || a.label.length - b.label.length; });
    return res.slice(0, 25);
  }
  var searchTimer;
  function onSearch() {
    var q = $("#np-q").value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      Promise.all(SEARCH_CATS.map(ensure)).then(function () {
        var box = $("#np-results");
        var res = search(q);
        box.hidden = !q.trim();
        box.innerHTML = res.length ? res.map(function (r, k) {
          return '<li><button type="button" data-res="' + k + '"><b>' + esc(r.label) + "</b>" + (r.ne ? ' <span lang="ne">' + esc(r.ne) + "</span>" : "") + "<small>" + esc(r.sub || "") + "</small></button>" +
            (r.href ? '<a href="' + esc(r.href) + '" class="np-open">Page</a>' : "") + "</li>";
        }).join("") : '<li class="np-empty">No match. Try the English or Nepali spelling, a palika with a ward number ("Jayaprithvi 11"), or turn on more categories.</li>';
        box._res = res;
      }).catch(showError);
    }, 180);
  }
  function pick(r) {
    $("#np-results").hidden = true;
    if (r.cat) { if (!state.on.has(r.cat)) { state.on.add(r.cat); refresh().then(function () { go(r.cat, r.i, 15); }); } else go(r.cat, r.i, 15); return; }
    if (r.district) { setDistrict(r.district); return; }
    if (r.ll) { map.flyTo({ center: [r.ll[1], r.ll[0]], zoom: 13 }); closePanelOnMobile(); }
  }

  function setDistrict(slug) {
    state.district = slug;
    $("#np-district").value = slug;
    var d = admin.districts.find(function (x) { return x.slug === slug; });
    if (d && d.bbox) map.fitBounds([[d.bbox[0], d.bbox[1]], [d.bbox[2], d.bbox[3]]], { padding: 30, maxZoom: 11 });
    else map.fitBounds(NEPAL, { padding: 20 });
    var link = $("#np-district-link");
    if (link) { link.hidden = !d; if (d) { link.href = d.path; link.textContent = d.name + " District: wards, palikas, former VDCs →"; } }
    CATS.forEach(function (c) { if (layers[c.id] && layers[c.id].loaded && map.getSource("s-" + c.id)) map.getSource("s-" + c.id).setData(geojson(c.id)); });
    renderChips(); renderList(); writeUrl(); closePanelOnMobile();
  }
  function closePanelOnMobile() { if (window.matchMedia("(max-width: 760px)").matches) document.body.classList.remove("np-panel-open"); }
  function showError(e) { console.error(e); var h = $("#np-list-head"); if (h) h.textContent = "Could not load map data. Please reload."; }


  // ---------- From → To routes ----------
  // Roads and trails from OpenStreetMap, routed by OSRM on the FOSSGIS servers that openstreetmap.org itself uses
  // (CORS-enabled, no key; fair use). If routing is unavailable we still show the straight line and hand off to
  // Google Maps for turn-by-turn navigation.
  var ROUTER = CFG.router || "https://routing.openstreetmap.de/";
  var PROFILES = { car: ["routed-car", "driving"], bike: ["routed-bike", "driving"], foot: ["routed-foot", "driving"] };
  var ALONG = ["worship", "peak", "lake", "sight", "waterfall", "park", "airport", "village"];
  var routeSeq = 0;
  var routeData = null;
  var markers = { from: null, to: null };
  var picking = null;

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".np-tabs [data-tab]").forEach(function (b) { var on = b.getAttribute("data-tab") === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    $("#np-route").hidden = tab !== "route";
    document.querySelector(".np-explore").hidden = tab === "route";
    if (map) map.resize();
  }
  function marker(which) {
    var p = state[which];
    if (markers[which]) { markers[which].remove(); markers[which] = null; }
    if (!p || !map) return;
    var el = document.createElement("div");
    el.className = "np-pin-wrap";
    el.innerHTML = '<div class="np-pin ' + (which === "from" ? "a" : "b") + '"><span>' + (which === "from" ? "A" : "B") + "</span></div>";
    markers[which] = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
    markers[which].on("dragend", function () {
      var ll = markers[which].getLngLat();
      setPoint(which, { lat: ll.lat, lng: ll.lng, label: "Pinned point " + ll.lat.toFixed(4) + ", " + ll.lng.toFixed(4) });
    });
  }
  function setPoint(which, p, quiet) {
    state[which] = p;
    $(which === "from" ? "#np-from" : "#np-to").value = p ? p.label : "";
    marker(which);
    if (!quiet) { setTab("route"); computeRoute(); }
    writeUrl();
  }
  /** A search result (see search()) → a point, or null when it has no single location. */
  function resultPoint(r) {
    if (r.cat) { var row = layers[r.cat].rows[r.i]; return { lat: row[R.lat], lng: row[R.lng], label: r.label + (r.sub ? ", " + r.sub.split(" · ").pop() : "") }; }
    if (r.ll) return { lat: r.ll[0], lng: r.ll[1], label: r.label + (r.sub ? ", " + r.sub.split(" · ")[0] : "") };
    if (r.district) {
      var d = admin.districts.find(function (x) { return x.slug === r.district; });
      if (d && d.bbox) return { lat: (d.bbox[1] + d.bbox[3]) / 2, lng: (d.bbox[0] + d.bbox[2]) / 2, label: d.name + " District" };
    }
    return null;
  }
  function suggest(which) {
    var input = $(which === "from" ? "#np-from" : "#np-to");
    var box = $(which === "from" ? "#np-from-sugg" : "#np-to-sugg");
    var q = input.value;
    clearTimeout(box._t);
    box._t = setTimeout(function () {
      Promise.all(SEARCH_CATS.map(ensure)).then(function () {
        var res = search(q).filter(function (r) { return resultPoint(r); }).slice(0, 12);
        box.hidden = !q.trim();
        box.innerHTML = res.length ? res.map(function (r, k) {
          return '<li><button type="button" data-k="' + k + '"><b>' + esc(r.label) + "</b>" + (r.ne ? ' <span lang="ne">' + esc(r.ne) + "</span>" : "") + "<small>" + esc(r.sub || "") + "</small></button></li>";
        }).join("") : '<li class="np-empty">No match. Try another spelling, a palika with its ward ("Jayaprithvi 11"), or pick the point on the map with 📌.</li>';
        box._res = res;
      }).catch(showError);
    }, 160);
  }
  function chooseSuggestion(which, k) {
    var box = $(which === "from" ? "#np-from-sugg" : "#np-to-sugg");
    var r = box._res && box._res[k];
    box.hidden = true;
    if (r) setPoint(which, resultPoint(r));
  }
  function dimPlaces(dim) {
    CATS.forEach(function (c) {
      if (map.getLayer("p-" + c.id)) map.setPaintProperty("p-" + c.id, "circle-opacity", dim ? 0.35 : 1);
      if (map.getLayer("c-" + c.id)) map.setPaintProperty("c-" + c.id, "circle-opacity", dim ? 0.3 : 0.85);
    });
  }
  function clearRoute() {
    routeData = null;
    if (map && styleReady) dimPlaces(false);
    if (map && map.getSource("np-route")) map.getSource("np-route").setData({ type: "FeatureCollection", features: [] });
    if (map && map.getSource("np-along")) map.getSource("np-along").setData({ type: "FeatureCollection", features: [] });
    $("#np-route-sum").hidden = true;
    $("#np-along-wrap").hidden = true;
    $("#np-steps-wrap").hidden = true;
  }
  function ensureRouteLayers() {
    if (!styleReady || map.getSource("np-route")) return;
    map.addSource("np-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "np-route-casing", type: "line", source: "np-route", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 5, 14, 11], "line-opacity": 0.9 } });
    map.addLayer({ id: "np-route-line", type: "line", source: "np-route", filter: ["!=", ["get", "straight"], true], layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#1565c0", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 3, 14, 7] } });
    map.addLayer({ id: "np-route-straight", type: "line", source: "np-route", filter: ["==", ["get", "straight"], true],
      paint: { "line-color": "#5f6b62", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 3, 14, 6], "line-dasharray": [2, 2] } });
    map.addSource("np-along", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "np-along-dot", type: "circle", source: "np-along",
      paint: { "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 13, 8], "circle-stroke-color": "#1565c0", "circle-stroke-width": 2 } });
    map.on("click", "np-along-dot", function (e) { var p = e.features[0].properties; openPopup(p.cat, p.i); });
  }
  var fmtTime = function (sec) {
    var m = Math.round(sec / 60);
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60), r = m % 60;
    return h + " h" + (r ? " " + r + " min" : "");
  };
  function stepText(st) {
    var m = st.maneuver || {}, mod = m.modifier ? m.modifier.replace("sharp ", "sharp ").replace("slight ", "slightly ") : "";
    var road = st.name || st.ref || "";
    var onto = road ? " onto " + road : "";
    switch (m.type) {
      case "depart": return "Start" + (road ? " on " + road : "") + (m.bearing_after != null ? " heading " + compass(m.bearing_after) : "");
      case "arrive": return "Arrive at " + (state.to ? state.to.label.split(",")[0] : "your destination");
      case "turn": return (mod === "straight" ? "Go straight" : "Turn " + mod) + onto;
      case "new name": return "Continue" + onto;
      case "continue": return (mod && mod !== "straight" ? "Keep " + mod : "Continue") + onto;
      case "merge": return "Merge" + (mod ? " " + mod : "") + onto;
      case "on ramp": case "off ramp": case "fork": return "Keep " + (mod || "straight") + onto;
      case "end of road": return "At the end of the road, turn " + mod + onto;
      case "roundabout": case "rotary": case "roundabout turn": return "At the roundabout, take exit " + (m.exit || 1) + onto;
      case "exit roundabout": case "exit rotary": return "Leave the roundabout" + onto;
      default: return (mod ? "Go " + mod : "Continue") + onto;
    }
  }
  function compass(b) { return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(((b % 360) + 360) % 360 / 45) % 8]; }
  function googleUrl() {
    var tm = { car: "driving", bike: "two-wheeler", foot: "walking" }[state.mode];
    return "https://www.google.com/maps/dir/?api=1&origin=" + state.from.lat + "," + state.from.lng + "&destination=" + state.to.lat + "," + state.to.lng + "&travelmode=" + (tm === "two-wheeler" ? "driving" : tm);
  }
  function computeRoute() {
    clearRoute();
    var msg = $("#np-route-msg");
    if (!state.from || !state.to) { msg.hidden = false; msg.textContent = state.from ? "Now choose where you want to go (B)." : state.to ? "Now choose where you start (A), or use your location." : "Choose where you start and where you want to go, or tap any place on the map and pick From here / To here."; return; }
    if (!styleReady) return;
    ensureRouteLayers();
    var seq = ++routeSeq;
    var a = state.from, b = state.to;
    var prof = PROFILES[state.mode];
    msg.hidden = false; msg.textContent = "Finding the way…";
    var url = ROUTER + prof[0] + "/route/v1/" + prof[1] + "/" + a.lng.toFixed(6) + "," + a.lat.toFixed(6) + ";" + b.lng.toFixed(6) + "," + b.lat.toFixed(6) + "?overview=full&geometries=geojson&steps=true&alternatives=false";
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("router " + r.status)); })
      .then(function (j) {
        clearTimeout(timer);
        if (seq !== routeSeq) return;
        if (!j.routes || !j.routes.length) throw new Error(j.code || "no route");
        showRoute(j.routes[0], false);
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (seq !== routeSeq) return;
        console.warn("route", e);
        // Straight line so the reader still sees direction and distance.
        var d = km(a.lat, a.lng, b.lat, b.lng);
        showRoute({ distance: d * 1000, duration: null, geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] }, legs: [] }, true);
      });
  }
  function showRoute(route, straight) {
    routeData = route;
    dimPlaces(true);
    var coords = route.geometry.coordinates;
    map.getSource("np-route").setData({ type: "Feature", properties: { straight: straight }, geometry: route.geometry });
    var bb = coords.reduce(function (acc, c) { return [Math.min(acc[0], c[0]), Math.min(acc[1], c[1]), Math.max(acc[2], c[0]), Math.max(acc[3], c[1])]; }, [180, 90, -180, -90]);
    var wide = window.matchMedia("(max-width: 760px)").matches ? { top: 40, bottom: 160, left: 30, right: 30 } : 50;
    map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: wide, maxZoom: 15 });
    var dist = route.distance / 1000;
    var modeWord = { car: "by car or bus", bike: "by motorbike or bicycle", foot: "on foot" }[state.mode];
    $("#np-route-msg").hidden = !straight;
    $("#np-route-msg").textContent = straight ? "We could not get road directions right now (or there is no road or trail between these points in OpenStreetMap). The dashed line shows the direction and the distance as the crow flies." : "";
    var sum = $("#np-route-sum");
    sum.hidden = false;
    sum.innerHTML = '<div class="np-sum"><b>' + fmtKm(dist) + "</b>" + (straight ? " in a straight line" : "") +
      (route.duration ? ' · about <b>' + fmtTime(route.duration * (state.mode === "car" ? 1.25 : 1)) + "</b> " + esc(modeWord) : "") + "</div>" +
      '<div class="np-route-ends"><span class="np-dot a">A</span> ' + esc(state.from.label) + '<br><span class="np-dot b">B</span> ' + esc(state.to.label) + "</div>" +
      (route.duration && state.mode === "car" ? '<p class="np-note">Hill roads are slow and conditions change with the season; the time includes a margin but check locally before you travel.</p>' : "") +
      (route.duration && state.mode === "foot" ? '<p class="np-note">Walking time on flat ground. On trekking trails, add time for climbs: roughly 1 hour per 300–400 m of ascent.</p>' : "") +
      '<div class="np-actions"><a class="np-btn" target="_blank" rel="noopener" href="' + esc(googleUrl()) + '">Navigate in Google Maps</a>' +
      '<button class="np-btn" type="button" id="np-route-share">Copy route link</button>' +
      '<button class="np-btn" type="button" id="np-route-clear">Clear</button></div>';
    var steps = (route.legs[0] && route.legs[0].steps) || [];
    $("#np-steps-wrap").hidden = !steps.length;
    $("#np-steps").innerHTML = steps.map(function (st) {
      return "<li>" + esc(stepText(st)) + (st.distance > 30 && st.maneuver.type !== "arrive" ? ' <span class="np-n">' + fmtKm(st.distance / 1000) + "</span>" : "") + "</li>";
    }).join("");
    Promise.all(ALONG.map(ensure)).then(function () { alongTheWay(coords, straight); }).catch(showError);
    closePanelOnMobile();
    writeUrl();
  }
  /** Places within ~1.5 km of the route, in the order you pass them. */
  function alongTheWay(coords, straight) {
    var BUF = 1.5;
    // Resample the line every ~0.5 km and bucket the samples in a 0.02° grid.
    var samples = [], grid = {}, run = 0;
    var put = function (lat, lng, at) { var k = Math.floor(lat / 0.02) + ":" + Math.floor(lng / 0.02); (grid[k] = grid[k] || []).push(samples.length); samples.push([lat, lng, at]); };
    put(coords[0][1], coords[0][0], 0);
    for (var i = 1; i < coords.length; i++) {
      var a = coords[i - 1], b = coords[i];
      var seg = km(a[1], a[0], b[1], b[0]);
      var n = Math.max(1, Math.ceil(seg / 0.5));
      for (var s2 = 1; s2 <= n; s2++) { var t = s2 / n; put(a[1] + (b[1] - a[1]) * t, a[0] + (b[0] - a[0]) * t, run + seg * t); }
      run += seg;
    }
    var found = [];
    ALONG.forEach(function (id) {
      var L = layers[id];
      if (!L || !L.loaded) return;
      for (var r = 0; r < L.rows.length; r++) {
        var row = L.rows[r];
        if (id === "village" && !/city|town|village/.test(row[R.sub] || "")) continue;
        var cy = Math.floor(row[R.lat] / 0.02), cx = Math.floor(row[R.lng] / 0.02), best = null;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var list = grid[(cy + dy) + ":" + (cx + dx)];
          if (!list) continue;
          for (var q = 0; q < list.length; q++) {
            var smp = samples[list[q]];
            var d = km(smp[0], smp[1], row[R.lat], row[R.lng]);
            if (d <= BUF && (!best || d < best.off)) best = { off: d, at: smp[2] };
          }
        }
        if (best) found.push({ id: id, i: r, off: best.off, at: best.at, wiki: !!row[R.wiki] });
      }
    });
    // Spread the list along the whole route: split it into ~30 stretches and keep the best few of each
    // (a Wikipedia article or Nepali name first, then the closest to the road), plus one town per stretch.
    found.sort(function (x, y) { return x.at - y.at; });
    var bins = Math.max(1, Math.min(30, Math.ceil(run / 2)));
    var size = (run || 1) / bins, buckets = [];
    found.forEach(function (f) { var k = Math.min(bins - 1, Math.floor(f.at / size)); (buckets[k] = buckets[k] || []).push(f); });
    var rank = function (f) { var row = layers[f.id].rows[f.i]; return (f.wiki ? 0 : 2) + (row[R.ne] ? 0 : 1) + f.off; };
    var shown = [];
    buckets.forEach(function (list) {
      if (!list) return;
      var lm = list.filter(function (f) { return f.id !== "village"; }).sort(function (x, y) { return rank(x) - rank(y); }).slice(0, 3);
      var tw = list.filter(function (f) { return f.id === "village"; }).sort(function (x, y) { return rank(x) - rank(y); }).slice(0, 1);
      shown = shown.concat(lm, tw);
    });
    shown.sort(function (x, y) { return x.at - y.at; });
    map.getSource("np-along").setData({ type: "FeatureCollection", features: shown.map(function (f) {
      var row = layers[f.id].rows[f.i];
      return { type: "Feature", geometry: { type: "Point", coordinates: [row[R.lng], row[R.lat]] }, properties: { cat: f.id, i: f.i, color: CAT[f.id].color } };
    }) });
    var counts = {};
    found.forEach(function (f) { counts[f.id] = (counts[f.id] || 0) + 1; });
    $("#np-along-wrap").hidden = !found.length;
    $("#np-along-head").textContent = found.length
      ? Object.keys(counts).map(function (id) { return counts[id].toLocaleString("en-IN") + " " + (CAT[id].label || id).toLowerCase(); }).join(" · ") + " within " + BUF + " km of the " + (straight ? "line" : "route") + (shown.length < found.length ? ". Showing " + shown.length + " spread along the way." : ".")
      : "";
    $("#np-along").innerHTML = shown.map(function (f) {
      var row = layers[f.id].rows[f.i];
      var where = placeLine(row);
      return '<li><button type="button" data-go="' + f.id + ":" + f.i + '"><i style="background:' + CAT[f.id].color + '"></i><span><b>' + esc(row[R.n] || row[R.ne]) + "</b>" + (row[R.n] && row[R.ne] ? ' <span lang="ne">' + esc(row[R.ne]) + "</span>" : "") +
        "<small>" + (f.at < 0.5 ? "near A" : f.at > run - 0.5 ? "near B" : fmtKm(f.at) + " from A") + " · " + (f.off < 0.15 ? "on the way" : fmtKm(f.off) + " off the way") + " · " + esc(kindText(f.id, row)) + (where ? " · " + esc(where.text) : "") + "</small></span></button></li>";
    }).join("");
  }
  function startPicking(which) {
    picking = which;
    map.getCanvas().style.cursor = "crosshair";
    $("#np-route-msg").hidden = false;
    $("#np-route-msg").textContent = "Tap the map to set " + (which === "from" ? "A (start)" : "B (destination)") + ".";
    closePanelOnMobile();
  }

  // ---------- boot ----------
  function boot() {
    var ll = readUrl();
    var el = $("#np-map");
    if (!el || !window.maplibregl) { showError(new Error("map library missing")); return; }
    var opts = { container: el, style: STYLE, maxBounds: [[76, 24], [92, 33]], attributionControl: false };
    if (ll) { opts.center = [ll[1], ll[0]]; opts.zoom = ll[2]; } else { opts.bounds = NEPAL; opts.fitBoundsOptions = { padding: 20 }; }
    map = new maplibregl.Map(opts);
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Places © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://openfreemap.org">OpenFreeMap</a>' }));
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    var geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true });
    map.addControl(geo, "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    geo.on("geolocate", function (e) { state.me = [e.coords.latitude, e.coords.longitude]; renderList(); });
    $("#np-near").addEventListener("click", function () { geo.trigger(); });

    var styled = new Promise(function (res) { map.on("load", function () { styleReady = true; res(); }); });
    var adminP = getJson("admin.json").then(function (a) {
      admin = a;
      a.districtById = {};
      a.districts.forEach(function (d) { a.districtById[d.id] = d; });
      var sel = $("#np-district");
      sel.innerHTML = '<option value="">All of Nepal</option>' + a.provinces.map(function (p) {
        return '<optgroup label="' + esc(p.name) + '">' + a.districts.filter(function (d) { return d.province === p.id; }).map(function (d) { return '<option value="' + d.slug + '">' + esc(d.name) + " · " + esc(d.ne) + "</option>"; }).join("") + "</optgroup>";
      }).join("");
      sel.value = state.district;
    });
    Promise.all([styled, adminP]).then(function () {
      if (state.district) setDistrict(state.district);
      return refresh();
    }).then(function () {
      if (state.query) { $("#np-q").value = state.query; onSearch(); }
      ensureRouteLayers();
      setTab(state.tab);
      if (state.from) setPoint("from", state.from, true);
      if (state.to) setPoint("to", state.to, true);
      document.querySelectorAll(".np-modes [data-mode]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-mode") === state.mode); });
      if (state.from && state.to) computeRoute();
    }).catch(showError);
    map.on("moveend", function () { renderList(); writeUrl(); });

    $("#np-cats").addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      var id = b.getAttribute("data-cat");
      if (state.on.has(id)) state.on.delete(id); else state.on.add(id);
      refresh();
    });
    $("#np-religion").addEventListener("change", function () {
      state.religion = new Set(Array.from(document.querySelectorAll("#np-religion input:checked")).map(function (x) { return x.value; }));
      if (layers.worship && layers.worship.loaded) map.getSource("s-worship").setData(geojson("worship"));
      renderChips(); renderList(); writeUrl();
    });
    document.querySelectorAll("#np-religion input").forEach(function (x) { x.checked = state.religion.has(x.value); });
    var ele = $("#np-ele");
    ele.value = String(state.minEle);
    $("#np-ele-out").textContent = state.minEle ? "≥ " + Number(state.minEle).toLocaleString("en-IN") + " m" : "any height";
    ele.addEventListener("input", function () {
      state.minEle = Number(ele.value);
      $("#np-ele-out").textContent = state.minEle ? "≥ " + state.minEle.toLocaleString("en-IN") + " m" : "any height";
      if (layers.peak && layers.peak.loaded) map.getSource("s-peak").setData(geojson("peak"));
      renderChips(); renderList(); writeUrl();
    });
    $("#np-district").addEventListener("change", function (e) { setDistrict(e.target.value); });
    $("#np-q").addEventListener("input", onSearch);
    $("#np-q").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { var r = $("#np-results")._res; if (r && r[0]) pick(r[0]); }
      if (e.key === "Escape") $("#np-results").hidden = true;
    });
    $("#np-results").addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var b = e.target.closest("[data-res]");
      if (b) pick($("#np-results")._res[Number(b.getAttribute("data-res"))]);
    });
    $("#np-list").addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      if (!b) return;
      var parts = b.getAttribute("data-go").split(":");
      go(parts[0], Number(parts[1]));
    });
    document.querySelector(".np-tabs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]");
      if (b) { setTab(b.getAttribute("data-tab")); writeUrl(); }
    });
    ["from", "to"].forEach(function (which) {
      var input = $(which === "from" ? "#np-from" : "#np-to");
      var box = $(which === "from" ? "#np-from-sugg" : "#np-to-sugg");
      input.addEventListener("input", function () { suggest(which); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && box._res && box._res[0]) { e.preventDefault(); chooseSuggestion(which, 0); }
        if (e.key === "Escape") box.hidden = true;
      });
      box.addEventListener("click", function (e) { var b = e.target.closest("[data-k]"); if (b) chooseSuggestion(which, Number(b.getAttribute("data-k"))); });
    });
    $("#np-route").addEventListener("click", function (e) {
      var pk = e.target.closest("[data-pick]");
      if (pk) startPicking(pk.getAttribute("data-pick"));
      var md = e.target.closest("[data-mode]");
      if (md) {
        state.mode = md.getAttribute("data-mode");
        document.querySelectorAll(".np-modes [data-mode]").forEach(function (b) { b.classList.toggle("on", b === md); });
        computeRoute();
      }
      if (e.target.id === "np-route-clear") { setPoint("from", null, true); setPoint("to", null, true); clearRoute(); computeRoute(); }
      if (e.target.id === "np-route-share") {
        var btn = e.target;
        writeUrl();
        setTimeout(function () {
          var link = location.href;
          (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { btn.textContent = "Copied"; }, function () { prompt("Copy this link", link); });
        }, 450);
      }
      var g = e.target.closest("[data-go]");
      if (g) { var parts = g.getAttribute("data-go").split(":"); go(parts[0], Number(parts[1])); }
    });
    $("#np-swap").addEventListener("click", function () { var f = state.from; setPoint("from", state.to, true); setPoint("to", f, true); computeRoute(); });
    $("#np-me-from").addEventListener("click", function () {
      if (!navigator.geolocation) { $("#np-route-msg").textContent = "Your browser cannot share your location."; return; }
      $("#np-route-msg").hidden = false; $("#np-route-msg").textContent = "Finding your location…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        state.me = [pos.coords.latitude, pos.coords.longitude];
        setPoint("from", { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "My location" });
      }, function () { $("#np-route-msg").textContent = "Location permission was not given. Type a place for A instead, or pick it on the map with 📌."; }, { enableHighAccuracy: true, timeout: 15000 });
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-route]");
      if (!b) return;
      var ll = b.getAttribute("data-ll").split(",").map(Number);
      if (popup) popup.remove();
      setPoint(b.getAttribute("data-route"), { lat: ll[0], lng: ll[1], label: b.getAttribute("data-name") || ll.join(", ") });
    });
    map.on("click", function (e) {
      if (!picking) return;
      var which = picking;
      picking = null;
      map.getCanvas().style.cursor = "";
      setPoint(which, { lat: e.lngLat.lat, lng: e.lngLat.lng, label: "Pinned point " + e.lngLat.lat.toFixed(4) + ", " + e.lngLat.lng.toFixed(4) });
    });
    $("#np-toggle").addEventListener("click", function () { document.body.classList.toggle("np-panel-open"); });
    $("#np-reset").addEventListener("click", function () {
      state.district = ""; state.religion.clear(); state.minEle = 0; $("#np-q").value = "";
      document.querySelectorAll("#np-religion input").forEach(function (x) { x.checked = false; });
      ele.value = "0"; $("#np-ele-out").textContent = "any height";
      setDistrict("");
    });
  }
  window.__nepalmap = { state: state, layers: layers, search: function (q) { return search(q); }, setPoint: function (w, p) { setPoint(w, p); }, get route() { return routeData; }, get map() { return map; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
