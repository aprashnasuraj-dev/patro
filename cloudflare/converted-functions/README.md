# Converted Supabase Edge Functions

This tree contains Cloudflare Worker-native copies of the immutable Supabase Edge Function snapshots under `migration/cloudflare/supabase/`.

Conversion rules:

- `Deno.serve(handler)` becomes an ES module Worker with `export default { fetch(request, env, ctx) }`.
- `Deno.env.get(NAME)` becomes `envGet(NAME)`, which reads Cloudflare bindings through `cloudflare:workers`.
- `npm:` specifiers are converted to normal npm package imports.
- Supabase's `jsr:@supabase/functions-js/edge-runtime.d.ts` type-only import is removed.
- Original archived files are never modified.
- Historical content-addressed bundles are converted under `archive/` using the same rules.

These converted functions are source-preservation/porting artifacts. They are not automatically deployed by the root Worker configuration.
