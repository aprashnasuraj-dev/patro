# Roadmap feature flags

All user-visible roadmap work is reversible and defaults OFF until its phase gate is locally verified. The precise-location and external-route disclosure is a strict privacy fix and therefore is not gated.

| Flag | Default | Phase | Rollout condition | Rollback |
|---|---:|---:|---|---|
| telemetry | off | 1 | schema/privacy tests + sink decision | disable |
| provenanceUi | off | 2 | manifest coverage + UI checks | disable |
| nepalSearchWorker | off | 3 | benchmark beats/equals baseline and search fixtures pass | disable |
| nepalRoutingProviderV2 | off | 4 | fault injection + provider decision | disable |
| nepalStablePlaceIds | off | 5 | identity stability across rebuild fixtures | disable |
| baliMonthGrid | off | 6 | grid/date/source fixtures + a11y | disable |
| baliRerainanSearch | off | 6 | search fixtures + noindex query behavior | disable |
| baliLearningGuides | off | 6 | deterministic glossary/Wuku links + a11y | disable |
| baliIcsFeeds | off | 7 | RFC 5545 parser validation | disable |
| nepalVisitorMode | off | 8 | copy review + a11y | disable |
| seoPolicyEngine | off | 8 | URL-family checks pass | disable |
| futureNepalApi | off | 9 | 3–5 design partners + licensing decision | keep off |
| futureEmbeds | off | 9 | partner demand | keep off |
| futureBaliCulturalSurfaces | off | 10 | authoritative corpus + cultural review | keep off |
