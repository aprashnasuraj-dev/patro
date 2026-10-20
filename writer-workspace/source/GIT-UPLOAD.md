# For the owner: from Drive to Git (do after ChatGPT finishes, or after any batch)

1. Download the Drive folder `MissionMangal-Writer/output/`.
2. In your repo, copy into `missionmangal/longform/`:
   - `output/articles/*.json`  → `missionmangal/longform/articles/`
   - `output/images/*`         → `missionmangal/longform/images/`
   - `output/research/*.json`  → `missionmangal/longform/research/`
   (Do **not** commit `output/done/` or `output/rejected/`; keep them for your records.)
3. First time only: copy `_repo-updates/` over the repo (adds image support, the image check, and the build workflow that requires images).
4. Commit + push. The workflow **Mission Mangal long-form build** renders every page and enforces the publish gate (words, title, meta, citations, image). Fix anything it flags, then publish `site/` (artifact `longform-site`).
5. Local check any time: `cd missionmangal/longform && REQUIRE_IMAGE=1 STRICT=1 node build.mjs`.

Final paths per article: `articles/<slug>.json`, `images/<slug>-hero.<ext>`, `research/<slug>.json`, rendered to `site/<slug>/index.html` with the image copied beside it (URL `https://aafnaipatro.com/<slug>/`).
