# Client-side SEO Tools (300)

This module is generated from the user-supplied `300_new_tool_ideas_western.csv`, which is the inventory source of truth for this build.

## Inventory policy

- Final canonical tool count: **300**.
- Removed by explicit scope rule: car-accident tools (#87, #88).
- Removed as ultra-heavy dependency-bound tools: #148 RAW photo decode, #152 ML face blur, #160 HDR→SDR video transcode, #161 VFR→CFR video re-encode, #162 video deinterlace, #177 FLAC/ALAC/WAV transcode.
- Added eight lightweight long-tail replacements to return to exactly 300.
- No duplicate canonical slug or primary keyword is allowed.
- Canonical namespaces are `/tools/`, `/converter/`, and `/calculator/`.

## Runtime contract

Pages are emitted as static HTML. The page shell loads a tiny module, which lazy-imports exactly one client engine. Working inputs are browser-local. No tool API, D1 query, R2 read, KV call, Worker calculation, or server-side conversion is part of the normal tool execution path.

Optional format parsers may fetch a capability module only after the user invokes that operation. Ultra-heavy codec/model tools are excluded rather than making every visitor carry those costs.
