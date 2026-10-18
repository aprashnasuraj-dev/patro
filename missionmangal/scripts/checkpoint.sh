#!/usr/bin/env bash
# Backup plan #1: push this shard's state to its own branch (force) so a killed/timed-out job loses at most ~15 minutes of work.
set -euo pipefail
SHARD="${1:?shard}"; SRC="missionmangal/state/shard-${SHARD}"; [ -d "$SRC" ] || exit 0
TMP="$(mktemp -d)"; cp -r "$SRC" "$TMP/state"; cd "$TMP"
git init -q; git config user.name mission-mangal-bot; git config user.email bot@users.noreply.github.com
git add -A; git commit -qm "checkpoint shard ${SHARD} $(date -u +%FT%TZ)"
git push -qf "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" "HEAD:refs/heads/mm-state-shard-${SHARD}"
