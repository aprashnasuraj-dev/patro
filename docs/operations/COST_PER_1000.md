# Cost per 1,000 sessions

Run only with measured usage:

```bash
node scripts/reports/cost-per-1000.mjs docs/operations/cost-input.example.json
```

Replace the zeros with the same-period Nepal Map + Bali Calendar session, Worker request, CPU-ms and log-event counts. If billing provides a known incremental Cloudflare charge, populate `cloudflare_incremental_charge_usd`; otherwise the report is explicitly a marginal-overage scenario.

Current dated pricing assumptions live in the script so future changes are code-reviewed. Worker bandwidth/egress is not assigned a fictional cost. External routing/DEM charges must be entered from the provider invoice or usage report.

The output always reports:
- actual cost/1,000 only when actual incremental Cloudflare charge is provided,
- external provider costs separately,
- marginal Cloudflare overage scenario,
- the pricing basis date and warning.
