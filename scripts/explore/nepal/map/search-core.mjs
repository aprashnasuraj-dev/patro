export const ROW = { name: 0, nameNe: 1, sub: 4, wiki: 10 };

export function normalizeSearch(value) {
  const nfc = String(value || "").toLocaleLowerCase().normalize("NFC");
  const folded = nfc.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return folded.replace(/[^a-z0-9ऀ-ॿ]+/g, "");
}

export function searchSkeleton(value) {
  return normalizeSearch(value)
    .replace(/chh/g, "c").replace(/ch/g, "c").replace(/sh/g, "s")
    .replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u")
    .replace(/[wv]/g, "b").replace(/h/g, "").replace(/(.)\1+/g, "$1");
}

export function queryPlaceLayers(query, layers, ids, limit = 400) {
  const nq = normalizeSearch(query), sq = searchSkeleton(query);
  if (nq.length < 2) return [];
  const out = [];
  for (const id of ids) {
    const rows = layers[id] || [];
    for (let i = 0; i < rows.length && out.length < limit; i++) {
      const row = rows[i];
      const a = normalizeSearch(row[ROW.name]), b = normalizeSearch(row[ROW.nameNe]);
      let score = a === nq || b === nq ? 2.5
        : a.indexOf(nq) === 0 || b.indexOf(nq) === 0 ? 3
        : a.indexOf(nq) > 0 || b.indexOf(nq) > 0 ? 4
        : searchSkeleton(row[ROW.name]).indexOf(sq) === 0 && sq.length > 2 ? 5 : -1;
      if (score < 0) continue;
      if (row[ROW.wiki]) score -= 0.6;
      if (row[ROW.nameNe]) score -= 0.1;
      if (id === "village" && /hamlet|neighbourhood|locality|isolated_dwelling|quarter/.test(row[ROW.sub] || "")) score += 0.4;
      if (id === "village" && /city|town/.test(row[ROW.sub] || "")) score -= 0.3;
      out.push({ id, i, score });
    }
  }
  out.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id) || a.i - b.i);
  return out.slice(0, limit);
}
