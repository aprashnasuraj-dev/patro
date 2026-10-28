# Client-side Browser Tools

This module preserves the existing `300_new_tool_ideas_western.csv` catalog and extends it with `audit200/aafnaipatro_200_net_new_browser_tools.csv`, the source of truth for the additional 200 tools.

## Inventory policy

- Current canonical browser-tool catalog: **550 direct `/tool/` pages** (the original 350 plus the audited 200-tool browser-local extension).
- Removed by explicit scope rule: car-accident tools (#87, #88).
- Removed as ultra-heavy dependency-bound tools: #148 RAW photo decode, #152 ML face blur, #160 HDR→SDR video transcode, #161 VFR→CFR video re-encode, #162 video deinterlace, #177 FLAC/ALAC/WAV transcode.
- Added eight lightweight long-tail replacements to restore the original catalog before the later duplicate-clean extension.
- No duplicate canonical slug or primary keyword is allowed.
- Canonical browser-tool leaves use direct `/tool/<slug>` routes; Advanced Tools is discovery/navigation only.

## Runtime contract

Pages are emitted as static HTML. The page shell loads a tiny module, which lazy-imports exactly one client engine. Working inputs are browser-local. No tool API, D1 query, R2 read, KV call, Worker calculation, or server-side conversion is part of the normal tool execution path.

Optional format parsers may fetch a capability module only after the user invokes that operation. Ultra-heavy codec/model tools are excluded rather than making every visitor carry those costs.
