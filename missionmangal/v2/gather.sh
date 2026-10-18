#!/usr/bin/env bash
# Restore source artifacts and previous v2 outputs without deleting source archives.
# Each artifact downloads into state-in/<artifact-name>/; checkpoint fallback is used for missing shards.
set -euo pipefail
N="${1:-25}"
mkdir -p missionmangal/state
shopt -s nullglob
for d in missionmangal/state-in/*/; do
  name="$(basename "$d")"
  case "$name" in shard-[0-9]*|rescue-[0-9]*|v2-out-[0-9]*) ;; *) continue;; esac
  target="$name"
  case "$name" in v2-out-*) target="v2-${name#v2-out-}";; esac
  if [[ -f "$d/ledger.jsonl" ]]; then
    mkdir -p "missionmangal/state/$target"
    cp -a "$d/." "missionmangal/state/$target/"
  elif [[ -f "$d/state/ledger.jsonl" ]]; then
    mkdir -p "missionmangal/state/$target"
    cp -a "$d/state/." "missionmangal/state/$target/"
  else
    echo "::warning::Artifact $name has no ledger at expected location"
  fi
done
bash missionmangal/scripts/restore-checkpoints.sh "$N"
missing=0
for ((i=0;i<N;i++)); do
  if [[ ! -s "missionmangal/state/shard-$i/ledger.jsonl" ]]; then
    echo "::error::Missing first-pass shard-$i ledger after artifact and checkpoint restoration"
    missing=$((missing+1))
  fi
done
[[ "$missing" -eq 0 ]] || exit 1
echo "Restored all $N first-pass ledgers; state directories:"
find missionmangal/state -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
