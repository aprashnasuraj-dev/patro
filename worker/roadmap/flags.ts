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
  nepalVisitorMode: false,
  seoPolicyEngine: false,
  futureNepalApi: false,
  futureEmbeds: false,
  futureBaliCulturalSurfaces: false,
} as const;

export type RoadmapFlag = keyof typeof ROADMAP_FLAGS;
