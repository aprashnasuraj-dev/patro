# Mero Patro client-ready release package

This branch is the consolidated Vercel package for the Mero Patro UI/UX upgrade.

## Delivery phases
1. Brand/quick wins — Mero Patro metadata, logo assets, manifest and known brand strings.
2. Design system — tokens, Mukta/Inter/Tiro, Lucide, i18n dictionaries, shared shell, theme/language controls.
3. Restructure — Explore hub, My Diary tabs, shared native routing while preserving legacy storage and protected pages.
4. Launch polish — footer/trust/contact, SEO/canonical, PWA cache expansion, native route rewrites, remaining icon cleanup, staged Supabase contact schema.

No existing localStorage/IndexedDB key is renamed. Supabase SQL/router source is staged here but must be deployed only after Vercel preview/CI is green. Browser screenshot/Lighthouse checks require a graphical browser and must not be claimed if unavailable.
