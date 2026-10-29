# Nepal Map / Bali Calendar operational SLOs

Status: **targets prepared; production measurements required after rollout**.

Cloudflare Workers observability is already enabled in `wrangler.jsonc`. Roadmap Worker paths emit structured `roadmap_http` and `roadmap_dependency` objects; they intentionally exclude raw query strings, coordinates and user identifiers.

## Initial service objectives

| Surface | Initial objective | Window | Notes |
|---|---:|---:|---|
| Nepal public API core | >=99.9% non-5xx | rolling 28d | 4xx validation/throttling is not provider failure |
| Nepal public API core latency | p95 <=300 ms | rolling 24h + 28d | target, not claimed until measured |
| Correction submission | >=99.5% non-5xx when enabled | rolling 28d | 400/429 are expected client/abuse outcomes |
| Static Nepal Map HTML/data | >=99.9% non-5xx | rolling 28d | use Cloudflare HTTP analytics, not Worker logs because static map bypasses Worker |
| BIPAD overlay | measured dependency, no core SLO | rolling 24h | failure hides/degrades the live overlay; local hospitals/police/airports remain available |
| Public FOSSGIS routing | measured dependency, no provider SLA | rolling 24h | product must retain straight-line + external-navigation fallback |
| Bali Calendar Worker pages | >=99.9% non-5xx | rolling 28d | existing world-calendar correctness tests remain separate |

These are product engineering targets, not claims about upstream provider SLAs.

## Error budget

For a 99.9% 28-day availability target, the service error budget is 0.1% of eligible requests. `scripts/reports/slo.mjs` calculates the actual request/error totals from structured NDJSON logs and refuses to report a pass when there is no data.

## Dashboard recipe

Create a Cloudflare Custom Dashboard named **AafnaiPatro · Nepal Map + Bali Calendar** after the WIP branch is deployed to a verified preview. Recommended charts:

1. **Nepal API requests** — Workers Observability Logs; filter `event=roadmap_http`, `product=nepalmap`; timeseries count, group by `path_group`.
2. **Nepal API 5xx rate** — same dataset; percentage where `status >= 500`.
3. **Nepal API latency** — p50/p95/p99 of `duration_ms`, grouped by `path_group`.
4. **BIPAD dependency outcome** — `event=roadmap_dependency`, `dependency=bipad`; stacked count by `outcome`.
5. **BIPAD latency** — p95 `duration_ms` by `operation`.
6. **Worker CPU/outcomes** — built-in Workers Observability dataset for script `patro`.
7. **Static Nepal Map HTTP failures** — HTTP analytics filtered to `/nepalmap*` and `/data/nepalmap/*`.
8. **Bali Worker failures/latency** — Worker metrics filtered to `/bali-calendar*`; add roadmap task events once product telemetry is enabled.

## Alert candidates

- Critical: Nepal API 5xx >1% for 5 minutes with >=100 requests.
- Warning: Nepal API p95 >1s for 10 minutes.
- Warning only: BIPAD `error|timeout|throttled` >50% for 10 minutes; do not page if local resilience data remains healthy.
- Critical: static Nepal Map 5xx >1% for 5 minutes.
- Warning: correction 429 spikes may indicate targeted spam against specific source IDs.

## Verification

Run:

```bash
node scripts/reports/slo.mjs logs.ndjson
```

The report outputs measured request count, availability, p50/p95/p99, path-group breakdown and dependency outcomes. Production dashboard values remain authoritative once deployed.
