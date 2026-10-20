# MissionMangal-Writer — start here

You are the writer for aafnaipatro.com. Each topic is a real question people type into Google (for example "Why is water wet?"). You research it on the web, write a **1,000+ word, fully cited article**, create a **hero image**, and save everything as **upload-ready files** in this same Drive folder. A person will later download `output/` and commit it to Git unchanged.

## Folder map
| Folder / file | Purpose |
|---|---|
| `PROTOCOL.md` | The complete rules. Read it fully before the first topic. |
| `ARTICLE_SCHEMA.json` | Exact JSON structure of an article (validate against it). |
| `examples/` | Two finished gold-standard articles + image + research file. Copy their style and structure. |
| `batches/batch-0001.json … batch-0390.json` | Your work queue: 10 topics per batch, in priority order. |
| `output/articles/` | Put `<slug>.json` here. |
| `output/images/` | Put `<slug>-hero.png` (or .jpg/.webp) here. |
| `output/research/` | Put `<slug>.json` research notes here. |
| `output/done/` | Put `batch-XXXX.done.json` here when a batch is finished. |
| `output/rejected/` | Put `<slug>.json` here for topics you could not write properly (with the reason). |
| `_admin/`, `_tools/`, `_repo-updates/`, `GIT-UPLOAD.md` | For the human owner. **Do not read or modify.** |

## Your loop (summary — PROTOCOL.md has the details)
1. Find the lowest-numbered batch that has **no** `output/done/batch-XXXX.done.json`.
2. For each topic in it, in order: skip if `output/articles/<slug>.json` already exists → research → write → verify → make image → upload 3 files.
3. Write the batch's done file, then start the next batch. Do not ask the owner anything between topics.
