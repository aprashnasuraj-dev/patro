/**
 * Roadmap feature registry.
 *
 * User-visible roadmap changes default OFF until the corresponding phase gate is
 * locally verified. Strict privacy/correctness fixes are not gated here.
 */
export const ROADMAP_FLAGS = {
  telemetry: false,
  provenanceUi: false,
  nepalSearchWorker: false,
  nepalRoutingProviderV2: false,
  nepalStablePlaceIds: false,
  nepalBoundaryConfidence: false,
  nepalDetourRouting: false,
  nepalRoadSafety: false,
  nepalTerrain: false,
  nepalOfflinePacks: false,
  nepalExports: false,
  nepalPoiPages: false,
  nepalMobileSheetV2: false,
  nepalEmergency: false,
  nepalItinerary: false,
  nepalCorrectionsUi: false,
  nepalApi: false,
  nepalEmbeds: false,
  nepalPmtiles: false,
  roadmapSlo: false,
  roadmapCostMetrics: false,
  baliMonthGrid: false,
  baliRerainanSearch: false,
  baliLearningGuides: false,
  baliIcsFeeds: false,
  baliOtonanDualResult: false,
  baliSubscriptionUi: false,
  baliPiodalan: false,
  baliDauhAyu: false,
  baliPadewasan: false,
  baliEnglishGuide: false,
  nepalVisitorMode: false,
  seoPolicyEngine: false,
  futureNepalApi: false,
  futureEmbeds: false,
  futureBaliCulturalSurfaces: false,
} as const;

export type RoadmapFlag = keyof typeof ROADMAP_FLAGS;
export type RoadmapFlags = { [K in RoadmapFlag]: boolean };

const ENV_FLAG_KEYS: Partial<Record<RoadmapFlag, string>> = {
  telemetry: "ROADMAP_TELEMETRY",
  provenanceUi: "ROADMAP_PROVENANCE_UI",
  baliMonthGrid: "BALI_MONTH_GRID",
  baliRerainanSearch: "BALI_RERAINAN_SEARCH",
  baliLearningGuides: "BALI_LEARNING_GUIDES",
  baliIcsFeeds: "BALI_ICS_FEEDS",
  baliOtonanDualResult: "BALI_OTONAN_DUAL_RESULT",
  baliSubscriptionUi: "BALI_SUBSCRIPTION_UI",
  baliPiodalan: "BALI_PIODALAN",
  baliDauhAyu: "BALI_DAUH_AYU",
  baliPadewasan: "BALI_PADEWASAN",
  baliEnglishGuide: "BALI_ENGLISH_GUIDE",
};

export function roadmapFlagsFromEnv(env: Record<string, unknown> | null | undefined): RoadmapFlags {
  const flags = { ...ROADMAP_FLAGS } as RoadmapFlags;
  if (!env) return flags;
  for (const [flag, key] of Object.entries(ENV_FLAG_KEYS) as [RoadmapFlag, string][]) {
    flags[flag] = env[key] === "1";
  }
  return flags;
}

export function roadmapFlagSignature(flags: RoadmapFlags): string {
  return (Object.keys(flags) as RoadmapFlag[]).filter((k) => flags[k]).sort().join(",") || "none";
}
