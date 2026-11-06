# Advanced tool Worker source snapshots

These are the exact original modules wrapped by the 20 search-discovery Worker versions listed in `manifest.json`. Each source was retrieved from Cloudflare and checked against its SHA-256 digest; the manifest records the active version, preceding version and apex route observed at capture time. The deployed entry and discovery wrapper live in `cloudflare/adsterra-gateway/`.

Before deploying any Worker, compare its current Cloudflare deployment, routes, runtime, bindings and code with this snapshot. To reconstruct the captured bundle, stage that Worker's `original.mjs` together with `advanced-tool-entry.mjs` renamed to `worker.mjs` and `advanced-tool-discovery.mjs`. Do not replace current production with a stale snapshot; validate functionality and retain all current settings and assets. A future release can otherwise overwrite changes made after capture.
