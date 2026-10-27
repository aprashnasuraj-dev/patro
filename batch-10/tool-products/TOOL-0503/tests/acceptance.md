# Deferred acceptance — TOOL-0503

**TEST_PENDING** (no test suite executed).

- Golden scenario: Sell 40 shares at £8, repurchase 20 within 30 days, match those 20 at purchase cost before pool.
- Domain constraints: Same-day buys, purchases in next 30 days, then Section 104 pool in this order.
- Unsupported cases: Source template for one security, no corporate actions or foreign currency FX.
- Test malformed numbers, injection content, invalid dates, oversized CSV and boundary conditions.
- Verify no network requests, no account/session storage, local copy and CSV handling.
- Verify distinct design, mobile 320px, keyboard and accessible announcement.
- Confirm references/rate year during later integration, especially regulatory calculations.
