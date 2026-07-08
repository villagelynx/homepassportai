#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8080}"

if ! python3 -c "import openai" 2>/dev/null; then
  echo "Installing Python dependencies (openai)…"
  pip3 install --user -r requirements.txt
fi

if lsof -ti :"${PORT}" >/dev/null 2>&1; then
  echo "Stopping old server on port ${PORT}…"
  lsof -ti :"${PORT}" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "YOUR_MAC_IP")"
node scripts/build-config.mjs 2>/dev/null || true

echo ""
echo "HomePassportAI — $(pwd)"
echo "  Mac:    http://localhost:${PORT}"
echo "  iPhone: http://${IP}:${PORT}"
echo ""
echo "Your saved appliances stay on this phone per address (port matters)."
echo ""

exec python3 server.py "$PORT" --no-open
