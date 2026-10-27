# Deferred acceptance: TOOL-0529

Status: **TEST_PENDING**. No product tests executed.

## Known answer and calculation
If a 16 kg puppy is assumed 55% grown, central adult estimate is about 29.1 kg, with broad uncertainty.

## Rules and validation
Adult weight = current measured weight divided by user-supplied estimate of fraction of mature weight.

## Unsupported cases and security
This tool does not diagnose growth, nutritional status or orthopedic risk.
- Reject malicious or oversized inputs; do not dangerously inject user content into DOM.
- Compare precise floating-point and whole-date edge cases.
- Confirm results are not falsely represented as legally certified.
- Ensure local-only execution, no third-party data leakage, offline availability.
- Verify CSV formula neutralization, keyboard UX, accessibility announcements, mobile 320px and dark mode.
