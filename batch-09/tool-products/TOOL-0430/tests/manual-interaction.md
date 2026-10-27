# TOOL-0430 — deferred acceptance scenarios

Status: TEST_PENDING; these are specifications, not executed test results.

- At 320, 375, 768 and 1440 px, labels, values and controls remain visible without horizontal document overflow.
- Tab through each field and the primary action; focus indicator remains visible; Enter submits the form.
- A screen reader hears the one page H1 and the result region announced after submit.
- Light/dark modes maintain contrast; reduced-motion preference does not hide feedback.
- Error case: impossible dates, scientific overflow, missing required numeric values, decimal bounds and unsupported jurisdictional cases must show explicit feedback.
- No DOM injection for `<script>`, `onerror`, right-to-left text or JSON content; user values are only inserted with `textContent`.
- Repeat calculation on edited input; copy button text equals displayed values; JSON export contains current input values, warnings and complete output with safe filename.
- Clipboard denial is handled; exporting large inputs is bounded.
- No network calls, account, cookies, content upload or server-side compute for normal calculation.
- Performance budget review: no heavy dependency at route load, no growing listeners for repeated calculations, input schema caps prevent excessive allocations.
- Domain-specific manual review: No legal entitlement to an item replacement charge; actual repair method and tenant liability may differ.
