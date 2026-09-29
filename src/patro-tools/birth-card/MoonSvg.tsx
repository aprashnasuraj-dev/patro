/** Accurate moon-phase drawing from the Moon–Sun elongation (0..360). */
export function MoonSvg({ angle, size = 96, lit = '#f5e9c8', dark = '#1d2433' }: { angle: number; size?: number; lit?: string; dark?: string }) {
  const r = size / 2 - 2;
  const c = size / 2;
  const a = ((angle % 360) + 360) % 360;
  const rx = Math.abs(Math.cos((a * Math.PI) / 180)) * r;
  const waxing = a < 180;
  const gibbous = a > 90 && a < 270;
  // limb: right half when waxing, left half when waning
  const limbSweep = waxing ? 1 : 0;
  // terminator from bottom back to top
  const termSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${limbSweep} ${c} ${c + r} A ${rx} ${r} 0 0 ${termSweep} ${c} ${c - r} Z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="चन्द्रमाको कला">
      <circle cx={c} cy={c} r={r} fill={dark} />
      {a > 2 && a < 358 && <path d={d} fill={lit} />}
    </svg>
  );
}
