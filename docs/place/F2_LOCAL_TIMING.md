# F2 — Local timing alongside existing Nepal values

Only a valid saved place mounts the lazy astronomy card on home/today, date and
astro routes. Festival standalone HTML retains its original content/canonical and
loads a separate self-hosted module; it changes no DOM with no saved place.
No new D1/API calls. Moonrise search covers the actual civil day. Tithi interval
is computed at local sunrise; computed Kathmandu comparisons are labelled and
never overwrite the official archive above. Storage read: patro.place.v1.

## Preserved behaviours
- [x] No saved place: null render; all old pages/controls/defaults remain.
- [x] Official Nepal dates and archive data unchanged; CSP unchanged.

## Validation and rollback
Five-place interval/moonrise contract and TypeScript pass. Revert this commit or
clear patro.place.v1 to remove extra rows. New generated festival module is inert
without a place; no migration.
