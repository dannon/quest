import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handleConnection } from './ws-handler.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('quest-terminal-server');
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('[ws] client connected');
  handleConnection(ws);
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
