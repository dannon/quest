import { createSystem } from '@iwsdk/core';
import { TerminalPanel } from '../components/terminal-panel.js';
import { WsClient } from '../lib/ws-client.js';
import { bridges } from './terminal-render-system.js';

let wsClient: WsClient | null = null;

export class TerminalConnectionSystem extends createSystem({
  terminals: { required: [TerminalPanel] },
}) {
  init() {
    const wsUrl = this.getWsUrl();
    wsClient = new WsClient(wsUrl);

    wsClient.onMessage((msg) => {
      for (const entity of this.queries.terminals.entities) {
        const sessionId = TerminalPanel.data.sessionId[entity.index];
        if (msg.sessionId !== sessionId) continue;

        if (msg.type === 'output') {
          const bridge = bridges.get(entity.index);
          if (bridge) bridge.write(msg.data);
        } else if (msg.type === 'exit') {
          (TerminalPanel.data.connected as unknown as number[])[entity.index] = 0;
        }
      }
    });

    wsClient.connect();

    this.queries.terminals.subscribe('qualify', (entity) => {
      // Generate session ID if not set
      let sessionId = TerminalPanel.data.sessionId[entity.index];
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        TerminalPanel.data.sessionId[entity.index] = sessionId;
      }

      const cols = TerminalPanel.data.cols[entity.index];
      const rows = TerminalPanel.data.rows[entity.index];

      // Wait for WS to be connected before spawning
      const trySpawn = () => {
        if (wsClient?.connected) {
          wsClient.spawn(sessionId, cols, rows);
          (TerminalPanel.data.connected as unknown as number[])[entity.index] = 1;

          // Wire terminal input → WS
          const bridge = bridges.get(entity.index);
          if (bridge) {
            bridge.onData((data) => {
              wsClient?.input(sessionId, data);
            });
          }
        } else {
          setTimeout(trySpawn, 500);
        }
      };
      trySpawn();
    });
  }

  private getWsUrl(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  }
}
