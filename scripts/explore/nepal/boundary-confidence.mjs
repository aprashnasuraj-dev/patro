const EARTH_KM = 6371.0088;

const rad = (v) => v * Math.PI / 180;

function projectKm(lng, lat, refLat) {
  return [EARTH_KM * rad(lng) * Math.cos(rad(refLat)), EARTH_KM * rad(lat)];
}

function pointSegmentDistanceKm(point, a, b) {
  const refLat = point[1];
  const [px, py] = projectKm(point[0], point[1], refLat);
  const [ax, ay] = projectKm(a[0], a[1], refLat);
  const [bx, by] = projectKm(b[0], b[1], refLat);
  const dx = bx - ax, dy = by - ay;
  const denom = dx * dx + dy * dy;
  if (!denom) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denom));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    const hit = ((yi > point[1]) !== (yj > point[1])) &&
      (point[0] < (xj - xi) * (point[1] - yi) / ((yj - yi) || Number.EPSILON) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function polygonContains(point, polygon) {
  if (!polygon.length || !pointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) if (pointInRing(point, polygon[i])) return false;
  return true;
}

function geometryContains(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return polygonContains(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((p) => polygonContains(point, p));
  return false;
}

function geometryDistanceKm(point, geometry) {
  let best = Infinity;
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] :
    geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  for (const polygon of polygons) for (const ring of polygon) {
    for (let i = 1; i < ring.length; i++) best = Math.min(best, pointSegmentDistanceKm(point, ring[i - 1], ring[i]));
    if (ring.length > 2) best = Math.min(best, pointSegmentDistanceKm(point, ring[ring.length - 1], ring[0]));
  }
  return best;
}

export function normalizeBoundaryFeature(feature) {
  const p = feature?.properties || {};
  const palikaId = String(p.palika_id ?? p.palikaId ?? p.locallevel_fullcode ?? p.local_level_id ?? p.municipality_id ?? "");
  const wardRaw = p.ward ?? p.ward_no ?? p.ward_number ?? p.WARD ?? null;
  const ward = wardRaw == null || wardRaw === "" ? null : Number(wardRaw);
  return { feature, palika_id: palikaId, ward: Number.isFinite(ward) ? ward : null };
}

export function classifyBoundaryConfidence(point, features, expected = {}, thresholds = {}) {
  const ambiguousKm = thresholds.ambiguousKm ?? 0.25;
  const mediumKm = thresholds.mediumKm ?? 1;
  const normalized = features.map(normalizeBoundaryFeature).filter((x) => x.feature?.geometry);
  const contained = normalized.filter((x) => geometryContains(point, x.feature.geometry));
  const nearest = normalized.map((x) => ({ ...x, distance_km: geometryDistanceKm(point, x.feature.geometry) }))
    .sort((a, b) => a.distance_km - b.distance_km);

  const candidate = contained[0] || nearest[0] || null;
  if (!candidate) {
    return { confidence: "unverified", uncertain: true, inside: false, boundary_distance_m: null, reason: "no_boundary_data", candidate: null };
  }

  const boundaryDistanceKm = candidate.distance_km ?? geometryDistanceKm(point, candidate.feature.geometry);
  const expectedPalika = expected.palika_id == null ? null : String(expected.palika_id);
  const expectedWard = expected.ward == null ? null : Number(expected.ward);
  const palikaMatch = !expectedPalika || candidate.palika_id === expectedPalika;
  const wardMatch = expectedWard == null || candidate.ward == null || candidate.ward === expectedWard;
  const overlapping = contained.length > 1;

  let confidence = "high";
  let reason = "inside_boundary";
  if (!contained.length) { confidence = "low"; reason = "outside_all_boundaries"; }
  else if (!palikaMatch || !wardMatch) { confidence = "low"; reason = "assignment_mismatch"; }
  else if (overlapping) { confidence = "low"; reason = "overlapping_boundaries"; }
  else if (boundaryDistanceKm <= ambiguousKm) { confidence = "low"; reason = "near_boundary"; }
  else if (boundaryDistanceKm <= mediumKm) { confidence = "medium"; reason = "moderately_near_boundary"; }

  return {
    confidence,
    uncertain: confidence === "low",
    inside: contained.length > 0,
    boundary_distance_m: Math.round(boundaryDistanceKm * 1000),
    reason,
    palika_match: palikaMatch,
    ward_match: wardMatch,
    overlapping_candidates: contained.length,
    candidate: {
      palika_id: candidate.palika_id || null,
      ward: candidate.ward,
    },
  };
}

export function auditAssignments(rows, features, thresholds) {
  const summary = { high: 0, medium: 0, low: 0, unverified: 0, mismatches: 0, near_boundary: 0 };
  const results = rows.map((row) => {
    const result = classifyBoundaryConfidence([row.lng, row.lat], features, { palika_id: row.palika_id, ward: row.ward }, thresholds);
    summary[result.confidence] = (summary[result.confidence] || 0) + 1;
    if (result.reason === "assignment_mismatch") summary.mismatches++;
    if (result.reason === "near_boundary") summary.near_boundary++;
    return { source_id: row.source_id, ...result };
  });
  return { summary, results };
}
