# Deferred acceptance: TOOL-0530

Status: **TEST_PENDING**. No product tests executed.

## Known answer and calculation
A $100 sale with 2.7% plus $0.30 fees costs $3.00 before any surcharge; fee-on-fee changes full recovery.

## Rules and validation
Card proceeds = sticker price×(1+surcharge)×(1−processor %) − flat processing fee; cash proceeds = sticker×(1−cash discount).

## Unsupported cases and security
Legal compliance cannot be inferred solely from numeric economics or processor contracts.
- Reject malicious or oversized inputs; do not dangerously inject user content into DOM.
- Compare precise floating-point and whole-date edge cases.
- Confirm results are not falsely represented as legally certified.
- Ensure local-only execution, no third-party data leakage, offline availability.
- Verify CSV formula neutralization, keyboard UX, accessibility announcements, mobile 320px and dark mode.
