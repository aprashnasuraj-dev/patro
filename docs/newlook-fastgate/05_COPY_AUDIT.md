# 05 — Copy audit and approval queue
Status: editorial proposals only; DO NOT silently change festival/month transliteration.
| Observed string / problem | Proposed action | approval |
|---|---|---|
| “Astronomica calendar” (reported UI truncation) | Astronomical calendar / खगोलीय पात्रो; verify exact source occurrence | review |
| “Dhanya Purnima / Udhhauli” | inspect underlying source key and trusted event label; ask owner before changing transliteration | **owner required** |
| “Sait rules” in AafnaiPages HUB_COPY and HomePageCurrent discovery | explain in plain bilingual copy e.g. verified traditional auspicious-time criteria, not a claim of guarantee | review |
| AppChrome has ◈, ☾, ⏳ and mobile ▦, ♈, ↔, ●, ⋯; HomePageCurrent uses ◉, ◷, ☾, ⌛, ✦, ✧, ◎, ▦ | replace with consistent installed Lucide icons; preserve screen reader names | engineering |
| English/Nepali mix in InstallCard e.g. “Browser menu बाट ‘Install app’...” | fully localized ne/en strings | review |
| “All 64 available features” hardcoded in HomePageCurrent, while feature directory may evolve | derive count from canonical registry; do not make unverified count claim | engineering |
| Current English calendar weekday headers Sun–Sat differ from requested Nepali weekday headers | choose visible Nepali names with full localized accessible labels; user language content in day panel | review |
| “Today · Nepal time” and weather localized independently | ensure sunrise locality/clock labeling consistent | review |
| Quick note may expose technical statuses, AD formatting | move to My space; BS-first date display; remove developer copy from public UI | engineering |
| Observances conflated with festival or closure styling | show distinct Observance, Festival, Public holiday data labels | editorial+engineering |
| News/History on homepage | remove news/home history widget presentation; leave existing dedicated URLs available | review |
| Stray spaces before punctuation across public bilingual copy | lint inventory and review changes by diff, not regex replacement of data | editorial |
| English-first SEO in seo.ts vs bilingual UI | preserve crawler behavior until metadata strategy reviewed, ensure page-specific translated metadata | SEO |
Transliteration watchlist: BS month labels in title.ts, festivalName source priority in HomePageCurrent, archive labels / festival datasets, Lhosar / Nepal Sambat terms. These are protected until owner review. This is a source-verified targeted audit plus user-reported items, not a claim that every generated page has been proofread.
