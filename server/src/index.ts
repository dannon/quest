import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { WebSocketServer } from 'ws';
import { handleConnection } from './ws-handler.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const TOKEN = process.env.PTY_TOKEN || randomBytes(24).toString('base64url');

const httpServer = createServer((_req, res) => {
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws',
  maxPayload: 128 * 1024, // 128KB max message size
});

wss.on('connection', (ws) => {
  handleConnection(ws, TOKEN);
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  console.log(`[server] auth token: ${TOKEN}`);
});

export { TOKEN };
