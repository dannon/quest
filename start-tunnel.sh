#!/bin/bash
set -euo pipefail

# Start PTY server + Cloudflare quick tunnel
# Requires: node, npm, cloudflared
#
# Usage:
#   ./start-tunnel.sh              # Quick tunnel (random URL)
#   ./start-tunnel.sh my-hostname  # Named tunnel (requires cloudflared setup)
#
# The script prints a URL -- open it on your Quest.

PORT="${PORT:-3001}"

# Check dependencies
if ! command -v cloudflared &>/dev/null; then
  echo "cloudflared not found. Install it:"
  echo "  brew install cloudflare/cloudflare/cloudflared"
  echo "  # or: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

# Install server deps if needed
if [ ! -d "server/node_modules" ]; then
  echo "[setup] Installing server dependencies..."
  (cd server && npm install)
fi

# Start PTY server in background, capture the auth token from its output
PTY_LOG=$(mktemp)
echo "[pty] Starting PTY server on :${PORT}..."
(cd server && npx tsx src/index.ts) > "$PTY_LOG" 2>&1 &
PTY_PID=$!

cleanup() {
  echo ""
  echo "[shutdown] Stopping..."
  kill $PTY_PID 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  rm -f "$PTY_LOG"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for the server to start and extract the token
AUTH_TOKEN=""
for i in $(seq 1 15); do
  AUTH_TOKEN=$(grep -oP 'auth token: \K.*' "$PTY_LOG" 2>/dev/null || true)
  if [ -n "$AUTH_TOKEN" ]; then
    break
  fi
  sleep 1
done

if [ -z "$AUTH_TOKEN" ]; then
  echo "[error] Could not get auth token. Server output:"
  cat "$PTY_LOG"
  cleanup
fi

# Tail server logs in background
tail -f "$PTY_LOG" &

if [ "${1:-}" != "" ]; then
  echo "[tunnel] Starting named tunnel: $1"
  cloudflared tunnel run "$1" &
  TUNNEL_PID=$!
  echo ""
  echo "========================================="
  echo " PTY server running on named tunnel"
  echo " Auth token: ${AUTH_TOKEN}"
  echo ""
  echo " Open on Quest:"
  echo "   https://orangehack.com?pty=$1&token=${AUTH_TOKEN}"
  echo "========================================="
else
  echo "[tunnel] Starting quick tunnel..."

  TUNNEL_LOG=$(mktemp)
  cloudflared tunnel --url "http://localhost:${PORT}" 2>"$TUNNEL_LOG" &
  TUNNEL_PID=$!

  TUNNEL_URL=""
  for i in $(seq 1 30); do
    TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
    if [ -n "$TUNNEL_URL" ]; then
      break
    fi
    sleep 1
  done
  rm -f "$TUNNEL_LOG"

  if [ -z "$TUNNEL_URL" ]; then
    echo "[error] Could not get tunnel URL after 30s. Check cloudflared output."
    cleanup
  fi

  TUNNEL_HOST="${TUNNEL_URL#https://}"

  echo ""
  echo "========================================="
  echo " PTY server tunneled at:"
  echo "   ${TUNNEL_URL}"
  echo " Auth token: ${AUTH_TOKEN}"
  echo ""
  echo " Open on Quest:"
  echo "   https://orangehack.com?pty=${TUNNEL_HOST}&token=${AUTH_TOKEN}"
  echo "========================================="
fi

wait
