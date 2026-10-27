# Beautiful, useful visualizations at 530-tool scale

Design for clarity, not decorative charts. Use shared typography, responsive spacing and coherent accessible components; adapt data visualization to the task:

- Finance: amortization lines, payoff waterfalls, sensitivity ranges, contribution/withdrawal calendars.
- Tax/legal: timeline rails, threshold bands, evidence badges, jurisdiction + effective-date panels (never imply legal certainty).
- Converters/data: dual-pane mapping, before/after diff, transform pipeline, table and CSV export.
- Developer/security: editor+output panels, syntax marks, parsing tree, safe redaction preview, byte counts.
- PDF/images/media: drag/drop only where needed, thumbnails, actual preview/diff before save, progress, bounded memory.
- Statistics: scatter/residuals, distributions, confidence bands, small multiple result tables, controls for assumptions.
- Health/fitness: labeled zone gradients, workout timelines, split charts, non-diagnostic caveats.
- Home/construction: isometric diagrams with dimensions, material cut tables, waste breakdowns, scale warnings.
- Education: stepwise worked examples, equation typesetting, schedules/progress, downloadable worksheets.
- Logistics/commerce: dimension outlines, pallet layouts, weight/cost ladders, regulatory date cards.

Component contract: `<ToolPage> <ToolInputs> <ToolResults> <ToolVisual> <WorkedExamples> <Sources> <RelatedTools>`. The page loads only its own implementation bundle; shared shell remains small. Always provide text/table alternatives to charts; users can reset or copy results. Print/download interactions must produce genuine files, not placeholder actions.

Group card details: concise unique title, input/output type, time to use only if genuinely measured, privacy label if accurate, related topic; never invent popularity or user ratings. Render source-safe SVG icons; ensure skeleton loading and graceful enhancement when JS is disabled.
