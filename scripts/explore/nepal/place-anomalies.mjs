const EARTH_KM = 6371;
const rad = (v) => v * Math.PI / 180;
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lng - a.lng);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(q));
}

export function detectPlaceAnomalies(previous, next, options = {}) {
  const moveKm = options.moveKm ?? 5;
  const bulkThreshold = options.bulkThreshold ?? 100;
  const prev = new Map(previous.map((r) => [r.source_id, r]));
  const curr = new Map(next.map((r) => [r.source_id, r]));
  const anomalies = [];
  let removed = 0, added = 0;

  for (const [sourceId, old] of prev) {
    const now = curr.get(sourceId);
    if (!now) { removed++; anomalies.push({ code: "disappeared", source_id: sourceId, before: old }); continue; }
    const moved = distanceKm(old, now);
    if (moved > moveKm) anomalies.push({ code: "large_move", source_id: sourceId, km: Number(moved.toFixed(2)), before: old, after: now });
    if (old.category && now.category && old.category !== now.category) anomalies.push({ code: "category_change", source_id: sourceId, before: old.category, after: now.category });
    if ((old.name || old.name_ne) && !(now.name || now.name_ne)) anomalies.push({ code: "name_disappeared", source_id: sourceId, before: old });
  }
  for (const [sourceId, now] of curr) if (!prev.has(sourceId)) { added++; anomalies.push({ code: "added", source_id: sourceId, after: now }); }

  if (removed >= bulkThreshold) anomalies.push({ code: "bulk_disappearance", count: removed });
  if (added >= bulkThreshold) anomalies.push({ code: "bulk_addition", count: added });

  const seen = new Map();
  for (const r of next) {
    const key = String(r.name || r.name_ne || "").trim().toLocaleLowerCase() + "|" + Number(r.lat).toFixed(4) + "|" + Number(r.lng).toFixed(4);
    if (!key.startsWith("|")) {
      if (seen.has(key)) anomalies.push({ code: "probable_duplicate", source_id: r.source_id, other_source_id: seen.get(key) });
      else seen.set(key, r.source_id);
    }
  }
  return anomalies;
}
