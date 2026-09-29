const NOC_URL = "https://noc.org.np/retailprice";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_HTML_BYTES = 768 * 1024;

export interface NocFuelZone {
  depots: string[];
  petrol: number;
  diesel: number;
  kerosene: number;
  atfDutyFreeUsdPerKl: number | null;
  atfDomesticNprPerL: number | null;
  lpgNprPerCylinder: number | null;
}

export interface NocFuelPayload {
  ok: true;
  source: "Nepal Oil Corporation";
  sourceUrl: string;
  fetchedAt: string;
  effectiveDate: string | null;
  freshness: "live" | "official-snapshot";
  stale: boolean;
  note?: string;
  zones: NocFuelZone[];
}

const OFFICIAL_SNAPSHOT: Omit<NocFuelPayload, "fetchedAt"> = {
  ok: true,
  source: "Nepal Oil Corporation",
  sourceUrl: NOC_URL,
  effectiveDate: "2083.04.17 (2026-08-02)",
  freshness: "official-snapshot",
  stale: true,
  note: "NOC is currently serving a maintenance/coming-soon page to the server runtime. Showing the latest source-verified NOC regional snapshot bundled with this release.",
  zones: [
    {
      depots: ["Charali","Biratnagar","Mahendranagar (Dhanusa)","Birgunj","Amlekhjung","Bhalbari","Nepalgunj","Dhangadi"],
      petrol: 197.5, diesel: 197.5, kerosene: 197.5,
      atfDutyFreeUsdPerKl: 1222, atfDomesticNprPerL: 249, lpgNprPerCylinder: 2060
    },
    {
      depots: ["Surkhet","Dang"],
      petrol: 199, diesel: 199, kerosene: 199,
      atfDutyFreeUsdPerKl: 1697, atfDomesticNprPerL: 249, lpgNprPerCylinder: 2060
    },
    {
      depots: ["Kathmandu","Pokhara","Dipayal"],
      petrol: 200, diesel: 200, kerosene: 200,
      atfDutyFreeUsdPerKl: 1697, atfDomesticNprPerL: 249, lpgNprPerCylinder: 2060
    }
  ]
};

let cached: { expiresAt: number; payload: NocFuelPayload } | null = null;

function normalizeHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8226;|&bull;/gi, "•")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function extract(block: string, pattern: RegExp): number | null {
  return parseNumber(pattern.exec(block)?.[1]);
}

export function parseNocFuelPage(html: string): NocFuelZone[] {
  const text = normalizeHtml(html);
  const marker = text.toLowerCase().indexOf("current retail selling price");
  const scope = marker >= 0 ? text.slice(marker, marker + 12_000) : text.slice(0, 12_000);
  const starts = [...scope.matchAll(/\(([^()]*,[^()]*)\)\s*Petrol\s*\(MS\)/gi)];
  const zones: NocFuelZone[] = [];

  for (let i = 0; i < starts.length; i++) {
    const match = starts[i];
    const start = match.index ?? 0;
    const end = i + 1 < starts.length ? (starts[i + 1].index ?? start + 2200) : Math.min(scope.length, start + 2200);
    const block = scope.slice(start, end);
    const petrol = extract(block, /Petrol\s*\(MS\)[^\d]{0,60}([\d.]+)/i);
    const diesel = extract(block, /Diesel\s*\(HSD\)[^\d]{0,60}([\d.]+)/i);
    const kerosene = extract(block, /Kerosene\s*\(SKO\)[^\d]{0,60}([\d.]+)/i);
    if (petrol == null || diesel == null || kerosene == null) continue;
    zones.push({
      depots: match[1].split(",").map((value) => value.trim()).filter(Boolean),
      petrol, diesel, kerosene,
      atfDutyFreeUsdPerKl: extract(block, /Aviation Fuel Duty Free[^\d]{0,80}([\d.]+)/i),
      atfDomesticNprPerL: extract(block, /Aviation Turbine Fuel\s*\(Jet A-1\)[^\d]{0,80}([\d.]+)/i),
      lpgNprPerCylinder: extract(block, /LP Gas[^\d]{0,60}([\d.]+)/i),
    });
  }
  return zones;
}

function snapshot(note?: string): NocFuelPayload {
  return {
    ...OFFICIAL_SNAPSHOT,
    fetchedAt: new Date().toISOString(),
    note: note || OFFICIAL_SNAPSHOT.note,
    zones: OFFICIAL_SNAPSHOT.zones.map((zone) => ({ ...zone, depots: [...zone.depots] })),
  };
}

export async function fetchNocFuelPrices(): Promise<NocFuelPayload> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.payload;

  try {
    const response = await fetch(NOC_URL, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Patro-Nepali-Utility/1.0 (+https://patro-blush.vercel.app)"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("noc_http_" + response.status);
    const declared = Number(response.headers.get("content-length") || "0");
    if (Number.isFinite(declared) && declared > MAX_HTML_BYTES) throw new Error("noc_response_too_large");
    const html = await response.text();
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) throw new Error("noc_response_too_large");

    const zones = parseNocFuelPage(html);
    const normalized = normalizeHtml(html).toLowerCase();
    const maintenance = normalized.includes("coming soon") || normalized.includes("website") && normalized.includes("rebuilt");
    const result: NocFuelPayload = zones.length
      ? {
          ok: true, source: "Nepal Oil Corporation", sourceUrl: NOC_URL,
          fetchedAt: new Date().toISOString(), effectiveDate: null,
          freshness: "live", stale: false, zones
        }
      : snapshot(maintenance
          ? "NOC is currently serving its website maintenance page to the server runtime. Showing the latest source-verified NOC regional snapshot."
          : "NOC's live page format could not be parsed. Showing the latest source-verified NOC regional snapshot.");

    cached = { expiresAt: now + CACHE_TTL_MS, payload: result };
    return result;
  } catch (error) {
    const result = snapshot("Live NOC retrieval failed (" + String((error as Error)?.message || error) + "). Showing the latest source-verified NOC regional snapshot.");
    cached = { expiresAt: now + 2 * 60 * 1000, payload: result };
    return result;
  }
}
