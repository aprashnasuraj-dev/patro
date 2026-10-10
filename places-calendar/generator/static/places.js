// Live countdown (pages are static; the visitor's own date decides the text)
// and native share / copy-link. No dependencies, ~1 KB.
(function () {
  var NE = "०१२३४५६७८९";
  function ne(n) { return String(n).replace(/[0-9]/g, function (d) { return NE[+d]; }); }

  // "Today" in Nepal (UTC+05:45), independent of the visitor's timezone.
  var now = new Date(Date.now() + (5 * 60 + 45) * 60000);
  var todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  document.querySelectorAll(".countdown[data-date]").forEach(function (el) {
    var p = el.getAttribute("data-date").split("-");
    var target = Date.UTC(+p[0], +p[1] - 1, +p[2]);
    var days = Math.round((target - todayUTC) / 86400000);
    var isNe = el.getAttribute("data-lang") === "ne";
    el.textContent = "";
    if (days > 0) {
      var b = document.createElement("strong");
      b.textContent = isNe ? ne(days) : days;
      el.appendChild(b);
      el.appendChild(document.createTextNode(" " + el.getAttribute("data-togo")));
    } else if (days === 0) {
      var s = document.createElement("strong");
      s.textContent = el.getAttribute("data-today");
      el.appendChild(s);
    } else {
      el.textContent = el.getAttribute("data-passed");
    }
  });

  document.querySelectorAll(".btn-share").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          var old = btn.textContent;
          btn.textContent = btn.getAttribute("data-copied");
          setTimeout(function () { btn.textContent = old; }, 1800);
        });
      }
    });
  });
})();
