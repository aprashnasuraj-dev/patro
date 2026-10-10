/**
 * Signature hero visuals, one per family, drawn as inline SVG from the computed data (no images, no scripts).
 * Each visual is informative, not decoration: the moon disc is today's real phase, the rings show where
 * today sits in the 13-month Ethiopian year and the 210-day Pawukon, the grid is the 35-day weton cycle.
 */
import { esc } from "./html";

const f = (n: number) => Math.round(n * 100) / 100;

/**
 * Moon disc with an accurate terminator. phaseAngle: 0 new, 90 first quarter, 180 full, 270 last quarter.
 * Northern-hemisphere view: the lit limb is on the right while waxing.
 */
export function moonDisc(phaseAngle: number, label: string, size = 260): string {
  const r = size / 2 - 6, c = size / 2;
  const theta = (((phaseAngle % 360) + 360) % 360) * Math.PI / 180;
  const k = (1 - Math.cos(theta)) / 2; // illuminated fraction
  const waxing = phaseAngle < 180;
  const rx = f(r * Math.abs(Math.cos(theta)));
  const top = `${c} ${f(c - r)}`, bottom = `${c} ${f(c + r)}`;
  // Outer limb: right half while waxing, left half while waning. Terminator bulges into the lit side for crescents.
  const outer = waxing ? `A ${r} ${r} 0 0 1 ${bottom}` : `A ${r} ${r} 0 0 0 ${bottom}`;
  const crescent = k < 0.5;
  const termSweep = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
  const lit = k < 0.003 ? "" : k > 0.997 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="url(#mlit)"/>` : `<path d="M ${top} ${outer} A ${rx} ${r} 0 0 ${termSweep} ${top} Z" fill="url(#mlit)"/>`;
  const craters = [[0.32, 0.38, 0.11], [0.62, 0.3, 0.07], [0.55, 0.62, 0.13], [0.3, 0.7, 0.06], [0.72, 0.55, 0.05]]
    .map(([x, y, s]) => `<circle cx="${f(c - r + 2 * r * x)}" cy="${f(c - r + 2 * r * y)}" r="${f(r * s)}" fill="#000" opacity=".07"/>`).join("");
  return `<svg class="moon" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">
<defs><radialGradient id="mlit" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#fff8e2"/><stop offset=".7" stop-color="#f1dfa6"/><stop offset="1" stop-color="#d9c27f"/></radialGradient>
<radialGradient id="mglow" r="50%"><stop offset=".55" stop-color="#f6e7b5" stop-opacity=".22"/><stop offset="1" stop-color="#f6e7b5" stop-opacity="0"/></radialGradient>
<clipPath id="mclip"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath></defs>
<circle cx="${c}" cy="${c}" r="${f(r + 6)}" fill="url(#mglow)" opacity="${f(0.25 + 0.75 * k)}"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="#26305a"/><g clip-path="url(#mclip)"><g class="moon-lit">${lit}</g>${craters}</g>
<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#f6e7b5" stroke-opacity=".18"/></svg>`;
}

/** Polar helpers. 0° = top, clockwise. */
const pt = (c: number, r: number, deg: number) => [c + r * Math.sin(deg * Math.PI / 180), c - r * Math.cos(deg * Math.PI / 180)];
function arc(c: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = pt(c, r, a0), [x1, y1] = pt(c, r, a1);
  return `M ${f(x0)} ${f(y0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

/** Ethiopian year ring: 12 months of 30 days + Pagume, today's position marked. */
export function ethiopianYearRing(month: number, day: number, yearLength: number, monthsAm: string[], center: { big: string; small: string }, size = 300): string {
  const c = size / 2, r = size / 2 - 26;
  const dayOfYear = (month - 1) * 30 + day;
  const deg = (d: number) => (d / yearLength) * 360;
  let segs = "";
  for (let m = 0; m < 13; m++) {
    const start = m * 30, len = m < 12 ? 30 : yearLength - 360;
    const a0 = deg(start) + 0.8, a1 = deg(start + len) - 0.8;
    const isCur = m === month - 1;
    segs += `<path d="${arc(c, r, a0, a1)}" class="seg${isCur ? " cur" : ""}${m === 12 ? " pag" : ""}"/>`;
    const [lx, ly] = pt(c, r + 17, deg(start + len / 2));
    if (m < 12) segs += `<text x="${f(lx)}" y="${f(ly)}" class="lbl" text-anchor="middle" dominant-baseline="middle">${esc(monthsAm[m].slice(0, 2))}</text>`;
  }
  const [mx, my] = pt(c, r, deg(dayOfYear - 0.5));
  return `<svg class="ring eth" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(center.small)}">
