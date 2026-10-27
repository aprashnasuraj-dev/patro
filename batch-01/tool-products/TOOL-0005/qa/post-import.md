# TOOL-0005 — deferred integration and QA

1. Verify extracted path/hash and immutable reserved URL /tools/json-to-protobuf.
2. Add lazy route import of `src/ui.ts`, mount to `data-tool-id="TOOL-0005"` root, preserve static HTML.
3. For tools 0003 and 0010, install pinned `yaml@2.8.1` (pending license/compatibility review); no browser/server work was run during staging.
4. Run prepared Vitest tests in actual Git worktree. Run typecheck and targeted production build.
5. Browser check sample, input errors, download/export, copy, 320/375/768/1440px, tab/focus and screen reader announcements in both themes.
6. Validate against primary authorities listed in sources.json, including adversarial or ambiguous cases and confidentiality.
7. Record real commands, failures, fixes, reruns and final evidence. Do not publish automatically.
