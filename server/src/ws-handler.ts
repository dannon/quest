import type { WebSocket } from 'ws';
import * as pty from './pty-manager.js';

// Client→Server messages
interface SpawnMessage {
  type: 'spawn';
  sessionId: string;
  cols: number;
  rows: number;
}

interface InputMessage {
  type: 'input';
  sessionId: string;
  data: string;
}

interface ResizeMessage {
  type: 'resize';
  sessionId: string;
  cols: number;
  rows: number;
}

type ClientMessage = SpawnMessage | InputMessage | ResizeMessage;

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

export function handleConnection(ws: WebSocket): void {
  let boundSessionId: string | null = null;

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', sessionId: '', message: 'invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'spawn': {
        boundSessionId = msg.sessionId;
        pty.spawn(
          msg.sessionId,
          msg.cols || 120,
          msg.rows || 36,
          (data) => send(ws, { type: 'output', sessionId: msg.sessionId, data }),
          (code, signal) => send(ws, { type: 'exit', sessionId: msg.sessionId, code, signal }),
        );
        break;
      }

      case 'input': {
        pty.write(msg.sessionId, msg.data);
        break;
      }

      case 'resize': {
        pty.resize(msg.sessionId, msg.cols, msg.rows);
        break;
      }

      default:
        send(ws, { type: 'error', sessionId: '', message: `unknown message type` });
    }
  });

  ws.on('close', () => {
    if (boundSessionId) {
      pty.detach(boundSessionId);
    }
  });
}
