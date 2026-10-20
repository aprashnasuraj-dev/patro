# MissionMangal writer workspace

Source archive: `MissionMangal-Writer.zip` on `missionmangal-v2`. This branch is isolated from the application release branch.

Follow the archive's `README-FIRST.md`, `PROTOCOL.md`, and `ARTICLE_SCHEMA.json`. The user explicitly changes the output destination from Google Drive to this Git branch. Preserve the protocol's per-topic quality and verification rules. Batch 0001 is first, 10 topics per batch, 390 batches total.

Write per-topic files to `writer-workspace/output/articles/<slug>.json`, `writer-workspace/output/research/<slug>.json`, and `writer-workspace/output/images/<slug>-hero.png`; record finished batches in `writer-workspace/output/done/batch-XXXX.done.json`. Only mark done after verification and all required output files are committed. Do not change the app or source archive. Final publication into `missionmangal/longform/` is a separate integration step.
