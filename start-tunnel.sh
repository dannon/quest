#!/bin/bash
set -euo pipefail

# Start PTY server + Cloudflare quick tunnel
# Requires: node, npm, cloudflared
#
# Usage:
#   ./start-tunnel.sh              # Quick tunnel (random URL)
#   ./start-tunnel.sh my-hostname  # Named tunnel (requires cloudflared setup)
#
# The script prints a URL — open orangehack.com?pty=<that-url> on your Quest.

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

# Start PTY server in background
echo "[pty] Starting PTY server on :${PORT}..."
(cd server && npx tsx src/index.ts) &
PTY_PID=$!

cleanup() {
  echo ""
  echo "[shutdown] Stopping..."
  kill $PTY_PID 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

sleep 1

if [ "${1:-}" != "" ]; then
  # Named tunnel — user must have already run:
  #   cloudflared tunnel create <name>
  #   cloudflared tunnel route dns <name> <hostname>
  echo "[tunnel] Starting named tunnel: $1"
  cloudflared tunnel run "$1" &
  TUNNEL_PID=$!
  echo ""
  echo "========================================="
  echo " PTY server running on named tunnel"
  echo " Open on Quest:"
  echo "   orangehack.com?pty=$1"
  echo "========================================="
else
  # Quick tunnel — cloudflared generates a random URL
  echo "[tunnel] Starting quick tunnel..."

  # cloudflared quick tunnel outputs the URL to stderr
  TUNNEL_LOG=$(mktemp)
  cloudflared tunnel --url "http://localhost:${PORT}" 2>"$TUNNEL_LOG" &
  TUNNEL_PID=$!

  # Wait for the tunnel URL to appear
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

  # Strip https:// for the pty param
  TUNNEL_HOST="${TUNNEL_URL#https://}"

  echo ""
  echo "========================================="
  echo " PTY server tunneled at:"
  echo "   ${TUNNEL_URL}"
  echo ""
  echo " Open on Quest:"
  echo "   https://orangehack.com?pty=${TUNNEL_HOST}"
  echo "========================================="
fi

# Wait for either process to exit
wait
