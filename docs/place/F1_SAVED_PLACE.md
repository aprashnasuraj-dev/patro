# F1 — Shared opt-in saved place

Storage read: new patro.place.v1, existing patro.weather.city.v1 (suggestion only).
75 approximate Nepal/diaspora city centres use IANA zones. Explicit confirmation
saves {name,lat,lon,tz,source}; corrupt storage defaults to Kathmandu. Geolocation
uses the device zone with an editable confirmation because devices can have a
foreign zone. Prayer Times keeps its controls and now formats in the chosen zone.
New /tools/my-place is lazy; existing routes remain unchanged by default.

## Preserved behaviours
- [x] Kathmandu/Nepali/official dates, routes, canonicals and existing keys.
- [x] Existing weather, prayer controls, calendar values and CSP; no D1 reads.

## Validation and rollback
TypeScript, city/zone and corrupt-store contracts pass. Revert this item to remove
the feature; the new key can remain harmlessly stored. No old data is migrated.
