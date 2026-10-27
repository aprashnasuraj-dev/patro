# Deferred acceptance — TOOL-0510

**TEST_PENDING** (no test suite executed).

- Golden scenario: Buy 100 shares at $10, sell at $8, then repurchase within 30 days triggers a possible superficial-loss review.
- Domain constraints: Average-cost pool for identical CAD-denominated securities; lookahead flags provisional superficial-loss cases.
- Unsupported cases: Cross-account/affiliated acquisitions and tax basis add-back are intentionally not automated.
- Test malformed numbers, injection content, invalid dates, oversized CSV and boundary conditions.
- Verify no network requests, no account/session storage, local copy and CSV handling.
- Verify distinct design, mobile 320px, keyboard and accessible announcement.
- Confirm references/rate year during later integration, especially regulatory calculations.
