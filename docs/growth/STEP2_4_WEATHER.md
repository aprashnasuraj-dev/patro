# Step 2.4: browser weather

Browser and original Worker share the exact existing provider normalization. Direct Open-Meteo uses all original fields, Kathmandu timezone and 16-day horizon. Existing attribution and every renderer remain intact. Shared in-memory deduplication and guarded 30-minute sessionStorage cache reduce calls; blocked storage works. Upstream failure falls back to the old daily API. New keys: patro.weather.v1:<lat>:<lng> (ephemeral forecasts only).

Rollback: replace the direct request with the existing fallback, or revert weather-client.ts. Neither endpoint nor saved weather-city key changes. Actual provider terms/quotas still apply; this does not imply unlimited upstream traffic.
