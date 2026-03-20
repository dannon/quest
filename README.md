# Spatial Terminal HUD

A mixed-reality terminal for Meta Quest. Puts a real shell (bash, claude, whatever) on a floating panel in your physical space via passthrough AR. Voice input, virtual keyboard, grabbable panels.

Built with [IWSDK](https://github.com/aspect-build/aspect-build-iwsdk) (Meta's Immersive Web SDK), xterm.js, and node-pty.

## How it works

The frontend is a static IWSDK app deployed to Cloudflare Pages. It renders xterm.js to an off-screen canvas, then maps that canvas as a Three.js texture onto a plane in the XR scene. A separate PTY server (node-pty + WebSocket) runs on your machine and spawns a real shell. You connect the two via a Cloudflare quick tunnel.

```
Quest Headset                         Your Machine
┌──────────────────────┐              ┌─────────────────┐
│  IWSDK App (browser) │──── WSS ────│  PTY Server     │
│  xterm.js → texture  │   (tunnel)  │  node-pty + ws  │
│  voice / keyboard    │              │  bash/claude/..  │
└──────────────────────┘              └─────────────────┘
```

## Quick start

### 1. Start the PTY server + tunnel

```bash
git clone https://github.com/dannon/quest.git
cd quest
./start-tunnel.sh
```

This starts the PTY server on port 3001 and creates a Cloudflare quick tunnel. It prints a URL like:

```
https://orangehack.com?pty=abc-123-xyz.trycloudflare.com
```

Requires [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and Node.js 20+.

### 2. Open on Quest

Navigate to the URL from step 1 in the Quest browser. The app loads, connects to your tunnel, and you get a terminal floating in your room.

### 3. Interact

- **Grab & move** -- point at the terminal and squeeze to reposition
- **Voice input** -- left hand pinch (trigger) to push-to-talk, release to send
- **Virtual keyboard** -- poke the keys on the panel below the terminal
- **URL param** -- `?pty=hostname` to connect to any PTY server

## Local development

```bash
# Terminal 1: PTY server
cd server && npm install && npm run dev

# Terminal 2: Vite dev server (proxies /ws to localhost:3001)
npm install && npm run dev
```

Open https://localhost:8081. The Vite proxy handles WebSocket routing in dev so no tunnel is needed.

## Project structure

```
src/
  index.ts                           # Entry point -- creates world, entities, registers systems
  components/
    terminal-panel.ts                # ECS component: session ID, cols, rows, connected state
    panel-anchor.ts                  # World-anchored vs head-tracked mode
    voice-input.ts                   # Voice state
    virtual-keyboard.ts              # Keyboard state + target terminal
    connect-dialog.ts                # Connection dialog visibility
  systems/
    terminal-render-system.ts        # xterm.js canvas → Three.js CanvasTexture at 15fps
    terminal-connection-system.ts    # WebSocket lifecycle, PTY host resolution
    panel-management-system.ts       # Head-tracked follow with smooth lerp
    voice-input-system.ts            # Web Speech API, push-to-talk via pinch
    keyboard-system.ts               # UIKitML key presses → terminal input
    connect-dialog-system.ts         # Connection UI logic
  lib/
    terminal-bridge.ts               # xterm.js + CanvasAddon, off-screen container
    ws-client.ts                     # WebSocket wrapper with auto-reconnect
    speech-recognizer.ts             # Web Speech API wrapper
    pty-config.ts                    # Runtime PTY host from URL param / localStorage
server/
  src/
    index.ts                         # HTTP + WebSocket server
    pty-manager.ts                   # node-pty spawn/resize/cleanup, 5min idle TTL
    ws-handler.ts                    # JSON message protocol
ui/
  keyboard.uikitml                   # QWERTY virtual keyboard layout
  connect.uikitml                    # Connection dialog
  status-bar.uikitml                 # Status indicators
```

## WebSocket protocol

Client → Server: `spawn`, `input`, `resize`
Server → Client: `output`, `exit`, `error`

All messages are JSON with a `type` field and `sessionId`.

## Deployment

The frontend is deployed to Cloudflare Pages at orangehack.com. The PTY server runs wherever you want -- your laptop, a VPS, a Raspberry Pi. Connect them with a Cloudflare tunnel.

For a persistent setup (named tunnel + Cloudflare Access for auth):

```bash
cloudflared tunnel create quest-pty
cloudflared tunnel route dns quest-pty pty.yourdomain.com
./start-tunnel.sh quest-pty
```

Then configure a Cloudflare Access policy on `pty.yourdomain.com` to restrict who can connect.
