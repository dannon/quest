import type { WebSocket } from 'ws';
import * as pty from './pty-manager.js';

const MAX_INPUT_BYTES = 64 * 1024; // 64KB max per input message
const MAX_SESSIONS = 10;

function clampCols(n: unknown): number {
  const v = typeof n === 'number' ? n : 120;
  return Math.max(1, Math.min(v, 500));
}

function clampRows(n: unknown): number {
  const v = typeof n === 'number' ? n : 36;
  return Math.max(1, Math.min(v, 200));
}

// Server→Client messages
interface OutputMessage {
  type: 'output';
  sessionId: string;
  data: string;
}

interface ExitMessage {
  type: 'exit';
  sessionId: string;
  code: number;
  signal: number;
}

interface ErrorMessage {
  type: 'error';
  sessionId: string;
  message: string;
}

function send(ws: WebSocket, msg: OutputMessage | ExitMessage | ErrorMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function handleConnection(ws: WebSocket, expectedToken: string): void {
  let authenticated = false;
  let boundSessionId: string | null = null;

  // Auto-close if not authenticated within 10 seconds
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      send(ws, { type: 'error', sessionId: '', message: 'auth timeout' });
      ws.close();
    }
  }, 10_000);

  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', sessionId: '', message: 'invalid JSON' });
      return;
    }

    // First message must be auth
    if (!authenticated) {
      if (msg.type === 'auth' && typeof msg.token === 'string') {
        if (msg.token === expectedToken) {
          authenticated = true;
          clearTimeout(authTimeout);
          send(ws, { type: 'error', sessionId: '', message: 'auth ok' });
        } else {
          send(ws, { type: 'error', sessionId: '', message: 'auth failed' });
          ws.close();
        }
      } else {
        send(ws, { type: 'error', sessionId: '', message: 'auth required' });
        ws.close();
      }
      return;
    }

    switch (msg.type) {
      case 'spawn': {
        const sessionId = typeof msg.sessionId === 'string' ? msg.sessionId : '';
        if (!sessionId) {
          send(ws, { type: 'error', sessionId: '', message: 'missing sessionId' });
          return;
        }

        // One session per connection
        if (boundSessionId && boundSessionId !== sessionId) {
          send(ws, { type: 'error', sessionId, message: 'session already bound' });
          return;
        }

        // Global session limit
        if (!boundSessionId && pty.sessionCount() >= MAX_SESSIONS) {
          send(ws, { type: 'error', sessionId, message: 'max sessions reached' });
          return;
        }

        boundSessionId = sessionId;
        pty.spawn(
          sessionId,
          clampCols(msg.cols),
          clampRows(msg.rows),
          (data) => send(ws, { type: 'output', sessionId, data }),
          (code, signal) => send(ws, { type: 'exit', sessionId, code, signal }),
        );
        break;
      }

      case 'input': {
        const sessionId = typeof msg.sessionId === 'string' ? msg.sessionId : '';
        if (sessionId !== boundSessionId) {
          send(ws, { type: 'error', sessionId, message: 'session mismatch' });
          return;
        }
        const data = typeof msg.data === 'string' ? msg.data : '';
        if (data.length > MAX_INPUT_BYTES) {
          send(ws, { type: 'error', sessionId, message: 'input too large' });
          return;
        }
        pty.write(sessionId, data);
        break;
      }

      case 'resize': {
        const sessionId = typeof msg.sessionId === 'string' ? msg.sessionId : '';
        if (sessionId !== boundSessionId) {
          send(ws, { type: 'error', sessionId, message: 'session mismatch' });
          return;
        }
        pty.resize(sessionId, clampCols(msg.cols), clampRows(msg.rows));
        break;
      }

      default:
        send(ws, { type: 'error', sessionId: '', message: 'unknown message type' });
    }
  });

  ws.on('close', () => {
    clearTimeout(authTimeout);
    if (boundSessionId) {
      pty.detach(boundSessionId);
    }
  });
}
