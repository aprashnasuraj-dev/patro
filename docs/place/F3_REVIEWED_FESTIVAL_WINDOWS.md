# F3 — Festival windows and explicit official-clock conversion

All candidate ritual rules, source references, review records and window lengths
live in ritual-config.ts. A named qualified reviewer and dated signoff are
required for BOTH the festival rule and shared window settings. They are null:
public muhurta/parana recommendations fail closed. No reviewer is fabricated.
The gated engine supports aparahna, pradosh, nishitha, Chhath sunset/next sunrise,
vrat tithi end, both monthly Ekadashis with hari-vasara exclusion, Purnima/Aunsi,
Chaturthi moonrise and sidereal Sankranti. Ramadan reuses existing prayer times.
Official NPT clock conversion accepts a manually supplied published sait; it
explicitly labels this as user-supplied, not an independently verified official
announcement. No official time was invented from an absent archive field.

## Preserved behaviours
- [x] Official Nepal rows/defaults, archive values and ritual engine unchanged.
- [x] All previous controls, routes, storage and CSP; no D1 reads.

## Validation and rollback
TypeScript, gate, NPT/BST conversion and ingress contracts pass. Public religious
launch remains blocked on review. Clear reviewer records or revert this commit
for rollback. PlaceTimingCard stays available independently.
