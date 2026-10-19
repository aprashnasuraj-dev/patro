# Mission Mangal v2 conveyor operations

The V1 import remains read-only. Batch 1 starts at zero-based batch_index 0, with at most 50 planned topics. The full 5,000-topic target is 100 batches if the reconciled plan actually contains 5,000 eligible rows; approved V1 topics and held YMYL topics reduce the eligible count.

The coordinator is .github/workflows/missionmangal-v2-conveyor.yml. Run it manually first from the missionmangal-v2-rescue-combined branch. GitHub only activates scheduled workflows from the repository default branch: merge/deploy the workflow to the default branch (after review) for the 30-minute cron to operate. A scheduled run checks out the feature branch explicitly.

Each tick: stop if a batch PR is open or a combined run is active; materialize the most recent successful run into a numbered PR if it lacks one; otherwise, after the previous PR is closed or merged, dispatch the next numbered batch. Closing without merging permits progress but does not publish its output. Failures and missing reports stop the conveyor for manual intervention, rather than skipping evidence. Do not close a PR until its contents and status have been reviewed.

The combined workflow restores V1 artifacts, the previous combined run's preparation state and worker outputs, builds the reconciled plan, selects one 50-topic slice, and executes workers. Outputs are artifacts with 14-day retention, so pauses longer than retention need durable external archival or refreshed retention. GitHub Actions run time, concurrency, quotas, and provider health still apply; a cron is not a guarantee of continuous 24-hour compute.

The PR contains separate approved and review-required directories. Deterministic fallback dossiers are never approved or auto-published. YMYL is held. Production publication requires its own review and release gate.

Operational checks: inspect the regression workflow, combined run, manifest counts, worker summaries, release-candidate inventory, and batch PR before advancing. The current implementation has not been end-to-end proven by 100 successful runs.
