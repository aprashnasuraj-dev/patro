#!/usr/bin/env bash
# Gather every prior state dir into missionmangal/state: downloaded artifacts first, then pass-1 checkpoint branches for any missing shard.
set -uo pipefail
mkdir -p missionmangal/state
for d in missionmangal/state-in/*/; do [ -d "$d" ] && cp -rn "$d" "missionmangal/state/$(basename "$d")" 2>/dev/null; done
bash missionmangal/scripts/restore-checkpoints.sh "${1:-25}" || true
rm -rf missionmangal/state-in
ls missionmangal/state | tr '\n' ' '; echo
