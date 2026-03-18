import * as pty from 'node-pty';

interface Session {
  pty: pty.IPty;
  lastActivity: number;
  onData: (data: string) => void;
  onExit: (code: number, signal: number) => void;
}

const sessions = new Map<string, Session>();

const CLEANUP_INTERVAL = 30_000;
const SESSION_TTL = 5 * 60_000; // keep PTY alive 5min after disconnect

export function spawn(
  sessionId: string,
  cols: number,
  rows: number,
  onData: (data: string) => void,
  onExit: (code: number, signal: number) => void,
): void {
  if (sessions.has(sessionId)) {
    reattach(sessionId, onData, onExit);
    return;
  }

  const shell = process.env.SHELL || '/bin/bash';
  const term = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: process.env.HOME,
    env: { ...process.env } as Record<string, string>,
  });

  const session: Session = { pty: term, lastActivity: Date.now(), onData, onExit };
  sessions.set(sessionId, session);

  term.onData((data) => {
    session.lastActivity = Date.now();
    session.onData(data);
  });

  term.onExit(({ exitCode, signal }) => {
    session.onExit(exitCode ?? 0, signal ?? 0);
    sessions.delete(sessionId);
  });
}

export function reattach(
  sessionId: string,
  onData: (data: string) => void,
  onExit: (code: number, signal: number) => void,
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.onData = onData;
  session.onExit = onExit;
  session.lastActivity = Date.now();
  return true;
}

export function write(sessionId: string, data: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
    session.pty.write(data);
  }
}

export function resize(sessionId: string, cols: number, rows: number): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.pty.resize(cols, rows);
  }
}

export function detach(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.onData = () => {};
    session.onExit = () => {};
  }
}

export function destroy(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.pty.kill();
    sessions.delete(sessionId);
  }
}

// Reap idle sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      console.log(`[pty] reaping idle session ${id}`);
      session.pty.kill();
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL);
