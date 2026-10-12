/* Aafnai Patro public link widget. Static, no requests or tracking. */
(() => {
  'use strict';
  const source = document.currentScript;
  if (!source) return;
  const origin = 'https://aafnaipatro.com';
  const shortcuts = [
    ['/today', 'आजको नेपाली मिति', 'Today’s Nepali Date'],
    ['/convert', 'BS ↔ AD', 'BS ↔ AD'],
    ['/tools/nepali-typing', 'नेपाली टाइपिङ', 'Nepali Typing'],
    ['/time-machine', 'समययन्त्र', 'Time Machine'],
    ['/moon', 'चन्द्र पात्रो', 'Moon Calendar']
  ];
  const nepali = source.dataset.lang !== 'en';
  const host = document.createElement('nav');
  host.setAttribute('aria-label', nepali ? 'आफ्नै पात्रो उपकरणहरू' : 'Aafnai Patro shortcuts');
  host.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px;border:1px solid #d9e7df;border-radius:14px;font:500 14px/1.5 system-ui,sans-serif;background:#fff;color:#133c29';
  for (const [route, ne, en] of shortcuts) {
    const a = document.createElement('a');
    a.href = origin + route;
    a.textContent = nepali ? ne : en;
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    a.style.cssText = 'display:inline-block;padding:8px 10px;border-radius:9px;color:#115733;background:#edf7f0;text-decoration:none;';
    host.appendChild(a);
  }
  const credit = document.createElement('a');
  credit.href = origin + '/';
  credit.textContent = nepali ? 'आफ्नै पात्रो' : 'Aafnai Patro';
  credit.rel = 'noopener noreferrer';
  credit.target = '_blank';
  credit.style.cssText = 'margin-inline-start:auto;color:#115733;font-weight:700;text-decoration:underline';
  host.appendChild(credit);
  source.parentNode?.insertBefore(host, source);
})();
