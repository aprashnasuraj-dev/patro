// Live converter for the kati pages. Reads the exact ratio from data-ratio,
// accepts Nepali or Latin digits, and prints with lakh grouping (and Nepali
// digits on Nepali pages). ~1 KB, no dependencies.
(function () {
  var NE = "०१२३४५६७८९";
  function toLatin(s) { return String(s).replace(/[०-९]/g, function (d) { return NE.indexOf(d); }); }
  function toNe(s) { return String(s).replace(/[0-9]/g, function (d) { return NE[+d]; }); }
  function lakh(intStr) {
    if (intStr.length <= 3) return intStr;
    var head = intStr.slice(0, -3), tail = intStr.slice(-3), parts = [];
    while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
    if (head) parts.unshift(head);
    return parts.join(",") + "," + tail;
  }
  function fmt(x) {
    if (!isFinite(x)) return "—";
    var ax = Math.abs(x);
    var p = ax >= 1000 ? 2 : ax >= 1 ? 4 : ax === 0 ? 0 : Math.min(10, Math.max(4, -Math.floor(Math.log10(ax)) + 3));
    var s = x.toFixed(p);
    if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    var neg = s[0] === "-"; if (neg) s = s.slice(1);
    var ip = s.split(".")[0], fp = s.split(".")[1];
    return (neg ? "-" : "") + lakh(ip) + (fp ? "." + fp : "");
  }
  document.querySelectorAll("form.conv").forEach(function (f) {
    var ratio = parseFloat(f.getAttribute("data-ratio"));
    var ne = f.getAttribute("data-lang") === "ne";
    var input = f.querySelector("input"), out = f.querySelector(".conv-out");
    if (ne) input.value = toNe(input.value);
    function run() {
      var v = parseFloat(toLatin(input.value).replace(/,/g, ""));
      var s = isNaN(v) ? "—" : fmt(v * ratio);
      out.textContent = ne ? toNe(s) : s;
    }
    input.addEventListener("input", run);
    run();
  });
})();
