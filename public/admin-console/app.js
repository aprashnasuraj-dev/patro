/* Aafnai Patro admin console — single-file app, no dependencies.
 * Talks only to /api/aap/* (same origin, cookie session + CSRF header). */
(function () {
  "use strict";

  // ======================================================================
  // Core helpers
  // ======================================================================
  var root = document.getElementById("app");
  var S = {
    csrf: null, admin: null, route: "dashboard", sub: "", cleanup: [],
    cfg: null, draft: null, saveTimer: null, saving: false, previewOpen: false, pending: 0,
  };

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "value") el.value = v;
        else if (k === "checked") el.checked = !!v;
        else if (k === "text") el.textContent = v;
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { add(el, k); }); return; }
    el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function svg(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs || {}) el.setAttribute(k, attrs[k]);
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }

  var ICONS = {
    dashboard: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
    traffic: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    live: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M5 5a10 10 0 0 0 0 14M19 19a10 10 0 0 0 0-14",
    site: "M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.6-9-7.6zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01M16.5 12h.01",
    agent: "M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z",
    users: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 3.6a3.5 3.5 0 0 1 0 6.8",
    security: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4",
    activity: "M4 6h16M4 12h16M4 18h10",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
    menu: "M4 7h16M4 12h16M4 17h16",
    external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
    close: "M6 6l12 12M18 6L6 18",
    refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  };
  function icon(name) {
    return svg("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
      svg("path", { d: ICONS[name] || "" }));
  }

  var NF = new Intl.NumberFormat("en-IN");
  function num(n) { return NF.format(Number(n) || 0); }
  function npTime(ts, opts) {
    if (!ts) return "—";
    var d = typeof ts === "number" ? new Date(ts) : new Date(String(ts).replace(" ", "T") + (String(ts).indexOf("Z") < 0 && String(ts).indexOf("+") < 0 ? "Z" : ""));
    return d.toLocaleString("en-GB", Object.assign({ timeZone: "Asia/Kathmandu", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, opts || {}));
  }
  function ago(ts) {
    if (!ts) return "never";
    var t = typeof ts === "number" ? ts : Date.parse(String(ts).replace(" ", "T") + (String(ts).indexOf("Z") < 0 ? "Z" : ""));
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 86400 * 30) return Math.floor(s / 86400) + " d ago";
    return npTime(t, { year: "numeric", hour: undefined, minute: undefined });
  }
  function delta(cur, prev) {
    if (!prev) return cur ? h("span", { class: "delta up" }, "new") : null;
    var pct = Math.round(((cur - prev) / prev) * 100);
    return h("span", { class: "delta " + (pct >= 0 ? "up" : "down") }, (pct >= 0 ? "+" : "") + pct + "% vs previous");
  }
  var NE_DIGITS = "०१२३४५६७८९";
  function neNum(n) { return String(n).replace(/\d/g, function (d) { return NE_DIGITS[d]; }); }
  var BS_MONTHS = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
  var COUNTRY = (function () { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { return null; } })();
  function countryName(code) { if (!code || code === "??") return "Unknown"; try { return COUNTRY ? COUNTRY.of(code) : code; } catch (e) { return code; } }

  function ApiError(message, status, data) { this.message = message; this.status = status; this.data = data; }
  ApiError.prototype = Object.create(Error.prototype);

  var MESSAGES = {
    invalid_credentials: "Username or password is incorrect.",
    totp_invalid: "That code didn't match. Try the next one from your authenticator app.",
    csrf_failed: "Your session token expired. Reload the page.",
    forbidden: "Your role can't do this.",
    owner_only: "Only an owner can do this.",
    d1_unavailable: "The database isn't connected to this Worker.",
  };
  function api(method, path, body) {
    var headers = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (S.csrf && method !== "GET") headers["x-aap-csrf"] = S.csrf;
    return fetch(path, { method: method, headers: headers, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.status === 401 && data.error === "auth_required") { S.admin = null; renderLogin(); throw new ApiError("Signed out", 401, data); }
          if (res.status === 403 && data.error === "password_change_required") { S.admin.mustChangePassword = true; renderPasswordChange(); throw new ApiError("Change your password first", 403, data); }
          if (!res.ok || data.ok === false) {
            var msg = data.message || MESSAGES[data.error] || (data.error === "locked" ? "Too many attempts. Try again in " + Math.ceil((data.retryInSeconds || 900) / 60) + " minutes." : "Request failed (" + res.status + ")");
            throw new ApiError(msg, res.status, data);
          }
          return data;
        });
      });
  }

  var toastBox = null;
  function toast(msg, kind) {
    if (!toastBox) { toastBox = h("div", { class: "toasts", role: "status" }); document.body.appendChild(toastBox); }
    var t = h("div", { class: "toast" + (kind === "error" ? " error" : "") }, msg);
    toastBox.appendChild(t);
    setTimeout(function () { t.remove(); }, kind === "error" ? 6000 : 3200);
  }
  function fail(e) { if (e && e.status !== 401) toast(e.message || String(e), "error"); }

  function dialog(build) {
    return new Promise(function (resolve) {
      var d = h("dialog");
      function done(v) { d.close(); d.remove(); resolve(v); }
      d.addEventListener("cancel", function (ev) { ev.preventDefault(); done(null); });
      build(d, done);
      document.body.appendChild(d);
      d.showModal();
      var f = d.querySelector("input,textarea,button.primary,button.danger");
      if (f) f.focus();
    });
  }
  function confirmBox(title, body, confirmText, danger) {
    return dialog(function (d, done) {
      add(d, [h("h2", null, title), h("p", { class: "muted" }, body),
        h("div", { class: "row" },
          h("button", { class: "btn", onclick: function () { done(false); } }, "Cancel"),
          h("button", { class: "btn " + (danger ? "danger solid" : "primary"), onclick: function () { done(true); } }, confirmText))]);
    });
  }
  function promptBox(title, label, value, confirmText, multiline) {
    return dialog(function (d, done) {
      var input = multiline ? h("textarea", { class: "input", rows: "3" }) : h("input", { class: "input", type: "text" });
      input.value = value || "";
      var form = h("form", { onsubmit: function (ev) { ev.preventDefault(); done(input.value); } },
        h("h2", null, title), h("label", { class: "field" }, h("span", null, label), input),
        h("div", { class: "row" }, h("button", { type: "button", class: "btn", onclick: function () { done(null); } }, "Cancel"), h("button", { class: "btn primary" }, confirmText)));
      add(d, form);
    });
  }
  function busy(btn, promise) {
    var label = btn.textContent;
    btn.disabled = true;
    return promise.finally(function () { btn.disabled = false; btn.textContent = label; });
  }
  function roleAtLeast(r) { var rank = { viewer: 1, editor: 2, owner: 3 }; return S.admin && rank[S.admin.role] >= rank[r]; }

  // ======================================================================
  // Auth screens
  // ======================================================================
  function loginArt() {
    var days = [];
    for (var i = 1; i <= 35; i++) days.push(h("span", { class: i % 7 === 0 ? "red" : "" }, i <= 32 ? neNum(i) : ""));
    return h("div", { class: "login-art" },
      h("div", null, h("div", { class: "brand", style: { padding: 0 } }, h("span", { class: "brand-mark" }, "आ"), h("span", null, h("b", null, "Aafnai Patro"), h("small", null, "aafnaipatro.com")))),
      h("div", null, h("div", { class: "ne" }, "आफ्नै पात्रो", h("br"), "सञ्चालन कक्ष"), h("p", null, "Run the site from one place — traffic, live visitors, every label and colour, and an AI agent that drafts changes for you.")),
      h("div", { class: "grid-days", "aria-hidden": "true" }, days));
  }

  function renderLogin(message) {
    stopCleanup();
    var needTotp = false;
    var err = h("div", { class: "form-error", role: "alert", hidden: !message }, message || "");
    var user = h("input", { class: "input", name: "username", autocomplete: "username", required: true, autocapitalize: "none", spellcheck: "false" });
    var pass = h("input", { class: "input", name: "password", type: "password", autocomplete: "current-password", required: true });
    var code = h("input", { class: "input", name: "totp", inputmode: "numeric", autocomplete: "one-time-code", pattern: "[0-9 ]*", maxlength: "7" });
    var codeField = h("label", { class: "field", hidden: true }, h("span", null, "Authenticator code"), code, h("small", null, "6 digits from your authenticator app."));
    var btn = h("button", { class: "btn primary", type: "submit", style: { width: "100%" } }, "Sign in");
    var form = h("form", {
      onsubmit: function (ev) {
        ev.preventDefault();
        err.hidden = true;
        busy(btn, api("POST", "/api/aap/auth/login", { username: user.value, password: pass.value, totp: needTotp ? code.value : undefined })
          .then(function (d) { S.csrf = d.csrf; S.admin = d.admin; start(); })
          .catch(function (e) {
            if (e.data && e.data.totpRequired) {
              needTotp = true; codeField.hidden = false; code.focus();
              if (e.data.error === "totp_required") return;
            }
            err.textContent = e.message; err.hidden = false;
          }));
      }
    }, h("h1", null, "Sign in"), h("p", { class: "lede" }, "Admin access for aafnaipatro.com"),
      h("div", { class: "stack" }, err,
        h("label", { class: "field" }, h("span", null, "Username"), user),
        h("label", { class: "field" }, h("span", null, "Password"), pass),
        codeField, btn));
    clear(root);
    add(root, h("div", { class: "login" }, loginArt(), h("div", { class: "login-form" }, form)));
    user.focus();
  }

  function renderPasswordChange() {
    stopCleanup();
    var err = h("div", { class: "form-error", role: "alert", hidden: true });
    var cur = h("input", { class: "input", type: "password", autocomplete: "current-password", required: true });
    var uname = h("input", { class: "input", value: S.admin.username, autocomplete: "username", required: true, autocapitalize: "none" });
    var p1 = h("input", { class: "input", type: "password", autocomplete: "new-password", required: true, minlength: "10" });
    var p2 = h("input", { class: "input", type: "password", autocomplete: "new-password", required: true });
    var btn = h("button", { class: "btn primary", style: { width: "100%" } }, "Save and continue");
    var form = h("form", {
      onsubmit: function (ev) {
        ev.preventDefault(); err.hidden = true;
        if (p1.value !== p2.value) { err.textContent = "The new passwords don't match."; err.hidden = false; return; }
        busy(btn, api("POST", "/api/aap/auth/password", { currentPassword: cur.value, newPassword: p1.value, newUsername: uname.value })
          .then(function (d) { S.admin.mustChangePassword = false; S.admin.username = d.username; toast("Password saved"); start(); })
          .catch(function (e) { err.textContent = e.message; err.hidden = false; }));
      }
    }, h("h1", null, "Set your own password"),
      h("div", { class: "stack" },
        h("div", { class: "form-note" }, "This account was created from the starter password in the code repository. Choose a private password before continuing — you can also change the username here."),
        err,
        h("label", { class: "field" }, h("span", null, "Current password"), cur),
        h("label", { class: "field" }, h("span", null, "Username"), uname),
        h("label", { class: "field" }, h("span", null, "New password"), p1, h("small", null, "At least 10 characters, mixing letters with numbers or symbols.")),
        h("label", { class: "field" }, h("span", null, "Repeat new password"), p2),
        btn,
        h("button", { type: "button", class: "btn ghost", style: { width: "100%" }, onclick: logout }, "Sign out")));
    clear(root);
    add(root, h("div", { class: "login" }, loginArt(), h("div", { class: "login-form" }, form)));
    cur.focus();
  }

  function logout() {
    api("POST", "/api/aap/auth/logout", {}).catch(function () {}).then(function () {
      if (S.previewOpen) api("POST", "/api/aap/preview", { on: false }).catch(function () {});
      S.admin = null; S.csrf = null; renderLogin();
    });
  }

  // ======================================================================
  // Layout + routing
  // ======================================================================
  var NAV = [
    { group: null, items: [["dashboard", "Dashboard"], ["traffic", "Traffic"], ["live", "Live now"]] },
    { group: "Site", items: [["site", "Edit site"], ["agent", "AI agent"]] },
    { group: "People", items: [["users", "Site users"], ["security", "Admins & security"]] },
    { group: "System", items: [["activity", "Activity log"], ["settings", "Settings"]] },
  ];
  var ICON_FOR = { dashboard: "dashboard", traffic: "traffic", live: "live", site: "site", agent: "agent", users: "users", security: "security", activity: "activity", settings: "settings" };
  var VIEWS = {};
  var layoutEl, mainEl, navEl, publishBarEl;

  function renderLayout() {
    navEl = h("nav", { class: "nav", "aria-label": "Admin sections" });
    NAV.forEach(function (g) {
      if (g.group) add(navEl, h("div", { class: "nav-group" }, g.group));
      g.items.forEach(function (it) {
        add(navEl, h("a", { href: "#/" + it[0], "data-route": it[0], onclick: function () { layoutEl.classList.remove("nav-open"); } },
          icon(ICON_FOR[it[0]]), h("span", null, it[1]), it[0] === "agent" ? h("span", { class: "count", hidden: true }) : null));
      });
    });
    var rail = h("aside", { class: "rail" },
      h("a", { class: "brand", href: "#/dashboard" }, h("span", { class: "brand-mark" }, "आ"), h("span", null, h("b", null, "Aafnai Patro"), h("small", null, "Admin console"))),
      navEl,
      h("div", { class: "rail-foot" },
        h("div", { class: "who" }, S.admin.displayName || S.admin.username),
        h("div", { class: "role" }, S.admin.username + " · " + S.admin.role),
        h("div", { class: "row" },
          h("a", { class: "btn sm ghost", href: "/", target: "_blank", rel: "noopener", style: { color: "#dfe9e3" } }, "View site", icon("external")),
          h("button", { onclick: logout }, "Sign out"))));
    var topbar = h("header", { class: "topbar" },
      h("button", { "aria-label": "Open menu", onclick: function () { layoutEl.classList.toggle("nav-open"); } }, icon("menu")),
      h("b", null, "Aafnai Patro admin"));
    mainEl = h("main", { class: "content", id: "main", tabindex: "-1" });
    publishBarEl = h("div", { class: "publish-bar", hidden: true, role: "region", "aria-label": "Unpublished changes" });
    layoutEl = h("div", { class: "layout" }, rail, h("div", null, topbar, mainEl), publishBarEl);
    layoutEl.addEventListener("click", function (ev) { if (layoutEl.classList.contains("nav-open") && ev.target === layoutEl) layoutEl.classList.remove("nav-open"); });
    clear(root);
    add(root, layoutEl);
  }

  function stopCleanup() { S.cleanup.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); S.cleanup = []; }

  function route() {
    if (!S.admin) return;
    var parts = (location.hash.replace(/^#\/?/, "") || "dashboard").split("/");
    var name = VIEWS[parts[0]] ? parts[0] : "dashboard";
    S.route = name; S.sub = parts[1] || "";
    stopCleanup();
    Array.prototype.forEach.call(navEl.querySelectorAll("a[data-route]"), function (a) {
      if (a.getAttribute("data-route") === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    clear(mainEl);
    add(mainEl, h("p", { class: "muted" }, "Loading…"));
    Promise.resolve(VIEWS[name](mainEl)).catch(function (e) { clear(mainEl); add(mainEl, h("div", { class: "form-error" }, e.message || String(e))); });
    document.title = (name.charAt(0).toUpperCase() + name.slice(1)) + " · Aafnai Patro admin";
    refreshCounts();
  }

  function refreshCounts() {
    api("GET", "/api/aap/ai/proposals").then(function (d) {
      S.pending = (d.proposals || []).length;
      var c = navEl && navEl.querySelector("a[data-route=agent] .count");
      if (c) { c.hidden = !S.pending; c.textContent = S.pending; }
    }).catch(function () {});
    updatePublishBar();
  }

  function pageHead(title, lede, actions) {
    return h("div", { class: "page-head" }, h("div", null, h("h1", null, title), lede ? h("p", { class: "lede" }, lede) : null), actions ? h("div", { class: "row" }, actions) : null);
  }

  // ======================================================================
  // Charts
  // ======================================================================
  function niceMax(v) { if (v <= 5) return 5; var p = Math.pow(10, Math.floor(Math.log10(v))); var n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function bucketLabel(b, bucket) {
    if (bucket === "hour") return b.slice(11, 16);
    var d = new Date(b + "T00:00:00Z");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  }
  function trafficChart(series, bucket) {
    var W = 760, H = 230, L = 40, R = 10, T = 12, B = 26;
    var max = niceMax(Math.max.apply(null, series.map(function (s) { return s.views; }).concat([1])));
    var n = Math.max(1, series.length), bw = (W - L - R) / n;
    var y = function (v) { return T + (H - T - B) * (1 - v / max); };
    var g = svg("svg", { class: "chart", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Page views and visitors over time" });
    for (var i = 0; i <= 4; i++) {
      var val = (max / 4) * i, yy = y(val);
      g.appendChild(svg("line", { class: "grid-line", x1: L, x2: W - R, y1: yy, y2: yy }));
      var t = svg("text", { class: "axis", x: L - 6, y: yy + 4, "text-anchor": "end" }); t.textContent = val >= 1000 ? Math.round(val / 100) / 10 + "k" : Math.round(val); g.appendChild(t);
    }
    var pts = [];
    series.forEach(function (s, idx) {
      var x = L + idx * bw;
      var rect = svg("rect", { class: "bar", x: x + bw * 0.15, width: Math.max(1, bw * 0.7), y: y(s.views), height: Math.max(0, H - B - y(s.views)), rx: Math.min(3, bw * 0.2) });
      var tt = svg("title"); tt.textContent = bucketLabel(s.bucket, bucket) + ": " + num(s.views) + " views, " + num(s.visitors) + " visitors"; rect.appendChild(tt);
      g.appendChild(rect);
      pts.push((x + bw / 2).toFixed(1) + "," + y(s.visitors).toFixed(1));
    });
    if (pts.length > 1) g.appendChild(svg("polyline", { class: "line", points: pts.join(" ") }));
    var every = Math.max(1, Math.ceil(n / 7));
    series.forEach(function (s, idx) {
      if (idx % every !== 0 && idx !== n - 1) return;
      var t = svg("text", { class: "axis", x: L + idx * bw + bw / 2, y: H - 6, "text-anchor": "middle" }); t.textContent = bucketLabel(s.bucket, bucket); g.appendChild(t);
    });
    return h("div", null, g, h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "var(--leaf)" } }), "Page views"), h("span", null, h("i", { style: { background: "var(--marigold-bright)" } }), "Visitors")));
  }
  function meterList(rows, labelKey, valueKey, fmtLabel) {
    if (!rows || !rows.length) return h("p", { class: "empty" }, "No data yet.");
    var max = Math.max.apply(null, rows.map(function (r) { return Number(r[valueKey]) || 0; }).concat([1]));
    return h("ul", { class: "meter-list" }, rows.map(function (r) {
      var label = fmtLabel ? fmtLabel(r[labelKey]) : r[labelKey];
      return h("li", null, h("i", { class: "fill", style: { width: (100 * (Number(r[valueKey]) || 0) / max).toFixed(1) + "%" } }), h("span", { title: label }, label), h("b", null, num(r[valueKey])));
    }));
  }

  // ======================================================================
  // Dashboard
  // ======================================================================
  VIEWS.dashboard = function (el) {
    return Promise.all([api("GET", "/api/aap/dashboard"), fetch("/api/v1/today").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })])
      .then(function (res) {
        var d = res[0], t = res[1];
        clear(el);
        var bs = t && t.bs;
        var dateNe = bs && bs.year ? neNum(bs.day) + " " + (BS_MONTHS[(Number(bs.month) || 1) - 1] || "") + " " + neNum(bs.year) : "आज";
        var tithi = t && t.panchang && (t.panchang.tithi_ne || (t.panchang.tithi && (t.panchang.tithi.name_ne || t.panchang.tithi.ne || t.panchang.tithi.name)) || "");
        var adText = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" });
        var liveNum = h("div", { class: "big" }, num(d.live.activeNow));
        add(el, [
          pageHead("नमस्ते, " + (S.admin.displayName || S.admin.username).split(" ")[0], null,
            [h("a", { class: "btn", href: "#/site" }, "Edit site"), h("a", { class: "btn primary", href: "#/agent" }, "Ask the AI agent")]),
          h("section", { class: "aaja", "aria-label": "Today" },
            h("div", null, h("div", { class: "date-ne", lang: "ne" }, dateNe), h("div", { class: "date-sub" }, adText + (tithi ? " · " + tithi : ""))),
            h("div", null, liveNum, h("div", { class: "cap" }, h("span", { class: "pulse", "aria-hidden": "true" }), "on the site right now")),
            h("div", null, h("div", { class: "big" }, d.live.signedInNow == null ? "—" : num(d.live.signedInNow)), h("div", { class: "cap" }, "signed-in users active"))),
          h("section", { class: "kpis", "aria-label": "Key numbers" },
            h("div", { class: "kpi" }, h("div", { class: "v" }, num(d.today.views)), h("div", { class: "l" }, "Estimated page views today")),
            h("div", { class: "kpi" }, h("div", { class: "v" }, num(d.today.visitors)), h("div", { class: "l" }, "Observed visitors today")),
            h("div", { class: "kpi" }, h("div", { class: "v" }, num(d.week.totals.visitors)), h("div", { class: "l" }, "Observed visitors, last 7 days"), delta(d.week.totals.visitors, d.week.previous.visitors)),
            h("div", { class: "kpi" }, h("div", { class: "v" }, d.users.available ? num(d.users.total) : "—"), h("div", { class: "l" }, "Registered users"), d.users.available && d.users.new7 ? h("span", { class: "delta up" }, "+" + num(d.users.new7) + " this week") : null)),
          h("div", { class: "grid grid-2", style: { gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)" } },
            h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Last 7 days"), h("a", { href: "#/traffic", class: "small" }, "Full traffic report")), trafficChart(d.week.series, "day")),
            h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Site status")), siteStatus(d))),
          h("div", { class: "grid grid-3", style: { marginTop: "1rem" } },
            h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Top pages")), meterList(d.week.paths, "path", "views")),
            h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Countries")), meterList(d.week.countries, "country", "visitors", countryName)),
            h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Recent activity"), h("a", { href: "#/activity", class: "small" }, "All")), activityList(d.recent))),
        ]);
        var timer = setInterval(function () {
          api("GET", "/api/aap/analytics/live").then(function (l) { liveNum.textContent = num(l.activeNow); }).catch(function () {});
        }, 15000);
        S.cleanup.push(function () { clearInterval(timer); });
      });
  };
  function siteStatus(d) {
    var s = d.site;
    return h("div", { class: "stack" },
      h("div", { class: "row" }, h("span", { class: "pill ok" }, "Live version " + s.publishedVersion), s.publishedAt ? h("span", { class: "muted small" }, "published " + ago(s.publishedAt)) : h("span", { class: "muted small" }, "site defaults")),
      s.draftDirty ? h("div", { class: "row" }, h("span", { class: "pill warn" }, "Draft has unpublished changes"), h("a", { href: "#/site", class: "small" }, "Review")) : h("p", { class: "muted small", style: { margin: 0 } }, "No unpublished changes."),
      s.maintenance ? h("div", { class: "row" }, h("span", { class: "pill bad" }, "Maintenance mode is ON"), h("a", { href: "#/site/maintenance", class: "small" }, "Turn off")) : null,
      d.pendingProposals ? h("div", { class: "row" }, h("span", { class: "pill warn" }, d.pendingProposals + " AI proposal" + (d.pendingProposals > 1 ? "s" : "") + " waiting"), h("a", { href: "#/agent", class: "small" }, "Review")) : null,
      d.users.available ? h("p", { class: "muted small", style: { margin: 0 } }, num(d.users.active24h) + " users active today · " + num(d.users.pushSubscriptions) + " push subscriptions · " + num(d.users.families) + " families") : null);
  }
  var ACTION_TEXT = {
    login: "signed in", login_failed: "failed sign-in", login_recovery: "signed in with recovery password", password_changed: "changed password",
    publish: "published the site", save_draft: "edited the draft", discard_draft: "discarded the draft", restore_to_draft: "restored a version to draft",
    ai_chat: "asked the AI agent", ai_proposal_applied: "applied an AI proposal", ai_key_saved: "saved an AI key", ai_key_removed: "removed an AI key",
    ai_settings: "changed AI settings", totp_enabled: "turned on 2-step sign-in", totp_disabled: "turned off 2-step sign-in", admin_created: "added an admin",
    admin_updated: "updated an admin", admin_deleted: "removed an admin", user_deleted: "deleted a site user", user_sessions_revoked: "signed a user out",
    settings_updated: "changed settings", import: "imported a configuration", bootstrap: "created the owner account", session_revoked: "ended a session",
  };
  function activityList(rows) {
    if (!rows || !rows.length) return h("p", { class: "empty" }, "Nothing yet.");
    return h("ul", { class: "meter-list" }, rows.map(function (r) {
      return h("li", null, h("span", null, h("b", { style: { fontWeight: 600 } }, r.admin || "system"), " " + (ACTION_TEXT[r.action] || r.action)), h("span", { class: "muted small" }, ago(r.ts)));
    }));
  }

  // ======================================================================
  // Traffic
  // ======================================================================
  VIEWS.traffic = function (el) {
    var range = S.sub || "7d";
    return api("GET", "/api/aap/analytics?range=" + range).then(function (d) {
      clear(el);
      var seg = h("div", { class: "seg", role: "group", "aria-label": "Period" }, ["24h", "7d", "30d", "90d"].map(function (r) {
        return h("button", { "aria-pressed": String(r === d.range), onclick: function () { location.hash = "#/traffic/" + r; } }, r === "24h" ? "24 hours" : r.replace("d", " days"));
      }));
      var edge = h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Cloudflare edge"), h("p", null, "All requests at the edge, including bots and API calls."))), h("p", { class: "muted" }, "Loading…"));
      add(el, [
        pageHead("Traffic · weighted estimates / observed visitors", "Counted from real browsers with an anonymous daily visitor ID — no cookies. Times are Nepal time.", seg),
        h("section", { class: "kpis" },
          h("div", { class: "kpi" }, h("div", { class: "v" }, num(d.totals.views)), h("div", { class: "l" }, "Page views"), delta(d.totals.views, d.previous.views)),
          h("div", { class: "kpi" }, h("div", { class: "v" }, num(d.totals.visitors)), h("div", { class: "l" }, "Visitors"), delta(d.totals.visitors, d.previous.visitors)),
          h("div", { class: "kpi" }, h("div", { class: "v" }, d.totals.visitors ? (d.totals.views / d.totals.visitors).toFixed(1) : "0"), h("div", { class: "l" }, "Pages per visitor")),
          h("div", { class: "kpi" }, h("div", { class: "v" }, (d.devices.find(function (x) { return x.device === "mobile"; }) || { visitors: 0 }).visitors && d.totals.visitors ? Math.round(100 * d.devices.find(function (x) { return x.device === "mobile"; }).visitors / d.devices.reduce(function (a, b) { return a + b.visitors; }, 0)) + "%" : "—"), h("div", { class: "l" }, "On mobile"))),
        h("section", { class: "panel" }, trafficChart(d.series, d.bucket)),
        h("div", { class: "grid grid-2", style: { marginTop: "1rem" } },
          h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Pages")), pagesTable(d.paths)),
          h("div", { class: "stack" },
            h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Where visitors come from")), meterList(d.referrers, "referrer", "views")),
            h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Countries")), meterList(d.countries, "country", "visitors", countryName)))),
        h("div", { class: "grid grid-2", style: { marginTop: "1rem" } },
          h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Devices")), meterList(d.devices, "device", "visitors", function (x) { return x ? x.charAt(0).toUpperCase() + x.slice(1) : "Unknown"; })),
          h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Browsers")), meterList(d.browsers, "browser", "visitors"))),
        h("div", { style: { marginTop: "1rem" } }, edge),
      ]);
      api("GET", "/api/aap/analytics/cloudflare?days=" + (d.range === "24h" ? 2 : Math.min(30, parseInt(d.range, 10) || 7))).then(function (c) {
        var body = edge.querySelector("p.muted");
        if (!c.configured) { body.textContent = ""; add(body, ["Add a Cloudflare API token and zone ID in ", h("a", { href: "#/settings" }, "Settings"), " to see edge totals here."]); return; }
        if (c.error) { body.textContent = "Cloudflare: " + c.error; return; }
        body.remove();
        var tot = c.days.reduce(function (a, r) { a.requests += r.requests; a.pageViews += r.pageViews; a.threats += r.threats; a.bytes += r.bytes; a.cached += r.cached; return a; }, { requests: 0, pageViews: 0, threats: 0, bytes: 0, cached: 0 });
        add(edge, h("div", { class: "table-wrap" }, h("table", { class: "t" },
          h("thead", null, h("tr", null, h("th", null, "Date"), h("th", { class: "num" }, "Requests"), h("th", { class: "num" }, "Page views"), h("th", { class: "num" }, "Unique IPs"), h("th", { class: "num" }, "Cached"), h("th", { class: "num" }, "Threats"))),
          h("tbody", null, c.days.slice().reverse().map(function (r) {
            return h("tr", null, h("td", null, r.date), h("td", { class: "num" }, num(r.requests)), h("td", { class: "num" }, num(r.pageViews)), h("td", { class: "num" }, num(r.uniques)), h("td", { class: "num" }, r.requests ? Math.round(100 * r.cached / r.requests) + "%" : "—"), h("td", { class: "num" }, num(r.threats)));
          })),
          h("tfoot", null, h("tr", null, h("td", null, h("b", null, "Total")), h("td", { class: "num" }, h("b", null, num(tot.requests))), h("td", { class: "num" }, h("b", null, num(tot.pageViews))), h("td"), h("td", { class: "num" }, tot.requests ? Math.round(100 * tot.cached / tot.requests) + "%" : "—"), h("td", { class: "num" }, num(tot.threats)))))));
      }).catch(function (e) { var p = edge.querySelector("p.muted"); if (p) p.textContent = e.message; });
    });
  };
  function pagesTable(rows) {
    if (!rows.length) return h("p", { class: "empty" }, "No page views recorded yet. They appear within a minute of the first visit after deploy.");
    return h("div", { class: "table-wrap" }, h("table", { class: "t" },
      h("thead", null, h("tr", null, h("th", null, "Page"), h("th", { class: "num" }, "Views"), h("th", { class: "num" }, "Visitors"))),
      h("tbody", null, rows.map(function (r) {
        return h("tr", null, h("td", null, h("a", { href: r.path, target: "_blank", rel: "noopener" }, r.path)), h("td", { class: "num" }, num(r.views)), h("td", { class: "num" }, num(r.visitors)));
      }))));
  }

  // ======================================================================
  // Live
  // ======================================================================
  VIEWS.live = function (el) {
    clear(el);
    var big = h("div", { class: "big" }, "…"), signed = h("div", { class: "big" }, "…"), updated = h("span", { class: "muted small" });
    var pages = h("div"), countries = h("div"), devices = h("div"), stream = h("div");
    add(el, [
      pageHead("Live now", "Visitors seen in the last 5 minutes. Refreshes every 10 seconds.", updated),
      h("section", { class: "aaja", style: { gridTemplateColumns: "1fr 1fr" } },
        h("div", null, big, h("div", { class: "cap" }, h("span", { class: "pulse" }), "visitors right now")),
        h("div", null, signed, h("div", { class: "cap" }, "signed-in users (15 min)"))),
      h("div", { class: "grid grid-3" },
        h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Pages being read")), pages),
        h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Countries")), countries),
        h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Devices")), devices)),
      h("section", { class: "panel", style: { marginTop: "1rem" } }, h("div", { class: "panel-head" }, h("h2", null, "Latest page views")), stream),
    ]);
    function load() {
      return api("GET", "/api/aap/analytics/live").then(function (d) {
        big.textContent = num(d.activeNow);
        signed.textContent = d.signedInNow == null ? "—" : num(d.signedInNow);
        updated.textContent = "Updated " + new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kathmandu" });
        clear(pages); add(pages, meterList(d.paths, "path", "visitors"));
        clear(countries); add(countries, meterList(d.countries, "country", "visitors", countryName));
        clear(devices); add(devices, meterList(d.devices, "device", "visitors"));
        clear(stream);
        add(stream, d.recent.length ? h("div", { class: "table-wrap" }, h("table", { class: "t" },
          h("thead", null, h("tr", null, h("th", null, "Time"), h("th", null, "Page"), h("th", null, "Country"), h("th", null, "Device"))),
          h("tbody", null, d.recent.map(function (r) {
            return h("tr", null, h("td", null, npTime(r.ts, { day: undefined, month: undefined, second: "2-digit" })), h("td", null, r.path), h("td", null, countryName(r.country)), h("td", null, r.device));
          })))) : h("p", { class: "empty" }, "Waiting for the first visitor."));
      });
    }
    var timer = setInterval(function () { if (document.visibilityState === "visible") load().catch(function () {}); }, 10000);
    S.cleanup.push(function () { clearInterval(timer); });
    return load();
  };

  // Part 2 (site editor, AI agent, users, security, activity, settings) follows.
  window.__AAP = { S: S, h: h, add: add, clear: clear, icon: icon, api: api, toast: toast, fail: fail, confirmBox: confirmBox, promptBox: promptBox, dialog: dialog,
    busy: busy, num: num, ago: ago, npTime: npTime, pageHead: pageHead, VIEWS: VIEWS, roleAtLeast: roleAtLeast, meterList: meterList, ACTION_TEXT: ACTION_TEXT,
    countryName: countryName, route: route, refreshCounts: refreshCounts };
  function updatePublishBar() { if (window.__AAP.updatePublishBar) window.__AAP.updatePublishBar(publishBarEl); }

  // ======================================================================
  // Boot
  // ======================================================================
  function start() {
    if (S.admin.mustChangePassword) return renderPasswordChange();
    renderLayout();
    window.removeEventListener("hashchange", route);
    window.addEventListener("hashchange", route);
    route();
  }
  window.__AAP.boot = function () {
    api("GET", "/api/aap/auth/me")
      .then(function (d) { S.csrf = d.csrf; S.admin = d.admin; start(); })
      .catch(function (e) { if (e.status !== 401) renderLogin(e.message); });
  };
})();

/* ===================== Part 2 ===================== */
(function () {
  "use strict";
  var A = window.__AAP, S = A.S, h = A.h, add = A.add, clear = A.clear, api = A.api, toast = A.toast, fail = A.fail;
  var num = A.num, ago = A.ago, npTime = A.npTime, pageHead = A.pageHead, VIEWS = A.VIEWS, roleAtLeast = A.roleAtLeast, busy = A.busy;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sw(label, checked, onchange, disabled) {
    var input = h("input", { type: "checkbox", role: "switch", checked: checked, disabled: disabled, onchange: function () { onchange(input.checked); } });
    return h("label", { class: "switch" }, input, h("span", null, label));
  }
  function field(label, control, hint) { return h("label", { class: "field" }, h("span", null, label), control, hint ? h("small", null, hint) : null); }

  // ======================================================================
  // Draft state, autosave, publish bar, preview
  // ======================================================================
  var editSeq = 0, saveStatus = null;
  function loadCfg() {
    return api("GET", "/api/aap/config").then(function (d) { S.cfg = d; S.draft = clone(d.draft); return d; });
  }
  function setStatus(text) { if (saveStatus) saveStatus.textContent = text; }
  function changed(section) {
    if (!roleAtLeast("editor")) { setStatus("Read-only — your role can't edit."); return; }
    editSeq++;
    var mine = editSeq;
    setStatus("Unsaved changes…");
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(function () {
      setStatus("Saving draft…");
      api("PUT", "/api/aap/config", { config: S.draft, section: section })
        .then(function (d) {
          S.cfg = d;
          if (mine === editSeq) S.draft = clone(d.draft);
          setStatus("Draft saved " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
          A.updatePublishBar();
          reloadPreview();
        })
        .catch(function (e) { setStatus("Couldn't save: " + e.message); fail(e); });
    }, 650);
  }

  var publishBarEl = null;
  A.updatePublishBar = function (el) {
    if (el) publishBarEl = el;
    if (!publishBarEl) return;
    var render = function (cfg) {
      clear(publishBarEl);
      if (!cfg || !cfg.draftDirty || !roleAtLeast("editor")) { publishBarEl.hidden = true; return; }
      publishBarEl.hidden = false;
      add(publishBarEl, [
        h("strong", null, "Draft has unpublished changes"),
        h("span", { class: "muted small" }, "Visitors still see version " + cfg.publishedVersion + "."),
        h("span", { class: "spacer" }),
        h("button", { class: "btn sm", onclick: function () { openPreview("/"); } }, "Preview"),
        h("button", { class: "btn sm ghost", onclick: discard }, "Discard draft"),
        h("button", { class: "btn sm primary", onclick: publish }, "Publish"),
      ]);
    };
    if (S.cfg) render(S.cfg);
    else api("GET", "/api/aap/config").then(function (d) { S.cfg = d; render(d); }).catch(function () {});
  };
  function afterCfg(d) { S.cfg = d; S.draft = clone(d.draft); A.updatePublishBar(); if (S.route === "site") A.route(); }
  function publish() {
    A.promptBox("Publish changes", "What changed? (helps you find this version later)", "", "Publish now").then(function (note) {
      if (note === null) return;
      api("POST", "/api/aap/config/publish", { note: note }).then(function (d) { toast("Published version " + d.version + " — live within about 20 seconds"); afterCfg(d); }).catch(fail);
    });
  }
  function discard() {
    A.confirmBox("Discard the draft?", "The draft goes back to what's live now. This can't be undone.", "Discard draft", true).then(function (ok) {
      if (ok) api("POST", "/api/aap/config/discard", {}).then(function (d) { toast("Draft discarded"); afterCfg(d); }).catch(fail);
    });
  }

  var previewEl = null, previewFrame = null, previewTimer = null;
  function openPreview(path) {
    api("POST", "/api/aap/preview", { on: true }).then(function () {
      S.previewOpen = true;
      if (previewEl) { previewFrame.src = path + (path.indexOf("?") < 0 ? "?" : "&") + "aap=" + Date.now(); return; }
      var pathInput = h("input", { class: "input", value: path, "aria-label": "Page to preview", style: { minHeight: "34px" } });
      previewFrame = h("iframe", { title: "Draft preview", src: path + "?aap=" + Date.now() });
      previewEl = h("div", { class: "preview-frame-wrap", role: "dialog", "aria-label": "Draft preview" },
        h("header", null,
          h("form", { class: "row", style: { flex: 1, flexWrap: "nowrap" }, onsubmit: function (ev) { ev.preventDefault(); var p = pathInput.value.trim() || "/"; if (p[0] !== "/") p = "/" + p; previewFrame.src = p + "?aap=" + Date.now(); } }, pathInput),
          h("button", { class: "btn sm ghost", title: "Reload", "aria-label": "Reload preview", onclick: reloadPreview }, A.icon("refresh")),
          h("a", { class: "btn sm ghost", href: path, target: "_blank", rel: "noopener", title: "Open in new tab" }, A.icon("external")),
          h("button", { class: "btn sm", onclick: closePreview }, "Close")),
        previewFrame);
      document.body.appendChild(previewEl);
    }).catch(fail);
  }
  function reloadPreview() {
    if (!previewFrame) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () { try { previewFrame.contentWindow.location.reload(); } catch (e) { previewFrame.src = previewFrame.src; } }, 300);
  }
  function closePreview() {
    if (previewEl) previewEl.remove();
    previewEl = previewFrame = null; S.previewOpen = false;
    api("POST", "/api/aap/preview", { on: false }).catch(function () {});
  }
  window.addEventListener("pagehide", function () { if (S.previewOpen) fetch("/api/aap/preview", { method: "POST", keepalive: true, credentials: "same-origin", headers: { "content-type": "application/json", "x-aap-csrf": S.csrf || "" }, body: '{"on":false}' }); });

  // ======================================================================
  // Site editor
  // ======================================================================
  var SITE_TABS = [["labels", "Rename text"], ["theme", "Colours & style"], ["features", "Sections"], ["banner", "Banner"], ["redirects", "Redirects"], ["maintenance", "Maintenance"], ["advanced", "Advanced"], ["history", "History"]];
  VIEWS.site = function (el) {
    var tab = SITE_TABS.some(function (t) { return t[0] === S.sub; }) ? S.sub : "labels";
    return loadCfg().then(function () {
      clear(el);
      saveStatus = h("span", { class: "muted small", role: "status" }, roleAtLeast("editor") ? "Changes save to the draft automatically." : "Read-only");
      add(el, pageHead("Edit site", "Changes go to a private draft. Preview them, then publish when ready — no rebuild or git needed.",
        [saveStatus, h("button", { class: "btn", onclick: function () { openPreview("/"); } }, "Preview draft")]));
      var tabs = h("div", { class: "tabs", role: "tablist" }, SITE_TABS.map(function (t) {
        return h("button", { role: "tab", "aria-selected": String(t[0] === tab), onclick: function () { location.hash = "#/site/" + t[0]; } }, t[1]);
      }));
      var body = h("div", { role: "tabpanel" });
      add(el, [tabs, body]);
      return SITE[tab](body);
    });
  };
  var SITE = {};

  // ---- Rename text ----
  SITE.labels = function (el) {
    var list = h("datalist", { id: "aap-label-suggest" }, S.cfg.catalog.reduce(function (acc, f) { acc.push(h("option", { value: f.ne }), h("option", { value: f.name })); return acc; }, []));
    var from = h("input", { class: "input", list: "aap-label-suggest", placeholder: "राशिफल", required: true });
    var to = h("input", { class: "input", placeholder: "दैनिक राशिफल" });
    var match = h("select", { class: "input" }, h("option", { value: "exact" }, "Whole text"), h("option", { value: "contains" }, "Everywhere it appears"));
    var tbody = h("tbody");
    function draw() {
      clear(tbody);
      if (!S.draft.labels.length) { add(tbody, h("tr", null, h("td", { colspan: "4", class: "empty" }, "No renames yet. Add one above — e.g. change “राशिफल” to “दैनिक राशिफल” in every menu."))); return; }
      S.draft.labels.forEach(function (r, i) {
        var toIn = h("input", { class: "input", value: r.to, "aria-label": "New text for " + r.from, oninput: function () { r.to = toIn.value; changed("labels"); } });
        var m = h("select", { class: "input", "aria-label": "Match", onchange: function () { r.match = m.value; changed("labels"); } }, h("option", { value: "exact" }, "Whole text"), h("option", { value: "contains" }, "Everywhere"));
        m.value = r.match;
        add(tbody, h("tr", null, h("td", null, h("b", null, r.from)), h("td", null, toIn), h("td", null, m),
          h("td", { class: "num" }, h("button", { class: "btn sm danger", onclick: function () { S.draft.labels.splice(i, 1); changed("labels"); draw(); } }, "Remove"))));
      });
    }
    draw();
    add(el, [
      list,
      h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Rename anything visitors see"), h("p", null, "Type the text exactly as it shows on the site — menu items, headings, buttons, Nepali or English. Renames apply on every page, including the app's own navigation."))),
        h("form", { class: "grid", style: { gridTemplateColumns: "1fr 1fr auto auto", alignItems: "end" }, onsubmit: function (ev) {
          ev.preventDefault();
          var f = from.value.trim();
          if (!f) return;
          S.draft.labels = S.draft.labels.filter(function (x) { return x.from !== f; });
          S.draft.labels.push({ from: f, to: to.value, match: match.value });
          from.value = ""; to.value = ""; changed("labels"); draw(); from.focus();
        } }, field("Current text", from), field("New text", to), field("Match", match), h("button", { class: "btn primary" }, "Add rename"))),
      h("section", { class: "panel" }, h("div", { class: "table-wrap" }, h("table", { class: "t" },
        h("thead", null, h("tr", null, h("th", null, "Current text"), h("th", null, "Shows as"), h("th", null, "Match"), h("th"))), tbody))),
    ]);
  };

  // ---- Colours & style ----
  var COLOR_FIELDS = [
    ["accent", "Main colour", "Buttons, links, today's date"], ["accentStrong", "Main colour, darker", "Hover states and headings"],
    ["accentSoft", "Soft tint", "Highlighted panels"], ["background", "Page background", ""], ["surface", "Cards and panels", ""],
    ["text", "Main text", ""], ["muted", "Secondary text", ""], ["line", "Borders", ""],
    ["holiday", "Holidays", "Saturdays and public holidays"], ["festival", "Festivals", ""],
  ];
  var DEFAULTS = {
    light: { accent: "#176f3b", accentStrong: "#0f5a2e", accentSoft: "#eef6f1", background: "#f7f7f5", surface: "#ffffff", text: "#111827", muted: "#4b5563", line: "#e5e7eb", holiday: "#c0392b", festival: "#b7791f" },
    dark: { accent: "#34a765", accentStrong: "#47bc78", accentSoft: "#14251c", background: "#161d1a", surface: "#0f1412", text: "#f3f4f6", muted: "#c4c9d0", line: "#26302c", holiday: "#f2776b", festival: "#e3b45a" },
  };
  function lum(hex) {
    var m = hex.replace("#", ""); if (m.length === 3) m = m.split("").map(function (c) { return c + c; }).join("");
    var rgb = [0, 2, 4].map(function (i) { var v = parseInt(m.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var themeMode = "light";
  SITE.theme = function (el) {
    var t = S.draft.theme;
    var rows = h("div"), sample = h("div"), warn = h("div");
    function val(k) { return t[themeMode][k] || DEFAULTS[themeMode][k]; }
    function drawSample() {
      clear(sample); clear(warn);
      var bg = val("background"), sf = val("surface"), tx = val("text"), mu = val("muted"), ac = val("accent"), r = t.radius == null ? 12 : t.radius;
      add(sample, h("div", { class: "preview-card", style: { background: bg, color: tx, borderColor: val("line"), fontFamily: t.font ? '"' + t.font + '", Mukta, sans-serif' : "Mukta, sans-serif" } },
        h("div", { style: { background: sf, border: "1px solid " + val("line"), borderRadius: r + "px", padding: "12px" } },
          h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, h("b", { lang: "ne" }, "कात्तिक २०८३"), h("span", { style: { background: ac, color: "#fff", padding: "2px 10px", borderRadius: r + "px", fontSize: ".85rem" } }, "आज")),
          h("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px", textAlign: "center", fontSize: ".9rem" } },
            ["आ", "सो", "मं", "बु", "बि", "शु", "श"].map(function (d, i) { return h("span", { style: { color: i === 6 ? val("holiday") : mu } }, d); }),
            [1, 2, 3, 4, 5, 6, 7].map(function (n) {
              var isToday = n === 4, sat = n === 7, fest = n === 2;
              return h("span", { style: { padding: "6px 0", borderRadius: Math.max(2, r * 0.6) + "px", background: isToday ? ac : fest ? val("accentSoft") : "transparent", color: isToday ? "#fff" : sat ? val("holiday") : fest ? val("festival") : tx, fontWeight: isToday ? 700 : 400 } }, "०१२३४५६७८९"[n]);
            })),
          h("p", { style: { color: mu, margin: "10px 0 0", fontSize: ".88rem" } }, "तिथि: पञ्चमी · Secondary text sample"))));
      var issues = [];
      var c1 = contrast(tx, bg), c2 = contrast(tx, sf), c3 = contrast("#ffffff", ac);
      if (c1 < 4.5) issues.push("Main text on page background is hard to read (" + c1.toFixed(1) + ":1, aim for 4.5).");
      if (c2 < 4.5) issues.push("Main text on cards is hard to read (" + c2.toFixed(1) + ":1).");
      if (c3 < 3) issues.push("White text on the main colour is hard to read (" + c3.toFixed(1) + ":1).");
      if (issues.length) add(warn, h("div", { class: "form-note" }, issues.join(" ")));
    }
    function drawRows() {
      clear(rows);
      COLOR_FIELDS.forEach(function (f) {
        var k = f[0], set = !!t[themeMode][k];
        var picker = h("input", { type: "color", value: val(k), "aria-label": f[1] + " colour" });
        var text = h("input", { class: "input", type: "text", value: set ? t[themeMode][k] : "", placeholder: DEFAULTS[themeMode][k], "aria-label": f[1] + " hex" });
        var reset = h("button", { class: "btn sm ghost", disabled: !set, onclick: function () { delete t[themeMode][k]; changed("theme"); drawRows(); drawSample(); } }, "Reset");
        picker.addEventListener("input", function () { t[themeMode][k] = picker.value; text.value = picker.value; reset.disabled = false; changed("theme"); drawSample(); });
        text.addEventListener("change", function () {
          var v = text.value.trim();
          if (!v) { delete t[themeMode][k]; } else if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) { t[themeMode][k] = v.toLowerCase(); picker.value = v.length === 4 ? "#" + v.slice(1).split("").map(function (c) { return c + c; }).join("") : v; } else { toast("Use a hex colour like #176f3b", "error"); return; }
          changed("theme"); drawSample(); reset.disabled = !t[themeMode][k];
        });
        add(rows, h("div", { class: "swatch-row" }, h("label", null, f[1], f[2] ? h("small", null, f[2]) : null), h("div", { class: "color-ctl" }, picker, text, reset)));
      });
    }
    var modeSeg = h("div", { class: "seg", role: "group", "aria-label": "Colour mode" }, ["light", "dark"].map(function (m) {
      return h("button", { "aria-pressed": String(m === themeMode), onclick: function () { themeMode = m; Array.prototype.forEach.call(modeSeg.children, function (b) { b.setAttribute("aria-pressed", String(b.textContent.toLowerCase().indexOf(m) === 0)); }); drawRows(); drawSample(); } }, m === "light" ? "Light mode" : "Dark mode");
    }));
    var radiusVal = h("span", { class: "muted small" }, t.radius == null ? "Site default" : t.radius + " px");
    var radius = h("input", { type: "range", min: "0", max: "28", value: t.radius == null ? 12 : t.radius, disabled: t.radius == null, style: { width: "100%" }, "aria-label": "Corner radius" });
    radius.addEventListener("input", function () { t.radius = Number(radius.value); radiusVal.textContent = t.radius + " px"; changed("theme"); drawSample(); });
    var font = h("select", { class: "input", onchange: function () { t.font = font.value; changed("theme"); drawSample(); } },
      Object.keys(S.cfg.fonts).map(function (k) { return h("option", { value: k }, S.cfg.fonts[k]); }));
    font.value = t.font || "";
    drawRows(); drawSample();
    add(el, h("div", { class: "grid grid-2" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Colours"), modeSeg), rows),
      h("div", { class: "stack" },
        h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "Sample")), sample, warn),
        h("section", { class: "panel stack" }, h("h2", null, "Style"),
          h("div", { class: "field" }, h("span", null, "Corner roundness"),
            h("div", { class: "row" }, h("label", { class: "check" }, h("input", { type: "checkbox", checked: t.radius == null, onchange: function (ev) { t.radius = ev.target.checked ? null : Number(radius.value); radius.disabled = ev.target.checked; radiusVal.textContent = t.radius == null ? "Site default" : t.radius + " px"; changed("theme"); drawSample(); } }), "Site default"), h("span", { class: "spacer" }), radiusVal),
            radius),
          field("Body font", font, "Fonts load from Google Fonts. All choices support Nepali.")))));
  };

  // ---- Sections ----
  SITE.features = function (el) {
    var tbody = h("tbody");
    function ruleFor(path) { return S.draft.features.find(function (f) { return f.path === path; }); }
    function setRule(path, state, redirectTo) {
      S.draft.features = S.draft.features.filter(function (f) { return f.path !== path; });
      if (state !== "on") S.draft.features.push({ path: path, enabled: state !== "off", hideInNav: true, redirectTo: redirectTo || "/" });
      changed("features");
    }
    function draw() {
      clear(tbody);
      var known = S.cfg.catalog.map(function (f) { return f.path; });
      var rows = S.cfg.catalog.concat(S.draft.features.filter(function (f) { return known.indexOf(f.path) < 0; }).map(function (f) { return { path: f.path, name: f.path, ne: "", custom: true }; }));
      rows.forEach(function (f) {
        var rule = ruleFor(f.path);
        var state = !rule ? "on" : !rule.enabled ? "off" : "hidden";
        var redirect = h("input", { class: "input", value: rule && rule.redirectTo || "/", "aria-label": "Send visitors to", hidden: state !== "off", style: { maxWidth: "160px" }, onchange: function () { setRule(f.path, "off", redirect.value); } });
        var sel = h("select", { class: "input", "aria-label": "State of " + f.name, onchange: function () { redirect.hidden = sel.value !== "off"; setRule(f.path, sel.value, redirect.value); if (f.custom && sel.value === "on") draw(); } },
          h("option", { value: "on" }, "Visible"), h("option", { value: "hidden" }, "Hidden from menus"), h("option", { value: "off" }, "Turned off"));
        sel.value = state;
        add(tbody, h("tr", { class: "feature-row" },
          h("td", null, h("b", { lang: "ne" }, f.ne || f.name), h("small", null, f.ne ? f.name + " · " : "", h("a", { href: f.path, target: "_blank", rel: "noopener" }, f.path))),
          h("td", null, sel), h("td", null, redirect)));
      });
    }
    draw();
    var newPath = h("input", { class: "input", placeholder: "/tools/something" });
    add(el, [
      h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Show, hide or turn off sections"), h("p", null, "“Hidden from menus” keeps the page reachable by link. “Turned off” sends visitors elsewhere. You still see turned-off pages while signed in."))),
        h("div", { class: "table-wrap" }, h("table", { class: "t" }, h("thead", null, h("tr", null, h("th", null, "Section"), h("th", null, "State"), h("th", null, "Send visitors to"))), tbody))),
      h("section", { class: "panel" }, h("form", { class: "row", onsubmit: function (ev) {
        ev.preventDefault(); var p = newPath.value.trim(); if (!p) return; if (p[0] !== "/") p = "/" + p;
        if (!ruleFor(p)) S.draft.features.push({ path: p, enabled: true, hideInNav: true, redirectTo: "/" });
        newPath.value = ""; changed("features"); draw();
      } }, h("label", { class: "field", style: { flex: 1 } }, h("span", null, "Another page path"), newPath), h("button", { class: "btn", style: { alignSelf: "flex-end" } }, "Add page"))),
    ]);
  };

  // ---- Banner ----
  SITE.banner = function (el) {
    var b = S.draft.banner;
    var strip = h("div");
    function drawStrip() {
      clear(strip);
      var bg = b.tone === "festive" ? "linear-gradient(90deg,#b7791f,#c0392b)" : b.tone === "alert" ? "#7f1d1d" : "#0f5a2e";
      add(strip, b.text ? h("div", { style: { background: bg, color: "#fff", padding: ".55rem 1rem", borderRadius: "8px", textAlign: "center" } }, b.text, b.linkText ? h("u", { style: { marginLeft: ".6rem", fontWeight: 600 } }, b.linkText) : null, b.dismissible ? h("span", { style: { float: "right", opacity: 0.8 } }, "×") : null)
        : h("p", { class: "muted" }, "Write a message to see it here."));
    }
    function newId() { b.id = "b" + Date.now().toString(36); }
    var text = h("textarea", { class: "input", rows: "2", value: b.text, placeholder: "विजया दशमी २०८३ को हार्दिक मंगलमय शुभकामना!", oninput: function () { b.text = text.value; newId(); changed("banner"); drawStrip(); } });
    var lt = h("input", { class: "input", value: b.linkText, placeholder: "See holidays", oninput: function () { b.linkText = lt.value; changed("banner"); drawStrip(); } });
    var lu = h("input", { class: "input", value: b.linkUrl, placeholder: "/festivals/dashain", oninput: function () { b.linkUrl = lu.value; changed("banner"); } });
    var tone = h("div", { class: "seg", role: "group", "aria-label": "Style" }, [["info", "Green"], ["festive", "Festive"], ["alert", "Alert"]].map(function (x) {
      return h("button", { "aria-pressed": String(b.tone === x[0]), onclick: function () { b.tone = x[0]; Array.prototype.forEach.call(tone.children, function (btn, i) { btn.setAttribute("aria-pressed", String(["info", "festive", "alert"][i] === b.tone)); }); changed("banner"); drawStrip(); } }, x[1]);
    }));
    drawStrip();
    add(el, h("section", { class: "panel stack" },
      h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Announcement banner"), h("p", null, "Shown at the top of every page. Visitors who close it won't see the same message again; editing the text shows it to everyone anew."))),
      sw("Show the banner", b.enabled, function (v) { b.enabled = v; changed("banner"); }),
      field("Message", text),
      h("div", { class: "grid grid-2" }, field("Link text (optional)", lt), field("Link address", lu, "A page path like /rashifal or a full https:// link.")),
      h("div", { class: "row" }, h("span", { style: { fontWeight: 600 } }, "Style"), tone, h("span", { class: "spacer" }), sw("Visitors can close it", b.dismissible, function (v) { b.dismissible = v; changed("banner"); drawStrip(); })),
      h("div", null, h("h3", { style: { marginBottom: ".5rem" } }, "Preview"), strip)));
  };

  // ---- Redirects ----
  SITE.redirects = function (el) {
    var tbody = h("tbody");
    function draw() {
      clear(tbody);
      if (!S.draft.redirects.length) { add(tbody, h("tr", null, h("td", { colspan: "4", class: "empty" }, "No redirects."))); return; }
      S.draft.redirects.forEach(function (r, i) {
        add(tbody, h("tr", null, h("td", null, r.from), h("td", null, r.to), h("td", null, r.status === 301 ? "Permanent" : "Temporary"),
          h("td", { class: "num" }, h("button", { class: "btn sm danger", onclick: function () { S.draft.redirects.splice(i, 1); changed("redirects"); draw(); } }, "Remove"))));
      });
    }
    draw();
    var from = h("input", { class: "input", placeholder: "/old-page", required: true }), to = h("input", { class: "input", placeholder: "/new-page or https://…", required: true });
    var status = h("select", { class: "input" }, h("option", { value: "301" }, "Permanent (301)"), h("option", { value: "302" }, "Temporary (302)"));
    add(el, [
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Redirects"), h("p", null, "Send an old or short address to another page. Useful for campaign links like /dashain."))),
        h("form", { class: "grid", style: { gridTemplateColumns: "1fr 1fr auto auto", alignItems: "end" }, onsubmit: function (ev) {
          ev.preventDefault();
          var f = from.value.trim(); if (f[0] !== "/") f = "/" + f;
          S.draft.redirects = S.draft.redirects.filter(function (r) { return r.from !== f; });
          S.draft.redirects.push({ from: f, to: to.value.trim(), status: Number(status.value) });
          from.value = to.value = ""; changed("redirects"); draw();
        } }, field("From", from), field("To", to), field("Type", status), h("button", { class: "btn primary" }, "Add redirect"))),
      h("section", { class: "panel" }, h("div", { class: "table-wrap" }, h("table", { class: "t" }, h("thead", null, h("tr", null, h("th", null, "From"), h("th", null, "To"), h("th", null, "Type"), h("th"))), tbody))),
    ]);
  };

  // ---- Maintenance ----
  SITE.maintenance = function (el) {
    var m = S.draft.maintenance;
    var title = h("input", { class: "input", value: m.title, oninput: function () { m.title = title.value; changed("maintenance"); } });
    var msg = h("textarea", { class: "input", rows: "3", value: m.message, oninput: function () { m.message = msg.value; changed("maintenance"); } });
    var allow = h("textarea", { class: "input code", rows: "3", value: (m.allowPaths || []).join("\n"), placeholder: "/rashifal", oninput: function () { m.allowPaths = allow.value.split(/\s+/).filter(Boolean); changed("maintenance"); } });
    var toggle = h("input", { type: "checkbox", role: "switch", checked: m.enabled, onchange: function () {
      if (toggle.checked) {
        A.confirmBox("Turn on maintenance mode?", "After you publish, visitors see the maintenance page instead of the site. You still see the site while signed in.", "Turn on", true)
          .then(function (ok) { if (ok) { m.enabled = true; changed("maintenance"); } else toggle.checked = false; });
      } else { m.enabled = false; changed("maintenance"); }
    } });
    add(el, h("section", { class: "panel stack" },
      h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Maintenance mode"), h("p", null, "Use while making big changes. Takes effect when you publish."))),
      h("label", { class: "switch" }, toggle, h("span", null, "Show the maintenance page to visitors")),
      field("Heading", title), field("Message", msg),
      field("Pages that stay open (one per line)", allow, "Optional. These paths and everything under them keep working.")));
  };

  // ---- Advanced ----
  SITE.advanced = function (el) {
    var css = h("textarea", { class: "input code", rows: "12", value: S.draft.customCss, spellcheck: "false", placeholder: ".site-footer { display: none; }", oninput: function () { S.draft.customCss = css.value; changed("advanced"); } });
    var head = h("textarea", { class: "input code", rows: "6", value: S.draft.customHead, spellcheck: "false", placeholder: '<meta name="facebook-domain-verification" content="…">', oninput: function () { S.draft.customHead = head.value; changed("advanced"); } });
    var fileIn = h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: function () {
      var f = fileIn.files[0]; if (!f) return;
      f.text().then(function (t) { return api("POST", "/api/aap/config/import", { config: JSON.parse(t) }); })
        .then(function (d) { toast("Imported into the draft"); afterCfg(d); }).catch(function (e) { toast("Import failed: " + e.message, "error"); });
    } });
    add(el, [
      h("section", { class: "panel stack" }, h("h2", null, "Visitor counting"),
        sw("Count visitors (anonymous, no cookies)", S.draft.analytics.enabled, function (v) { S.draft.analytics.enabled = v; changed("advanced"); }),
        h("label", {}, "Pageview sample (0.01–1)", h("input", {type:"number",min:0.01,max:1,step:0.01,value:S.draft.analytics.sample||0.1,onchange:function(e){S.draft.analytics.sample=Math.min(1,Math.max(0.01,Number(e.target.value)||0.1));changed("advanced");}})),
        h("label", {}, "Cloudflare Web Analytics token", h("input", {value:S.draft.analytics.webAnalyticsToken||"",maxlength:32,onchange:function(e){S.draft.analytics.webAnalyticsToken=e.target.value;changed("advanced");}})),
        h("p", { class: "muted small", style: { margin: 0 } }, "Turning this off stops new traffic and live numbers after you publish.")),
      h("section", { class: "panel stack" }, h("h2", null, "Custom CSS"),
        h("p", { class: "muted small", style: { margin: 0 } }, "Added after the site's own styles. The site's colour variables work here: --brand-600, --surface, --surface-2, --ink-900, --radius, --holiday."), css),
      h("section", { class: "panel stack" }, h("h2", null, "Extra code in <head>"),
        h("div", { class: "form-note" }, "For verification tags and similar. Scripts from other domains are blocked by the site's security policy unless that policy is updated in code."), head),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Backup"), h("p", null, "Download the draft as a file, or load one back into the draft."))),
        h("div", { class: "row" },
          h("button", { class: "btn", onclick: function () {
            var blob = new Blob([JSON.stringify(S.draft, null, 2)], { type: "application/json" });
            var a = h("a", { href: URL.createObjectURL(blob), download: "aafnaipatro-site-config-" + new Date().toISOString().slice(0, 10) + ".json" });
            document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
          } }, "Download draft"),
          h("button", { class: "btn", disabled: !roleAtLeast("editor"), onclick: function () { fileIn.click(); } }, "Import file"), fileIn)),
    ]);
  };

  // ---- History ----
  SITE.history = function (el) {
    return api("GET", "/api/aap/config/versions").then(function (d) {
      add(el, h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Published versions"), h("p", null, "Restoring copies a version into the draft. Publish to make it live again."))),
        d.versions.length ? h("div", { class: "table-wrap" }, h("table", { class: "t" },
          h("thead", null, h("tr", null, h("th", null, "Version"), h("th", null, "Note"), h("th", null, "By"), h("th", null, "When"), h("th"))),
          h("tbody", null, d.versions.map(function (v) {
            return h("tr", null, h("td", null, h("b", null, "v" + v.version), v.version === S.cfg.publishedVersion ? h("span", { class: "pill ok", style: { marginLeft: ".4rem" } }, "live") : null),
              h("td", null, v.note || h("span", { class: "muted" }, "—")), h("td", null, v.created_by), h("td", null, npTime(v.created_at)),
              h("td", { class: "num" }, h("button", { class: "btn sm", disabled: !roleAtLeast("editor"), onclick: function () {
                api("POST", "/api/aap/config/restore", { id: v.id }).then(function (r) { toast("Version " + v.version + " copied to the draft"); afterCfg(r); }).catch(fail);
              } }, "Restore to draft")));
          })))) : h("p", { class: "empty" }, "Nothing published yet. The site runs on its built-in defaults.")));
    });
  };

  // ======================================================================
  // AI agent
  // ======================================================================
  VIEWS.agent = function (el) {
    var tab = S.sub === "providers" ? "providers" : "chat";
    clear(el);
    add(el, pageHead("AI agent", "Ask questions about traffic or describe changes in plain Nepali or English. The agent drafts changes; you approve each one."));
    add(el, h("div", { class: "tabs", role: "tablist" },
      h("button", { role: "tab", "aria-selected": String(tab === "chat"), onclick: function () { location.hash = "#/agent"; } }, "Chat"),
      h("button", { role: "tab", "aria-selected": String(tab === "providers"), onclick: function () { location.hash = "#/agent/providers"; } }, "Providers & settings")));
    var body = h("div");
    add(el, body);
    return tab === "chat" ? agentChat(body) : agentProviders(body);
  };

  var SUGGEST = [
    "आज कति जना आए? Compare with yesterday.",
    "Which pages grew the most this week?",
    "Rename “राशिफल” to “दैनिक राशिफल” in the menus",
    "Add a festive Tihar greeting banner that links to /festivals",
    "Make the main colour a deeper green and check contrast",
    "Hide TV from the menus but keep the page working",
  ];
  function agentChat(el) {
    var threadsEl = h("ul", { class: "threads" }), msgsEl = h("div", { class: "messages", "aria-live": "polite" }), propsEl = h("div", { class: "stack" });
    var input = h("textarea", { class: "input", rows: "2", placeholder: "Ask or describe a change…", "aria-label": "Message to the AI agent" });
    var sendBtn = h("button", { class: "btn primary" }, "Send");
    var current = null;
    input.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); send(); } });
    sendBtn.addEventListener("click", send);
    if (!roleAtLeast("editor")) { input.disabled = true; sendBtn.disabled = true; input.placeholder = "Your role can view conversations but not chat."; }

    function loadThreads() {
      return api("GET", "/api/aap/ai/threads").then(function (d) {
        clear(threadsEl);
        add(threadsEl, h("li", null, h("button", { "aria-current": String(!current), onclick: function () { current = null; drawThread(null); loadThreads(); } }, "+ New conversation")));
        d.threads.forEach(function (t) {
          add(threadsEl, h("li", null, h("button", { "aria-current": String(current === t.id), onclick: function () { openThread(t.id); } }, t.title, h("small", null, ago(t.updated_at)))));
        });
      });
    }
    function openThread(id) {
      current = id;
      return api("GET", "/api/aap/ai/thread?id=" + encodeURIComponent(id)).then(function (d) { drawThread(d); loadThreads(); }).catch(fail);
    }
    function drawThread(d) {
      clear(msgsEl); clear(propsEl);
      if (!d) {
        add(msgsEl, h("div", { class: "stack" }, h("p", { class: "muted" }, "Try one of these:"),
          h("div", { class: "suggestions" }, SUGGEST.map(function (s) { return h("button", { onclick: function () { input.value = s; input.focus(); } }, s); }))));
        api("GET", "/api/aap/ai/proposals").then(function (p) {
          if (p.proposals.length) add(propsEl, [h("h3", null, "Waiting for your approval"), p.proposals.map(function (x) { return proposalCard(x, function () { drawThread(null); }); })]);
        }).catch(function () {});
        return;
      }
      d.thread.messages.forEach(function (m) {
        if (m.role === "tools") add(msgsEl, h("div", { class: "msg tools" }, "Checked: " + m.tools.map(function (t) { return t.replace(/_/g, " "); }).join(", ")));
        else add(msgsEl, h("div", { class: "msg " + m.role }, m.text));
      });
      if (d.proposals.length) {
        add(propsEl, h("h3", null, "Proposed changes"));
        d.proposals.forEach(function (p) { add(propsEl, proposalCard(p, function () { openThread(current); })); });
        var pending = d.proposals.filter(function (p) { return p.status === "pending"; });
        if (pending.length > 1 && roleAtLeast("editor")) add(propsEl, h("div", { class: "row" }, h("button", { class: "btn", onclick: function (ev) {
          var btn = ev.currentTarget;
          busy(btn, pending.reduce(function (pr, p) { return pr.then(function () { return api("POST", "/api/aap/ai/proposal", { id: p.id, action: "apply" }); }); }, Promise.resolve())
            .then(function () { toast("All changes applied to the draft"); S.cfg = null; A.refreshCounts(); openThread(current); }).catch(fail));
        } }, "Apply all " + pending.length)));
      }
      setTimeout(function () { msgsEl.lastElementChild && msgsEl.lastElementChild.scrollIntoView({ block: "nearest" }); }, 30);
    }
    function send() {
      var text = input.value.trim();
      if (!text || sendBtn.disabled) return;
      if (!current) clear(msgsEl);
      add(msgsEl, h("div", { class: "msg user" }, text));
      var typing = h("div", { class: "typing" }, "Thinking…");
      add(msgsEl, typing);
      input.value = ""; sendBtn.disabled = true;
      api("POST", "/api/aap/ai/chat", { threadId: current, message: text })
        .then(function (d) { current = d.threadId; if (d.proposals.length) { S.cfg = null; A.refreshCounts(); } return openThread(current); })
        .catch(function (e) { typing.remove(); add(msgsEl, h("div", { class: "msg error" }, e.message, " ", h("a", { href: "#/agent/providers" }, "Check provider settings"))); })
        .finally(function () { sendBtn.disabled = false; input.focus(); });
    }
    add(el, h("div", { class: "agent" },
      h("aside", { class: "panel", style: { padding: ".6rem" } }, threadsEl),
      h("section", { class: "chat" }, msgsEl, propsEl, h("div", { class: "composer" }, input, sendBtn))));
    drawThread(null);
    return loadThreads();
  }
  function proposalCard(p, after) {
    var label = { pending: "Waiting", applied: "Applied to draft", rejected: "Rejected", failed: "Failed" }[p.status] || p.status;
    var actions = p.status === "pending" && roleAtLeast("editor") ? h("div", { class: "row" },
      h("button", { class: "btn sm ghost", onclick: function () { api("POST", "/api/aap/ai/proposal", { id: p.id, action: "reject" }).then(function () { A.refreshCounts(); after(); }).catch(fail); } }, "Reject"),
      h("button", { class: "btn sm primary", onclick: function (ev) {
        busy(ev.currentTarget, api("POST", "/api/aap/ai/proposal", { id: p.id, action: "apply" }).then(function (r) { toast(r.note || "Applied"); S.cfg = null; A.refreshCounts(); after(); }).catch(fail));
      } }, p.tool === "publish_draft" ? "Publish" : "Apply")) : h("span", { class: "pill " + (p.status === "applied" ? "ok" : "") }, label);
    return h("div", { class: "proposal " + p.status }, h("div", { class: "what" }, h("b", null, p.summary), h("small", null, p.tool.replace(/_/g, " ") + " · " + ago(p.created_at))), actions);
  }

  function agentProviders(el) {
    return api("GET", "/api/aap/ai/settings").then(function (d) {
      var st = d.settings;
      var active = h("select", { class: "input", onchange: function () { st.provider = active.value; } }, d.providers.map(function (p) { return h("option", { value: p.id }, p.label + (p.hasKey ? "" : " (no key)")); }));
      active.value = st.provider;
      var list = h("div", { class: "stack" });
      d.providers.forEach(function (p) {
        var dl = h("datalist", { id: "models-" + p.id });
        var model = h("input", { class: "input", value: st.models[p.id] || "", placeholder: p.defaultModel || "model id", list: "models-" + p.id, onchange: function () { st.models[p.id] = model.value.trim(); } });
        var keyIn = h("input", { class: "input", type: "password", autocomplete: "off", placeholder: p.hasKey ? "Replace key (" + p.hint + ")" : "Paste API key", "aria-label": p.label + " API key" });
        var out = h("span", { class: "muted small", role: "status" });
        var base = p.id === "custom" ? field("Base URL", h("input", { class: "input", value: st.customBaseUrl, placeholder: "https://api.example.com/v1", onchange: function (ev) { st.customBaseUrl = ev.target.value.trim(); } }), "Any OpenAI-compatible endpoint.") : null;
        add(list, h("section", { class: "panel" },
          h("div", { class: "panel-head" }, h("div", null, h("h2", null, p.label), h("p", null, p.hasKey ? "Key saved " + (p.hint || "") + (p.keyUpdatedAt ? ", " + ago(p.keyUpdatedAt) : "") : "No key saved.")),
            p.keyUrl ? h("a", { href: p.keyUrl, target: "_blank", rel: "noopener", class: "small" }, "Get a key") : null),
          h("div", { class: "grid grid-2" },
            h("div", { class: "field" }, h("span", null, "API key"), h("div", { class: "row", style: { flexWrap: "nowrap" } }, keyIn,
              h("button", { class: "btn", disabled: !roleAtLeast("owner"), onclick: function (ev) {
                if (!keyIn.value.trim()) return;
                busy(ev.currentTarget, api("PUT", "/api/aap/ai/key", { provider: p.id, key: keyIn.value.trim() }).then(function () { toast(p.label + " key saved (encrypted)"); A.route(); }).catch(fail));
              } }, "Save"),
              p.hasKey ? h("button", { class: "btn danger", disabled: !roleAtLeast("owner"), onclick: function () {
                A.confirmBox("Remove the " + p.label + " key?", "The agent and any feature using it stop working until a new key is added.", "Remove key", true).then(function (ok) { if (ok) api("DELETE", "/api/aap/ai/key?provider=" + p.id).then(function () { toast("Key removed"); A.route(); }).catch(fail); });
              } }, "Remove") : null),
              roleAtLeast("owner") ? h("small", null, "Stored encrypted. It's never shown again.") : h("small", null, "Only owners can change keys.")),
            h("div", { class: "field" }, h("span", null, "Model"), h("div", { class: "row", style: { flexWrap: "nowrap" } }, model, dl,
              h("button", { class: "btn", disabled: !p.hasKey, onclick: function (ev) {
                busy(ev.currentTarget, api("GET", "/api/aap/ai/models?provider=" + p.id).then(function (r) { clear(dl); add(dl, r.models.map(function (m) { return h("option", { value: m }); })); out.textContent = r.models.length + " models loaded — start typing in the model box."; model.focus(); }).catch(function (e) { out.textContent = e.message; }));
              } }, "Load list")), h("small", null, "Leave empty to use " + (p.defaultModel || "the provider default") + "."))),
          base,
          h("div", { class: "row", style: { marginTop: ".75rem" } },
            h("button", { class: "btn sm", disabled: !p.hasKey, onclick: function (ev) {
              out.textContent = "Testing…";
              busy(ev.currentTarget, api("PUT", "/api/aap/ai/settings", { settings: st }).then(function () { return api("POST", "/api/aap/ai/test", { provider: p.id }); })
                .then(function (r) { out.textContent = "Connected · " + r.model + " replied in " + r.ms + " ms"; }).catch(function (e) { out.textContent = e.message; }));
            } }, "Test connection"), out)));
      });
      var instr = h("textarea", { class: "input", rows: "4", value: st.instructions, placeholder: "e.g. Always write banner text in Nepali. Never turn off Rashifal.", oninput: function () { st.instructions = instr.value; } });
      add(el, [
        h("section", { class: "panel stack" },
          h("div", { class: "panel-head" }, h("h2", null, "Agent settings"), h("button", { class: "btn primary", disabled: !roleAtLeast("editor"), onclick: function (ev) {
            busy(ev.currentTarget, api("PUT", "/api/aap/ai/settings", { settings: st }).then(function () { toast("AI settings saved"); }).catch(fail));
          } }, "Save settings")),
          h("div", { class: "grid grid-2" },
            field("Provider the agent uses", active),
            h("div", { class: "field" }, h("span", null, "Approval"), sw("Apply proposals to the draft automatically", st.autoApply, function (v) { st.autoApply = v; }), h("small", null, "Publishing always needs your click."))),
          field("Standing instructions", instr, "The agent follows these in every conversation."),
          h("div", { class: "field" }, h("span", null, "Public Jyotish chat"),
            sw("Use the Groq key saved here for the site's Jyotish chat", st.jyotishBridge.groq, function (v) { st.jyotishBridge.groq = v; }),
            sw("Use the NVIDIA key saved here for the site's Jyotish chat", st.jyotishBridge.nvidia, function (v) { st.jyotishBridge.nvidia = v; }),
            h("small", null, "Only used when no key is set in Cloudflare. Lets you rotate the Jyotish key from here."))),
        h("h2", { style: { margin: "1.5rem 0 .75rem" } }, "Providers"),
        list,
      ]);
    });
  }

  // ======================================================================
  // Site users
  // ======================================================================
  VIEWS.users = function (el) {
    var page = 0, q = "";
    var tableBox = h("div"), more = h("div", { class: "row", style: { marginTop: ".75rem" } });
    var search = h("input", { class: "input", type: "search", placeholder: "Search name or email", "aria-label": "Search users", style: { maxWidth: "320px" } });
    var t; search.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { q = search.value.trim(); page = 0; load(); }, 300); });
    function load() {
      return api("GET", "/api/aap/users?page=" + page + "&q=" + encodeURIComponent(q)).then(function (d) {
        clear(tableBox); clear(more);
        if (d.unavailable) { add(tableBox, h("p", { class: "empty" }, "The sign-in tables aren't in the database yet. Users appear here after Google sign-in is set up.")); return; }
        if (!d.users.length) { add(tableBox, h("p", { class: "empty" }, q ? "No users match “" + q + "”." : "No one has signed in yet.")); return; }
        add(tableBox, h("div", { class: "table-wrap" }, h("table", { class: "t" },
          h("thead", null, h("tr", null, h("th", null, "User"), h("th", null, "Joined"), h("th", null, "Last active"), h("th", { class: "num" }, "Sessions"), h("th"))),
          h("tbody", null, d.users.map(function (u) {
            var active = u.last_seen_at && (Date.now() - Date.parse(String(u.last_seen_at).replace(" ", "T") + "Z") < 15 * 60000);
            return h("tr", null,
              h("td", null, h("div", { class: "row", style: { flexWrap: "nowrap" } }, u.picture_url ? h("img", { class: "avatar", src: u.picture_url, alt: "", referrerpolicy: "no-referrer" }) : h("span", { class: "avatar" }),
                h("div", null, h("b", null, u.display_name || "—"), active ? h("span", { class: "pill ok", style: { marginLeft: ".4rem" } }, "online") : null, h("div", { class: "muted small" }, u.email || "")))),
              h("td", null, npTime(u.created_at, { year: "numeric", hour: undefined, minute: undefined })),
              h("td", null, ago(u.last_seen_at)),
              h("td", { class: "num" }, num(u.sessions)),
              h("td", { class: "num" }, h("div", { class: "row", style: { justifyContent: "flex-end", flexWrap: "nowrap" } },
                h("button", { class: "btn sm", disabled: !u.sessions || !roleAtLeast("editor"), onclick: function () {
                  api("POST", "/api/aap/users/revoke", { id: u.id }).then(function () { toast("Signed out on all devices"); load(); }).catch(fail);
                } }, "Sign out"),
                h("button", { class: "btn sm danger", disabled: !roleAtLeast("owner"), onclick: function () {
                  A.confirmBox("Delete " + (u.email || "this user") + "?", "Their diary, notes, reminders, family links and push subscriptions are deleted permanently.", "Delete user", true)
                    .then(function (ok) { if (ok) api("DELETE", "/api/aap/users?id=" + encodeURIComponent(u.id)).then(function () { toast("User deleted"); load(); }).catch(fail); });
                } }, "Delete"))));
          })))));
        if (page > 0) add(more, h("button", { class: "btn", onclick: function () { page--; load(); } }, "Previous"));
        if (d.hasMore) add(more, h("button", { class: "btn", onclick: function () { page++; load(); } }, "Next"));
      }).catch(fail);
    }
    return api("GET", "/api/aap/users/summary").then(function (s) {
      clear(el);
      add(el, pageHead("Site users", "People who signed in to aafnaipatro.com with Google."));
      if (s.available) add(el, h("section", { class: "kpis" },
        h("div", { class: "kpi" }, h("div", { class: "v" }, num(s.total)), h("div", { class: "l" }, "Registered"), s.new7 ? h("span", { class: "delta up" }, "+" + num(s.new7) + " this week") : null),
        h("div", { class: "kpi" }, h("div", { class: "v" }, num(s.activeNow)), h("div", { class: "l" }, "Active now (15 min)")),
        h("div", { class: "kpi" }, h("div", { class: "v" }, num(s.active24h)), h("div", { class: "l" }, "Active today")),
        h("div", { class: "kpi" }, h("div", { class: "v" }, num(s.active7d)), h("div", { class: "l" }, "Active this week"))));
      add(el, h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", null, "People"), search), tableBox, more));
      return load();
    });
  };

  // ======================================================================
  // Admins & security
  // ======================================================================
  VIEWS.security = function (el) {
    return Promise.all([api("GET", "/api/aap/auth/sessions"), api("GET", "/api/aap/admins")]).then(function (r) {
      var sess = r[0], admins = r[1].admins;
      clear(el);
      add(el, pageHead("Admins & security", "Your sign-in, two-step verification, open sessions, and who else can manage the site."));
      add(el, h("div", { class: "grid grid-2" }, passwordPanel(), totpPanel()));
      add(el, h("section", { class: "panel", style: { marginTop: "1rem" } },
        h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Where you're signed in"), h("p", null, "Sessions last 12 hours of inactivity and at most 7 days."))),
        h("div", { class: "table-wrap" }, h("table", { class: "t" },
          h("thead", null, h("tr", null, h("th", null, "Device"), h("th", null, "IP"), h("th", null, "Last active"), h("th"))),
          h("tbody", null, sess.sessions.map(function (x) {
            return h("tr", null, h("td", null, (x.user_agent || "Unknown").replace(/\(([^)]{0,60}).*?\)/, "($1)").slice(0, 90)), h("td", null, x.ip || "—"), h("td", null, ago(x.last_seen_at)),
              h("td", { class: "num" }, x.id === sess.current ? h("span", { class: "pill ok" }, "this device") : h("button", { class: "btn sm danger", onclick: function () { api("DELETE", "/api/aap/auth/sessions?id=" + x.id).then(function () { toast("Session ended"); A.route(); }).catch(fail); } }, "End")));
          }))))));
      add(el, adminsPanel(admins));
    });
  };
  function passwordPanel() {
    var err = h("div", { class: "form-error", hidden: true });
    var cur = h("input", { class: "input", type: "password", autocomplete: "current-password", required: true });
    var uname = h("input", { class: "input", value: S.admin.username, autocomplete: "username", autocapitalize: "none" });
    var p1 = h("input", { class: "input", type: "password", autocomplete: "new-password", required: true, minlength: "10" });
    var p2 = h("input", { class: "input", type: "password", autocomplete: "new-password", required: true });
    var btn = h("button", { class: "btn primary" }, "Save");
    return h("section", { class: "panel" }, h("form", { class: "stack", onsubmit: function (ev) {
      ev.preventDefault(); err.hidden = true;
      if (p1.value !== p2.value) { err.textContent = "The new passwords don't match."; err.hidden = false; return; }
      busy(btn, api("POST", "/api/aap/auth/password", { currentPassword: cur.value, newPassword: p1.value, newUsername: uname.value })
        .then(function (d) { S.admin.username = d.username; toast("Saved. Other sessions were signed out."); cur.value = p1.value = p2.value = ""; })
        .catch(function (e) { err.textContent = e.message; err.hidden = false; }));
    } }, h("h2", null, "Username & password"), err, field("Username", uname), field("Current password", cur),
      h("div", { class: "grid grid-2" }, field("New password", p1), field("Repeat", p2)), h("div", null, btn)));
  }
  function totpPanel() {
    var box = h("section", { class: "panel stack" });
    function draw() {
      clear(box);
      add(box, h("h2", null, "Two-step sign-in"));
      if (S.admin.totpEnabled) {
        add(box, [h("p", null, h("span", { class: "pill ok" }, "On"), " Signing in needs a code from your authenticator app."),
          h("div", null, h("button", { class: "btn danger", onclick: function () {
            A.promptBox("Turn off two-step sign-in", "Enter your password to confirm", "", "Turn off").then(function (pw) {
              if (pw === null) return;
              api("POST", "/api/aap/auth/totp/disable", { password: pw }).then(function () { S.admin.totpEnabled = false; toast("Two-step sign-in is off"); draw(); }).catch(fail);
            });
          } }, "Turn off"))]);
        return;
      }
      add(box, [h("p", { class: "muted", style: { margin: 0 } }, "Adds a 6-digit code from Google Authenticator, Microsoft Authenticator, Authy or 1Password to every sign-in. Strongly recommended since this console controls the whole site."),
        h("div", null, h("button", { class: "btn primary", onclick: function (ev) {
          busy(ev.currentTarget, api("POST", "/api/aap/auth/totp/setup", {}).then(function (d) {
            clear(box);
            var code = h("input", { class: "input", inputmode: "numeric", maxlength: "7", autocomplete: "one-time-code", placeholder: "123456" });
            add(box, [h("h2", null, "Set up two-step sign-in"),
              h("p", { style: { margin: 0 } }, "1. In your authenticator app, add an account and enter this key (or tap the link on your phone):"),
              h("div", { class: "code-box" }, d.secret.replace(/(.{4})/g, "$1 ").trim()),
              h("a", { href: d.uri, class: "small" }, "Open in authenticator app"),
              h("p", { style: { margin: 0 } }, "2. Enter the 6-digit code it shows:"),
              h("form", { class: "row", onsubmit: function (e2) {
                e2.preventDefault();
                api("POST", "/api/aap/auth/totp/enable", { code: code.value }).then(function () { S.admin.totpEnabled = true; toast("Two-step sign-in is on"); draw(); }).catch(fail);
              } }, code, h("button", { class: "btn primary" }, "Turn on"), h("button", { type: "button", class: "btn ghost", onclick: draw }, "Cancel"))]);
            code.focus();
          }).catch(fail));
        } }, "Set up"))]);
    }
    draw();
    return box;
  }
  function adminsPanel(admins) {
    var owner = roleAtLeast("owner");
    var tbody = h("tbody", null, admins.map(function (a) {
      var role = h("select", { class: "input", disabled: !owner || a.id === S.admin.id, "aria-label": "Role for " + a.username, onchange: function () {
        api("PATCH", "/api/aap/admins", { id: a.id, role: role.value }).then(function () { toast("Role updated"); }).catch(function (e) { fail(e); role.value = a.role; });
      } }, h("option", { value: "owner" }, "Owner"), h("option", { value: "editor" }, "Editor"), h("option", { value: "viewer" }, "Viewer"));
      role.value = a.role;
      return h("tr", null, h("td", null, h("b", null, a.username), a.id === S.admin.id ? h("span", { class: "muted small" }, " (you)") : null, a.display_name ? h("div", { class: "muted small" }, a.display_name) : null),
        h("td", null, role), h("td", null, a.totp_enabled ? h("span", { class: "pill ok" }, "2-step on") : h("span", { class: "pill" }, "password only"), a.must_change_password ? h("span", { class: "pill warn", style: { marginLeft: ".3rem" } }, "temp password") : null),
        h("td", null, ago(a.last_login_at)),
        h("td", { class: "num" }, owner && a.id !== S.admin.id ? h("div", { class: "row", style: { justifyContent: "flex-end", flexWrap: "nowrap" } },
          h("button", { class: "btn sm", onclick: function () {
            A.promptBox("Reset password for " + a.username, "Temporary password (they must change it at next sign-in)", "", "Reset").then(function (pw) {
              if (pw) api("PATCH", "/api/aap/admins", { id: a.id, resetPassword: pw }).then(function () { toast("Password reset and their sessions ended"); A.route(); }).catch(fail);
            });
          } }, "Reset password"),
          h("button", { class: "btn sm danger", onclick: function () {
            A.confirmBox("Remove " + a.username + "?", "They lose access to the admin console immediately.", "Remove", true).then(function (ok) {
              if (ok) api("DELETE", "/api/aap/admins?id=" + a.id).then(function () { toast("Admin removed"); A.route(); }).catch(fail);
            });
          } }, "Remove")) : null));
    }));
    var panel = h("section", { class: "panel", style: { marginTop: "1rem" } },
      h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Admins"), h("p", null, "Owners manage admins and keys. Editors change the site and use the AI agent. Viewers can only look."))),
      h("div", { class: "table-wrap" }, h("table", { class: "t" }, h("thead", null, h("tr", null, h("th", null, "Username"), h("th", null, "Role"), h("th", null, "Security"), h("th", null, "Last sign-in"), h("th"))), tbody)));
    if (owner) {
      var un = h("input", { class: "input", required: true, autocapitalize: "none", placeholder: "username" });
      var pw = h("input", { class: "input", required: true, type: "text", autocomplete: "off", placeholder: "temporary password" });
      var rl = h("select", { class: "input" }, h("option", { value: "editor" }, "Editor"), h("option", { value: "viewer" }, "Viewer"), h("option", { value: "owner" }, "Owner"));
      add(panel, h("form", { class: "grid", style: { gridTemplateColumns: "1fr 1fr auto auto", alignItems: "end", marginTop: "1rem" }, onsubmit: function (ev) {
        ev.preventDefault();
        api("POST", "/api/aap/admins", { username: un.value, password: pw.value, role: rl.value }).then(function () { toast("Admin added — share the temporary password privately"); A.route(); }).catch(fail);
      } }, field("New admin", un), field("Temporary password", pw), field("Role", rl), h("button", { class: "btn primary" }, "Add admin")));
    }
    return panel;
  }

  // ======================================================================
  // Activity log
  // ======================================================================
  VIEWS.activity = function (el) {
    var tbody = h("tbody"), more = h("div", { class: "row", style: { marginTop: ".75rem" } }), lastId = 0;
    function load() {
      return api("GET", "/api/aap/audit" + (lastId ? "?before=" + lastId : "")).then(function (d) {
        d.items.forEach(function (r) {
          var detail = r.detail ? (function () { try { var o = JSON.parse(r.detail); return Object.keys(o).map(function (k) { return k + ": " + (typeof o[k] === "object" ? JSON.stringify(o[k]) : o[k]); }).join(" · "); } catch (e) { return r.detail; } })() : "";
          add(tbody, h("tr", null, h("td", null, npTime(r.ts)), h("td", null, h("b", null, r.admin || "system")), h("td", null, A.ACTION_TEXT[r.action] || r.action), h("td", { class: "muted small" }, detail.slice(0, 160))));
          lastId = r.id;
        });
        clear(more);
        if (d.items.length === 100) add(more, h("button", { class: "btn", onclick: load }, "Load older"));
        if (!tbody.children.length) add(tbody, h("tr", null, h("td", { colspan: "4", class: "empty" }, "No activity yet.")));
      });
    }
    clear(el);
    add(el, [pageHead("Activity log", "Every sign-in, change and publish, kept for a year."),
      h("section", { class: "panel" }, h("div", { class: "table-wrap" }, h("table", { class: "t" }, h("thead", null, h("tr", null, h("th", null, "When"), h("th", null, "Who"), h("th", null, "What"), h("th", null, "Details"))), tbody)), more)]);
    return load();
  };

  // ======================================================================
  // Settings
  // ======================================================================
  VIEWS.settings = function (el) {
    return Promise.all([api("GET", "/api/aap/settings"), api("GET", "/api/aap/health")]).then(function (r) {
      var s = r[0], hl = r[1], owner = roleAtLeast("owner");
      clear(el);
      add(el, pageHead("Settings", "Analytics, Cloudflare connection and system health."));
      var ret = h("select", { class: "input", disabled: !owner }, [30, 90, 180, 365].map(function (d) { return h("option", { value: String(d) }, d + " days"); }));
      ret.value = String(s.retentionDays);
      var zone = h("input", { class: "input", value: s.cloudflareZoneId, disabled: !owner, placeholder: "32-character zone ID" });
      var token = h("input", { class: "input", type: "password", autocomplete: "off", disabled: !owner, placeholder: s.cloudflareToken ? "Saved (" + s.cloudflareToken + ") — paste to replace" : "API token with Analytics:Read" });
      add(el, h("div", { class: "grid grid-2" },
        h("section", { class: "panel stack" }, h("h2", null, "Analytics"),
          field("Keep page-view records for", ret, "Older records are deleted nightly."),
          h("p", { class: "muted small", style: { margin: 0 } }, "Visitor IDs rotate daily and IP addresses are never stored. To stop counting entirely, use Edit site → Advanced.")),
        h("section", { class: "panel stack" }, h("h2", null, "Cloudflare edge stats (optional)"),
          field("Zone ID", zone, "Cloudflare dashboard → aafnaipatro.com → Overview, right column."),
          field("API token", token, "Create at dash.cloudflare.com/profile/api-tokens with the Zone · Analytics · Read permission."))));
      if (owner) add(el, h("div", { class: "row", style: { marginTop: "1rem" } }, h("button", { class: "btn primary", onclick: function (ev) {
        var body = { retentionDays: Number(ret.value), cloudflareZoneId: zone.value.trim() };
        if (token.value.trim()) body.cloudflareToken = token.value.trim();
        busy(ev.currentTarget, api("PUT", "/api/aap/settings", body).then(function () { toast("Settings saved"); A.route(); }).catch(fail));
      } }, "Save settings"), s.cloudflareToken ? h("button", { class: "btn danger", onclick: function () { api("PUT", "/api/aap/settings", { cloudflareToken: "" }).then(function () { toast("Token removed"); A.route(); }).catch(fail); } }, "Remove token") : null));
      var envRows = Object.keys(hl.env).map(function (k) { return h("div", null, h("span", null, k), hl.env[k] ? h("span", { class: "pill ok" }, "set") : h("span", { class: "pill" }, "not set")); });
      add(el, h("section", { class: "panel", style: { marginTop: "1rem" } },
        h("div", { class: "panel-head" }, h("h2", null, "System health")),
        h("div", { class: "health-grid" },
          h("div", null, h("span", null, "Database (D1)"), hl.d1 ? h("span", { class: "pill ok" }, "ok · " + hl.d1LatencyMs + " ms") : h("span", { class: "pill bad" }, "unreachable")),
          h("div", null, h("span", null, "Calendar records"), h("b", null, hl.contentRecords == null ? "—" : num(hl.contentRecords))),
          h("div", null, h("span", null, "Sign-in tables"), hl.tables.identity ? h("span", { class: "pill ok" }, "present") : h("span", { class: "pill warn" }, "missing")),
          h("div", null, h("span", null, "Push tables"), hl.tables.push ? h("span", { class: "pill ok" }, "present") : h("span", { class: "pill warn" }, "missing")),
          h("div", null, h("span", null, "Holiday overrides"), hl.tables.holidays ? h("span", { class: "pill ok" }, "present") : h("span", { class: "pill warn" }, "missing")),
          h("div", null, h("span", null, "Calendar source"), h("span", { class: "muted small" }, hl.calendarSource || "—"))),
        h("h3", { style: { margin: "1.25rem 0 .5rem" } }, "Worker secrets"),
        h("div", { class: "health-grid" }, envRows),
        hl.usingGeneratedKey ? h("p", { class: "muted small", style: { marginTop: "1rem" } }, "Saved API keys are encrypted with a key generated inside the database. For extra protection, add an ADMIN_SECRET (32+ random characters) to the Worker once — keys saved before that must then be re-entered.") : null));
    });
  };

  A.boot();
})();
