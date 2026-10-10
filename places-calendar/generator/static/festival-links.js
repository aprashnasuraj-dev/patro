/*
 * Opt-in festival links for the existing aafnaipatro.com day pages.
 *
 * Nothing happens unless the page contains a placeholder:
 *
 *   <div data-aafnai-festivals data-date="2026-11-08" data-lang="ne"></div>
 *   <script src="/static/places/festival-links.js" defer></script>
 *
 * data-date defaults to the date in the URL (/date/YYYY-MM-DD) and data-lang
 * to the page's <html lang>. The script fills the placeholder with links to
 * the festival pages for that day. It never touches anything else on the
 * page, so existing calendar features keep working exactly as before. If the
 * JSON can't be loaded, the placeholder simply stays empty.
 */
(function () {
  var box = document.querySelector("[data-aafnai-festivals]");
  if (!box) return;
  var m = location.pathname.match(/\/date\/(\d{4}-\d{2}-\d{2})/);
  var day = box.getAttribute("data-date") || (m && m[1]);
  if (!day) return;
  var lang = (box.getAttribute("data-lang") || document.documentElement.lang || "en").slice(0, 2) === "ne" ? "ne" : "en";
  var src = box.getAttribute("data-src") || "/places-data/festivals/by-date.json";

  fetch(src, { credentials: "omit" })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (all) {
      var items = all[day] || [];
      if (!items.length) return;
      var h = document.createElement("h2");
      h.textContent = lang === "ne" ? "आजका चाडपर्व" : "Festivals on this day";
      var ul = document.createElement("ul");
      items.forEach(function (f) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = lang === "ne" ? f.url_ne : f.url_en;
        a.textContent = lang === "ne" ? f.name_ne : f.name_en;
        li.appendChild(a);
        if (f.day > 1) {
          li.appendChild(document.createTextNode(lang === "ne" ? " (" + f.day + "औं दिन)" : " (day " + f.day + ")"));
        }
        ul.appendChild(li);
      });
      box.appendChild(h);
      box.appendChild(ul);
    })
    .catch(function () {});
})();