${segs}<path d="${arc(c, r, 0.01, Math.max(0.5, deg(dayOfYear - 0.5)))}" class="progress"/><circle cx="${f(mx)}" cy="${f(my)}" r="9" class="mark"/>
<text x="${c}" y="${c - 8}" text-anchor="middle" class="cbig">${esc(center.big)}</text><text x="${c}" y="${c + 26}" text-anchor="middle" class="csmall">${esc(center.small)}</text></svg>`;
}

/** Pawukon ring: 30 wuku × 7 days = 210, holidays dotted, today marked. */
export function pawukonRing(dayIndex: number, wukuNames: readonly string[], holidays: { day: number; name: string }[], center: { big: string; small: string }, size = 320): string {
  const c = size / 2, r = size / 2 - 30;
  const deg = (d: number) => (d / 210) * 360;
  let g = "";
  for (let w = 0; w < 30; w++) {
    const cur = Math.floor(dayIndex / 7) === w;
    g += `<path d="${arc(c, r, deg(w * 7) + 0.7, deg(w * 7 + 7) - 0.7)}" class="seg${cur ? " cur" : ""}"><title>${esc(wukuNames[w])}</title></path>`;
  }
  for (const h of holidays) {
    const [x, y] = pt(c, r - 20, deg(h.day + 0.5));
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="4.5" class="hol"><title>${esc(h.name)}</title></circle>`;
  }
  const [mx, my] = pt(c, r, deg(dayIndex + 0.5));
  return `<svg class="ring pawukon" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(center.small)}">
${g}<circle cx="${f(mx)}" cy="${f(my)}" r="10" class="mark"/><text x="${c}" y="${c - 6}" text-anchor="middle" class="cbig">${esc(center.big)}</text><text x="${c}" y="${c + 24}" text-anchor="middle" class="csmall">${esc(center.small)}</text></svg>`;
}

/** The 35-day weton cycle as a 7 × 5 grid of neptu values, the given weton highlighted. */
export function wetonGrid(hari: readonly string[], pasaran: readonly string[], neptuHari: number[], neptuPasaran: number[], curHari: number, curPasaran: number): string {
  let cells = `<div class="wg-h"></div>${pasaran.map((p, j) => `<div class="wg-h${j === curPasaran ? " on" : ""}">${esc(p)}</div>`).join("")}`;
  hari.forEach((h, i) => {
    cells += `<div class="wg-h row${i === curHari ? " on" : ""}">${esc(h)}</div>`;
    pasaran.forEach((p, j) => {
      const on = i === curHari && j === curPasaran;
      cells += `<a class="wg-c${on ? " on" : ""}" href="/weton/${h.toLowerCase()}-${p.toLowerCase()}" aria-label="${esc(`${h} ${p}, neptu ${neptuHari[i] + neptuPasaran[j]}`)}">${neptuHari[i] + neptuPasaran[j]}</a>`;
    });
  });
  return `<figure style="margin:0;width:100%;max-width:400px"><div class="wgrid" role="group" aria-label="35 weton dan neptu">${cells}</div><figcaption class="note" style="margin-top:8px">Selapan: 7 hari × 5 pasaran = 35 weton. Angka di setiap lingkaran adalah neptu.</figcaption></figure>`;
}

/** Tear-off wall-calendar sheet: how name days are seen at home in Central Europe. */
export function tearSheet(day: number, monthLabel: string, weekday: string, names: string): string {
  return `<div class="sheet" aria-hidden="true"><div class="sheet-top"><span></span><span></span></div><div class="sheet-month">${esc(monthLabel)}</div><div class="sheet-day">${day}</div><div class="sheet-wd">${esc(weekday)}</div><div class="sheet-names">${esc(names)}</div></div>`;
}
