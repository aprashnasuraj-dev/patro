/* Shared UI kit for the community pages. Needs the engine bundle (global S) loaded first. */
window.K = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const TZ = 'Asia/Kathmandu';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const Y = +today.slice(0, 4);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MONTHS = ['जनवरी','फेब्रुअरी','मार्च','अप्रिल','मे','जुन','जुलाई','अगस्ट','सेप्टेम्बर','अक्टोबर','नोभेम्बर','डिसेम्बर'];
  const WEEK = ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  const CONF = { computed: ['गणना', '#2f6f4f'], expected: ['सम्भावित', '#8a6d1a'], announced: ['घोषित', '#1f4f8f'] };
  const npd = (n) => String(n).replace(/\d/g, (d) => '०१२३४५६७८९'[d]);
  const fmt = (iso) => `${npd(+iso.slice(8, 10))} ${MONTHS[+iso.slice(5, 7) - 1]} ${npd(iso.slice(0, 4))}`;
  const fmtShort = (iso) => `${npd(+iso.slice(8, 10))} ${MONTHS[+iso.slice(5, 7) - 1]}`;
  const weekday = (iso) => WEEK[new Date(iso + 'T00:00:00Z').getUTCDay()];
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const el = (tag, a = {}, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); p && p.appendChild(e); return e; };
  const P = (r, deg) => { const t = deg * Math.PI / 180; return [r * Math.sin(t), -r * Math.cos(t)]; };
  const t24 = (d) => npd(d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function badge(conf) { const [l, c] = CONF[conf]; return `<span class="badge" style="background:${c}">${l}</span>`; }
  function ring(d, color, size = 64) {
    const C = 2 * Math.PI * 26, frac = 1 - Math.min(Math.max(d, 0), 365) / 365;
    return `<svg viewBox="-32 -32 64 64" width="${size}" height="${size}" aria-hidden="true"><circle r="26" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="6"/><circle r="26" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" transform="rotate(-90)" stroke-dasharray="${C * frac} ${C}"/><text y="7" text-anchor="middle" font-size="18" font-weight="800" fill="currentColor">${npd(Math.max(d, 0))}</text></svg>`;
  }
  /** rows for this + next year, main entries only */
  function rowsFor(suite) { return [...S.suiteCalendar(suite, Y), ...S.suiteCalendar(suite, Y + 1)].filter((r) => !r.region); }
  function nextOf(rows, id) { return rows.find((r) => r.end >= today && (!id || r.festival.id === id)); }

  /** Month-grouped timeline with past items dimmed. onSelect(r) when a card is chosen. */
  function timeline(box, rows, { color, onSelect, limitMonths = 14 } = {}) {
    box.innerHTML = '';
    const upcoming = rows.filter((r) => r.end >= today);
    const groups = new Map();
    for (const r of upcoming) { const k = r.start.slice(0, 7); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    [...groups.entries()].slice(0, limitMonths).forEach(([ym, list]) => {
      const h = document.createElement('h3'); h.className = 'tl-month'; h.textContent = `${MONTHS[+ym.slice(5) - 1]} ${npd(ym.slice(0, 4))}`; box.appendChild(h);
      for (const r of list) {
        const d = days(today, r.start);
        const b = document.createElement('button'); b.className = 'tl-card';
        b.innerHTML = `<span class="tl-ring" style="color:inherit">${ring(d, color, 52)}</span><span><b>${esc(r.festival.dev)}</b> ${badge(r.confidence)}${r.festival.status === 'review' ? ' <i class="rv">समीक्षाधीन</i>' : ''}<br><small>${r.start === r.end ? fmt(r.main) + ' · ' + weekday(r.main) : fmt(r.start) + ' – ' + fmtShort(r.end)} · ${d <= 0 ? 'आज/जारी' : npd(d) + ' दिन'}</small></span>`;
        b.onclick = () => onSelect && onSelect(r);
        box.appendChild(b);
      }
    });
  }
  function detailHTML(r, color) {
    const f = r.festival, d = days(today, r.start);
    return `<div class="dt-top" style="color:${color}">${esc(f.roman)} · ${esc(f.en)}</div>
      <h3 class="dt-title">${esc(f.dev)} ${badge(r.confidence)}</h3>
      <div class="dt-date">${r.start === r.end ? fmt(r.main) + ', ' + weekday(r.main) : fmt(r.start) + ' – ' + fmt(r.end)} · ${d > 0 ? npd(d) + ' दिन बाँकी' : d === 0 ? 'आज!' : 'जारी'}</div>
      <p>${esc(f.summary)}</p>${f.details ? '<ul>' + f.details.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>' : ''}
      ${f.places ? `<div class="dt-places">📍 ${f.places.map(esc).join(' · ')}</div>` : ''}
      ${f.status === 'review' ? '<div class="rv">यो विवरण समुदायका विज्ञबाट समीक्षाधीन छ।</div>' : ''}`;
  }

  /* Sound (off by default) */
  let ac, soundOn = false;
  const audio = () => (ac ??= new (window.AudioContext || window.webkitAudioContext)());
  function bell(f = 523, g = .2, dur = 1.6) { if (!soundOn) return; const a = audio(), t = a.currentTime;
    [1, 2.01, 2.76].forEach((m, i) => { const o = a.createOscillator(), v = a.createGain(); o.frequency.value = f * m; v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g / (i + 1), t + .01); v.gain.exponentialRampToValueAtTime(.0001, t + dur / (i * .5 + 1)); o.connect(v).connect(a.destination); o.start(t); o.stop(t + dur); }); }
  function drum(f = 90, g = .5) { if (!soundOn) return; const a = audio(), t = a.currentTime, o = a.createOscillator(), v = a.createGain();
    o.frequency.setValueAtTime(f * 2, t); o.frequency.exponentialRampToValueAtTime(f, t + .12); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.001, t + .35); o.connect(v).connect(a.destination); o.start(t); o.stop(t + .4); }
  function soundToggle(btn) { btn.onclick = () => { soundOn = !soundOn; btn.setAttribute('aria-pressed', soundOn); btn.textContent = soundOn ? '🔔 आवाज खुला' : '🔕 आवाज बन्द'; if (soundOn) bell(); }; }

  /** Share card: draws with Canvas (browser shapes Devanagari correctly) and offers share/download. */
  function shareCard(canvas, { bg, fg, accent, kicker, title, sub, lines = [], footer, motif }) {
    const W = 1080, H = 1080, c = canvas.getContext('2d'); canvas.width = W; canvas.height = H;
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    motif && motif(c, W, H);
    c.fillStyle = accent; c.font = '600 40px Mukta, sans-serif'; c.textAlign = 'center'; c.fillText(kicker, W / 2, 190);
    c.fillStyle = fg; c.font = '800 104px Mukta, sans-serif'; c.fillText(title, W / 2, 420);
    c.font = '400 52px Mukta, sans-serif'; c.fillText(sub, W / 2, 510);
    c.font = '400 40px Mukta, sans-serif'; lines.forEach((l, i) => c.fillText(l, W / 2, 620 + i * 60));
    c.globalAlpha = .7; c.font = '400 30px Mukta, sans-serif'; c.fillText(footer, W / 2, H - 70); c.globalAlpha = 1;
  }
  async function shareCanvas(canvas, name, text) {
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text }); return; } catch {} }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  }

  /** Suite switcher shown on every page. */
  function nav(current) {
    const items = [['nepal-sambat-mandala.html', '🏯 नेपाल सम्बत'], ['lhosar.html', '🏔 ल्होसार'], ['tharu.html', '🔥 थारू'], ['mithila.html', '🐟 मिथिला'], ['kirat.html', '🥁 किरात'], ['hijri.html', '🌙 हिजरी'], ['samudaya-chakra.html', '🌐 समुदाय चक्र']];
    return `<nav class="suite-nav" aria-label="समुदाय पात्रो">${items.map(([h, l]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  }
  function stamp(el) { el.textContent = `आज ${fmt(today)}, ${weekday(today)}`; }

  return { TZ, today, Y, reduce, MONTHS, npd, fmt, fmtShort, weekday, days, el, P, t24, esc, badge, ring, rowsFor, nextOf, timeline, detailHTML, bell, drum, soundToggle, shareCard, shareCanvas, nav, stamp };
})();
