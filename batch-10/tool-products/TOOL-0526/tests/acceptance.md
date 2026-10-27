# Deferred acceptance: TOOL-0526

Status: **TEST_PENDING**. No product tests executed.

## Known answer and calculation
200W refrigerator with 1200W start plus 900W pump with 2200W start: staggered peak is lower than simultaneous peak.

## Rules and validation
Peak = total steady running watts plus the largest simultaneous starting extra watts; applies user-entered reserve.

## Unsupported cases and security
Does not size fuel tank, neutral bonding, grounding, power factor or transfer switch.
- Reject malicious or oversized inputs; do not dangerously inject user content into DOM.
- Compare precise floating-point and whole-date edge cases.
- Confirm results are not falsely represented as legally certified.
- Ensure local-only execution, no third-party data leakage, offline availability.
- Verify CSV formula neutralization, keyboard UX, accessibility announcements, mobile 320px and dark mode.
