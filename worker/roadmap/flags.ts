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
  baliMonthGrid: false,
  baliRerainanSearch: false,
  baliLearningGuides: false,
  baliIcsFeeds: false,
  nepalVisitorMode: false,
  seoPolicyEngine: false,
  futureNepalApi: false,
  futureEmbeds: false,
  futureBaliCulturalSurfaces: false,
} as const;

export type RoadmapFlag = keyof typeof ROADMAP_FLAGS;
