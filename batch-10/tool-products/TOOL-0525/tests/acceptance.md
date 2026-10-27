# Deferred acceptance: TOOL-0525

Status: **TEST_PENDING**. No product tests executed.

## Known answer and calculation
16,000 kWh heat/3 COP=5,333 kWh electricity; compare 16,000/0.88 kWh gas energy.

## Rules and validation
Cost_HP = useful heat / seasonal COP × power price; cost_gas = useful heat / boiler efficiency × gas energy price.

## Unsupported cases and security
Apples-to-apples demand and accurate seasonal metrics required.
- Reject malicious or oversized inputs; do not dangerously inject user content into DOM.
- Compare precise floating-point and whole-date edge cases.
- Confirm results are not falsely represented as legally certified.
- Ensure local-only execution, no third-party data leakage, offline availability.
- Verify CSV formula neutralization, keyboard UX, accessibility announcements, mobile 320px and dark mode.
