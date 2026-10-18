#!/usr/bin/env bash
# Backup plan #2: for every shard whose artifact is missing, pull its last checkpoint branch into missionmangal/state/.
set -uo pipefail
N="${1:?shards}"; mkdir -p missionmangal/state
for i in $(seq 0 $((N-1))); do
  [ -f "missionmangal/state/shard-$i/ledger.jsonl" ] && continue
  if git fetch -q origin "mm-state-shard-$i" 2>/dev/null; then
    mkdir -p "missionmangal/state/shard-$i"; git archive FETCH_HEAD state | tar -x -C missionmangal/state/shard-"$i" --strip-components=1
    echo "restored shard $i from checkpoint branch"
  fi
done
