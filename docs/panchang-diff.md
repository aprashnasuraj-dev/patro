# Panchang comparison log

The Patro tools kit contains a reference astronomy fallback. Nepal Miti's existing production panchang remains the primary source for Nepal/Kathmandu. This file records date-level disagreements for review; neither engine is silently changed to make the other match.

## Comparison policy

- **Primary:** current Nepal Miti production panchang/archive.
- **Fallback/cross-check:** the kit reference calculator in `src/patro-tools/core/astro.ts`.
- Official festival/sait records override computed candidates where an official record exists.
- A mismatch is logged rather than auto-corrected.

## Baseline sample

| AD date | Production | Kit/reference | Result |
| --- | --- | --- | --- |
| 2026-09-29 | Krishna Tritiya; Ashwini; sunrise 05:55; sunset 17:52 | comparison fixture pending automated CI sweep | primary retained |

Automated comparison fixtures will append only differing dates here as the feature phases are wired. No production value is changed by this document.
