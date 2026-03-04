#!/usr/bin/env bash
set -euo pipefail

BOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PORT=${PORT:-3000}
URL="http://127.0.0.1:${PORT}/healthz"

# Fail fast if the panel isn't responding quickly.
if ! curl -fsS --max-time 5 "$URL" >/dev/null; then
  "$BOT_DIR/scripts/telegram-send.sh" "SRP Legacy web healthcheck FAILED: ${URL}"
  exit 2
fi
