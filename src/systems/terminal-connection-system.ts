import { createSystem } from '@iwsdk/core';
import { TerminalPanel } from '../components/terminal-panel.js';
import { WsClient } from '../lib/ws-client.js';
import { getPtyHost, getPtyToken, onPtyHostSet, getWsUrl } from '../lib/pty-config.js';
import { bridges } from './terminal-render-system.js';

let wsClient: WsClient | null = null;

export class TerminalConnectionSystem extends createSystem({
  terminals: { required: [TerminalPanel] },
}) {
  init() {
    const host = getPtyHost();
    if (host) {
      this.connectToHost(host);
    }

    this.cleanupFuncs.push(
      onPtyHostSet((newHost) => {
        if (wsClient) {
          wsClient.disconnect();
        }
        this.connectToHost(newHost);
      }),
    );

    this.queries.terminals.subscribe('qualify', (entity) => {
      this.spawnForEntity(entity.index);
    });
  }

  private connectToHost(host: string): void {
    const url = getWsUrl(host);
    const token = getPtyToken();
    wsClient = new WsClient(url, token);

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

    for (const entity of this.queries.terminals.entities) {
      this.spawnForEntity(entity.index);
    }
  }

  private spawnForEntity(entityIndex: number): void {
    let sessionId = TerminalPanel.data.sessionId[entityIndex];
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      TerminalPanel.data.sessionId[entityIndex] = sessionId;
    }

    const cols = TerminalPanel.data.cols[entityIndex];
    const rows = TerminalPanel.data.rows[entityIndex];

    const trySpawn = () => {
      if (wsClient?.connected) {
        wsClient.spawn(sessionId, cols, rows);
        (TerminalPanel.data.connected as unknown as number[])[entityIndex] = 1;

        const bridge = bridges.get(entityIndex);
        if (bridge) {
          bridge.onData((data) => {
            wsClient?.input(sessionId, data);
          });
        }
      } else if (wsClient) {
        setTimeout(trySpawn, 500);
      }
    };
    trySpawn();
  }
}
