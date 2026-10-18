#!/usr/bin/env bash
# Push this v2 worker's state to its own branch so a killed job loses at most ~15 minutes.
set -euo pipefail
W="${1:?worker}"; SRC="missionmangal/state/v2-${W}"; [ -d "$SRC" ] || exit 0
TMP="$(mktemp -d)"; cp -r "$SRC" "$TMP/state"; cd "$TMP"
git init -q; git config user.name mission-mangal-bot; git config user.email bot@users.noreply.github.com
git add -A; git commit -qm "v2 checkpoint worker ${W} $(date -u +%FT%TZ)"
git push -qf "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" "HEAD:refs/heads/mm-v2-state-${W}"
