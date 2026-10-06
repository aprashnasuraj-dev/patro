# Aafnai Patro Janma Patro integration

Production mounts:
- `/janmapatro/` — Janma Patro
- `/janmapatro/milan.html` — Guna Milan
- `/jyotish/china` — compatibility mount to the same Janma Patro UI
- `/jyotish/matchmaking` — compatibility mount to the same Guna Milan UI
- `/janmapatro/api/*` — R2 save/share API

The calculation engine under `packages/engine/src` is copied unchanged from the validated Janma Patro release. Do not replace the renderer output with React markup: `renderJanmaPatroHTML`, `renderMilanHTML`, `renderChartSVG`, and `PATRO_CSS` are the visual source of truth.

Persistence uses `JP_STORE` (R2). `SSR` remains `off`; saved share pages load the saved input from R2 and compute/render in the browser.
