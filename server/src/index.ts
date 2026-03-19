import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handleConnection } from './ws-handler.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://orangehack.com').split(',');

const httpServer = createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('quest-terminal-server');
});

const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws',
  verifyClient: ({ origin }: { origin?: string }) => {
    if (!origin) return true;
    return ALLOWED_ORIGINS.includes(origin);
  },
});

wss.on('connection', (ws) => {
  console.log('[ws] client connected');
  handleConnection(ws);
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
