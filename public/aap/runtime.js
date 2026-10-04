/* Aafnai Patro site runtime — applies admin console settings in the browser.
 * Loaded on every page by the Worker (see worker/admin-console/site-config.ts).
 * Renames text, shows the announcement banner, keeps disabled sections out of
 * in-app navigation, and sends an anonymous page-view beacon (no cookies). */
(function () {
  "use strict";
  var el = document.getElementById("aap-config");
  if (!el || window.__aapRuntime) return;
  window.__aapRuntime = true;
  var cfg;
  try { cfg = JSON.parse(el.textContent || "{}"); } catch (e) { return; }

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, CODE: 1, PRE: 1, SVG: 1, TEMPLATE: 1 };
  var ATTRS = ["title", "aria-label", "placeholder", "alt"];
  var FORM = { INPUT: 1, TEXTAREA: 1, SELECT: 1 }; // never touch their values, but rename their attributes
  var exact = {}, contains = [], lastSet = new WeakMap();

  function compile(labels) {
    exact = {}; contains = [];
    (labels || []).forEach(function (r) {
      if (!r || !r.from) return;
      if (r.match === "contains") contains.push([r.from, r.to]);
      else exact[r.from] = r.to;
    });
    contains.sort(function (a, b) { return b[0].length - a[0].length; });
  }
  function hasRules() { return contains.length > 0 || Object.keys(exact).length > 0; }

  function transform(text) {
    if (!text) return text;
    var trimmed = text.trim();
    if (trimmed && Object.prototype.hasOwnProperty.call(exact, trimmed)) {
      var lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
      return lead + exact[trimmed] + trail;
    }
    var out = text;
    for (var i = 0; i < contains.length; i++) {
      if (out.indexOf(contains[i][0]) !== -1) out = out.split(contains[i][0]).join(contains[i][1]);
    }
    return out;
  }

  function skipped(node) {
    for (var n = node; n && n !== document.body; n = n.parentNode) {
      if (n.nodeType === 1) {
        if (SKIP[n.nodeName.toUpperCase()] || n.isContentEditable || n.id === "aap-banner" || (n.hasAttribute && n.hasAttribute("data-aap-keep"))) return true;
      }
    }
    return false;
  }

  function applyText(node) {
    var v = node.nodeValue;
    if (!v || !v.trim() || lastSet.get(node) === v) return;
    var next = transform(v);
    if (next !== v) { lastSet.set(node, next); node.nodeValue = next; }
  }
  function applyAttrs(elm) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = elm.getAttribute(ATTRS[i]);
      if (!a) continue;
      var key = "aap:" + ATTRS[i];
      if (elm[key] === a) continue;
      var next = transform(a);
      if (next !== a) { elm[key] = next; elm.setAttribute(ATTRS[i], next); }
    }
  }
  function isForm(n) { return n.nodeType === 1 && FORM[n.nodeName.toUpperCase()]; }
  function attrTarget(n) { // attributes of form controls are renamable; their contents are not
    if (isForm(n)) return !skipped(n.parentNode);
    return !skipped(n);
  }
  function walk(root) {
    if (!hasRules() || !root) return;
    if (root.nodeType === 3) { if (!skipped(root)) applyText(root); return; }
    if (root.nodeType === 1 && isForm(root)) { if (attrTarget(root)) applyAttrs(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    applyAttrs(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (isForm(n)) { applyAttrs(n); return NodeFilter.FILTER_REJECT; }
          return SKIP[n.nodeName.toUpperCase()] || n.id === "aap-banner" || n.isContentEditable ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) applyText(n); else applyAttrs(n);
    }
  }
  var lastTitle = null;
  function applyTitle() {
    if (!hasRules()) return;
    var t = document.title;
    if (t === lastTitle) return; // our own write — don't rename it again
    var next = transform(t);
    lastTitle = next;
    if (next !== t) document.title = next;
  }

  var pending = [], scheduled = false;
  function flush() {
    scheduled = false;
    var batch = pending; pending = [];
    for (var i = 0; i < batch.length; i++) if (batch[i].isConnected) walk(batch[i]);
    applyTitle();
  }
  function queue(node) {
    pending.push(node);
    if (!scheduled) { scheduled = true; (window.requestAnimationFrame || setTimeout)(flush); }
  }

  // ---- banner ----
  function storageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function renderBanner(b) {
    var old = document.getElementById("aap-banner");
    if (old) old.remove();
    if (!b || !b.text) return;
    if (b.dismissible && storageGet("aap-banner-" + b.id) === "1") return;
    var bar = document.createElement("div");
    bar.id = "aap-banner";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    bar.setAttribute("data-tone", b.tone || "info");
    var span = document.createElement("span");
    span.textContent = b.text;
    bar.appendChild(span);
    if (b.linkUrl && b.linkText) {
      var a = document.createElement("a");
      a.href = b.linkUrl;
      a.textContent = b.linkText;
      if (/^https:/i.test(b.linkUrl) && b.linkUrl.indexOf(location.origin) !== 0) { a.target = "_blank"; a.rel = "noopener"; }
      bar.appendChild(a);
    }
    if (b.dismissible) {
      var x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Dismiss announcement");
      x.textContent = "×";
      x.onclick = function () { storageSet("aap-banner-" + b.id, "1"); bar.remove(); };
      bar.appendChild(x);
    }
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ---- disabled sections (client-side navigation) ----
  function disabledTarget(path) {
    if (cfg.preview) return null;
    var list = cfg.disabled || [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i].path;
      if (path === p || path.indexOf(p + "/") === 0) return list[i].to || "/";
    }
    return null;
  }
  function guardRoute() {
    var to = disabledTarget(location.pathname.replace(/\/+$/, "") || "/");
    if (to && to !== location.pathname) location.replace(to);
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a || a.origin !== location.origin) return;
    var to = disabledTarget(a.pathname.replace(/\/+$/, "") || "/");
    if (to) { ev.preventDefault(); ev.stopPropagation(); location.assign(to); }
  }, true);

  // ---- analytics ----
  var lastPath = null;
  function beacon(kind) {
    if (!cfg.analytics) return;
    var body = JSON.stringify({ t: kind, p: location.pathname, r: kind === "pv" && lastPath === null ? document.referrer : "" });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/aap/hit", new Blob([body], { type: "application/json" }))) return;
    } catch (e) { /* fall through */ }
    try { fetch("/api/aap/hit", { method: "POST", body: body, keepalive: true, headers: { "content-type": "application/json" } }); } catch (e) { /* ignore */ }
  }
  function onRoute() {
    var p = location.pathname;
    if (p === lastPath) return;
    guardRoute();
    beacon("pv");
    lastPath = p;
    queue(document.body);
  }
  ["pushState", "replaceState"].forEach(function (m) {
    var orig = history[m];
    history[m] = function () { var r = orig.apply(this, arguments); setTimeout(onRoute, 0); return r; };
  });
  window.addEventListener("popstate", onRoute);
  setInterval(function () { if (document.visibilityState === "visible") beacon("hb"); }, 60000);

  // ---- boot ----
  function apply(next) {
    cfg = next;
    compile(cfg.labels);
    renderBanner(cfg.banner);
    walk(document.body);
    applyTitle();
  }
  function start() {
    apply(cfg);
    onRoute();
    new MutationObserver(function (records) {
      if (!hasRules()) return;
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === "characterData") queue(r.target);
        else if (r.type === "attributes") { if (attrTarget(r.target)) applyAttrs(r.target); }
        else for (var j = 0; j < r.addedNodes.length; j++) queue(r.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    var titleEl = document.querySelector("title");
    if (titleEl) new MutationObserver(applyTitle).observe(titleEl, { childList: true, characterData: true, subtree: true });

    // If this HTML came from the browser cache, make sure settings are current.
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      if (cfg.preview || (nav && nav.transferSize === 0)) {
        fetch("/api/aap/site-config", { credentials: "same-origin", cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (fresh) { if (fresh && fresh.v !== cfg.v) apply(fresh); })
          .catch(function () {});
      }
    } catch (e) { /* ignore */ }
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
