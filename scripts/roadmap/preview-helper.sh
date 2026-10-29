#!/usr/bin/env bash
set -euo pipefail

roadmap_start_preview() {
  if [[ -n "${ROADMAP_BASE_URL:-}" ]]; then
    export ROADMAP_BASE_URL
    ROADMAP_PREVIEW_PID=""
    return
  fi
  local port="${ROADMAP_PORT:-8787}"
  export ROADMAP_BASE_URL="http://127.0.0.1:${port}"
  local log="${TMPDIR:-/tmp}/aafnaipatro-roadmap-preview.log"
  npx wrangler dev --local --config wrangler.jsonc --port "$port" >"$log" 2>&1 &
  ROADMAP_PREVIEW_PID="$!"
  export ROADMAP_PREVIEW_PID
  for _ in $(seq 1 90); do
    if curl -fsS "$ROADMAP_BASE_URL/bali-calendar" >/dev/null 2>&1; then return; fi
    if ! kill -0 "$ROADMAP_PREVIEW_PID" 2>/dev/null; then
      cat "$log" >&2
      return 1
    fi
    sleep 1
  done
  echo "preview did not become ready: $log" >&2
  return 1
}

roadmap_stop_preview() {
  if [[ -n "${ROADMAP_PREVIEW_PID:-}" ]]; then
    kill "$ROADMAP_PREVIEW_PID" 2>/dev/null || true
    wait "$ROADMAP_PREVIEW_PID" 2>/dev/null || true
  fi
}
