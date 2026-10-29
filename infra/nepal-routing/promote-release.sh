#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DATA="$ROOT/data"
ACTION="${1:-}"
VALUE="${2:-}"
mkdir -p "$DATA/releases"

switch_link() {
  local link="$1" target="$2"
  local next="$link.next"
  rm -f "$next"
  ln -s "$target" "$next"
  mv -Tf "$next" "$link"
}

current_target() {
  if [[ -L "$DATA/current" ]]; then readlink -f "$DATA/current"; fi
}

health_or_revert() {
  local old="$1"
  VALHALLA_DATA_DIR="$DATA/current" docker compose -p aafnaipatro-nepal-routing -f "$ROOT/docker-compose.yml" up -d --force-recreate valhalla
  for _ in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${VALHALLA_PORT:-8002}/status" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  if [[ -n "$old" && -d "$old" ]]; then
    echo "health failed; reverting to $old" >&2
    switch_link "$DATA/current" "$old"
    VALHALLA_DATA_DIR="$DATA/current" docker compose -p aafnaipatro-nepal-routing -f "$ROOT/docker-compose.yml" up -d --force-recreate valhalla
  fi
  return 1
}

case "$ACTION" in
  promote)
    [[ -n "$VALUE" ]] || { echo "usage: $0 promote <snapshot-label>" >&2; exit 2; }
    target="$(readlink -f "$DATA/releases/$VALUE" 2>/dev/null || true)"
    [[ -n "$target" && -f "$target/source-lock.json" && -f "$target/valhalla.json" ]] || { echo "release is incomplete: $VALUE" >&2; exit 3; }
    graph_artifact="$(find "$target" -maxdepth 2 \( -type f -name '*tiles*.tar' -o -type d -name '*tiles*' \) -print -quit)"
    [[ -n "$graph_artifact" ]] || { echo "release has no routing graph artifact: $VALUE" >&2; exit 3; }
    old="$(current_target || true)"
    if [[ -n "$old" ]]; then switch_link "$DATA/previous" "$old"; fi
    switch_link "$DATA/current" "$target"
    health_or_revert "$old"
    echo "promoted $VALUE"
    ;;
  rollback)
    prev="$(readlink -f "$DATA/previous" 2>/dev/null || true)"
    [[ -n "$prev" && -d "$prev" ]] || { echo "no previous release available" >&2; exit 4; }
    old="$(current_target || true)"
    switch_link "$DATA/current" "$prev"
    health_or_revert "$old"
    echo "rolled back to $prev"
    ;;
  *)
    echo "usage: $0 {promote <snapshot-label>|rollback}" >&2
    exit 2
    ;;
esac
