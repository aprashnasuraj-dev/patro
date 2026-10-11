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
    var ll = (q.get("ll") || "").split(",").map(Number);
    return ll.length === 3 && ll.every(isFinite) ? ll : null;
  }
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
      '<button class="np-btn" type="button" data-share="' + lat + "," + lng + '">Copy link</button></div></div>';
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
    $("#np-toggle").addEventListener("click", function () { document.body.classList.toggle("np-panel-open"); });
    $("#np-reset").addEventListener("click", function () {
      state.district = ""; state.religion.clear(); state.minEle = 0; $("#np-q").value = "";
      document.querySelectorAll("#np-religion input").forEach(function (x) { x.checked = false; });
      ele.value = "0"; $("#np-ele-out").textContent = "any height";
      setDistrict("");
    });
  }
  window.__nepalmap = { state: state, layers: layers, search: function (q) { return search(q); }, get map() { return map; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
